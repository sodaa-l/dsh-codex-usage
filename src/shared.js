export const USAGE_STATUSES = Object.freeze([
  'ok',
  'missing-cli',
  'cli-wrapper-unsupported',
  'not-authenticated',
  'unsupported-auth',
  'timeout',
  'protocol-error',
  'account-unavailable',
  'rate-limits-unavailable',
  'cli-error',
  'unavailable',
]);

const WINDOW_MINUTES = Object.freeze({ fiveHour: 300, weekly: 10080 });

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function firstRecord(...values) {
  return values.find(isRecord) ?? null;
}

function selectCodexRateLimits(response) {
  const result = isRecord(response) ? response : {};
  const topLevel = firstRecord(result.rateLimits, result);
  if (!topLevel) return null;

  const byLimitId = topLevel.rateLimitsByLimitId ?? result.rateLimitsByLimitId;
  if (byLimitId != null) {
    return isRecord(byLimitId) && isRecord(byLimitId.codex) ? byLimitId.codex : null;
  }

  const limitId = topLevel.limitId ?? result.limitId;
  if (limitId != null && (typeof limitId !== 'string' || limitId.toLowerCase() !== 'codex')) {
    return null;
  }
  return topLevel;
}

function normalizeReset(value) {
  let milliseconds;
  if (typeof value === 'number' && Number.isFinite(value)) {
    milliseconds = value < 1e12 ? value * 1000 : value;
  } else if (typeof value === 'string') {
    milliseconds = Date.parse(value);
  } else {
    return null;
  }

  if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function normalizeWindow(value) {
  if (!isRecord(value) || typeof value.usedPercent !== 'number' || !Number.isFinite(value.usedPercent)) {
    return null;
  }
  const usedPercent = Math.round(Math.min(100, Math.max(0, value.usedPercent)));
  const reset = value.resetsAt ?? value.resetAt ?? null;
  return { usedPercent, resetsAt: normalizeReset(reset) };
}

/** Select only the standard Codex limits and identify them by their duration. */
export function normalizeRateLimits(response) {
  const selected = selectCodexRateLimits(response);
  if (!selected) return { fiveHour: null, weekly: null };

  const limits = firstRecord(selected.rateLimits, selected) ?? selected;
  let fiveHour = null;
  let weekly = null;

  for (const [name, candidate] of [
    ['primary', limits.primary],
    ['secondary', limits.secondary],
    ['fiveHour', limits.fiveHour],
    ['weekly', limits.weekly],
  ]) {
    const normalized = normalizeWindow(candidate);
    if (!normalized) continue;

    const duration = candidate.windowDurationMins;
    if (duration === WINDOW_MINUTES.fiveHour) {
      fiveHour ??= normalized;
    } else if (duration === WINDOW_MINUTES.weekly) {
      weekly ??= normalized;
    } else if (duration == null && name === 'fiveHour') {
      fiveHour ??= normalized;
    } else if (duration == null && name === 'weekly') {
      weekly ??= normalized;
    }
  }

  return { fiveHour, weekly };
}

export function makeUsageResult(status, windows = { fiveHour: null, weekly: null }) {
  return {
    status: USAGE_STATUSES.includes(status) ? status : 'unavailable',
    windows: {
      fiveHour: status === 'ok' ? windows.fiveHour ?? null : null,
      weekly: status === 'ok' ? windows.weekly ?? null : null,
    },
  };
}
