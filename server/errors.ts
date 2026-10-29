import type { ErrorRequestHandler } from 'express';
import { log } from './logger.ts';

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const oversized = error?.type === 'entity.too.large';
  const malformed = error?.type === 'entity.parse.failed';
  const unsupported = error?.status === 415;
  const status = error instanceof HttpError ? error.status : oversized ? 413 : malformed ? 400 : unsupported ? 415 : 500;
  const code = error instanceof HttpError ? error.code : oversized ? 'BODY_TOO_LARGE' : malformed ? 'INVALID_JSON' : unsupported ? 'UNSUPPORTED_ENCODING' : 'INTERNAL_ERROR';
  const message = error instanceof HttpError ? error.message : oversized ? 'This request is too large.' : malformed ? 'Please send valid JSON.' : unsupported ? 'Please send plain UTF-8 JSON.' : 'Something went wrong. Please try again.';
  if (status >= 500) log('request_error', { requestId: res.locals.requestId, code });
  res.status(status).json({ error: { code, message, requestId: res.locals.requestId } });
};
