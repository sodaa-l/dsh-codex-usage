const PROVIDER = 'openai-codex';
const KEY = 'dsh-codex-usage/openai-codex';

function credential(record) {
  if (!record) return undefined;
  const value = record.kind === 'grant' && record.payload;
  if (!value || value.type !== 'oauth' || typeof value.access !== 'string' || !value.access || typeof value.refresh !== 'string' || !value.refresh || !Number.isFinite(value.expires)) throw new Error('Invalid stored Codex credential');
  return value;
}

// Release the credential lock on logout even when the provider ignores cancellation.
function waitForOperation(operation, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(signal.reason); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return operation(); }).then(
      (value) => { cleanup(); resolve(value); },
      (error) => { cleanup(); reject(error); },
    );
  });
}

export function createCredentialStore(credentials) {
  let writes = new AbortController();
  const check = (id, options) => {
    if (id !== PROVIDER) throw new Error('Unsupported provider');
    options?.signal?.throwIfAborted();
  };
  return {
    async read(id, options) { check(id, options); return credential(await credentials.readRecord(KEY)); },
    async list(options) {
      options?.signal?.throwIfAborted();
      return credential(await credentials.readRecord(KEY)) ? [{ providerId: PROVIDER, type: 'oauth' }] : [];
    },
    async modify(id, fn, options) {
      check(id, options);
      const signal = options?.signal ? AbortSignal.any([options.signal, writes.signal]) : writes.signal;
      const record = await credentials.modifyRecord(KEY, async (current) => {
        signal.throwIfAborted();
        const next = await waitForOperation(() => fn(credential(current)), signal);
        signal.throwIfAborted();
        return next === undefined ? undefined : { kind: 'grant', payload: credential({ kind: 'grant', payload: next }) };
      });
      return credential(record);
    },
    async delete(id, options) {
      check(id, options);
      writes.abort();
      writes = new AbortController();
      await credentials.deleteRecord(KEY);
    },
  };
}

export async function createCodexAuth(credentials, load = async () => {
  const [{ createModels }, { openaiCodexProvider }] = await Promise.all([
    import('@earendil-works/pi-ai/models'), import('@earendil-works/pi-ai/providers/openai-codex'),
  ]);
  return { createModels, openaiCodexProvider };
}) {
  const { createModels, openaiCodexProvider } = await load();
  const store = createCredentialStore(credentials);
  const models = createModels({ credentials: store });
  models.setProvider(openaiCodexProvider());
  let active;
  let generation = 0;
  return {
    async start() {
      if (active && ['starting', 'waiting'].includes(active.view.phase)) return active.view;
      const controller = new AbortController();
      const current = { controller, view: { phase: 'starting' } };
      const version = ++generation;
      active = current;
      const interaction = {
        signal: controller.signal,
        prompt: async (prompt) => {
          if (prompt.type === 'select') return 'browser';
          if (prompt.type !== 'manual_code') throw new Error('Unsupported login prompt');
          controller.signal.throwIfAborted();
          return new Promise((resolve, reject) => {
            const abort = () => { cleanup(); reject(new Error('Login cancelled')); };
            const cleanup = () => {
              controller.signal.removeEventListener('abort', abort);
              prompt.signal?.removeEventListener('abort', abort);
              if (current.answer === answer) current.answer = undefined;
            };
            const answer = (value) => { cleanup(); resolve(value); };
            current.answer = answer;
            controller.signal.addEventListener('abort', abort, { once: true });
            prompt.signal?.addEventListener('abort', abort, { once: true });
            if (controller.signal.aborted || prompt.signal?.aborted) { cleanup(); reject(new Error('Login cancelled')); }
          });
        },
        notify: (event) => {
          if (active !== current || controller.signal.aborted || event.type !== 'auth_url') return;
          const url = new URL(event.url);
          if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com') throw new Error('Invalid authorization URL');
          current.view = { phase: 'waiting', authUrl: url.href };
        },
      };
      current.done = models.login(PROVIDER, 'oauth', interaction, { agentName: 'dsh-codex-usage' })
        .then(() => { if (generation === version && !controller.signal.aborted) current.view = { phase: 'authenticated' }; })
        .catch(() => { if (generation === version && !controller.signal.aborted) current.view = { phase: 'failed' }; });
      return current.view;
    },
    status() { return active?.view ?? { phase: 'idle' }; },
    async account() {
      const current = await store.read(PROVIDER);
      if (!current) return null;
      let payload = {};
      try { payload = JSON.parse(Buffer.from(current.access.split('.')[1], 'base64url').toString('utf8')); } catch {}
      const profile = payload?.['https://api.openai.com/profile'];
      const claims = payload?.['https://api.openai.com/auth'];
      const safe = (value) => typeof value === 'string' && value.length <= 256 ? value : null;
      return { email: safe(profile?.email) || safe(payload?.email), plan: safe(claims?.chatgpt_plan_type), accountId: safe(current.accountId) };
    },
    submit(value) {
      if (typeof value !== 'string' || !value.trim() || value.length > 8192 || !active?.answer) throw new Error('No pending login input');
      active.answer(value.trim());
      return active.view;
    },
    async cancel() {
      generation++;
      const current = active;
      active = undefined;
      current?.controller.abort();
      if (current?.done) await current.done;
    },
    async logout() { await this.cancel(); await models.logout(PROVIDER); },
    async resolve(signal) {
      const resolved = await models.getAuth(PROVIDER, { signal });
      if (!resolved) return undefined;
      const current = await store.read(PROVIDER, { signal });
      if (!current || typeof current.accountId !== 'string' || !current.accountId) throw new Error('Missing account ID');
      return { auth: { ...resolved.auth, headers: { ...resolved.auth.headers, 'chatgpt-account-id': current.accountId } } };
    },
  };
}

export function normalizeWhamUsage(value, now = Date.now()) {
  const windows = { fiveHour: null, weekly: null };
  for (const item of [value?.rate_limit?.primary_window, value?.rate_limit?.secondary_window]) {
    if (!item || typeof item.used_percent !== 'number' || !Number.isFinite(item.used_percent)) continue;
    const key = item.limit_window_seconds === 18000 ? 'fiveHour' : item.limit_window_seconds === 604800 ? 'weekly' : null;
    if (!key || windows[key]) continue;
    const reset = Number.isFinite(item.reset_at) ? item.reset_at * 1000 : Number.isFinite(item.reset_after_seconds) ? now + item.reset_after_seconds * 1000 : NaN;
    const date = new Date(reset);
    windows[key] = { usedPercent: Math.round(Math.max(0, Math.min(100, item.used_percent))), resetsAt: Number.isFinite(date.valueOf()) ? date.toISOString() : null };
  }
  return windows;
}

export function createWhamReader(auth, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  return async ({ signal }) => {
    const combined = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
    try {
      const resolved = await auth.resolve(combined);
      if (!resolved?.auth?.apiKey) return { status: 'not-authenticated' };
      const headers = { ...resolved.auth.headers, authorization: `Bearer ${resolved.auth.apiKey}`, accept: 'application/json' };
      const response = await fetchImpl('https://chatgpt.com/backend-api/wham/usage', { headers, signal: combined });
      if (response.status === 401) return { status: 'not-authenticated' };
      if (!response.ok) return { status: 'rate-limits-unavailable' };
      const windows = normalizeWhamUsage(await response.json());
      return windows.fiveHour || windows.weekly ? { status: 'ok', windows } : { status: 'rate-limits-unavailable' };
    } catch (error) {
      if (signal.aborted) throw error;
      return { status: combined.aborted ? 'timeout' : 'unavailable' };
    }
  };
}
