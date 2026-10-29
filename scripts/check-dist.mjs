import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('id="root"'), 'Production HTML needs an application mount');
assert.ok(!html.includes('/src/'), 'Production HTML must reference compiled assets');
const assets = [...html.matchAll(/(?:src|href)="(\/(?:assets\/[^"?]+|favicon\.svg))"/g)].map(m => m[1]);
assert.ok(assets.some(a => a.endsWith('.js')) && assets.some(a => a.endsWith('.css')), 'Compiled JS and CSS must be linked');
for (const asset of assets) {
  const file = path.resolve(root, '.' + asset);
  assert.ok(file.startsWith(root + path.sep), 'Asset must stay inside dist');
  assert.ok((await stat(file)).size > 0, `Missing or empty asset: ${asset}`);
  if (/\.(js|css)$/.test(file)) assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/.test(await readFile(file, 'utf8')), 'Production assets must not depend on a local server');
}
const config = await readFile('netlify.toml', 'utf8');
assert.match(config, /publish\s*=\s*"dist"/);
assert.match(config, /from\s*=\s*"\/\*"[\s\S]*to\s*=\s*"\/index.html"[\s\S]*status\s*=\s*200/);
assert.match(config, /NODE_VERSION\s*=\s*"24"/);
assert.match(config, /frame-ancestors 'none'/);
console.log(`Production artifact checks passed: ${assets.length} linked assets exist; no localhost dependency; Netlify SPA fallback present.`);
