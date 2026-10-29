import test from "node:test";
import assert from "node:assert/strict";
import {
  parseExpiry,
  parseLabel,
  explanation,
  samples,
} from "../src/medicine.ts";
const now = new Date(2026, 9, 28);
test("complete sample reports only the printed fields", () => {
  const r = parseLabel(samples[0].text, now);
  assert.equal(r.name, "Paracetamol");
  assert.equal(r.strength, "500 mg");
  assert.equal(r.batch, "DEMO2401");
  assert.equal(r.manufacturer, "Example Pharma (sample manufacturer)");
  assert.equal(r.expiry.display, "August 2028");
  assert.equal(r.expiry.status, "future");
});
test("unclear sample never invents a medicine, strength, batch or manufacturer", () => {
  const r = parseLabel(samples[1].text, now);
  for (const field of ["name", "strength", "batch", "manufacturer"])
    assert.equal(r[field], undefined);
  assert.equal(r.expiry.status, "unverified");
  assert.match(explanation(r, "en"), /could not be confidently identified/);
  assert.match(explanation(r, "hi"), /पहचाना नहीं जा सका/);
});
test("past sample date is expired", () =>
  assert.equal(parseLabel(samples[2].text, now).expiry.status, "expired"));
test("a month/year date stays current through the last day of its month", () => {
  assert.equal(
    parseExpiry("EXP: 10/2026", new Date(2026, 9, 31, 23, 59, 59)).status,
    "future",
  );
  assert.equal(
    parseExpiry("EXP: 10/2026", new Date(2026, 10, 1)).status,
    "expired",
  );
});
test("manufacturing dates and unlabelled dates never become expiry dates", () => {
  assert.equal(parseExpiry("MFG: 03/2025\n08/2028", now), undefined);
});
test("unclear, ambiguous and invalid dates remain unverified", () => {
  for (const value of [
    "13/2028",
    "01/02/2028",
    "08/28",
    "August 20??",
    "08/2028?",
    "08/2028/99",
    "08/2028 or 09/2028",
  ])
    assert.equal(parseExpiry("EXP: " + value, now).status, "unverified", value);
});
test("multiple conflicting expiry values are never resolved by guessing", () =>
  assert.equal(
    parseExpiry("EXP: 08/2028\nEXP: 09/2028", now).status,
    "unverified",
  ));
test("missing fields cannot consume the following line", () => {
  const r = parseLabel(
    "Manufacturer:\nPARACETAMOL\nBatch No:\nEXP: 08/2028",
    now,
  );
  assert.equal(r.manufacturer, undefined);
  assert.equal(r.batch, undefined);
});
test("placeholder values are never reported as identified fields", () => {
  const r = parseLabel(
    "Medicine name: Unknown\nManufacturer: unreadable\nBatch: missing",
    now,
  );
  assert.equal(r.name, undefined);
  assert.equal(r.manufacturer, undefined);
  assert.equal(r.batch, undefined);
});
test("text month expiry and explicit product names are supported", () => {
  const r = parseLabel("Product name: Demo Brand\nEXP. September 2029", now);
  assert.equal(r.name, "Demo brand");
  assert.equal(r.expiry.display, "September 2029");
});
