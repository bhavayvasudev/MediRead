import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { log } from './logger.ts';

try {
  const config = loadConfig();
  const lifecycle = { shuttingDown: false };
  const server = createApp(config, lifecycle).listen(config.port, config.host, () => log('listening', { port: config.port, environment: config.nodeEnv }));
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('error', () => { log('startup_failed', { code: 'LISTEN_FAILED' }); process.exitCode = 1; });
  function shutdown(signal: string) {
    if (lifecycle.shuttingDown) return;
    lifecycle.shuttingDown = true;
    log('shutdown_started', { signal });
    const timer = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
    timer.unref();
    server.close(() => { clearTimeout(timer); log('shutdown_complete'); process.exitCode = 0; });
    server.closeIdleConnections();
  }
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
} catch {
  log('startup_failed', { code: 'INVALID_ENV', message: 'Check NODE_ENV, HOST, PORT, and CORS_ORIGINS. See .env.example.' });
  process.exitCode = 1;
}
