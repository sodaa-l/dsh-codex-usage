import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const find = (node, predicate) => {
  if (Array.isArray(node)) return node.flatMap((child) => find(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...find(node.children, predicate)];
};

function harness() {
  const hooks = [], effects = [], stored = new Map(), listeners = new Map();
  let plugin, cursor = 0, calls = 0, timers = 0, cleared = 0, snapshot;
  const registrations = new Map();
  const React = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = initial === null ? snapshot : typeof initial === 'function' ? initial() : initial;
      return [hooks[i], (next) => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }];
    },
    useSyncExternalStore() { cursor++; return { snapshot, refreshing: false }; },
    useRef(current) { const i = cursor++; return hooks[i] ??= { current }; },
    useCallback(fn) { cursor++; return fn; },
    useId() { return `panel-${cursor++}`; },
    useEffect(fn, deps) { const i = cursor++; effects.push({ fn, deps, index: i }); },
  };
  const add = (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); };
  const remove = (name, fn) => listeners.get(name)?.delete(fn);
  const window = {
    __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React); } },
    localStorage: { getItem: (key) => stored.get(key) ?? null },
    addEventListener: add, removeEventListener: remove,
    innerWidth: 1000, innerHeight: 700,
  };
  vm.runInNewContext(source, {
    window, document: { documentElement: { lang: 'zh' }, addEventListener: add, removeEventListener: remove },
    Intl, Event, AbortController, setTimeout, clearTimeout,
    setInterval: () => ++timers, clearInterval: (id) => { if (id !== undefined) cleared++; },
    fetch: async () => { calls++; return { ok: true, json: async () => snapshot }; },
  });
  plugin.apply({ effect: (fn) => fn(), locale: { register() {}, bind: () => (key, vars) => vars?.percent === undefined ? key : `${key}:${vars.percent}` }, slots: { inject: (_name, fn) => fn(), register: (options, component) => registrations.set(options.name, { options, component }) } });
  return {
    stored, effects, listeners, registrations,
    setSnapshot(value) { snapshot = value; hooks[0] = snapshot; },
    render() { cursor = 0; effects.length = 0; return registrations.get('conversation.composer.dock').component(); },
    reset() { hooks.length = 0; },
    stats: () => ({ calls, timers, cleared }),
  };
}

const both = { status: 'ok', windows: { fiveHour: { usedPercent: 24, resetsAt: '2026-10-28T07:00:00Z' }, weekly: { usedPercent: 45, resetsAt: '2026-11-02T07:00:00Z' } } };

test('footer stays independent of sidebar and renders remaining limits with independent switches', () => {
  const app = harness();
  app.setSnapshot(both);
  app.stored.set('dsh-codex-usage.display-settings', JSON.stringify({ enabled: false, showFiveHour: false, showWeekly: false }));
  assert.equal(app.registrations.get('conversation.composer.dock').options.order, 1000);
  let tree = app.render();
  const progress = find(tree, (node) => node.props.role === 'progressbar');
  assert.deepEqual(progress.map((node) => node.props['aria-valuenow']), [76, 55]);
  assert.deepEqual(find(tree, (node) => node.props.className === 'dcu-dock-percent').map((node) => node.children[0]), ['76%', '55%']);
  assert.doesNotMatch(JSON.stringify(tree), /resetAt|resetUnknown/);
  assert.match(JSON.stringify(tree), /dockFiveHourShort/);
  const css = find(tree, (node) => node.type === 'style').map((node) => node.children.join('')).join('');
  assert.match(css, /order: 1000/);
  assert.doesNotMatch(css, /margin-inline-start: auto|dsh-composer-card-max-width/);
  assert.match(JSON.stringify(tree), /dockWeeklyShort/);
  assert.equal(find(tree, (node) => node.props.className === 'dcu-dock-limit').length, 2);
  assert.equal(find(tree, (node) => node.children?.includes('・')).length, 1);
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showFiveHour: false, showWeekly: true }));
  app.reset(); tree = app.render();
  assert.deepEqual(find(tree, (node) => node.props.role === 'progressbar').map((node) => node.props['aria-valuenow']), [55]);
  assert.equal(find(tree, (node) => node.children?.includes('・')).length, 0);
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showFiveHour: true, showWeekly: false }));
  app.reset(); tree = app.render();
  assert.deepEqual(find(tree, (node) => node.props.role === 'progressbar').map((node) => node.props['aria-valuenow']), [76]);
});

test('footer handles weekly-only, unavailable, stale windows and corrupt preferences', () => {
  const app = harness();
  app.stored.set('dsh-codex-usage.dock-settings', '{invalid');
  app.setSnapshot({ status: 'ok', windows: { fiveHour: null, weekly: both.windows.weekly } });
  let tree = app.render();
  assert.equal(find(tree, (node) => node.props.className === 'dcu-dock-limit').length, 1);
  assert.doesNotMatch(JSON.stringify(tree), /dockFiveHourShort/);
  app.setSnapshot({ status: 'unavailable', windows: { fiveHour: null, weekly: null } });
  tree = app.render();
  assert.equal(find(tree, (node) => node.props.role === 'progressbar').length, 2);
  assert.ok(find(tree, (node) => node.props.role === 'progressbar').every((node) => node.props['aria-valuenow'] === undefined));
  assert.deepEqual(find(tree, (node) => node.props.className === 'dcu-dock-percent').map((node) => node.children[0]), ['—', '—']);
  assert.match(find(tree, (node) => node.type === 'button')[0].props['aria-label'], /statusUnavailable/);
  app.setSnapshot({ ...both, status: 'unavailable', stale: true });
  tree = app.render();
  assert.deepEqual(find(tree, (node) => node.props.role === 'progressbar').map((node) => node.props['aria-valuenow']), [76, 55]);
  assert.doesNotMatch(find(tree, (node) => node.type === 'button')[0].props['aria-label'], /statusUnavailable/);
});

test('footer opens the complete shared card above its trigger and cleans up dismissal listeners', () => {
  const app = harness();
  app.setSnapshot(both);
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showFiveHour: false, showWeekly: true }));
  let tree = app.render();
  find(tree, (node) => node.type === 'button')[0].props.onClick();
  tree = app.render();
  const button = find(tree, (node) => node.type === 'button')[0];
  const panel = find(tree, (node) => node.props.role === 'dialog')[0];
  assert.equal(button.props['aria-expanded'], true);
  assert.equal(button.props['aria-controls'], panel.props.id);
  assert.equal(panel.props.popover, 'manual');
  assert.equal(find(panel, (node) => node.props.className === 'dcu-limit').length, 2);
  assert.equal(find(panel, (node) => node.props.className === 'dcu-reset' && node.children[0] === 'resetAt').length, 2);
  let shown = 0, focused = 0;
  const triggerElement = { getBoundingClientRect: () => ({ right: 950, top: 600 }), focus: () => { focused++; } };
  const panelElement = { isConnected: true, showPopover: () => { shown++; }, hidePopover() {}, getBoundingClientRect: () => ({ width: 280 }) };
  button.props.ref.current = triggerElement;
  panel.props.ref.current = panelElement;
  tree.props.ref.current = { contains: (target) => target === triggerElement || target === panelElement };
  const cleanup = app.effects.at(-1).fn();
  assert.equal(shown, 1);
  tree = app.render();
  assert.equal(find(tree, (node) => node.props.role === 'dialog')[0].props.style.bottom, 108);
  assert.equal(find(tree, (node) => node.props.role === 'dialog')[0].props.style.left, 670);
  for (const dismiss of app.listeners.get('pointerdown')) dismiss({ target: panelElement });
  assert.ok(find(app.render(), (node) => node.props.role === 'dialog').length);
  let prevented = 0, stopped = 0;
  for (const escape of app.listeners.get('keydown')) escape({ key: 'Escape', preventDefault: () => { prevented++; }, stopPropagation: () => { stopped++; } });
  assert.equal(find(app.render(), (node) => node.props.role === 'dialog').length, 0);
  assert.equal(focused, 1); assert.equal(prevented, 1); assert.equal(stopped, 1);
  panelElement.isConnected = false;
  panelElement.hidePopover = () => { throw new Error('cannot hide a detached popover'); };
  cleanup();
  for (const name of ['pointerdown', 'keydown', 'scroll', 'resize']) assert.equal(app.listeners.get(name)?.size, 0);
  tree = app.render();
  find(tree, (node) => node.type === 'button')[0].props.onClick();
  assert.ok(find(app.render(), (node) => node.props.role === 'dialog').length);
  tree.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
  assert.equal(find(app.render(), (node) => node.props.role === 'dialog').length, 0);
});

test('both footer switches off hide the control and stop requests and polling', async () => {
  const app = harness();
  app.setSnapshot(both);
  app.render();
  const stop = app.effects[1].fn();
  assert.deepEqual(app.stats(), { calls: 1, timers: 1, cleared: 0 });
  stop();
  app.stored.set('dsh-codex-usage.dock-settings', JSON.stringify({ showFiveHour: false, showWeekly: false }));
  app.reset();
  assert.equal(app.render(), null);
  app.effects[1].fn();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(app.stats(), { calls: 1, timers: 1, cleared: 1 });
});
