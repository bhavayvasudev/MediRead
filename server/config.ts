export type Config = { port: number; host: string; nodeEnv: string; allowedOrigins: string[] };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production.');
  const port = env.PORT === undefined ? 3001 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const host = env.HOST ?? '0.0.0.0';
  if (!host.trim()) throw new Error('HOST must not be empty.');
  const allowedOrigins = (env.CORS_ORIGINS ?? (nodeEnv === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173')).split(',').map(s => s.trim()).filter(Boolean);
  if (nodeEnv === 'production' && !allowedOrigins.length) throw new Error('CORS_ORIGINS must list the allowed frontend origins in production.');
  for (const origin of allowedOrigins) {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error('CORS_ORIGINS contains an invalid origin.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || (nodeEnv === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
      throw new Error('CORS_ORIGINS must contain exact origins without paths, credentials, trailing slashes, or wildcards; production requires public HTTPS origins.');
    }
  }
  return { port, host, nodeEnv, allowedOrigins };
}
