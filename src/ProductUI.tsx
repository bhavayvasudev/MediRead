import { useId } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Link } from './router';
import { useStore, recordMedicine } from './store';

export function Field({ label, value, onChange, required = false, type = 'text', multiline = false, children, maxLength = 2000 }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; multiline?: boolean; children?: ReactNode; maxLength?: number }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}{required ? ' *' : ''}</label>{children ? <select id={id} value={value} onChange={e => onChange(e.target.value)} required={required}>{children}</select> : multiline ? <textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={maxLength} required={required} /> : <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} required={required} maxLength={maxLength} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} />}</div>;
}
export function Association({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { user } = useStore();
  const records = [...new Map([...user!.history, ...user!.saved].map(r => [r.id, r])).values()];
  return <Field label="Associated scan or saved medicine (optional)" value={value} onChange={onChange}><option value="">No association</option>{value && !records.some(r => r.id === value) && <option value={value}>Previously linked record (removed)</option>}{records.map(r => <option key={r.id} value={r.id}>{recordMedicine(r).name || 'Unclear sample'} — {new Date(r.at).toLocaleString()} · {r.id.slice(0, 8)}</option>)}</Field>;
}
export function AssociationLink({ id }: { id: string }) {
  const { user } = useStore();
  if (!id) return null;
  const collection = user!.history.some(r => r.id === id) ? 'history' : user!.saved.some(r => r.id === id) ? 'saved' : '';
  return collection ? <Link className="text-link" href={`/${collection}?record=${id}`}>View associated scan →</Link> : <p className="micro">The associated scan was removed from its collections.</p>;
}
export function NewButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="btn primary" onClick={onClick}><Plus size={17} />{children}</button>; }
export function Blank({ title, children }: { title: string; children: ReactNode }) { return <div className="product-blank"><h2>{title}</h2><p className="muted">{children}</p></div>; }
export const localDateTime = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export const toLocalDateTime = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
