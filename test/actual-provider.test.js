import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodexAuth, createCredentialStore } from '../src/oauth.js';
const sample = { type: 'oauth', access: 'sample-token', refresh: 'sample-refresh', accountId: 'sample-account' };
function fakeCredentials() {
  let record;
  let chain = Promise.resolve();
  return {
    readRecord: async () => { await chain; return record; },
    modifyRecord(_key, fn) {
      const next = chain.then(async () => { record = await fn(record) ?? record; return record; });
      chain = next.catch(() => {});
      return next;
    },
    deleteRecord: async () => { await chain; record = undefined; },
  };
}

test('actual provider logout completes during an unresponsive token refresh', { timeout: 2000 }, async (t) => {
  const credentials = fakeCredentials();
  const store = createCredentialStore(credentials);
  await store.modify('openai-codex', async () => ({ ...sample, expires: 0 }));
  const auth = await createCodexAuth(credentials);
  let started, finishRefresh;
  const refreshing = new Promise((resolve) => { started = resolve; });
  const payload = { 'https://api.openai.com/auth': { chatgpt_account_id: sample.accountId } };
  const rotatedAccess = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, 'https://auth.openai.com/oauth/token');
    started();
    return new Promise((resolve) => { finishRefresh = resolve; });
  });
  const resolution = auth.resolve(new AbortController().signal);
  const rejected = assert.rejects(resolution);
  await refreshing;
  await auth.logout();
  assert.equal(await store.read('openai-codex'), undefined);
  finishRefresh(Response.json({ access_token: rotatedAccess, refresh_token: 'rotated-refresh', expires_in: 3600 }));
  await rejected;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await store.read('openai-codex'), undefined);
});

test('caller cancellation still persists a rotated token unless explicitly logged out', { timeout: 2000 }, async (t) => {
  const credentials = fakeCredentials();
  const store = createCredentialStore(credentials);
  await store.modify('openai-codex', async () => ({ ...sample, expires: 0 }));
  const auth = await createCodexAuth(credentials);
  let started, finishRefresh, refreshSignal;
  const refreshing = new Promise((resolve) => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    refreshSignal = options.signal;
    started();
    return new Promise((resolve) => { finishRefresh = resolve; });
  });
  const controller = new AbortController();
  const resolution = auth.resolve(controller.signal);
  const rejected = assert.rejects(resolution, { name: 'AbortError' });
  await refreshing;
  controller.abort();
  await rejected;
  assert.equal(refreshSignal.aborted, false);
  const payload = { 'https://api.openai.com/auth': { chatgpt_account_id: sample.accountId } };
  const access = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
  finishRefresh(Response.json({ access_token: access, refresh_token: 'rotated-refresh', expires_in: 3600 }));
  const current = await store.read('openai-codex');
  assert.equal(current.access, access);
  assert.equal(current.refresh, 'rotated-refresh');
});

test('actual pi-ai provider resolves the stored account without exposing it to the client', async () => {
  const credentials = fakeCredentials();
  const store = createCredentialStore(credentials);
  await store.modify('openai-codex', async () => ({ ...sample, expires: Date.now() + 3600000 }));
  const auth = await createCodexAuth(credentials);
  const resolved = await auth.resolve(new AbortController().signal);
  assert.equal(resolved.auth.apiKey, sample.access);
  assert.equal(resolved.auth.headers['chatgpt-account-id'], sample.accountId);
  assert.deepEqual(auth.status(), { phase: 'idle' });
  await auth.logout();
  assert.equal(await store.read('openai-codex'), undefined);
});
