import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('registers settings and sidebar; persists display switches and handles weekly-only plans', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  const registrations = [];
  let snapshot = { status: 'ok', windows: { fiveHour: { usedPercent: 24, resetsAt: null }, weekly: { usedPercent: 0, resetsAt: null } } };
  const React = {
    createElement(type, props, ...children) {
      if (typeof type === 'function') return type({ ...props, children });
      return { type, props: props ?? {}, children };
    },
    useState(initial) {
      if (initial === null) return [snapshot, () => {}];
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: () => {},
  };
  const stored = new Map();
  let plugin;
  const browserWindow = {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } },
    localStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    dispatchEvent: () => true,
  };
  const context = { window: browserWindow, document: { documentElement: { lang: 'zh' } }, Event, Intl };
  vm.runInNewContext(source, context);
  const ctx = { effect: (fn) => fn(), locale: { register: () => {}, bind: () => (key, vars) => vars?.percent === undefined ? key : `${key}:${vars.percent}` }, slots: { inject: (_name, fn) => fn(), register: (options, component) => { registrations.push({ options, component }); } } };
  plugin.apply(ctx);
  assert.deepEqual(registrations.map((x) => x.options.name).sort(), ['settings.section', 'sidebar.footer.action']);
  const sidebar = registrations.find((x) => x.options.name === 'sidebar.footer.action').component;
  const card = sidebar({ wide: true });
  const text = JSON.stringify(card);
  assert.match(text, /used:76/);
  assert.match(text, /"aria-valuenow":76/);
  assert.match(text, /--dsw-font-family/);
  assert.match(text, /font-size: 12px/);
  assert.doesNotMatch(text, /font-weight: 600/);
  assert.doesNotMatch(text, /loginStarting/);

  snapshot = { status: 'ok', windows: { fiveHour: null, weekly: { usedPercent: 24, resetsAt: null } } };
  const weeklyOnly = JSON.stringify(sidebar({ wide: true }));
  assert.match(weeklyOnly, /weekly/);
  assert.doesNotMatch(weeklyOnly, /fiveHour/);
  snapshot = { status: 'unavailable', windows: { fiveHour: null, weekly: { usedPercent: 24, resetsAt: null } }, stale: true };
  const staleWeeklyOnly = JSON.stringify(sidebar({ wide: true }));
  assert.match(staleWeeklyOnly, /weekly/);
  assert.doesNotMatch(staleWeeklyOnly, /fiveHour|unavailable/);
  snapshot = { status: 'rate-limits-unavailable', windows: { fiveHour: null, weekly: null } };
  const unavailable = JSON.stringify(sidebar({ wide: true }));
  assert.match(unavailable, /fiveHour/);
  assert.match(unavailable, /unavailable/);
  snapshot = { status: 'ok', windows: { fiveHour: { usedPercent: 24, resetsAt: null }, weekly: { usedPercent: 0, resetsAt: null } } };

  const findNodes = (node, predicate, matches = []) => {
    if (Array.isArray(node)) node.forEach((child) => findNodes(child, predicate, matches));
    else if (node && typeof node === 'object') {
      if (predicate(node)) matches.push(node);
      findNodes(node.children, predicate, matches);
    }
    return matches;
  };
  const settingsComponent = registrations.find((x) => x.options.name === 'settings.section').component;
  let settings = settingsComponent();
  assert.match(JSON.stringify(settings), /settingsTitle/);
  let switches = findNodes(settings, (node) => node.props?.role === 'switch');
  assert.equal(switches.length, 3);
  assert.ok(switches.every((node) => node.props.checked));
  switches.find((node) => node.props.id === 'dcu-show-five-hour').props.onChange({ target: { checked: false } });
  assert.deepEqual(JSON.parse(stored.get('dsh-codex-usage.display-settings')), { enabled: true, showFiveHour: false, showWeekly: true });
  const hiddenFiveHour = JSON.stringify(sidebar({ wide: true }));
  assert.doesNotMatch(hiddenFiveHour, /fiveHour/);
  settings = settingsComponent();
  switches = findNodes(settings, (node) => node.props?.role === 'switch');
  switches.find((node) => node.props.id === 'dcu-show-weekly').props.onChange({ target: { checked: false } });
  assert.deepEqual(JSON.parse(stored.get('dsh-codex-usage.display-settings')), { enabled: true, showFiveHour: false, showWeekly: false });
  settings = settingsComponent();
  switches = findNodes(settings, (node) => node.props?.role === 'switch');
  switches.find((node) => node.props.id === 'dcu-sidebar-enabled').props.onChange({ target: { checked: false } });
  assert.deepEqual(JSON.parse(stored.get('dsh-codex-usage.display-settings')), { enabled: false, showFiveHour: false, showWeekly: false });
  assert.equal(sidebar({ wide: true }), null);
});

test('disabling the sidebar hides the card and stops its request timer', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  const effects = [], listeners = {};
  let plugin, component, fetchCalls = 0, intervalCalls = 0, clearedIntervals = 0;
  let displayValue = JSON.stringify({ enabled: true, showFiveHour: true, showWeekly: true });
  const React = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }; },
    useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
    useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn),
  };
  const window = {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } },
    localStorage: { getItem: (key) => key === 'dsh-codex-usage.display-settings' ? displayValue : null },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: (name) => { delete listeners[name]; },
    dispatchEvent: () => true,
  };
  vm.runInNewContext(source, { window, document: { documentElement: { lang: 'zh' } }, Event, Intl, AbortController,
    setInterval: () => { intervalCalls++; return intervalCalls; }, clearInterval: () => { clearedIntervals++; },
    setTimeout, clearTimeout,
    fetch: async () => { fetchCalls++; return { ok: true, json: async () => ({ status: 'ok', windows: { fiveHour: null, weekly: null } }) }; },
  });
  plugin.apply({ effect: (fn) => fn(), locale: { register() {}, bind: () => (key) => key }, slots: { inject: (_name, fn) => fn(), register: (options, fn) => { if (options.name === 'sidebar.footer.action') component = fn; } } });
  component({ wide: true });
  const stop = effects[1]();
  assert.equal(fetchCalls, 1);
  assert.equal(intervalCalls, 1);
  displayValue = JSON.stringify({ enabled: false, showFiveHour: true, showWeekly: true });
  stop();
  assert.equal(clearedIntervals, 1);
  effects.length = 0;
  assert.equal(component({ wide: true }), null);
  effects[1]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCalls, 1);
  assert.equal(intervalCalls, 1);
});

test('waits for the actual slots when sidebar parents appear before their children', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  let plugin;
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => ({})); } } } });
  const declared = new Set(['sidebar', 'sidebar.settings']);
  const pending = new Map();
  const registrations = [];
  const slots = {
    inject(name, callback) {
      if (declared.has(name)) callback();
      else pending.set(name, callback);
    },
    register(options) {
      assert.ok(declared.has(options.name), `${options.name} must be declared before registration`);
      registrations.push(options.name);
      return () => {};
    },
  };
  plugin.apply({ effect: (fn) => fn(), locale: { register() {}, bind: () => () => '' }, slots });
  assert.equal(registrations.length, 0);
  for (const name of ['sidebar.footer.action', 'settings.section']) {
    declared.add(name);
    pending.get(name)?.();
  }
  assert.deepEqual(registrations.sort(), ['settings.section', 'sidebar.footer.action']);
});

test('refresh retries failures and keeps last successful windows marked stale', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  let plugin, component, cursor = 0, calls = 0;
  const hooks = [], effects = [], listeners = {};
  const ok = { status: 'ok', windows: { fiveHour: { usedPercent: 21, resetsAt: null }, weekly: null } };
  const failed = { status: 'unavailable', windows: { fiveHour: null, weekly: null } };
  const React = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; return [hooks[i], (v) => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn) { cursor++; effects.push(fn); },
  };
  const window = { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } }, localStorage: { getItem: () => null }, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} };
  const context = { window, document: { documentElement: { lang: 'zh' } }, Event, Intl, AbortController, setInterval: () => 1, clearInterval() {}, setTimeout: (fn) => { queueMicrotask(fn); return 1; }, clearTimeout() {}, fetch: async () => ({ ok: true, json: async () => (++calls === 1 ? ok : failed) }) };
  vm.runInNewContext(source, context);
  plugin.apply({ effect: (fn) => fn(), locale: { register() {}, bind: () => (key, vars) => vars?.percent === undefined ? key : `${key}:${vars.percent}` }, slots: { inject: (_name, fn) => fn(), register: (options, fn) => { if (options.name === 'sidebar.footer.action') component = fn; } } });
  const render = () => { cursor = 0; return component({ wide: true }); };
  render();
  effects[0]();
  effects[1]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(JSON.stringify(render()), /used:79/);
  listeners['dsh-codex-usage-change']();
  assert.match(JSON.stringify(render()), /used:79/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 4);
  const stale = JSON.stringify(render());
  assert.match(stale, /used:79/);
  assert.doesNotMatch(stale, /staleUsage/);
});
