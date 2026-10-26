import { makeUsageResult, normalizeRateLimits } from './shared.js';

const MAX_RPC_BYTES = 1024 * 1024;
const TIMEOUT = Symbol('timeout');
const ABORTED = Symbol('aborted');

class ProtocolError extends Error {}
class ExecutableError extends Error {}
class UnsupportedWrapperError extends Error {}
class ProcessError extends Error {}
class RpcError extends Error {
  constructor(method) {
    super('Codex App Server returned a JSON-RPC error.');
    this.method = method;
  }
}

function abortError() {
  const error = new Error('Operation aborted.');
  error.name = 'AbortError';
  return error;
}

function assertNotAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function writeMessage(stream, message) {
  return new Promise((resolve, reject) => {
    if (!stream || stream.destroyed || stream.writableEnded) {
      reject(new ProtocolError('Codex App Server stdin is unavailable.'));
      return;
    }

    let settled = false;
    const cleanup = () => stream.removeListener?.('error', onError);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onError = (error) => finish(error);

    try {
      stream.once?.('error', onError);
      stream.write(`${JSON.stringify(message)}\n`, (error) => finish(error));
    } catch {
      finish(new ProtocolError('Could not write to Codex App Server.'));
    }
  });
}

function watchSubprocess(handle) {
  let rejectStreamFailure;
  const streamFailure = new Promise((_, reject) => { rejectStreamFailure = reject; });
  streamFailure.catch(() => {});
  const listeners = [];
  const onError = () => rejectStreamFailure(new ProcessError('Codex App Server stream failed.'));
  const onStderrData = () => {};

  for (const stream of [handle.stdin, handle.stdout, handle.stderr]) {
    if (!stream?.on) continue;
    stream.on('error', onError);
    listeners.push([stream, 'error', onError]);
  }
  if (handle.stderr?.on) {
    handle.stderr.on('data', onStderrData);
    listeners.push([handle.stderr, 'data', onStderrData]);
  }

  const processFailure = Promise.resolve(handle.done).then(
    () => { throw new ProcessError('Codex App Server exited before the query completed.'); },
    () => { throw new ProcessError('Codex App Server process failed.'); },
  );
  processFailure.catch(() => {});
  const failure = Promise.race([streamFailure, processFailure]);
  failure.catch(() => {});

  return {
    failure,
    dispose() {
      for (const [stream, event, listener] of listeners) {
        stream.removeListener?.(event, listener);
      }
    },
  };
}

async function readResponse(stream, expectedId, method, signal) {
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new ProtocolError('Codex App Server stdout is unavailable.');
  }

  const iterator = stream[Symbol.asyncIterator]();
  let buffered = '';
  let consumed = 0;

  while (true) {
    assertNotAborted(signal);
    const next = await iterator.next();
    if (next.done) throw new ProtocolError('Codex App Server closed stdout early.');

    const chunk = String(next.value);
    consumed += chunk.length;
    if (consumed > MAX_RPC_BYTES) throw new ProtocolError('Codex App Server response exceeded the size limit.');
    buffered += chunk;

    let newline = buffered.indexOf('\n');
    while (newline !== -1) {
      const line = buffered.slice(0, newline).trim();
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf('\n');
      if (!line) continue;

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        throw new ProtocolError('Codex App Server emitted invalid JSON.');
      }
      if (!isRecord(message) || message.id !== expectedId) continue;
      if (isRecord(message.error)) throw new RpcError(method);
      if (!Object.prototype.hasOwnProperty.call(message, 'result')) {
        throw new ProtocolError('Codex App Server response has no result.');
      }
      return message.result;
    }

    if (buffered.length > MAX_RPC_BYTES) {
      throw new ProtocolError('Codex App Server response line exceeded the size limit.');
    }
  }
}

async function request(handle, id, method, params, signal) {
  await writeMessage(handle.stdin, { jsonrpc: '2.0', id, method, params });
  return readResponse(handle.stdout, id, method, signal);
}

function statusForError(error) {
  if (error instanceof ExecutableError) return 'missing-cli';
  if (error instanceof UnsupportedWrapperError) return 'cli-wrapper-unsupported';
  if (error instanceof ProtocolError) return 'protocol-error';
  if (error instanceof RpcError) {
    if (error.method === 'account/read') return 'account-unavailable';
    if (error.method === 'account/rateLimits/read') return 'rate-limits-unavailable';
    return 'protocol-error';
  }
  return 'cli-error';
}

function accountStatus(accountResult) {
  const account = isRecord(accountResult) ? accountResult.account : null;
  if (!isRecord(account)) return 'not-authenticated';

  const type = typeof account.type === 'string'
    ? account.type.toLowerCase().replace(/[_-]/g, '')
    : '';
  if (type === 'apikey') return 'unsupported-auth';
  if (type === 'chatgpt' || type === 'chatgptauthtokens') return 'ok';
  return 'not-authenticated';
}

async function runProtocol(handle, signal) {
  await request(handle, 'initialize', 'initialize', {
    clientInfo: {
      name: 'dsh-codex-usage',
      title: 'Codex usage sidebar',
      version: '1.0.0',
    },
    capabilities: {},
  }, signal);

  await writeMessage(handle.stdin, { jsonrpc: '2.0', method: 'initialized' });

  const accountResult = await request(handle, 'account', 'account/read', {}, signal);
  const authStatus = accountStatus(accountResult);
  if (authStatus !== 'ok') return makeUsageResult(authStatus);

  const limitsResult = await request(
    handle,
    'rate-limits',
    'account/rateLimits/read',
    {},
    signal,
  );
  const windows = normalizeRateLimits(limitsResult);
  if (!windows.fiveHour && !windows.weekly) {
    return makeUsageResult('rate-limits-unavailable');
  }
  return makeUsageResult('ok', windows);
}

/** Create a one-shot, cancellable App Server reader using the Host subprocess service. */
export function createAppServerReader({ resolveExecutable, spawn, command = 'codex', cwd, timeoutMs = 15000 }) {
  return async function readUsage({ signal } = {}) {
    assertNotAborted(signal);

    const controller = new AbortController();
    let handle;
    let watcher;
    let timer;
    let timedOut = false;
    let externallyAborted = false;

    const onExternalAbort = () => {
      externallyAborted = true;
      controller.abort();
      try { handle?.terminate(); } catch {}
    };
    signal?.addEventListener('abort', onExternalAbort, { once: true });

    const operation = (async () => {
      let executable;
      try {
        executable = await resolveExecutable(command, undefined, controller.signal);
      } catch {
        if (controller.signal.aborted) throw abortError();
        throw new ExecutableError('Codex CLI could not be resolved.');
      }
      assertNotAborted(controller.signal);
      if (typeof executable !== 'string' || !executable.trim()) {
        throw new ExecutableError('Codex CLI could not be resolved.');
      }
      executable = executable.trim();
      if (/\.(?:cmd|bat)$/i.test(executable)) {
        throw new UnsupportedWrapperError('Windows command wrappers need an executable codex.exe path.');
      }

      try {
        handle = await spawn({
          argv: [executable, 'app-server', '--listen', 'stdio://'],
          cwd,
          stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
          graceMs: 1000,
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) throw abortError();
        return makeUsageResult('cli-error');
      }

      watcher = watchSubprocess(handle);
      if (controller.signal.aborted) {
        try { handle.terminate(); } catch {}
        try { await handle.waitForExit(); } catch {}
        watcher.dispose();
        throw abortError();
      }

      const protocol = runProtocol(handle, controller.signal);
      return Promise.race([protocol, watcher.failure]);
    })();

    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        try { handle?.terminate(); } catch {}
        resolve(TIMEOUT);
      }, timeoutMs);
    });

    let abortPromise;
    let resolveAbort;
    if (signal) {
      abortPromise = new Promise((resolve) => {
        resolveAbort = () => resolve(ABORTED);
        if (signal.aborted) resolveAbort();
        else signal.addEventListener('abort', resolveAbort, { once: true });
      });
    }

    try {
      const contenders = abortPromise
        ? [operation, timeoutPromise, abortPromise]
        : [operation, timeoutPromise];
      const result = await Promise.race(contenders);
      if (result === TIMEOUT || timedOut) return makeUsageResult('timeout');
      if (result === ABORTED || externallyAborted || signal?.aborted) throw abortError();
      return result;
    } catch (error) {
      if (signal?.aborted || externallyAborted) throw abortError();
      if (timedOut) return makeUsageResult('timeout');
      return makeUsageResult(statusForError(error));
    } finally {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onExternalAbort);
      if (resolveAbort) signal?.removeEventListener('abort', resolveAbort);
      if (handle) {
        try { handle.stdin?.end(); } catch {}
        try { handle.terminate(); } catch {}
        try { await handle.waitForExit(); } catch {}
      }
      watcher?.dispose();
    }
  };
}
