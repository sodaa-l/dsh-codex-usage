import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { createAppServerReader } from '../src/app-server.js';

function createMockServer(options = {}) {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const messages = [];
  let terminated = false;
  let resolveExit;
  let rejectExit;
  const done = new Promise((resolve, reject) => {
    resolveExit = resolve;
    rejectExit = reject;
  });
  const onSpawn = options.onSpawn ?? (() => {});

  const stdin = new Writable({
    write(chunk, _encoding, callback) {
      const text = String(chunk);
      for (const line of text.split('\n')) {
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          callback(new Error('Mock received invalid request JSON.'));
          return;
        }
        messages.push(message);
        if (!Object.prototype.hasOwnProperty.call(message, 'id')) continue;

        queueMicrotask(() => {
          if (terminated || options.stall) return;
          if (message.method === options.malformedMethod) {
            stdout.write('not-json\n');
            return;
          }
          if (message.method === options.errorMethod) {
            stdout.write(`${JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              error: { code: -32000, message: 'mock private error detail' },
            })}\n`);
            return;
          }

          let result = {};
          if (message.method === 'account/read') {
            result = { account: options.account ?? { type: 'chatgpt' } };
          } else if (message.method === 'account/rateLimits/read') {
            result = options.limits ?? {
              rateLimits: {
                primary: { usedPercent: 17, windowDurationMins: 300, resetsAt: 1793163600 },
                secondary: { usedPercent: 52, windowDurationMins: 10080, resetsAt: 1793758800 },
              },
            };
          }
          stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n`);
        });
      }
      callback();
    },
  });

  const handle = {
    stdin,
    stdout,
    stderr,
    done,
    messages,
    get terminated() { return terminated; },
    terminate() {
      if (terminated) return;
      terminated = true;
      stdin.destroy();
      stdout.end();
      stderr.end();
      resolveExit();
    },
    async waitForExit() { await done; return true; },
  };
  onSpawn(handle);
  if (options.rejectDoneOnSpawn) {
    queueMicrotask(() => rejectExit(new Error('simulated private provider failure')));
  }
  return handle;
}

function readerFor(options = {}) {
  const calls = { resolved: [], specs: [], handles: [] };
  const readUsage = createAppServerReader({
    command: options.command ?? 'codex',
    cwd: 'C:\\project',
    timeoutMs: options.timeoutMs ?? 1000,
    resolveExecutable: async (command) => {
      calls.resolved.push(command);
      if (options.missing) throw new Error('Executable not found.');
      return options.resolvedExecutable ?? 'C:\\tools\\codex.exe';
    },
    spawn: async (spec) => {
      calls.specs.push(spec);
      const handle = createMockServer({ ...options, onSpawn: (value) => calls.handles.push(value) });
      return handle;
    },
  });
  return { readUsage, calls };
}

test('runs initialize, account/read, and rate limits over stdio JSON-RPC', async () => {
  const { readUsage, calls } = readerFor();
  const result = await readUsage();

  assert.equal(result.status, 'ok');
  assert.deepEqual(result.windows, {
    fiveHour: { usedPercent: 17, resetsAt: '2026-10-28T05:00:00.000Z' },
    weekly: { usedPercent: 52, resetsAt: '2026-11-04T02:20:00.000Z' },
  });
  assert.deepEqual(calls.resolved, ['codex']);
  assert.deepEqual(calls.specs[0].argv, ['C:\\tools\\codex.exe', 'app-server', '--listen', 'stdio://']);
  assert.deepEqual(calls.handles[0].messages.map((message) => message.method), [
    'initialize', 'initialized', 'account/read', 'account/rateLimits/read',
  ]);
  assert.equal(calls.handles[0].terminated, true);
});

test('reports API key authentication without requesting plan limits', async () => {
  const { readUsage, calls } = readerFor({ account: { type: 'apiKey' } });
  const result = await readUsage();

  assert.equal(result.status, 'unsupported-auth');
  assert.deepEqual(result.windows, { fiveHour: null, weekly: null });
  assert.deepEqual(calls.handles[0].messages.map((message) => message.method), [
    'initialize', 'initialized', 'account/read',
  ]);
  assert.equal(calls.handles[0].terminated, true);
});

test('reports Windows command wrappers with an actionable status', async () => {
  const { readUsage, calls } = readerFor({ resolvedExecutable: 'C:\\tools\\codex.cmd' });
  const result = await readUsage();

  assert.equal(result.status, 'cli-wrapper-unsupported');
  assert.equal(calls.specs.length, 0);
});

test('reports missing-cli without spawning a process', async () => {
  const { readUsage, calls } = readerFor({ missing: true });
  const result = await readUsage();

  assert.equal(result.status, 'missing-cli');
  assert.equal(calls.specs.length, 0);
  assert.equal(calls.handles.length, 0);
});

test('sanitizes malformed JSON-RPC responses and RPC error text', async () => {
  const malformed = readerFor({ malformedMethod: 'initialize' });
  assert.equal((await malformed.readUsage()).status, 'protocol-error');
  assert.equal(malformed.calls.handles[0].terminated, true);

  const rpcError = readerFor({ errorMethod: 'account/rateLimits/read' });
  const result = await rpcError.readUsage();
  assert.equal(result.status, 'rate-limits-unavailable');
  assert.equal(JSON.stringify(result).includes('mock private error detail'), false);
  assert.equal(rpcError.calls.handles[0].terminated, true);
});

test('observes rejected process completion while protocol reads are pending', async () => {
  const { readUsage, calls } = readerFor({ stall: true, rejectDoneOnSpawn: true });
  const result = await readUsage();

  assert.equal(result.status, 'cli-error');
  assert.equal(calls.handles[0].terminated, true);
});

test('times out, terminates, and waits for the process to exit', async () => {
  const { readUsage, calls } = readerFor({ stall: true, timeoutMs: 25 });
  const result = await readUsage();

  assert.equal(result.status, 'timeout');
  assert.equal(calls.handles[0].terminated, true);
});

test('aborts a live request and cleans up its process', async () => {
  let resolveSpawned;
  const spawned = new Promise((resolve) => { resolveSpawned = resolve; });
  const calls = { handles: [] };
  const readUsage = createAppServerReader({
    command: 'codex',
    cwd: 'C:\\project',
    timeoutMs: 1000,
    resolveExecutable: async () => 'codex.exe',
    spawn: async () => {
      const handle = createMockServer({ stall: true, onSpawn: resolveSpawned });
      calls.handles.push(handle);
      return handle;
    },
  });
  const controller = new AbortController();
  const pending = readUsage({ signal: controller.signal });
  await spawned;
  controller.abort();

  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls.handles[0].terminated, true);
});

test('does not start when already aborted', async () => {
  let spawnCount = 0;
  const readUsage = createAppServerReader({
    resolveExecutable: async () => 'codex.exe',
    spawn: async () => { spawnCount += 1; throw new Error('should not spawn'); },
  });
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(readUsage({ signal: controller.signal }), { name: 'AbortError' });
  assert.equal(spawnCount, 0);
});

test('observes stdin and stderr errors and removes temporary listeners', async () => {
  for (const name of ['stdin', 'stderr']) {
    const { readUsage, calls } = readerFor({ stall: true });
    const pending = readUsage();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const handle = calls.handles[0];
    handle[name].emit('error', new Error('simulated private stream failure'));

    assert.equal((await pending).status, 'cli-error');
    assert.equal(handle[name].listenerCount('error'), 0);
    assert.equal(handle.terminated, true);
  }
});

test('cleans up a process handle that resolves after timeout', async () => {
  let resolveSpawn;
  const delayedSpawn = new Promise((resolve) => { resolveSpawn = resolve; });
  const readUsage = createAppServerReader({
    command: 'codex',
    cwd: 'C:\\project',
    timeoutMs: 20,
    resolveExecutable: async () => 'codex.exe',
    spawn: () => delayedSpawn,
  });

  assert.equal((await readUsage()).status, 'timeout');
  const handle = createMockServer({ stall: true, rejectDoneOnSpawn: true });
  resolveSpawn(handle);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(handle.terminated, true);
});
