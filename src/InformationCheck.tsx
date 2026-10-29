import { useState } from 'react';
import { ClipboardCheck, Copy } from 'lucide-react';
import { Link, useSearch } from './router';
import { useStore } from './store';
import { labelFields, pharmacistQuestion, upsert } from './records';
import type { FieldEvidence, InformationCheck as CheckRecord, LabelField } from './records';
import { Badge, Confirm, Heading } from './ui';
import { AssociationLink, Blank, Field } from './ProductUI';

export default function InformationCheck() {
  const { user, updateUser, notify } = useStore();
  const search = useSearch(); const requested = new URLSearchParams(search).get('scan');
  const checks = user!.checks;
  const selected = checks.find(c => c.id === requested);
  const [remove, setRemove] = useState(false);
  function save(record: CheckRecord) { updateUser(a => ({ ...a, checks: upsert(a.checks, record) })); }
  function change(field: LabelField, patch: Partial<FieldEvidence>) { if (selected) save({ ...selected, fields: { ...selected.fields, [field]: { ...selected.fields[field], ...patch } } }); }
  const pending = selected ? labelFields.filter(k => !selected.fields[k].confirmation.trim()) : [];
  async function copy() {
    try { await navigator.clipboard.writeText(pending.map(k => pharmacistQuestion(k, selected!.fields[k].value)).join('\n')); notify('Unresolved pharmacist questions copied.'); }
    catch { notify('Clipboard unavailable. Select and copy the questions below.'); }
  }
  return <><Heading title="Information Check" description="Keep unknown details visible. Prepare questions to ask a pharmacist about the original packaging." action={<Link href="/scan" className="btn primary"><ClipboardCheck size={18} />Start from a scan</Link>} />
    <div className="notice"><p>Sample details and your entries are unverified. A resolution means you explicitly recorded confirmation from a pharmacist; MediRead does not contact or verify professionals.</p></div>
    {!selected ? <section className="panel product-section">{requested && <p className="error" role="alert">This information check is unavailable. Choose another saved check.</p>}{!checks.length ? <Blank title="A question is a useful next step">Run a simulated scan, apply any text edits, then choose Information Check on the result. The scan snapshot and field checklist will be saved here.</Blank> : <><h2>Your saved checks</h2><div className="record-list">{checks.map(c => <Link key={c.id} href={`/information-check?scan=${c.id}`} className="record-summary"><span><strong>{c.fields['Medicine name'].value || 'Unknown medicine'}</strong><small>{new Date(c.at).toLocaleString()} · {labelFields.filter(k => !c.fields[k].confirmation.trim()).length} unresolved questions</small></span><span>Review →</span></Link>)}</div></>}</section> : <>
      <div className="product-toolbar"><Link href="/information-check" className="text-link">← All checks</Link><AssociationLink id={selected.scan.id} /><button className="text-button danger-text" onClick={() => setRemove(true)}>Delete check</button></div>
      <div className="product-two-col"><section className="panel product-section"><h2>Label field checklist</h2><p className="muted">Saved snapshot: {new Date(selected.at).toLocaleString()}. Edits save automatically. Changing a detail clears its confirmation.</p>{labelFields.map(k => { const field = selected.fields[k]; return <div className="evidence-field" key={k}><Field label={k} value={field.value} onChange={value => change(k, { value, source: value.trim() ? 'User entered' : 'Unknown', confirmation: '' })} /><div className="actions"><Badge tone={field.source === 'Unknown' ? 'warning' : 'demo'}>{field.source}</Badge><Badge tone={field.confirmation.trim() ? 'success' : 'warning'}>{field.confirmation.trim() ? 'Confirmation recorded by user' : field.value.trim() ? 'Unverified' : 'Missing'}</Badge></div></div>; })}<details className="snapshot"><summary>Original scan snapshot</summary><pre>{selected.scan.text}</pre></details></section>
      <section className="panel product-section question-panel"><div className="split"><h2>Questions for your pharmacist</h2><button className="btn secondary compact" onClick={() => void copy()} disabled={!pending.length}><Copy size={16} />Copy questions</button></div><p className="muted">{pending.length} missing or unverified fields. Record what the pharmacist confirmed to resolve each question.</p>{labelFields.map(k => { const f = selected.fields[k]; return <Question key={`${selected.id}-${k}`} field={k} evidence={f} onResolve={confirmation => change(k, { confirmation })} />; })}</section></div>
    </>}{remove && selected && <Confirm title="Delete this information check?" description="The checklist and recorded confirmations will be removed. The associated scan remains in history." onClose={() => setRemove(false)} onConfirm={() => { updateUser(a => ({ ...a, checks: a.checks.filter(c => c.id !== selected.id) })); notify('Information check removed.'); }} />}</>;
}
function Question({ field, evidence, onResolve }: { field: LabelField; evidence: FieldEvidence; onResolve: (v: string) => void }) {
  const [note, setNote] = useState('');
  return <div className="question-item">{evidence.confirmation.trim() ? <><Badge tone="success">Resolved · user-recorded confirmation</Badge><h3>{field}</h3><p className="muted">{evidence.confirmation}</p><button className="text-button" onClick={() => onResolve('')}>Reopen question</button></> : <><h3>{pharmacistQuestion(field, evidence.value)}</h3><Field label={`Pharmacist confirmation for ${field.toLowerCase()}`} value={note} onChange={setNote} multiline /><p className="micro">Record the confirmed detail, who confirmed it, and when. Enter the confirmed detail in the field checklist first. Only mark resolved after you have obtained confirmation.</p><button className="btn secondary compact" disabled={!note.trim() || !evidence.value.trim()} onClick={() => { onResolve(note.trim()); setNote(''); }}>I obtained confirmation · mark resolved</button></>}</div>;
}
