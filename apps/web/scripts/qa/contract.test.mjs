import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveContract } from './contract.mjs';

test('local smoke defaults and full inclusion', () => {
  const plan = resolveContract(['--check'], {});
  assert.equal(plan.baseURL, 'http://127.0.0.1:3100');
  assert.equal(plan.suite, 'smoke');
  assert.equal(plan.build, true);
  assert.equal(plan.startServer, true);
  assert.equal(plan.includesSmoke, true);
});
test('external full never requests local build or server', () => {
  const plan = resolveContract(['--check', 'full'], {
    PLAYWRIGHT_BASE_URL: 'https://preview.example.com',
  });
  assert.equal(plan.mode, 'external');
  assert.equal(plan.build, false);
  assert.equal(plan.startServer, false);
  assert.equal(plan.suite, 'full');
});
test('invalid options, URL and ports fail explicitly', () => {
  for (const args of [
    [],
    ['--check', 'unknown'],
    ['--check', 'smoke', 'full'],
    ['--check', '--check'],
  ]) {
    assert.throws(() => resolveContract(args, {}));
  }
  for (const url of [
    '',
    'oops',
    'file:///tmp',
    'https://user:pass@example.com',
    'https://example.com/?secret=x',
    'https://example.com/path',
  ]) {
    assert.throws(() => resolveContract(['--check'], { PLAYWRIGHT_BASE_URL: url }));
  }
  for (const port of ['', '0', '65536', '1.5', '3000x']) {
    assert.throws(() => resolveContract(['--check'], { E2E_PORT: port }));
  }
});
