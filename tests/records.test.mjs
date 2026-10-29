import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheck, labelFields, recoverRecords, compareComposition, pharmacistQuestion } from '../src/records.ts';
import { samples } from '../src/medicine.ts';
const scan = (scenario) => ({ id: 'scan-1', scenario: scenario.id, text: scenario.text, edited: false, at: '2026-10-29T08:00:00Z' });
const medicine = (patch = {}) => ({ id: 'a', name: 'User record', ingredients: 'Ingredient X', strength: '500 mg', form: 'tablet', brand: '', price: '', currency: 'INR', basis: '10 tablets', source: 'User transcribed package', verification: 'Unverified', evidence: '', at: '2026-10-29T08:00:00Z', ...patch });
test('check never infers ingredients from medicine name or preconfirms a sample', () => {
  const check = createCheck(scan(samples[0]));
  assert.equal(check.fields['Active ingredients'].value, '');
  assert.equal(check.fields['Active ingredients'].source, 'Unknown');
  assert.equal(check.fields['Medicine name'].source, 'Sample scenario');
  assert.ok(labelFields.every(k => !check.fields[k].confirmation));
});
test('field provenance preserves unchanged sample fields and identifies user changes', () => {
  const record = scan(samples[0]); record.text = record.text.replace('500 mg', '250 mg') + '\nActive ingredients: User-transcribed ingredient'; record.edited = true;
  const check = createCheck(record);
  assert.equal(check.fields.Strength.source, 'User entered');
  assert.equal(check.fields['Medicine name'].source, 'Sample scenario');
  assert.equal(check.fields['Active ingredients'].source, 'User entered');
  assert.match(pharmacistQuestion('Strength', '250 mg'), /unverified/);
});
test('unclear checks and placeholder compositions retain unknown information', () => {
  const record = scan(samples.find(s => s.id === 'unclear'));
  record.text += '\nComposition: Unknown';
  const check = createCheck(record);
  assert.equal(check.fields['Medicine name'].source, 'Unknown');
  assert.equal(check.fields['Active ingredients'].value, '');
  assert.equal(check.fields.Strength.value, '');
});
test('empty ingredient fields cannot consume another label line', () => {
  const record = scan(samples[0]);
  record.text += '\nActive ingredients:\nManufacturer: User-entered manufacturer';
  assert.equal(createCheck(record).fields['Active ingredients'].value, '');
});
test('brand names alone cannot establish a comparison or price difference', () => {
  const a = medicine({ ingredients: '', price: '5' });
  const b = medicine({ id: 'b', ingredients: '', price: '10' });
  assert.equal(compareComposition(a, b).label, 'No established composition match');
  assert.equal(compareComposition(a, b).priceDifference, null);
});
test('text matches need complete strength and form; no dose or unit equivalence inferred', () => {
  const a = medicine();
  assert.equal(compareComposition(a, medicine({ strength: '0.5 g' })).label, 'Potentially comparable records');
  assert.equal(compareComposition(a, medicine({ form: '' })).label, 'Potentially comparable records');
  assert.equal(compareComposition(a, medicine({ ingredients: ' ingredient   x ' })).label, 'Exact user-entered match');
});
test('price difference requires two supplied prices, identical basis, currency and all matching fields', () => {
  const a = medicine({ price: '40' }); const b = medicine({ id: 'b', price: '25' });
  assert.equal(compareComposition(a, b).priceDifference, 15);
  for (const patch of [{ price: '' }, { currency: 'USD' }, { basis: '20 tablets' }, { strength: '250 mg' }, { basis: '' }]) assert.equal(compareComposition(a, { ...b, ...patch }).priceDifference, null);
});
test('unknown placeholders and malformed prices never establish matching alternatives or savings', () => {
  const unknown = medicine({ ingredients: 'Unknown', strength: 'Unknown', form: 'Unknown', price: '20' });
  assert.equal(compareComposition(unknown, { ...unknown, id: 'b' }).label, 'No established composition match');
  for (const price of [' ', 'NaN', '-5', 'Infinity', '0x10']) assert.equal(compareComposition(medicine({ price: '40' }), medicine({ id: 'b', price })).priceDifference, null);
});
test('malformed and old stored product collections recover without trusting arbitrary data', () => {
  const data = recoverRecords({ checks: [null, { id: 'broken' }], timeline: 'bad', audits: [{ id: 'unsafe', at: 'invalid', image: 'javascript:alert(1)' }], compositions: [medicine(), medicine({ id: 'bad', price: '-5' })], comparisons: [{ id: 'broken', records: [] }] });
  assert.equal(data.compositions.length, 1);
  assert.deepEqual(data.timeline, []); assert.deepEqual(data.checks, []); assert.deepEqual(data.audits, []); assert.deepEqual(data.comparisons, []);
  assert.deepEqual(recoverRecords(null), { checks: [], timeline: [], audits: [], compositions: [], comparisons: [] });
});
