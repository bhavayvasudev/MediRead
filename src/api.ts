import { validScan } from './records';
import type { ScanRecord } from './store';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
// Empty configuration preserves the original offline demo. No images or user data are sent.
export const apiConfigured = Boolean(baseUrl);
export async function requestDemoScan(scenario: string, signal: AbortSignal): Promise<ScanRecord> {
  const response = await fetch(`${baseUrl}/api/demo/scans`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), credentials: 'omit',
  });
  if (!response.ok) throw new Error('We could not load the sample. Please try again.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('simulated' in data) || data.simulated !== true || !('record' in data) || !validScan(data.record) || data.record.scenario !== scenario || data.record.edited) {
    throw new Error('We could not read the sample. Please try again.');
  }
  return data.record;
}
