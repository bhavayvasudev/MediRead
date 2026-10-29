import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { samples, parseLabel } from './medicine';
import { emptyRecords, recoverRecords, validScan } from './records';
import type { ProductRecords } from './records';

export const DATA_KEY = 'mediread.demo.v2';
export const SESSION_KEY = 'mediread.session.v2';
export const DISCLAIMER = 'MediRead is a demonstration prototype. Scan results are simulated and are not extracted from the uploaded image. Medicine names, label details, and expiry information must be verified against the original packaging. Consult a doctor or pharmacist for medical decisions.';
export type Preferences = { textSize: 'standard' | 'large' | 'extra'; contrast: boolean; motion: boolean; language: 'en' | 'hi'; spoken: boolean; rate: number; startPage: '/dashboard' | '/scan' };
export type ScanRecord = { id: string; scenario: string; text: string; at: string; edited: boolean };
export type ScanDraft = { scenario: string; result: ScanRecord | null; text: string };
export type Account = ProductRecords & { id: string; name: string; email: string; salt: string; password: string; demo: boolean; preferences: Preferences; history: ScanRecord[]; saved: ScanRecord[]; draft: ScanDraft };
export const defaults: Preferences = { textSize: 'standard', contrast: false, motion: false, language: 'en', spoken: true, rate: 0.9, startPage: '/dashboard' };
export const emptyDraft: ScanDraft = { scenario: 'readable', result: null, text: '' };
const safeRead = (storage: 'localStorage' | 'sessionStorage', key: string) => { try { return window[storage].getItem(key); } catch { return null; } };
function readAccounts(): { accounts: Account[]; warning: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
    if (!Array.isArray(raw)) return { accounts: [], warning: 'Saved demo data had an invalid format and could not be restored. A fresh local workspace is available.' };
    const accounts = raw.filter((a: Account) => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.email === 'string' && typeof a.password === 'string' && typeof a.salt === 'string' && Array.isArray(a.history) && Array.isArray(a.saved)).map((a: Account) => ({ ...a, ...recoverRecords(a), preferences: recoverPreferences(a.preferences), draft: a.draft && samples.some(s => s.id === a.draft.scenario) && typeof a.draft.text === 'string' ? { ...a.draft, result: validScan(a.draft.result) ? a.draft.result : null } : { ...emptyDraft }, history: a.history.filter(validRecord), saved: a.saved.filter(validRecord) }));
    const keys = ['history', 'saved', 'checks', 'timeline', 'audits', 'compositions', 'comparisons'] as const;
    const skipped = accounts.length !== raw.length || accounts.some(a => { const original = raw.find(r => r?.id === a.id); return keys.some(k => original?.[k] !== undefined && (!Array.isArray(original[k]) || original[k].length !== a[k].length)); });
    return { accounts, warning: skipped ? 'Some invalid local records were skipped while restoring your workspace. Valid records remain available.' : '' };
  } catch { return { accounts: [], warning: 'Saved demo data could not be read. You can use a fresh local workspace; browser storage may be unavailable or malformed.' }; }
}
function validRecord(r: ScanRecord) { return validScan(r); }
function recoverPreferences(input: Partial<Preferences> = {}): Preferences {
  const p = input && typeof input === 'object' ? input : {};
  return { textSize: ['standard', 'large', 'extra'].includes(p.textSize || '') ? p.textSize! : defaults.textSize, contrast: p.contrast === true, motion: p.motion === true, language: p.language === 'hi' ? 'hi' : 'en', spoken: typeof p.spoken === 'boolean' ? p.spoken : true, rate: typeof p.rate === 'number' && p.rate >= .5 && p.rate <= 1.5 ? p.rate : defaults.rate, startPage: p.startPage === '/scan' ? '/scan' : '/dashboard' };
}
export function newRecord(scenario: string): ScanRecord {
  const sample = samples.find(s => s.id === scenario) || samples[0];
  return { id: crypto.randomUUID(), scenario: sample.id, text: sample.text, at: new Date().toISOString(), edited: false };
}
export function recordMedicine(r: ScanRecord) { return parseLabel(r.text); }
export function recordStatus(r: ScanRecord) {
  const expiry = recordMedicine(r).expiry;
  return !expiry || expiry.status === 'unverified' ? 'unverified' : expiry.status === 'expired' ? 'expired' : 'in-date';
}
export function validatePassword(password: string) { return password.length >= 8 && /[a-z]/i.test(password) && /[0-9]/.test(password); }
export function validEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}
type Store = {
  user: Account | null; toast: string; storageError: string; preview: string; imageName: string;
  notify: (message: string) => void; setPreview: (src: string, name?: string) => void;
  updateUser: (change: (account: Account) => Account) => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string, remember: boolean) => Promise<'/dashboard' | '/scan'>;
  resetPassword: (email: string, password: string) => Promise<void>;
  demoLogin: () => void; logout: () => void; clearAll: () => void;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [loaded] = useState(readAccounts);
  const [accounts, setAccounts] = useState<Account[]>(loaded.accounts);
  const [recoveryWarning, setRecoveryWarning] = useState(loaded.warning);
  const [id, setId] = useState(() => safeRead('sessionStorage', SESSION_KEY) || safeRead('localStorage', SESSION_KEY));
  const [toast, notify] = useState('');
  const [storageError, setStorageError] = useState('');
  const [preview, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const user = accounts.find(a => a.id === id) || null;
  useEffect(() => {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(accounts)); setStorageError(''); }
    catch { setStorageError('Browser storage is unavailable or full. Changes work for this session but may not survive a refresh.'); }
  }, [accounts]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => notify(''), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const prefs = user?.preferences || defaults;
    const root = document.documentElement;
    root.dataset.textSize = prefs.textSize;
    root.classList.toggle('high-contrast', prefs.contrast);
    root.classList.toggle('reduced-motion', prefs.motion);
    root.lang = 'en';
    root.dataset.resultLanguage = prefs.language;
  }, [user?.preferences]);
  function startSession(accountId: string, remember = false) {
    setImage(''); setImageName('');
    try {
      localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, accountId);
    } catch { setStorageError('This browser could not remember the session.'); }
    setId(accountId);
  }
  function updateUser(change: (account: Account) => Account) { setAccounts(current => current.map(a => a.id === id ? change(a) : a)); }
  function logout() {
    window.speechSynthesis?.cancel(); setId(null); setImage(''); setImageName('');
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* in-memory signout still works */ }
  }
  const value: Store = {
    user, toast, storageError: storageError || recoveryWarning, preview, imageName, notify,
    setPreview: (src, name = '') => { setImage(src); setImageName(name); }, updateUser,
    signup: async (name, email, password) => {
      const normalized = email.trim().toLowerCase();
      if (!name.trim() || !validEmail(normalized) || !validatePassword(password)) throw new Error('Enter a name, valid email, and a password with at least 8 characters, a letter, and a number.');
      if (accounts.some(a => a.email === normalized)) throw new Error('A local account with this email already exists. Please log in.');
      const salt = crypto.randomUUID();
      const account: Account = { ...emptyRecords(), id: crypto.randomUUID(), name: name.trim(), email: normalized, password: await hashPassword(password, salt), salt, demo: false, preferences: { ...defaults }, history: [], saved: [], draft: { ...emptyDraft } };
      setAccounts(all => [...all, account]); startSession(account.id); notify('Your local demo account is ready. Welcome to MediRead.');
    },
    login: async (email, password, remember) => {
      const account = accounts.find(a => a.email === email.trim().toLowerCase() && !a.demo);
      if (!account || await hashPassword(password, account.salt) !== account.password) throw new Error('Email or password does not match a local account in this browser.');
      startSession(account.id, remember); notify('Welcome back.');
      return account.preferences.startPage;
    },
    resetPassword: async (email, password) => {
      const account = accounts.find(a => a.email === email.trim().toLowerCase() && !a.demo);
      if (!account) throw new Error('No local account found for this email. Create an account or continue with the demo.');
      if (!validatePassword(password)) throw new Error('Use at least 8 characters, including a letter and a number.');
      const salt = crypto.randomUUID(); const hash = await hashPassword(password, salt);
      setAccounts(all => all.map(a => a.id === account.id ? { ...a, salt, password: hash } : a));
      notify('Local demo password reset. No email was sent. You can now log in.');
    },
    demoLogin: () => {
      let account = accounts.find(a => a.demo);
      if (!account) {
        account = { ...emptyRecords(), id: 'mediread-judge-demo', name: 'Demo Reader', email: 'reader@mediread.demo', salt: '', password: '', demo: true, preferences: { ...defaults }, history: [], saved: [], draft: { ...emptyDraft } };
        setAccounts(all => [...all, account!]);
      }
      startSession(account.id); notify('Demo workspace opened. All sample records are simulated.');
    },
    logout,
    clearAll: () => {
      logout(); setAccounts([]); setRecoveryWarning('');
      try { localStorage.removeItem(DATA_KEY); localStorage.removeItem('mediread-recent-v1'); } catch { /* surfaced by storage persistence */ }
      notify('All MediRead local demo accounts, records, and preferences were cleared from this browser.');
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('MediRead provider missing'); return value; }
