import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, inject } from '../index.js';

test('host registers separate safe usage and login routes and cleans them up', async () => {
  const routes = new Map();
  let cleanup;
  let unregistered = 0;
  const ctx = {
    credentials: { readRecord: async () => undefined, modifyRecord: async () => undefined, deleteRecord: async () => {} },
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => { unregistered++; }; } } },
    effect(setup) { cleanup = setup(); },
  };
  apply(ctx);
  assert.deepEqual(inject, ['connection', 'credentials']);
  const usage = await routes.get('/api/dsh-codex-usage').fetch(new Request('http://localhost/api/dsh-codex-usage'));
  assert.equal((await usage.json()).status, 'not-authenticated');
  assert.deepEqual(routes.get('/api/dsh-codex-usage/auth').methods, ['GET', 'POST']);
  const status = await routes.get('/api/dsh-codex-usage/auth').fetch(new Request('http://localhost/api/dsh-codex-usage/auth'));
  assert.deepEqual(await status.json(), { phase: 'idle', account: null });
  const logout = await routes.get('/api/dsh-codex-usage/auth').fetch(new Request('http://localhost/api/dsh-codex-usage/auth?action=logout', { method: 'POST' }));
  assert.deepEqual(await logout.json(), { phase: 'idle' });
  await cleanup();
  assert.equal(unregistered, 2);
});

test('logout route clears credentials and usage while an upstream refresh is offline', { timeout: 2000 }, async (t) => {
  const routes = new Map();
  let cleanup, started, failRefresh;
  let record = { kind: 'grant', payload: { type: 'oauth', access: 'expired-access', refresh: 'refresh', expires: 0, accountId: 'account' } };
  let chain = Promise.resolve();
  const credentials = {
    readRecord: async () => { await chain; return record; },
    modifyRecord(_key, fn) {
      const next = chain.then(async () => { record = await fn(record) ?? record; return record; });
      chain = next.catch(() => {});
      return next;
    },
    deleteRecord: async () => { await chain; record = undefined; },
  };
  const refreshing = new Promise((resolve) => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async () => {
    started();
    return new Promise((_resolve, reject) => { failRefresh = reject; });
  });
  apply({ credentials, connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } }, effect(setup) { cleanup = setup(); } });
  t.after(() => cleanup());
  const usage = () => routes.get('/api/dsh-codex-usage').fetch(new Request('http://localhost/api/dsh-codex-usage'));
  const pendingUsage = usage();
  await refreshing;
  const logout = await routes.get('/api/dsh-codex-usage/auth').fetch(new Request('http://localhost/api/dsh-codex-usage/auth?action=logout', { method: 'POST' }));
  assert.equal(logout.status, 200);
  assert.deepEqual(await logout.json(), { phase: 'idle' });
  assert.equal(record, undefined);
  await pendingUsage;
  assert.equal((await (await usage()).json()).status, 'not-authenticated');
  failRefresh(new TypeError('fetch failed'));
  await new Promise((resolve) => setImmediate(resolve));
  const account = await routes.get('/api/dsh-codex-usage/auth').fetch(new Request('http://localhost/api/dsh-codex-usage/auth'));
  assert.deepEqual(await account.json(), { phase: 'idle', account: null });
});
