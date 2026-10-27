import test from 'node:test';
import assert from 'node:assert/strict';
import { makeUsageResult } from '../src/shared.js';

const stamp = '2026-10-28T05:00:00.000Z';

test('non-ok result never carries quota data', () => {
  assert.deepEqual(makeUsageResult('rate-limits-unavailable', {
    fiveHour: { usedPercent: 42, resetsAt: stamp },
    weekly: null,
  }), {
    status: 'rate-limits-unavailable',
    windows: { fiveHour: null, weekly: null },
  });
});
