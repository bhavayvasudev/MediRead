import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Config } from './config.ts';
import { errorHandler, HttpError } from './errors.ts';
import { log } from './logger.ts';
import { demoRouter } from './routes/demo.ts';

export function createApp(config: Config, lifecycle = { shuttingDown: false }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    const start = performance.now();
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.on('finish', () => log('request', { requestId: res.locals.requestId, status: res.statusCode, durationMs: Math.round(performance.now() - start) }));
    next();
  });
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) callback(null, true);
    else callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This website is not allowed to connect.'));
  }, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'], maxAge: 600 }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mediread-api' }));
  app.get('/ready', (_req, res) => res.status(lifecycle.shuttingDown ? 503 : 200).json({ status: lifecycle.shuttingDown ? 'not_ready' : 'ready', dependencies: {} }));
  app.use((_req, _res, next) => lifecycle.shuttingDown ? next(new HttpError(503, 'SHUTTING_DOWN', 'Please try again shortly.')) : next());
  app.use(express.json({ limit: '16kb', strict: true }));
  app.use('/api/demo', demoRouter);
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'This API address was not found.')));
  app.use(errorHandler);
  return app;
}
