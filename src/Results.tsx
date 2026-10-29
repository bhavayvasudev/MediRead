import { useEffect, useRef, useState } from 'react';
import { Bookmark, Check, History, RotateCcw, Square, TriangleAlert, Volume2 } from 'lucide-react';
import { recordMedicine, useStore } from './store';
import type { ScanRecord } from './store';
import { Badge, Safety, Status } from './ui';
import { navigate } from './router';
import { createCheck, upsert } from './records';

export function describeRecord(record: ScanRecord, language: 'en' | 'hi') {
  const medicine = recordMedicine(record);
  if (language === 'hi') return [
    'यह एक सिम्युलेटेड डेमो परिणाम है। अपलोड की गई तस्वीर से जानकारी नहीं निकाली गई है।',
    medicine.name ? `नमूने में दवा का नाम ${medicine.name} है।` : 'दवा का नाम स्पष्ट नहीं है। अनुमान न लगाएँ।',
    medicine.strength ? `नमूने में लिखी ताकत ${medicine.strength} है। यह खुराक लेने की सलाह नहीं है।` : 'ताकत उपलब्ध नहीं है।',
    medicine.manufacturer ? `नमूना निर्माता: ${medicine.manufacturer}।` : '',
    medicine.batch ? `नमूना बैच नंबर: ${medicine.batch}।` : '',
    medicine.expiry?.status === 'expired' ? `नमूने की समाप्ति तिथि ${medicine.expiry.display} बीत चुकी है।` : medicine.expiry?.status === 'future' ? `नमूने की समाप्ति तिथि ${medicine.expiry.display} अभी नहीं बीती है। इससे दवा की सुरक्षा की पुष्टि नहीं होती।` : 'समाप्ति तिथि की पुष्टि नहीं हुई है।',
    'मूल पैकेजिंग पर सभी विवरण जाँचें। चिकित्सा निर्णयों के लिए डॉक्टर या फार्मासिस्ट से सलाह लें।',
  ].filter(Boolean).join(' ');
  return [
    'This is a simulated demo result. No information was extracted from your image.',
    medicine.name ? `The sample names ${medicine.name}.` : 'The medicine name is unclear. Do not guess its identity.',
    medicine.strength ? `The sample strength is ${medicine.strength}. Strength describes the label; it is not a dose recommendation.` : 'No reliable strength is available.',
    medicine.manufacturer ? `Sample manufacturer: ${medicine.manufacturer}.` : '',
    medicine.batch ? `Sample batch: ${medicine.batch}.` : '',
    medicine.expiry?.status === 'expired' ? `The sample expiry date, ${medicine.expiry.display}, has passed.` : medicine.expiry?.status === 'future' ? `The sample expiry date, ${medicine.expiry.display}, has not passed. This does not confirm medicine safety.` : 'The expiry date cannot be verified.',
    'Verify all details on the original packaging. Consult a doctor or pharmacist for medical decisions.',
  ].filter(Boolean).join(' ');
}
export function Speech({ record }: { record: ScanRecord }) {
  const { user, updateUser } = useStore(); const prefs = user!.preferences;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false); const [message, setMessage] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const generation = useRef(0);
  const supported = 'speechSynthesis' in window;
  const voice = voices.find(v => v.lang.toLowerCase().startsWith(prefs.language));
  const text = describeRecord(record, prefs.language);
  function stop() { generation.current++; window.speechSynthesis?.cancel(); utterance.current = null; setSpeaking(false); }
  useEffect(() => {
    if (!supported) return;
    const update = () => setVoices(window.speechSynthesis.getVoices()); update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', update); window.speechSynthesis.cancel(); generation.current++; };
  }, [supported]);
  useEffect(() => { generation.current++; window.speechSynthesis?.cancel(); setSpeaking(false); setMessage(''); }, [text, prefs.rate, prefs.spoken]);
  function play() {
    stop();
    if (!supported) { setMessage('Speech is not supported in this browser. The complete explanation is available above.'); return; }
    if (prefs.language === 'hi' && !voice) { setMessage('No Hindi voice is installed. Add a Hindi speech voice in your device language settings and restart the browser. The Hindi text is available above.'); return; }
    const current = generation.current;
    const audio = new SpeechSynthesisUtterance(text); utterance.current = audio;
    audio.lang = prefs.language === 'hi' ? 'hi-IN' : 'en-IN'; audio.rate = prefs.rate;
    if (voice) audio.voice = voice;
    audio.onstart = () => { if (current === generation.current) setSpeaking(true); };
    audio.onend = () => { if (current === generation.current) { setSpeaking(false); setMessage('Playback finished. Choose Replay to hear it again.'); } };
    audio.onerror = event => { if (current === generation.current) { setSpeaking(false); setMessage(event.error === 'not-allowed' ? 'Your browser blocked audio. Check site audio permissions and try Listen again.' : 'Speech could not play. Check your installed voices and device audio.'); } };
    setMessage('Starting spoken output…'); window.speechSynthesis.speak(audio);
  }
  return <div className="speech-box"><div className="split"><div className="inline"><Volume2 size={19} /><strong>{prefs.language === 'hi' ? 'अपनी गति से सुनें' : 'Listen at your pace'}</strong></div><label className="sr-only" htmlFor={`speech-language-${record.id}`}>Result language</label><select id={`speech-language-${record.id}`} value={prefs.language} onChange={e => { stop(); updateUser(a => ({ ...a, preferences: { ...a.preferences, language: e.target.value as 'en' | 'hi' } })); }}><option value="en">English</option><option value="hi">हिंदी</option></select></div><p className="explanation" lang={prefs.language}>{text}</p><div className="actions"><button className="btn primary" onClick={play} disabled={!prefs.spoken || speaking}><Volume2 size={17} />{prefs.language === 'hi' ? 'सुनें' : 'Listen'}</button><button className="btn secondary" disabled={!speaking} onClick={() => { stop(); setMessage('Playback stopped.'); }}><Square size={15} />Stop</button><button className="btn quiet" onClick={play} disabled={!prefs.spoken}><RotateCcw size={16} />Replay</button></div><p className="micro" role="status">{!prefs.spoken ? 'Spoken output is off. Enable it in Accessibility.' : !supported ? 'Browser speech unavailable. Read the explanation above.' : message || `${prefs.language === 'hi' ? voice ? 'Hindi voice available' : 'Hindi voice not installed' : 'Browser text-to-speech'} · ${prefs.rate}× speed`}</p></div>;
}
export function Results({ record, editable = false, text = record.text, onText, onApply }: { record: ScanRecord; editable?: boolean; text?: string; onText?: (text: string) => void; onApply?: () => void }) {
  const { user, updateUser, notify } = useStore(); const medicine = recordMedicine(record);
  const inHistory = user!.history.some(r => r.id === record.id && r.text === record.text);
  const inSaved = user!.saved.some(r => r.id === record.id && r.text === record.text);
  const dirty = text !== record.text;
  function save(collection: 'history' | 'saved') {
    updateUser(a => ({ ...a, [collection]: [record, ...a[collection].filter(r => r.id !== record.id)] }));
    notify(collection === 'history' ? 'Simulated result saved to scan history.' : 'Medicine added to your saved collection.');
  }
  function informationCheck() {
    updateUser(a => {
      const existing = a.checks.find(c => c.id === record.id && c.scan.text === record.text);
      return { ...a, history: upsert(a.history, record), checks: upsert(a.checks, existing || createCheck(record)) };
    });
    navigate(`/information-check?scan=${record.id}`);
    notify('Scan snapshot and information checklist saved. All details require confirmation.');
  }
  return <div className="result-content"><div className="split"><Badge tone="demo">Simulated demo result</Badge><Status record={record} /></div><div className="result-title"><span className="eyebrow">{record.edited ? 'User-edited sample text' : 'Predefined sample label'}</span><h2>{medicine.name || 'Medicine not identified'} {medicine.strength && <span>{medicine.strength}</span>}</h2><p className="muted">{record.edited ? 'Based on your edits to the sample text.' : 'This information comes from the chosen demo scenario.'}</p></div><dl className="medicine-facts"><div><dt>Manufacturer</dt><dd>{medicine.manufacturer || 'Not available'}</dd></div><div><dt>Batch number</dt><dd>{medicine.batch || 'Not available'}</dd></div><div><dt>Sample expiry</dt><dd>{medicine.expiry?.display || 'Not available'}</dd></div><div><dt>Source</dt><dd>{record.edited ? 'Edited demo text' : 'Simulated sample'}</dd></div></dl><div className={`notice ${record.scenario === 'unclear' ? 'warning' : ''}`}><TriangleAlert size={18} /><p><strong>{record.scenario === 'unclear' ? 'Unclear sample · verification required.' : 'Verify before relying on any detail.'}</strong> {record.scenario === 'unclear' ? 'The sample is unreadable. Missing information remains unknown. Ask a pharmacist to read the original label.' : 'No uploaded image has been analyzed. Dates and fields belong to the demo sample, and do not confirm medicine safety.'}</p></div><div className="field"><label htmlFor={`extracted-${record.id}`}>Sample extracted text {record.edited && <Badge>Edited</Badge>}</label><textarea id={`extracted-${record.id}`} rows={6} value={text} readOnly={!editable} maxLength={12000} onChange={e => onText?.(e.target.value)} /><p className="micro">{editable ? 'Editable demo text. Apply changes to update the explanation; this does not perform OCR.' : 'Saved snapshot of simulated label text.'}</p>{editable && dirty && <button className="btn secondary" onClick={onApply} disabled={!text.trim()}>Apply text edits</button>}</div><Speech record={record} /><div className="actions product-intro"><button className="btn primary" disabled={dirty} onClick={informationCheck}>Information Check &amp; pharmacist questions</button></div><div className="actions"><button className="btn secondary" onClick={() => save('history')} disabled={inHistory || dirty}>{inHistory ? <Check size={17} /> : <History size={17} />}{inHistory ? 'Saved to history' : 'Save to History'}</button><button className="btn secondary" onClick={() => save('saved')} disabled={inSaved || dirty}>{inSaved ? <Check size={17} /> : <Bookmark size={17} />}{inSaved ? 'Medicine saved' : 'Save Medicine'}</button></div>{dirty && <p className="micro">Apply your text edits before saving.</p>}<Safety /></div>;
}
