import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, settings, tileGrid, tileFrames } from '../public/experiments/inverse-canvas/engine.mjs';

test('approved mask frames remain identical to the source snapshot', () => {
  const source = readFileSync(new URL('../docs/references/underground-inverse-canvas/theme.js', import.meta.url), 'utf8');
  const start = source.indexOf('function tileFrames(');
  const end = source.indexOf('async function toggleTheme', start);
  const original = new Function('root', `const clamp = value => Math.max(0, Math.min(1, value)); ${source.slice(start, end)}; return tileFrames;`)({ style: { setProperty() {} } });
  for (const [width, height] of [[390, 844], [720, 600], [1440, 900]]) {
    const origin = { x: width - 30, y: 35 };
    const before = original(width, height, origin);
    const after = tileFrames(width, height, origin, DEFAULTS);
    assert.deepEqual(after.old, before.old);
    assert.deepEqual(after.next, before.next);
    assert.equal(after.duration, before.duration);
    assert.equal(after.count, before.count);
  }
});
test('density and timing controls change the geometry and rate', () => {
  const coarse = tileGrid(1440, 900, { tileCount: 180 });
  const fine = tileGrid(1440, 900, { tileCount: 1600 });
  assert.ok(fine.count > coarse.count * 4);
  assert.ok(fine.count < 1800);
  const frames = tileFrames(390, 500, { x: 195, y: 250 }, { spreadMs: 1600, flipMs: 900 });
  assert.equal(frames.duration, 2840);
  assert.equal(frames.old.length, 49);
  assert.ok(frames.next.every(frame => !/NaN|Infinity/.test(frame.clipPath)));
});
test('untrusted settings are bounded and unknown values do not reach styles', () => {
  const checked = settings({ tileCount: Infinity, spreadMs: -100, flipMs: 999999, gridMs: 'abc', origin: '<script>', palette: 'url(x)', intensity: -1 });
  assert.equal(checked.tileCount, 520);
  assert.equal(checked.spreadMs, 200);
  assert.equal(checked.flipMs, 1200);
  assert.equal(checked.gridMs, 280);
  assert.equal(checked.origin, 'pointer');
  assert.equal(checked.palette, 'teal');
  assert.equal(checked.intensity, .1);
  assert.deepEqual(settings(), DEFAULTS);
});
