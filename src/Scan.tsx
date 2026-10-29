import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, LoaderCircle, LockKeyhole, RotateCcw, ScanLine, ShieldCheck, Type, Upload, Volume2, X } from 'lucide-react';
import { samples } from './medicine';
import { emptyDraft, newRecord, useStore } from './store';
import { Badge, Heading, LabelIllustration } from './ui';
import { Results } from './Results';

export default function Scan() {
  const { user, updateUser, preview, imageName, setPreview, notify } = useStore();
  const draft = user!.draft;
  const [busy, setBusy] = useState(false); const [dragging, setDragging] = useState(false); const [error, setError] = useState('');
  const [camera, setCamera] = useState(false); const [cameraBusy, setCameraBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null); const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const mounted = useRef(true); const cameraRun = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cameraRun.current++; stream.current?.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) closeCamera(); }; document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => { if (camera && video.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => setError('Camera preview failed. Please browse for a photo.')); } }, [camera]);
  function setDraft(change: Partial<typeof draft>) { updateUser(a => ({ ...a, draft: { ...a.draft, ...change } })); }
  function closeCamera() { cameraRun.current++; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); setCameraBusy(false); }
  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera capture is unavailable here. Use Browse Files or a sample scenario. Camera access needs localhost or HTTPS.'); return; }
    const run = ++cameraRun.current; setCameraBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!mounted.current || run !== cameraRun.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; setCamera(true);
    } catch { if (mounted.current && run === cameraRun.current) setError('Camera unavailable or permission denied. You can upload a photo or use a sample instead.'); }
    finally { if (mounted.current && run === cameraRun.current) setCameraBusy(false); }
  }
  function capture() {
    if (!video.current?.videoWidth) { setError('The camera is not ready yet. Please try again.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    canvas.getContext('2d')?.drawImage(video.current, 0, 0); setPreview(canvas.toDataURL('image/jpeg', 0.85), 'Camera capture'); closeCamera();
    notify('Photo captured locally. Scan results will still use the selected simulated scenario.');
  }
  async function upload(file?: File) {
    if (!file) return; setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please choose a JPG, JPEG, PNG, or WebP image.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return; }
    try {
      const bitmap = await createImageBitmap(file); bitmap.close();
      const reader = new FileReader();
      reader.onload = () => { if (mounted.current) { closeCamera(); setPreview(String(reader.result), file.name); } };
      reader.onerror = () => { if (mounted.current) setError('This image could not be opened. Try another file.'); };
      reader.readAsDataURL(file);
    } catch { setError('This image could not be opened. Choose a valid image file.'); }
  }
  function scan() {
    closeCamera(); setBusy(true); setError('');
    timer.current = setTimeout(() => {
      const record = newRecord(draft.scenario);
      setDraft({ result: record, text: record.text }); setBusy(false); notify('Simulated demo result ready. No image analysis was performed.');
      requestAnimationFrame(() => { resultRef.current?.focus(); if (window.innerWidth < 1000) resultRef.current?.scrollIntoView({ block: 'start' }); });
    }, 1100);
  }
  function reset() { if (timer.current) clearTimeout(timer.current); closeCamera(); setBusy(false); setError(''); setPreview(''); setDraft({ ...emptyDraft }); window.speechSynthesis?.cancel(); if (input.current) input.current.value = ''; }
  return <><Heading eyebrow="YOUR LABEL, AT YOUR PACE" title="Scan a medicine" description="A little help with the small print. Try a clearly labeled sample to explore MediRead." action={<button className="btn secondary" onClick={reset}><RotateCcw size={17} />Clear Scan</button>} /><div className="journey">{[{ icon: ScanLine, label: 'Scan' }, { icon: Type, label: 'Read' }, { icon: ShieldCheck, label: 'Explain' }, { icon: Volume2, label: 'Listen' }].map((step, i) => <div className={`journey-step ${draft.result || i === 0 ? 'active' : ''}`} key={step.label}><span className="step-icon">{draft.result && i < 3 ? <Check size={16} /> : <step.icon size={17} />}</span>{step.label}{i < 3 && <span className="step-arrow">→</span>}</div>)}<span className="journey-note"><LockKeyhole size={14} />Photos stay on this device</span></div><div className="scan-layout"><section className={`panel scan-input ${busy ? 'is-scanning' : ''}`}><div className="panel-heading"><div><h2>Start with your label</h2><p>Upload a photo, or try a sample without one.</p></div><Badge>01</Badge></div><div className="input-tabs"><button className={!camera ? 'selected' : ''} onClick={() => { closeCamera(); input.current?.click(); }} disabled={busy}><Upload size={17} />Upload photo</button><button className={camera ? 'selected' : ''} onClick={() => void openCamera()} disabled={busy || cameraBusy}>{cameraBusy ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />}Camera</button></div><input ref={input} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" aria-label="Upload medicine label image" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />{camera ? <div className="camera-box"><video ref={video} autoPlay playsInline muted aria-label="Live camera preview" /><div className="actions"><button className="btn primary" onClick={capture}><Camera size={17} />Capture photo</button><button className="btn secondary" onClick={closeCamera}>Close camera</button></div></div> : <div className={`drop-zone ${dragging ? 'dragging' : ''} ${preview ? 'with-preview' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) void upload(e.dataTransfer.files[0]); }}>{preview ? <><img className="image-preview" src={preview} alt="Your uploaded medicine label; preview only, not analyzed" /><div className="preview-caption"><span>{imageName}</span><button className="icon-button" aria-label="Remove image" disabled={busy} onClick={() => setPreview('')}><X size={17} /></button></div><button className="btn secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={17} />Replace image</button></> : <><div className="scan-art"><span className="scan-corners" /><LabelIllustration /></div><h3>Bring the label into focus</h3><p>Drag a photo here, or choose one from your device.</p><button className="btn secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={17} />Browse Files</button><span className="micro">JPG, PNG, WebP · Up to 10 MB</span></>}</div>}{error && <p className="error" role="alert">{error}</p>}<div className="scenario-block"><div className="split"><h3>Choose a demo scenario</h3><Badge tone="demo">OCR simulated</Badge></div><p className="muted">Your photo is a preview only. Results always come from the selected sample below.</p><div className="scenario-list" role="radiogroup" aria-label="Demo scenario">{samples.map(s => <label className={`scenario ${draft.scenario === s.id ? 'selected' : ''}`} key={s.id}><input type="radio" name="scenario" value={s.id} checked={draft.scenario === s.id} disabled={busy} onChange={() => setDraft({ scenario: s.id })} /><span><strong>{s.id === 'expired' ? 'Expired sample' : s.title}</strong><small>{s.id === 'readable' ? 'Complete label · Paracetamol 500 mg' : s.id === 'expired' ? 'Past sample date · Cetirizine 10 mg' : 'Unclear sample · Missing details'}</small></span></label>)}</div></div><button className="btn primary full" disabled={busy} onClick={scan}>{busy ? <LoaderCircle className="spin" size={19} /> : <ScanLine size={19} />}{busy ? 'Preparing simulated result…' : 'Scan Medicine'}</button><p className="micro centered" role="status">{busy ? 'Loading predefined scenario. No image is being analyzed.' : 'No photo required to try the demo.'}</p></section><section className="panel results-panel" aria-label="Scan result" aria-busy={busy} ref={resultRef} tabIndex={-1}><div className="panel-heading"><div><h2>Your label, made clear</h2><p>Read. Understand. Listen.</p></div><Badge>02</Badge></div>{busy ? <div className="result-placeholder" role="status"><div className="scan-loading"><ScanLine size={44} /></div><h2>Bringing the sample into focus</h2><p>Preparing your selected demonstration data.</p><span className="progress-track"><span /></span><Badge tone="demo">Demo mode — OCR simulated</Badge></div> : draft.result ? <Results record={draft.result} editable text={draft.text} onText={text => setDraft({ text })} onApply={() => { if (draft.text.trim()) { setDraft({ result: { ...draft.result!, text: draft.text.trim(), edited: true }, text: draft.text.trim() }); notify('Explanation updated from your edited sample text.'); } }} /> : <div className="result-placeholder"><div className="sound-mark" aria-hidden="true">{[16, 30, 46, 25, 60, 40, 23, 48, 34, 16].map((h, i) => <i key={i} style={{ height: h }} />)}</div><h2>Small print. Made clear.</h2><p>Your sample information will appear here.<br />Choose a scenario and select Scan Medicine.</p><div className="placeholder-steps"><span><Type size={18} />Readable information</span><span><ShieldCheck size={18} />Expiry awareness</span><span><Volume2 size={18} />English & Hindi speech</span></div><Badge tone="demo">Simulated results. Real accessibility.</Badge></div>}</section></div></>;
}
