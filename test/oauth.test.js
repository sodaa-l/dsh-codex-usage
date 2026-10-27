import test from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialStore, createCodexAuth, createWhamReader, normalizeWhamUsage } from '../src/oauth.js';

function fakeCredentials() {
  let record;
  let chain = Promise.resolve();
  return {
    async readRecord() { await chain; return record; },
    modifyRecord(key, fn) { const next = chain.then(async () => { record = await fn(record) ?? record; return record; }); chain = next.catch(() => {}); return next; },
    async deleteRecord() { await chain; record = undefined; },
  };
}
const sample = { type: 'oauth', access: 'secret-access', refresh: 'secret-refresh', expires: 123, accountId: 'account' };

test('credential modifications serialize and leave the previous value on failure', async () => {
  const store = createCredentialStore(fakeCredentials());
  await store.modify('openai-codex', async () => sample);
  await Promise.all([1, 2].map(() => store.modify('openai-codex', async (old) => ({ ...old, expires: old.expires + 1 }))));
  assert.equal((await store.read('openai-codex')).expires, 125);
  await assert.rejects(store.modify('openai-codex', async () => { throw Error('failed'); }));
  assert.equal((await store.read('openai-codex')).expires, 125);
  await store.delete('openai-codex');
  assert.equal(await store.read('openai-codex'), undefined);
});

test('account details expose only selected fields from stored credentials', async () => {
  const credentials = fakeCredentials();
  const payload = { 'https://api.openai.com/profile': { email: 'test@example.com' }, 'https://api.openai.com/auth': { chatgpt_plan_type: 'plus' }, private: 'hidden' };
  const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
  await createCredentialStore(credentials).modify('openai-codex', async () => ({ ...sample, access: token }));
  const auth = await createCodexAuth(credentials, async () => ({ openaiCodexProvider: () => ({}), createModels: () => ({ setProvider() {} }) }));
  assert.deepEqual(await auth.account(), { email: 'test@example.com', plan: 'plus', accountId: 'account' });
  assert.equal(JSON.stringify(await auth.account()).includes('secret'), false);
});

test('WHAM windows use duration and convert absolute and relative resets', () => {
  const windows = normalizeWhamUsage({ rate_limit: {
    primary_window: { used_percent: 24.2, limit_window_seconds: 604800, reset_at: 100 },
    secondary_window: { used_percent: 200, limit_window_seconds: 18000, reset_after_seconds: 20 },
  } }, 1000);
  assert.deepEqual(windows, { fiveHour: { usedPercent: 100, resetsAt: '1970-01-01T00:00:21.000Z' }, weekly: { usedPercent: 24, resetsAt: '1970-01-01T00:01:40.000Z' } });
});

test('usage request sends credentials only upstream and returns sanitized result', async () => {
  let received;
  const reader = createWhamReader({ resolve: async () => ({ auth: { apiKey: 'secret', headers: { 'chatgpt-account-id': 'account' } } }) }, {
    fetchImpl: async (url, options) => { received = { url, options }; return Response.json({ rate_limit: { primary_window: { used_percent: 7, limit_window_seconds: 18000 }, secondary_window: null }, other: 'private' }); },
  });
  const result = await reader({ signal: new AbortController().signal });
  assert.equal(received.options.headers.authorization, 'Bearer secret');
  assert.equal(received.options.headers['chatgpt-account-id'], 'account');
  assert.deepEqual(result, { status: 'ok', windows: { fiveHour: { usedPercent: 7, resetsAt: null }, weekly: null } });
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('successful weekly-only usage keeps a valid weekly window and a missing 5-hour window', async () => {
  const reader = createWhamReader({ resolve: async () => ({ auth: { apiKey: 'secret', headers: { 'chatgpt-account-id': 'account' } } }) }, {
    fetchImpl: async () => Response.json({ rate_limit: { primary_window: { used_percent: 31, limit_window_seconds: 604800, reset_at: 200 }, secondary_window: null } }),
  });
  const result = await reader({ signal: new AbortController().signal });
  assert.deepEqual(result, { status: 'ok', windows: { fiveHour: null, weekly: { usedPercent: 31, resetsAt: '1970-01-01T00:03:20.000Z' } } });
});

test('browser sign-in accepts a manual callback and never exposes credentials', async () => {
  let received;
  const auth = await createCodexAuth(fakeCredentials(), async () => ({
    openaiCodexProvider: () => ({}),
    createModels: () => ({ setProvider() {}, login: async (_id, _type, interaction) => {
      assert.equal(await interaction.prompt({ type: 'select' }), 'browser');
      interaction.notify({ type: 'auth_url', url: 'https://auth.openai.com/oauth/authorize?state=test' });
      received = await interaction.prompt({ type: 'manual_code' });
    }, logout: async () => {} }),
  }));
  await auth.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(auth.status(), { phase: 'waiting', authUrl: 'https://auth.openai.com/oauth/authorize?state=test' });
  auth.submit('http://localhost:1455/auth/callback?code=test&state=test');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(received, 'http://localhost:1455/auth/callback?code=test&state=test');
  assert.deepEqual(auth.status(), { phase: 'authenticated' });
});

test('cancelling browser login rejects the pending input', async () => {
  let signal;
  const auth = await createCodexAuth(fakeCredentials(), async () => ({
    openaiCodexProvider: () => ({}),
    createModels: () => ({ setProvider() {}, login: async (_id, _type, interaction) => {
      signal = interaction.signal;
      await interaction.prompt({ type: 'manual_code' });
    }, logout: async () => {} }),
  }));
  await auth.start();
  await new Promise((resolve) => setImmediate(resolve));
  await auth.cancel();
  assert.equal(signal.aborted, true);
  assert.deepEqual(auth.status(), { phase: 'idle' });
});
