import { createCodexAuth, createWhamReader } from './src/oauth.js';
import { makeUsageResult } from './src/shared.js';

export const inject = ['connection', 'credentials'];

const API_PATH = '/api/dsh-codex-usage';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_MS = 60000;
const ERROR_CACHE_MS = 10000;

function finiteSetting(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

function serializeUsage(result, checkedAt, expiresAt) {
  const safe = makeUsageResult(result?.status, result?.windows);
  return { ...safe, checkedAt, expiresAt };
}

function abortError() {
  const error = new Error('Request aborted.');
  error.name = 'AbortError';
  return error;
}

function waitForCaller(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { cleanup(); resolve(value); },
      (error) => { cleanup(); reject(error); },
    );
  });
}

/** Share one owned query while letting callers cancel only their own wait. */
export function createUsageService({ readUsage, cacheMs = DEFAULT_CACHE_MS, errorCacheMs = ERROR_CACHE_MS, now = Date.now }) {
  let cachedValue;
  let cachedUntil = 0;
  let inFlight;
  let disposed = false;

  const startQuery = () => {
    const controller = new AbortController();
    const promise = Promise.resolve()
      .then(() => readUsage({ signal: controller.signal }))
      .then((result) => {
        const checkedAtMs = now();
        const checkedAt = new Date(checkedAtMs).toISOString();
        const ttl = result.status === 'ok' ? cacheMs : Math.min(cacheMs, errorCacheMs);
        const expiresAt = new Date(checkedAtMs + ttl).toISOString();
        const value = serializeUsage(result, checkedAt, expiresAt);
        if (ttl > 0) {
          cachedValue = value;
          cachedUntil = checkedAtMs + ttl;
        } else {
          cachedValue = undefined;
          cachedUntil = 0;
        }
        return value;
      })
      .finally(() => {
        if (inFlight?.controller === controller) inFlight = undefined;
      });

    inFlight = { controller, promise };
    return promise;
  };

  const getUsage = (signal, refresh = false) => {
    if (disposed) return Promise.reject(new Error('Usage service is disposed.'));
    if (signal?.aborted) return Promise.reject(abortError());
    if (inFlight) return waitForCaller(inFlight.promise, signal);
    if (!refresh && cachedValue && now() < cachedUntil) {
      return waitForCaller(Promise.resolve(cachedValue), signal);
    }
    return waitForCaller(startQuery(), signal);
  };

  const dispose = async () => {
    disposed = true;
    const active = inFlight;
    if (!active) return;
    active.controller.abort();
    try { await active.promise; } catch {}
  };

  const clear = async () => {
    cachedValue = undefined;
    cachedUntil = 0;
    const active = inFlight;
    if (active) {
      active.controller.abort();
      try { await active.promise; } catch {}
      cachedValue = undefined;
      cachedUntil = 0;
    }
  };

  return Object.freeze({ getUsage, clear, dispose });
}

export function apply(ctx, config = {}) {
  const timeoutMs = finiteSetting(config.timeoutMs, DEFAULT_TIMEOUT_MS, 1000, 60000);
  const cacheMs = finiteSetting(config.cacheMs, DEFAULT_CACHE_MS, 0, 600000);
  const authPromise = createCodexAuth(ctx.credentials);
  const usage = createUsageService({ readUsage: async (options) => createWhamReader(await authPromise, { timeoutMs })(options), cacheMs });

  ctx.effect(() => {
    const unregisterAuth = ctx.connection.fetch.register({
      path: `${API_PATH}/auth`,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const auth = await authPromise;
          let value;
          const action = new URL(request.url).searchParams.get('action');
          if (request.method === 'POST' && action === 'start') { await usage.clear(); value = await auth.start(); }
          else if (request.method === 'POST' && action === 'submit') {
            const body = await request.text();
            if (body.length > 16384) return new Response(null, { status: 400 });
            value = auth.submit(JSON.parse(body).value);
          }
          else if (request.method === 'POST' && (action === 'cancel' || action === 'logout')) {
            await usage.clear();
            if (action === 'logout') await auth.logout();
            else await auth.cancel();
            value = { phase: 'idle' };
          } else if (request.method === 'GET') {
            value = { ...auth.status(), account: await auth.account() };
            if (value.phase === 'authenticated') await usage.clear();
          } else return new Response(null, { status: 400 });
          return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
        } catch {
          return new Response(JSON.stringify({ phase: 'failed' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
        }
      },
    });
    const unregister = ctx.connection.fetch.register({
      path: API_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const refresh = new URL(request.url).searchParams.get('refresh') === '1';
        try {
          const value = await usage.getUsage(request.signal, refresh);
          return new Response(JSON.stringify(value), {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            },
          });
        } catch {
          return new Response(JSON.stringify({
            status: 'unavailable',
            windows: { fiveHour: null, weekly: null },
            checkedAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
          }), {
            status: 503,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            },
          });
        }
      },
    });

    return async () => {
      try {
        await unregister();
        await unregisterAuth();
      } finally {
        await usage.dispose();
        try { await (await authPromise).cancel(); } catch {}
      }
    };
  }, 'dsh-codex-usage: authenticated fetch route');
}
