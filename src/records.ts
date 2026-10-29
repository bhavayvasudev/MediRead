import { parseLabel, samples } from './medicine.ts';

export type ScanSnapshot = { id: string; text: string; scenario: string; edited: boolean; at: string };
export const labelFields = ['Medicine name', 'Strength', 'Active ingredients', 'Expiry date', 'Manufacturer', 'Batch number'] as const;
export type LabelField = typeof labelFields[number];
export type FieldEvidence = { value: string; source: 'Sample scenario' | 'User entered' | 'Unknown'; confirmation: string };
export type InformationCheck = { id: string; scan: ScanSnapshot; fields: Record<LabelField, FieldEvidence>; at: string };
export const eventTypes = ['Prescription change', 'Hospital update', 'Caregiver note', 'Medicine started', 'Medicine stopped', 'Other'] as const;
export const eventSources = ['Prescription', 'Hospital', 'Caregiver', 'User-entered note'] as const;
export type TimelineEntry = { id: string; name: string; type: string; at: string; source: string; previous: string; updated: string; notes: string; association: string };
export const auditItems = [
  ['Tiny or difficult-to-read print', 'Use larger, legible type with clear spacing.'],
  ['Poor text contrast', 'Use clear text and background contrast; avoid reflective text areas.'],
  ['Blurry or unclear printing', 'Use crisp, durable printing and clear characters.'],
  ['Crowded text layout', 'Group related details and provide more whitespace.'],
  ['Difficult-to-find expiry information', 'Place expiry information in a consistent, clearly labeled area.'],
  ['Difficult-to-identify medicine name or strength', 'Give the medicine name and strength a clear visual hierarchy.'],
  ['Other user-observed accessibility problems', 'Review the recorded observations with a packaging accessibility specialist.'],
] as const;
export type AuditState = 'Not assessed' | 'Not observed' | 'Issue found';
export type Audit = { id: string; title: string; at: string; states: AuditState[]; notes: string; image: string; imageName: string };
export type Composition = { id: string; name: string; ingredients: string; strength: string; form: string; brand: string; price: string; currency: string; basis: string; source: string; verification: string; evidence: string; at: string };
export type Comparison = { id: string; at: string; records: Composition[]; notes: string };
export type ProductRecords = { checks: InformationCheck[]; timeline: TimelineEntry[]; audits: Audit[]; compositions: Composition[]; comparisons: Comparison[] };
export const emptyRecords = (): ProductRecords => ({ checks: [], timeline: [], audits: [], compositions: [], comparisons: [] });
export function upsert<T extends { id: string }>(rows: T[], row: T): T[] { return [row, ...rows.filter(r => r.id !== row.id)]; }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(k => typeof v[k] === 'string');
const dated = (v: Record<string, unknown>) => strings(v, ['id', 'at']) && Number.isFinite(Date.parse(v.at as string));
export function validScan(v: unknown): v is ScanSnapshot { return object(v) && dated(v) && strings(v, ['text', 'scenario']) && typeof v.edited === 'boolean'; }
export function validComposition(v: unknown): v is Composition {
  return object(v) && dated(v) && strings(v, ['name', 'ingredients', 'strength', 'form', 'brand', 'price', 'currency', 'basis', 'source', 'verification', 'evidence']) && ['Unverified', 'Confirmation recorded by user'].includes(v.verification as string) && (v.price === '' || validPrice(v.price as string)) && (v.verification === 'Unverified' || !!(v.evidence as string).trim());
}
export function recoverRecords(input: unknown): ProductRecords {
  const data = object(input) ? input : {};
  const list = <T,>(key: string, valid: (v: unknown) => v is T) => Array.isArray(data[key]) ? (data[key] as unknown[]).filter(valid) : [];
  return {
    checks: list('checks', (v): v is InformationCheck => object(v) && dated(v) && validScan(v.scan) && object(v.fields) && labelFields.every(k => { const f = (v.fields as Record<string, unknown>)[k]; return object(f) && strings(f, ['value', 'source', 'confirmation']) && ['Sample scenario', 'User entered', 'Unknown'].includes(f.source as string); })),
    timeline: list('timeline', (v): v is TimelineEntry => object(v) && dated(v) && strings(v, ['name', 'type', 'source', 'previous', 'updated', 'notes', 'association']) && eventTypes.includes(v.type as typeof eventTypes[number]) && eventSources.includes(v.source as typeof eventSources[number])),
    audits: list('audits', (v): v is Audit => object(v) && dated(v) && strings(v, ['title', 'notes', 'image', 'imageName']) && (v.image === '' || /^data:image\/(?:png|jpeg|webp);base64,/.test(v.image as string)) && Array.isArray(v.states) && v.states.length === auditItems.length && v.states.every(s => ['Not assessed', 'Not observed', 'Issue found'].includes(s))),
    compositions: list('compositions', validComposition),
    comparisons: list('comparisons', (v): v is Comparison => object(v) && dated(v) && typeof v.notes === 'string' && Array.isArray(v.records) && v.records.length >= 2 && v.records.every(validComposition)),
  };
}
function values(scan: ScanSnapshot): Record<LabelField, string> {
  const p = parseLabel(scan.text);
  // Only explicit composition text is evidence; a medicine name is never an ingredient assertion.
  const ingredients = scan.text.match(/^(?:active ingredients?|composition)[ \t]*:[ \t]*([^\r\n]*)/im)?.[1]?.trim() || '';
  return { 'Medicine name': p.name || '', Strength: p.strength || '', 'Active ingredients': /^(unknown|unclear|n\/a|missing)\b/i.test(ingredients) ? '' : ingredients, 'Expiry date': p.expiry?.display || '', Manufacturer: p.manufacturer || '', 'Batch number': p.batch || '' };
}
export function createCheck(scan: ScanSnapshot): InformationCheck {
  const current = values(scan);
  const sample = samples.find(s => s.id === scan.scenario);
  const original = sample ? values({ ...scan, text: sample.text }) : null;
  return { id: scan.id, scan: { ...scan }, at: new Date().toISOString(), fields: Object.fromEntries(labelFields.map(k => [k, { value: current[k], source: !current[k] ? 'Unknown' : original?.[k] === current[k] ? 'Sample scenario' : 'User entered', confirmation: '' }])) as InformationCheck['fields'] };
}
export function pharmacistQuestion(field: LabelField, value: string) {
  const prompts: Record<LabelField, string> = { 'Medicine name': 'Can you confirm the medicine name on the original packaging?', Strength: 'Can you confirm the strength of this medicine?', 'Active ingredients': 'Can you confirm the active ingredients?', 'Expiry date': 'Can you verify the expiry date on the original packaging?', Manufacturer: 'Can you confirm the manufacturer?', 'Batch number': 'Can you confirm the batch number on the original packaging?' };
  return prompts[field] + (value ? ` Recorded detail (unverified): ${value}.` : ' This detail is unknown.');
}
const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const knownText = (v: string) => { const text = normalize(v); return !text || /^(?:unknown|unverified|unclear|missing|not (?:known|available|recorded|sure)|n\/?a|none|\?+)$/.test(text) ? '' : text; };
const validPrice = (v: string) => /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()) && Number.isFinite(Number(v)) && Number(v) >= 0;
export function compareComposition(a: Composition, b: Composition) {
  const keys = ['ingredients', 'strength', 'form'] as const;
  const complete = keys.every(k => knownText(a[k]) && knownText(b[k]));
  const exact = complete && keys.every(k => normalize(a[k]) === normalize(b[k]));
  const potential = !!knownText(a.ingredients) && normalize(a.ingredients) === normalize(b.ingredients);
  const priceComparable = exact && !!knownText(a.currency) && normalize(a.currency) === normalize(b.currency) && !!knownText(a.basis) && normalize(a.basis) === normalize(b.basis) && validPrice(a.price) && validPrice(b.price);
  return { label: exact ? 'Exact user-entered match' : potential ? 'Potentially comparable records' : 'No established composition match', priceDifference: priceComparable ? Math.abs(Number(a.price) - Number(b.price)) : null };
}
