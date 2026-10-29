// Allowlisted metadata only: never log bodies, headers, query strings, or secrets.
export function log(event: string, fields: Record<string, string | number | boolean> = {}) {
  process.stdout.write(JSON.stringify({ time: new Date().toISOString(), event, ...fields }) + '\n');
}
