import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRateLimits, makeUsageResult } from '../src/shared.js';

const stamp = '2026-10-28T05:00:00.000Z';

test('selects Codex standard windows by duration, regardless of order', () => {
  const result = normalizeRateLimits({
    rateLimitsByLimitId: {
      spark: { primary: { usedPercent: 99, windowDurationMins: 300, resetsAt: stamp } },
      codex: {
        primary: { usedPercent: 63.2, windowDurationMins: 10080, resetsAt: stamp },
        secondary: { usedPercent: 21, windowDurationMins: 300, resetsAt: 1793163600 },
      },
      codeReview: { primary: { usedPercent: 75, windowDurationMins: 10080, resetsAt: stamp } },
    },
  });

  assert.deepEqual(result, {
    fiveHour: { usedPercent: 21, resetsAt: '2026-10-28T05:00:00.000Z' },
    weekly: { usedPercent: 63, resetsAt: '2026-10-28T05:00:00.000Z' },
  });
});

test('does not infer durations from primary/secondary position', () => {
  const result = normalizeRateLimits({
    rateLimits: {
      primary: { usedPercent: 35, resetsAt: stamp },
      secondary: { usedPercent: 80, resetsAt: 1793163600 },
    },
  });

  assert.deepEqual(result, { fiveHour: null, weekly: null });
});

test('rejects explicitly nonstandard limit ids when no codex entry exists', () => {
  assert.deepEqual(normalizeRateLimits({
    rateLimits: {
      limitId: 'codex_spark',
      primary: { usedPercent: 62, windowDurationMins: 300, resetsAt: stamp },
    },
  }), { fiveHour: null, weekly: null });

  assert.deepEqual(normalizeRateLimits({
    rateLimitsByLimitId: {
      codex_spark: { primary: { usedPercent: 62, windowDurationMins: 300, resetsAt: stamp } },
    },
  }), { fiveHour: null, weekly: null });
});

test('clamps percentages and rejects malformed or unrelated windows', () => {
  const result = normalizeRateLimits({
    rateLimits: {
      primary: { usedPercent: 120, windowDurationMins: 60, resetsAt: 'not a date' },
      secondary: { usedPercent: -10, windowDurationMins: 300, resetsAt: -1 },
    },
  });

  assert.deepEqual(result, {
    fiveHour: { usedPercent: 0, resetsAt: null },
    weekly: null,
  });
  assert.deepEqual(normalizeRateLimits(null), { fiveHour: null, weekly: null });
});

test('non-ok result never carries quota data', () => {
  assert.deepEqual(makeUsageResult('unsupported-auth', {
    fiveHour: { usedPercent: 42, resetsAt: stamp },
    weekly: null,
  }), {
    status: 'unsupported-auth',
    windows: { fiveHour: null, weekly: null },
  });
});

test('treats a null limit map as absent but rejects a non-Codex map', () => {
  const legacy = {
    primary: { usedPercent: 12, windowDurationMins: 300, resetsAt: stamp },
    secondary: { usedPercent: 34, windowDurationMins: 10080, resetsAt: stamp },
  };
  assert.deepEqual(normalizeRateLimits({ rateLimitsByLimitId: null, rateLimits: legacy }), {
    fiveHour: { usedPercent: 12, resetsAt: stamp },
    weekly: { usedPercent: 34, resetsAt: stamp },
  });
  assert.deepEqual(normalizeRateLimits({
    rateLimits: legacy,
    rateLimitsByLimitId: { spark: legacy },
  }), { fiveHour: null, weekly: null });
});
