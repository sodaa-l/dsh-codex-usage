import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('registers settings and sidebar; shows remaining quota with body font tokens', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  const registrations = [];
  const React = {
    createElement(type, props, ...children) {
      if (typeof type === 'function') return type({ ...props, children });
      return { type, props: props ?? {}, children };
    },
    useState(initial) {
      if (initial === null) return [{ status: 'ok', windows: { fiveHour: { usedPercent: 24, resetsAt: null }, weekly: { usedPercent: 0, resetsAt: null } } }, () => {}];
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: () => {},
  };
  let plugin;
  const context = { window: { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } }, localStorage: { getItem: () => null } }, document: { documentElement: { lang: 'zh' } }, Event, Intl };
  vm.runInNewContext(source, context);
  const ctx = { effect: (fn) => fn(), locale: { register: () => {}, bind: () => (key, vars) => vars?.percent === undefined ? key : `${key}:${vars.percent}` }, slots: { inject: (_name, fn) => fn(), register: (options, component) => { registrations.push({ options, component }); } } };
  plugin.apply(ctx);
  assert.deepEqual(registrations.map((x) => x.options.name).sort(), ['settings.section', 'sidebar.footer.action']);
  const card = registrations.find((x) => x.options.name === 'sidebar.footer.action').component({ wide: true });
  const text = JSON.stringify(card);
  assert.match(text, /used:76/);
  assert.match(text, /"aria-valuenow":76/);
  assert.match(text, /--dsw-font-family/);
  assert.match(text, /font-size: 12px/);
  assert.doesNotMatch(text, /font-weight: 600/);
  assert.doesNotMatch(text, /loginStarting/);
  const settings = registrations.find((x) => x.options.name === 'settings.section').component();
  assert.match(JSON.stringify(settings), /refreshPeriod/);
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
