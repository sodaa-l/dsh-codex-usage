import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodexAuth, createCredentialStore } from '../src/oauth.js';
const sample = { type: 'oauth', access: 'sample-token', refresh: 'sample-refresh', accountId: 'sample-account' };
function fakeCredentials() {
  let record;
  return { readRecord: async () => record, modifyRecord: async (_key, fn) => record = await fn(record) ?? record, deleteRecord: async () => { record = undefined; } };
}

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
