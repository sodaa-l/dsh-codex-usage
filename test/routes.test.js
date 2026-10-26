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
