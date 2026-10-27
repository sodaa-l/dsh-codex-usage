export const USAGE_STATUSES = Object.freeze([
  'ok',
  'not-authenticated',
  'timeout',
  'rate-limits-unavailable',
  'unavailable',
]);

export function makeUsageResult(status, windows = { fiveHour: null, weekly: null }) {
  return {
    status: USAGE_STATUSES.includes(status) ? status : 'unavailable',
    windows: {
      fiveHour: status === 'ok' ? windows.fiveHour ?? null : null,
      weekly: status === 'ok' ? windows.weekly ?? null : null,
    },
  };
}
