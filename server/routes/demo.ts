import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { samples } from '../../src/medicine.ts';
import { HttpError } from '../errors.ts';

export const demoRouter = Router();
demoRouter.post('/scans', (req, res) => {
  if (!req.is('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Please send JSON.');
  const body: unknown = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('scenario' in body) || typeof body.scenario !== 'string') {
    throw new HttpError(400, 'INVALID_REQUEST', 'Choose one sample label. Only the scenario field is accepted.');
  }
  const sample = samples.find(s => s.id === body.scenario);
  if (!sample) throw new HttpError(400, 'INVALID_SCENARIO', 'Choose a readable, unclear, or expired sample.');
  res.status(201).json({ simulated: true, record: { id: randomUUID(), scenario: sample.id, text: sample.text, at: new Date().toISOString(), edited: false } });
});
