import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsageService } from '../index.js';

const okResult = {
  status: 'ok',
  windows: {
    fiveHour: { usedPercent: 31, resetsAt: '2026-10-28T05:00:00.000Z' },
    weekly: null,
  },
};

test('coalesces concurrent callers and caches a completed success', async () => {
  let calls = 0;
  let resolveQuery;
  const service = createUsageService({
    cacheMs: 60000,
    readUsage: () => {
      calls += 1;
      return new Promise((resolve) => { resolveQuery = resolve; });
    },
  });

  const first = service.getUsage();
  const second = service.getUsage();
  await Promise.resolve();
  assert.equal(calls, 1);

  resolveQuery(okResult);
  const [firstValue, secondValue] = await Promise.all([first, second]);
  assert.deepEqual(firstValue, secondValue);
  assert.equal((await service.getUsage()).status, 'ok');
  assert.equal(calls, 1);
  await service.dispose();
});

test('a caller abort does not cancel the shared query for another caller', async () => {
  let ownedSignal;
  let resolveQuery;
  const service = createUsageService({
    readUsage: ({ signal }) => {
      ownedSignal = signal;
      return new Promise((resolve) => { resolveQuery = resolve; });
    },
  });
  const caller = new AbortController();
  const cancelledWait = service.getUsage(caller.signal);
  const survivingWait = service.getUsage();
  await Promise.resolve();

  caller.abort();
  await assert.rejects(cancelledWait, { name: 'AbortError' });
  assert.equal(ownedSignal.aborted, false);

  resolveQuery(okResult);
  assert.equal((await survivingWait).status, 'ok');
  await service.dispose();
});

test('disposal aborts and settles the owned query', async () => {
  let ownedSignal;
  let observedAbort = false;
  const service = createUsageService({
    readUsage: ({ signal }) => new Promise((_resolve, reject) => {
      ownedSignal = signal;
      signal.addEventListener('abort', () => {
        observedAbort = true;
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    }),
  });
  const pending = service.getUsage().catch((error) => error.name);
  await Promise.resolve();

  await service.dispose();
  assert.equal(ownedSignal.aborted, true);
  assert.equal(observedAbort, true);
  assert.equal(await pending, 'AbortError');
  await assert.rejects(service.getUsage(), /disposed/);
});


