import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function settingsHarness(fetchImpl) {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  const hooks = [], effects = [], timers = new Map();
  let plugin, component, cursor = 0, timerId = 0, changes = 0;
  const React = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], (v) => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useSyncExternalStore(_subscribe, getSnapshot) { cursor++; return getSnapshot(); },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn) { cursor++; effects.push(fn); },
  };
  const window = {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } },
    localStorage: { getItem: () => null }, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { changes++; }, open: () => ({ location: {}, close() {} }),
  };
  vm.runInNewContext(source, { window, document: { documentElement: { lang: 'zh' } }, Event, Intl, AbortController,
    setInterval: (fn) => { timers.set(++timerId, fn); return timerId; }, clearInterval: (id) => timers.delete(id),
    setTimeout: (fn) => { queueMicrotask(fn); return 1; }, clearTimeout() {}, fetch: fetchImpl,
  });
  plugin.apply({ effect: (fn) => fn(), locale: { register() {}, bind: () => (key) => key }, slots: { inject: (_name, fn) => fn(), register: (options, fn) => { if (options.name === 'settings.section') component = fn; } } });
  const render = () => { cursor = 0; effects.length = 0; return component(); };
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.children)] : [];
  const button = (name) => {
    const found = nodes(render()).find((node) => node.type === 'button' && node.children.includes(name));
    assert.ok(found, `Missing ${name} button`);
    return found;
  };
  render();
  return { render, button, find: (predicate) => nodes(render()).find(predicate), effects, timers, changes: () => changes };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const noUsage = (status) => ({ status, windows: { fiveHour: null, weekly: null } });

test('stored account keeps sign-out available while usage fails or reports unauthenticated', async () => {
  for (const status of ['not-authenticated', 'rate-limits-unavailable', 'timeout', 'unavailable']) {
    const ui = await settingsHarness(async (url) => Response.json(url.endsWith('/auth')
      ? { phase: 'idle', account: { email: 'test@example.com' } } : noUsage(status)));
    ui.effects[1]();
    ui.effects[3]();
    await tick();
    ui.button('logout');
    const text = JSON.stringify(ui.render());
    assert.match(text, /accountConnected/);
    assert.doesNotMatch(text, /statusNotAuthenticated|loginFailed/);
  }
});

test('usage success keeps sign-out available when account status lookup fails', async () => {
  const ui = await settingsHarness(async (url) => {
    if (url.endsWith('/auth')) throw new TypeError('fetch failed');
    return Response.json({ status: 'ok', windows: { fiveHour: { usedPercent: 20 }, weekly: null } });
  });
  ui.effects[1]();
  ui.effects[3]();
  await tick();
  ui.button('logout');
  assert.match(JSON.stringify(ui.render()), /authStatusFailed/);
});

test('failed logout keeps account and retry button; successful logout clears usage without a new query', async () => {
  let failLogout = true, usageCalls = 0;
  const ui = await settingsHarness(async (url) => {
    if (url.includes('action=logout')) {
      if (failLogout) throw new TypeError('fetch failed');
      return Response.json({ phase: 'idle' });
    }
    if (url.endsWith('/auth')) return Response.json({ phase: 'idle', account: { email: 'test@example.com' } });
    usageCalls++;
    return Response.json({ status: 'ok', windows: { fiveHour: { usedPercent: 20 }, weekly: null } });
  });
  ui.effects[1]();
  ui.effects[3]();
  await tick();
  ui.button('logout').props.onClick();
  await tick();
  assert.match(JSON.stringify(ui.render()), /logoutFailed/);
  assert.match(JSON.stringify(ui.render()), /test@example.com/);
  assert.doesNotMatch(JSON.stringify(ui.render()), /loginFailed/);
  failLogout = false;
  ui.button('logout').props.onClick();
  await tick();
  ui.button('login');
  assert.equal(usageCalls, 1);
  assert.equal(ui.changes(), 0);
  assert.doesNotMatch(JSON.stringify(ui.render()), /accountConnected|test@example.com|logoutFailed/);
});

test('late auth polling cannot restore a cancelled account', async () => {
  let finishPoll;
  let polls = 0, loginStarted = false;
  const ui = await settingsHarness(async (url) => {
    if (url.includes('action=start')) { loginStarted = true; return Response.json({ phase: 'waiting', authUrl: 'https://auth.openai.com/test' }); }
    if (url.includes('action=cancel')) return Response.json({ phase: 'idle' });
    if (!loginStarted) return Response.json({ phase: 'idle', account: null });
    polls++;
    return new Promise((resolve) => { finishPoll = resolve; });
  });
  ui.effects[3]();
  await tick();
  ui.button('login').props.onClick();
  await tick();
  ui.render();
  const stop = ui.effects[4]();
  const poll = [...ui.timers.values()][0];
  const pending = poll();
  ui.button('cancelLogin').props.onClick();
  await tick();
  finishPoll(Response.json({ phase: 'authenticated', account: { email: 'late@example.com' } }));
  await pending;
  ui.button('login');
  assert.doesNotMatch(JSON.stringify(ui.render()), /late@example.com|accountConnected/);
  assert.equal(polls, 1);
  stop();
});

test('initial loading does not offer sign-in before account state is known', async () => {
  let finish;
  const ui = await settingsHarness(async (url) => url.endsWith('/auth')
    ? new Promise((resolve) => { finish = resolve; }) : Response.json(noUsage('not-authenticated')));
  const loginButton = () => ui.find((node) => node.type === 'button' && node.children.includes('login'));
  assert.equal(loginButton(), undefined);
  ui.effects[1]();
  ui.effects[3]();
  await tick();
  assert.equal(loginButton(), undefined);
  assert.doesNotMatch(JSON.stringify(ui.render()), /statusNotAuthenticated/);
  finish(Response.json({ phase: 'idle', account: { email: 'test@example.com' } }));
  await tick();
  ui.button('logout');
  assert.equal(loginButton(), undefined);
});

test('transient polling failure keeps manual callback and sign-in polling working', async () => {
  let polls = 0, submitted;
  const ui = await settingsHarness(async (url, options) => {
    if (url.includes('action=start')) return Response.json({ phase: 'waiting', authUrl: 'https://auth.openai.com/test' });
    if (url.includes('action=submit')) { submitted = JSON.parse(options.body); return Response.json({ phase: 'waiting' }); }
    if (!url.endsWith('/auth')) return Response.json({ status: 'ok', windows: { fiveHour: null, weekly: null } });
    if (polls++ === 0) return Response.json({ phase: 'idle', account: null });
    if (polls === 2) throw new TypeError('fetch failed');
    return Response.json({ phase: 'authenticated', account: { email: 'test@example.com' } });
  });
  ui.effects[3]();
  await tick();
  ui.button('login').props.onClick();
  await tick();
  ui.render();
  const stop = ui.effects[4]();
  const poll = [...ui.timers.values()][0];
  await poll();
  ui.button('cancelLogin');
  assert.match(JSON.stringify(ui.render()), /authStatusFailed/);
  ui.find((node) => node.type === 'input' && node.props['aria-label'] === 'manualPrompt').props.onChange({ target: { value: 'http://localhost/callback?code=test&state=test' } });
  ui.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.deepEqual(submitted, { value: 'http://localhost/callback?code=test&state=test' });
  ui.button('cancelLogin');
  await poll();
  ui.button('logout');
  assert.doesNotMatch(JSON.stringify(ui.render()), /authStatusFailed|loginFailed/);
  stop();
});
