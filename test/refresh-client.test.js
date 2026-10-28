import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes)
  : node && typeof node === 'object' ? [node, ...nodes(node.children)] : [];
const start = Date.parse('2026-10-28T05:00:00Z');
const usage = (usedPercent = 24, fiveHour = null, weekly = null) => ({
  status: 'ok',
  windows: {
    fiveHour: { usedPercent, resetsAt: fiveHour === null ? null : new Date(start + fiveHour).toISOString() },
    weekly: { usedPercent: 45, resetsAt: weekly === null ? null : new Date(start + weekly).toISOString() },
  },
});

function harness(initial = usage()) {
  let plugin, current, cursor, now = start, timerId = 0, server = initial, fetcher;
  const views = new Map(), registrations = new Map(), timers = new Map(), listeners = new Map();
  const requests = [], disposers = [], stored = new Map();
  const add = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
  };
  const dispatch = (name) => { for (const fn of [...listeners.get(name) ?? []]) fn(); };
  const React = {
    createElement(type, props, ...children) {
      return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children };
    },
    useState(initialValue) {
      const hooks = current.hooks, i = cursor++;
      if (!(i in hooks)) hooks[i] = { value: typeof initialValue === 'function' ? initialValue() : initialValue };
      return [hooks[i].value, (next) => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }];
    },
    useRef(value) { return current.hooks[cursor++] ??= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useId() { return `${current.id}-${cursor++}`; },
    useSyncExternalStore(subscribe, getSnapshot) {
      const hooks = current.hooks, view = current, i = cursor++;
      if (!(i in hooks)) hooks[i] = {
        kind: 'external', getSnapshot,
        cleanup: subscribe(() => view.updates.push(getSnapshot())),
      };
      return getSnapshot();
    },
    useEffect(fn, deps) {
      const hooks = current.hooks, i = cursor++, previous = hooks[i];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        current.pending.push(() => {
          previous?.cleanup?.();
          hooks[i] = { deps, cleanup: fn() };
        });
      }
    },
  };
  const window = {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } },
    localStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    addEventListener: add,
    removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
    dispatchEvent: (event) => { dispatch(event.type); return true; },
  };
  const timer = (fn, delay, period) => {
    timers.set(++timerId, { fn, due: now + delay, period });
    return timerId;
  };
  vm.runInNewContext(source, {
    window, document: { documentElement: { lang: 'zh' } }, Intl, Event, AbortController,
    Date: class extends Date { static now() { return now; } },
    setInterval: (fn, delay) => timer(fn, delay, delay), clearInterval: (id) => timers.delete(id),
    setTimeout: (fn, delay) => timer(fn, delay, 0), clearTimeout: (id) => timers.delete(id),
    fetch: async (url, options) => {
      if (url.includes('/auth')) return Response.json({ phase: 'idle', account: { email: 'test@example.com' } });
      const request = { url, signal: options.signal, at: now };
      requests.push(request);
      return fetcher ? fetcher(request, requests.length) : Response.json(server);
    },
  });
  plugin.apply({
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); },
    locale: { register() {}, bind: () => (key) => key },
    slots: { inject: (_name, fn) => fn(), register: (options, component) => registrations.set(options.name, component) },
  });
  const render = (id) => {
    const view = views.get(id);
    current = view; cursor = 0; view.pending = [];
    view.tree = registrations.get(view.slot)({ wide: true });
    for (const commit of view.pending) commit();
    return view.tree;
  };
  return {
    requests, timers, views, stored,
    mount(id, slot) { views.set(id, { id, slot, hooks: [], updates: [], pending: [] }); return render(id); },
    render, dispatch,
    snapshot(id) { return views.get(id).hooks.find((hook) => hook?.kind === 'external').getSnapshot().snapshot; },
    unmount(id) { for (const hook of views.get(id).hooks) hook?.cleanup?.(); views.delete(id); },
    setServer(value) { server = value; },
    setFetcher(value) { fetcher = value; },
    polls: () => [...timers.values()].filter((value) => value.period),
    dispose() { for (const dispose of disposers.reverse()) dispose(); },
    async advance(ms) {
      const target = now + ms;
      for (let count = 0; count < 100; count++) {
        const next = [...timers.entries()].filter(([, value]) => value.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) { now = target; return; }
        const [id, value] = next;
        now = Math.max(now, value.due);
        if (value.period) value.due += value.period;
        else timers.delete(id);
        value.fn();
        await flush();
      }
      assert.fail('Timers did not settle; possible reset refresh loop');
    },
  };
}

const sidebar = 'sidebar.footer.action';
const dock = 'conversation.composer.dock';
const settings = 'settings.section';

test('late-mounted footer and multiple conversations share one clock, request and snapshot with the sidebar', async () => {
  const app = harness();
  app.mount('sidebar', sidebar);
  await flush();
  await app.advance(10000);
  app.mount('dock', dock);
  app.mount('second-dock', dock);
  await flush();
  assert.equal(app.requests.length, 1);
  assert.equal(app.polls().length, 1);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  app.setServer(usage(31));
  await app.advance(50000);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].url, '/api/dsh-codex-usage?refresh=1');
  assert.equal(app.snapshot('sidebar').windows.fiveHour.usedPercent, 31);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  assert.strictEqual(app.views.get('sidebar').updates.at(-1), app.views.get('dock').updates.at(-1));
  assert.strictEqual(app.snapshot('dock'), app.snapshot('second-dock'));
  app.dispose();
});

test('manual refresh and interval preference changes update every surface without a second request', async () => {
  const app = harness();
  app.mount('sidebar', sidebar); app.mount('dock', dock); app.mount('settings', settings);
  await flush();
  app.setServer(usage(50));
  const button = nodes(app.render('settings')).find((node) => node.type === 'button' && node.children.includes('refresh'));
  button.props.onClick();
  await flush();
  assert.equal(app.requests.length, 2);
  assert.equal(app.snapshot('sidebar').windows.fiveHour.usedPercent, 50);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  assert.strictEqual(app.snapshot('dock'), app.snapshot('settings'));
  app.stored.set('dsh-codex-usage.refresh-interval', '300000');
  app.dispatch('dsh-codex-usage-preferences-change');
  assert.equal(app.polls().length, 1);
  assert.equal(app.polls()[0].period, 300000);
  await app.advance(60000);
  assert.equal(app.requests.length, 2);
  await app.advance(240000);
  assert.equal(app.requests.length, 3);
  app.dispose();
});

test('each window forces a refresh at reset independently of a 30-minute polling interval', async () => {
  const app = harness(usage(24, 10000, 20000));
  app.stored.set('dsh-codex-usage.refresh-interval', '1800000');
  app.mount('sidebar', sidebar); app.mount('dock', dock);
  await flush();
  await app.advance(9999);
  assert.equal(app.requests.length, 1);
  await app.advance(1);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].url, '/api/dsh-codex-usage?refresh=1');
  assert.equal(app.requests[1].at, start + 10000);
  // The upstream may still return the old reset time; it must not cause a loop.
  await app.advance(9999);
  assert.equal(app.requests.length, 2);
  app.setServer(usage(12, 30000, 20000));
  await app.advance(1);
  assert.equal(app.requests.length, 3);
  assert.equal(app.requests[2].at, start + 20000);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  await app.advance(10000);
  assert.equal(app.requests.length, 4);
  assert.equal(app.requests[3].at, start + 30000);
  app.dispose();
});

test('simultaneous resets and cached expired reset times each trigger one forced refresh', async () => {
  for (const reset of [10000, -10000]) {
    const app = harness(usage(24, reset, reset));
    app.mount('sidebar', sidebar); app.mount('dock', dock);
    await flush();
    await app.advance(Math.max(0, reset));
    assert.equal(app.requests.length, 2);
    assert.equal(app.requests[1].url, '/api/dsh-codex-usage?refresh=1');
    await app.advance(1000);
    assert.equal(app.requests.length, 2);
    app.dispose();
  }
});

test('a periodic refresh at the exact reset time also satisfies the forced reset refresh', async () => {
  const app = harness(usage(24, 60000, 60000));
  app.mount('sidebar', sidebar); app.mount('dock', dock);
  await flush();
  await app.advance(60000);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].url, '/api/dsh-codex-usage?refresh=1');
  assert.equal(app.requests[1].at, start + 60000);
  await app.advance(1000);
  assert.equal(app.requests.length, 2);
  app.dispose();
});

test('logout clears every surface and prevents a late usage response from restoring the old account', async () => {
  const app = harness();
  app.mount('sidebar', sidebar); app.mount('dock', dock); app.mount('settings', settings);
  await flush();
  let finish;
  app.setFetcher(() => new Promise((resolve) => { finish = resolve; }));
  app.dispatch('dsh-codex-usage-change');
  const button = nodes(app.render('settings')).find((node) => node.type === 'button' && node.children.includes('logout'));
  button.props.onClick();
  await flush();
  assert.equal(app.requests[1].signal.aborted, true);
  assert.equal(app.snapshot('sidebar').status, 'not-authenticated');
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  finish(Response.json(usage(90)));
  await flush();
  assert.equal(app.snapshot('dock').status, 'not-authenticated');
  assert.equal(app.snapshot('dock').windows.fiveHour, null);
  assert.equal(app.requests.length, 2);
  app.dispose();
});

test('a reset during an older request queues a forced query after that request settles', async () => {
  const app = harness(usage(24, 10000));
  app.mount('sidebar', sidebar); app.mount('dock', dock);
  await flush();
  let finish;
  app.setFetcher((_request, count) => count === 2
    ? new Promise((resolve) => { finish = resolve; }) : Response.json(usage(0, 100000)));
  await app.advance(5000);
  app.dispatch('dsh-codex-usage-change');
  assert.equal(app.requests.length, 2);
  await app.advance(5000);
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].signal.aborted, false);
  finish(Response.json(usage(25, 10000)));
  await flush();
  assert.equal(app.requests.length, 3);
  assert.equal(app.requests[2].url, '/api/dsh-codex-usage?refresh=1');
  assert.equal(app.requests[2].at, start + 10000);
  assert.equal(app.snapshot('sidebar').windows.fiveHour.usedPercent, 0);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  app.dispose();
});

test('hiding one surface preserves the shared request; hiding the last aborts it and ignores its late result', async () => {
  const app = harness();
  const pending = [];
  app.setFetcher(() => new Promise((resolve) => pending.push(resolve)));
  app.mount('sidebar', sidebar); app.mount('dock', dock);
  app.stored.set('dsh-codex-usage.display-settings', JSON.stringify({ enabled: false }));
  app.dispatch('dsh-codex-usage-preferences-change');
  assert.equal(app.render('sidebar'), null);
  assert.equal(app.requests[0].signal.aborted, false);
  assert.equal(app.polls().length, 1);
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showFiveHour: false, showWeekly: false }));
  app.dispatch('dsh-codex-usage-preferences-change');
  assert.equal(app.render('dock'), null);
  assert.equal(app.requests[0].signal.aborted, true);
  assert.equal(app.timers.size, 0);
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showWeekly: true }));
  app.dispatch('dsh-codex-usage-preferences-change');
  app.render('dock');
  assert.equal(app.requests.length, 2);
  pending[1](Response.json(usage(30)));
  await flush();
  pending[0](Response.json(usage(90)));
  await flush();
  assert.equal(app.snapshot('dock').windows.fiveHour.usedPercent, 30);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  app.dispose();
});

test('unmount and plugin disposal remove polling and reset timers without cancelling another active surface', async () => {
  const app = harness(usage(24, 10000, 20000));
  app.mount('sidebar', sidebar); app.mount('dock', dock); app.mount('settings', settings);
  await flush();
  app.unmount('sidebar');
  assert.equal(app.polls().length, 1);
  app.unmount('dock');
  assert.equal(app.polls().length, 0);
  assert.equal(app.timers.size, 1);
  app.unmount('settings');
  assert.equal(app.timers.size, 0);
  app.mount('dock', dock);
  await flush();
  app.dispose();
  assert.equal(app.timers.size, 0);
  await app.advance(120000);
  assert.equal(app.requests.length, 2);
});

test('failed refresh preserves the same stale limits in both surfaces until recovery', async () => {
  const app = harness();
  app.mount('sidebar', sidebar); app.mount('dock', dock);
  await flush();
  app.setServer({ status: 'timeout', windows: { fiveHour: null, weekly: null } });
  app.dispatch('dsh-codex-usage-change');
  await flush();
  await app.advance(4000);
  assert.equal(app.requests.length, 4);
  assert.equal(app.snapshot('sidebar').stale, true);
  assert.equal(app.snapshot('dock').windows.fiveHour.usedPercent, 24);
  assert.strictEqual(app.snapshot('sidebar'), app.snapshot('dock'));
  app.setServer(usage(33));
  app.dispatch('dsh-codex-usage-change');
  await flush();
  assert.equal(app.snapshot('dock').stale, undefined);
  assert.equal(app.snapshot('sidebar').windows.fiveHour.usedPercent, 33);
  app.dispose();
});
