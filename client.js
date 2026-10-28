window.__ModuleLoader__.load({
  id: 'dsh-codex-usage',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const namespace = 'dsh-codex-usage';
    const apiPath = '/api/dsh-codex-usage';
    const statuses = [
      'ok', 'not-authenticated', 'timeout', 'rate-limits-unavailable', 'unavailable',
    ];
    const statusKeys = {
      'not-authenticated': 'statusNotAuthenticated',
      timeout: 'statusTimeout',
      'rate-limits-unavailable': 'statusRateLimitsUnavailable',
      unavailable: 'statusUnavailable',
    };
    const dictionaries = {
      en: {
        login: 'Sign in', cancelLogin: 'Cancel', logout: 'Sign out', loginStarting: 'Preparing sign-in…', loginFailed: 'Sign-in failed. Please try again.', browserPrompt: 'Complete sign-in in your browser.', openBrowser: 'Open sign-in page', manualPrompt: 'If the callback fails, paste the redirected URL here:', submitCallback: 'Submit',
        logoutFailed: 'Could not sign out. Please try again.', authStatusFailed: 'Could not read sign-in status. Please try again.',
        accountEmail: 'Email', accountPlan: 'Plan', accountId: 'Account ID', accountConnected: 'Connected',
        staleUsage: 'Refresh failed; showing the last available usage.',
        title: 'Codex usage',
        fiveHour: '5-hour limit',
        weekly: 'Weekly limit',
        fiveHourShort: '5h',
        weeklyShort: 'Week',
        dockFiveHourShort: '5h', dockWeeklyShort: '1w', dockDisplay: 'Footer display', dockDisplayHint: 'Show limits at the right of the footer. Turn off both to hide the control.', dockFiveHourDisplayHint: 'Show the 5-hour limit in the footer.', dockWeeklyDisplayHint: 'Show the weekly limit in the footer.',
        used: 'Remaining {percent}%',
        usedShort: '{percent}% left',
        settingsTitle: 'Codex usage', account: 'Account', accountHint: 'Connect your ChatGPT account to view Codex limits.', sidebarDisplay: 'Sidebar display', sidebarDisplayHint: 'Show the Codex usage card in the sidebar.', fiveHourDisplay: '5-hour limit', fiveHourDisplayHint: 'Show the 5-hour limit in the sidebar.', weeklyDisplay: 'Weekly limit', weeklyDisplayHint: 'Show the weekly limit in the sidebar.', refreshTitle: 'Refresh usage', refreshHint: 'Update the displayed limits now.', refreshPeriod: 'Refresh interval', everyMinute: '1 minute', everyFiveMinutes: '5 minutes', everyFifteenMinutes: '15 minutes', everyThirtyMinutes: '30 minutes', settingsHint: 'The interval is saved in this browser.', saveFailed: 'Could not save this setting in this browser.',
        resetAt: '{time} Reset',
        resetShort: '{time} Reset',
        resetUnknown: 'Reset time unavailable',
        unavailable: 'Usage unavailable',
        loading: 'Loading usage…',
        refresh: 'Refresh Codex usage',
        statusNotAuthenticated: 'Sign in to Codex with your ChatGPT account to read plan limits.',
        statusTimeout: 'Codex usage request timed out.',
        statusRateLimitsUnavailable: 'Codex usage limits are not available right now.',
        statusUnavailable: 'Codex usage could not be loaded.',
      },
      zh: {
        login: '登录', cancelLogin: '取消', logout: '退出登录', loginStarting: '正在准备登录…', loginFailed: '登录失败，请重试。', browserPrompt: '请在浏览器中完成登录。', openBrowser: '打开登录页面', manualPrompt: '如果自动回调失败，请粘贴浏览器跳转后的地址：', submitCallback: '提交',
        logoutFailed: '退出登录失败，请重试。', authStatusFailed: '无法读取登录状态，请重试。',
        accountEmail: '邮箱', accountPlan: '套餐', accountId: '账号 ID', accountConnected: '已连接',
        staleUsage: '刷新失败，显示上次获取的额度。',
        title: 'Codex 用量',
        fiveHour: '5 小时限额',
        weekly: '每周限额',
        fiveHourShort: '5小时',
        weeklyShort: '每周',
        dockFiveHourShort: '5h', dockWeeklyShort: '1 周', dockDisplay: '底栏显示', dockDisplayHint: '在底栏右端显示额度，关闭两项即可隐藏控件。', dockFiveHourDisplayHint: '在底栏显示 5 小时限额。', dockWeeklyDisplayHint: '在底栏显示每周限额。',
        used: '剩余 {percent}%',
        usedShort: '剩余 {percent}%',
        settingsTitle: 'Codex 额度显示', account: '账号', accountHint: '连接 ChatGPT 账号以查看 Codex 额度', sidebarDisplay: '侧栏总开关', sidebarDisplayHint: '在侧栏显示 Codex 用量卡片。', fiveHourDisplay: '5 小时限额', fiveHourDisplayHint: '在侧栏显示 5 小时限额。', weeklyDisplay: '每周限额', weeklyDisplayHint: '在侧栏显示每周限额。', refreshTitle: '刷新用量', refreshHint: '立即更新显示的额度', refreshPeriod: '刷新周期', everyMinute: '1 分钟', everyFiveMinutes: '5 分钟', everyFifteenMinutes: '15 分钟', everyThirtyMinutes: '30 分钟', settingsHint: '刷新周期保存在当前浏览器中', saveFailed: '无法在当前浏览器中保存设置。',
        resetAt: '{time} 重置',
        resetShort: '{time} 重置',
        resetUnknown: '重置时间不可用',
        unavailable: '用量不可用',
        loading: '正在读取用量…',
        refresh: '刷新 Codex 用量',
        statusNotAuthenticated: '请使用 ChatGPT 账户登录 Codex，以读取套餐限额。',
        statusTimeout: '读取 Codex 用量超时。',
        statusRateLimitsUnavailable: '目前无法读取 Codex 用量限额。',
        statusUnavailable: '无法读取 Codex 用量。',
      },
    };

    // OpenAI Blossom from the user-provided OpenAI logos archive.
    const openAiPath = "M508.749 317.399C516.777 287.314 508.991 253.884 485.389 230.282C461.788 206.681 428.36 198.895 398.273 206.923C376.231 184.928 343.39 174.956 311.148 183.596C278.906 192.234 255.45 217.292 247.36 247.361C217.291 255.451 192.233 278.91 183.595 311.149C174.957 343.391 184.927 376.232 206.924 398.274C198.896 428.359 206.683 461.789 230.284 485.391C253.885 508.992 287.313 516.779 317.401 508.75C339.442 530.745 372.286 540.717 404.525 532.079C436.767 523.441 460.223 498.384 468.313 468.315C498.383 460.224 523.44 436.766 532.078 404.526C540.716 372.285 530.747 339.443 508.749 317.402V317.399ZM470.899 244.776C486.892 260.77 493.488 282.601 490.687 303.412L415.577 260.046C412.411 258.218 408.509 258.218 405.345 260.046L317.401 310.82V277.526C317.401 275.191 318.652 273.005 320.676 271.837L387.644 233.174C414.178 218.353 448.346 222.223 470.901 244.776H470.899ZM357.837 311.144L398.275 334.491V381.185L357.837 404.532L317.398 381.185V334.491L357.837 311.144ZM264.776 269.693C265.207 239.305 285.644 211.649 316.453 203.393C338.3 197.54 360.505 202.744 377.127 215.573L302.014 258.937C298.848 260.764 296.898 264.144 296.898 267.798V369.346L268.065 352.699C266.043 351.531 264.776 349.353 264.776 347.017V269.691V269.693ZM203.391 316.454C209.244 294.608 224.854 277.978 244.276 269.999V356.73C244.276 360.384 246.226 363.763 249.392 365.591L337.337 416.365L308.503 433.013C306.481 434.181 303.961 434.188 301.939 433.02L234.971 394.357C208.868 378.789 195.138 347.261 203.391 316.454ZM244.775 470.9C228.781 454.906 222.186 433.075 224.986 412.264L300.096 455.63C303.263 457.457 307.164 457.457 310.328 455.63L398.273 404.856V438.149C398.273 440.485 397.022 442.671 394.997 443.839L328.029 482.502C301.495 497.322 267.327 493.452 244.772 470.9H244.775ZM450.897 445.982C450.466 476.371 430.029 504.027 399.22 512.283C377.373 518.136 355.168 512.932 338.547 500.102L413.659 456.738C416.826 454.911 418.775 451.532 418.775 447.877V346.329L447.609 362.977C449.631 364.145 450.897 366.323 450.897 368.659V445.985V445.982ZM512.282 399.221C506.429 421.068 490.819 437.697 471.397 445.676V358.946C471.397 355.292 469.448 351.912 466.281 350.085L378.336 299.311L407.17 282.663C409.192 281.495 411.712 281.487 413.734 282.655L480.702 321.318C506.805 336.887 520.536 368.415 512.282 399.221Z";

    function isRecord(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeWindow(value) {
      if (!isRecord(value) || typeof value.usedPercent !== 'number' || !Number.isFinite(value.usedPercent)) return null;
      const usedPercent = Math.round(Math.min(100, Math.max(0, value.usedPercent)));
      const resetsAt = typeof value.resetsAt === 'string' ? value.resetsAt : null;
      return { usedPercent, resetsAt };
    }

    function normalizeSnapshot(value) {
      if (!isRecord(value) || !statuses.includes(value.status) || !isRecord(value.windows)) return null;
      return {
        status: value.status,
        windows: {
          fiveHour: normalizeWindow(value.windows.fiveHour),
          weekly: normalizeWindow(value.windows.weekly),
        },
      };
    }

    function resetTime(value, locale, includeDate) {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.valueOf())) return null;
      const options = includeDate
        ? { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { hour: 'numeric', minute: '2-digit' };
      try {
        return new Intl.DateTimeFormat(locale, options).format(date);
      } catch {
        return new Intl.DateTimeFormat(undefined, options).format(date);
      }
    }

    function Logo() {
      return h('svg', {
        className: 'dcu-logo',
        viewBox: '180 180 356 356',
        'aria-hidden': true,
        focusable: false,
      }, h('path', { fill: 'currentColor', d: openAiPath }));
    }

    function LimitRow({ label, shortLabel, window, wide, t, locale }) {
      const labelText = wide ? t(label) : t(shortLabel);
      if (!window) {
        return h('section', { className: 'dcu-limit', 'aria-label': t(label) },
          h('div', { className: 'dcu-limit-title' }, labelText),
          h('div', { className: 'dcu-empty', role: 'status' }, t('unavailable')),
        );
      }

      const reset = resetTime(window.resetsAt, locale, label === 'weekly');
      const percent = 100 - window.usedPercent;
      return h('section', { className: 'dcu-limit', 'aria-label': t(label) },
        h('div', { className: 'dcu-limit-title' }, labelText),
        h('div', {
          className: 'dcu-track',
          role: 'progressbar',
          'aria-label': t(label),
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': percent,
        }, h('div', { className: 'dcu-fill', style: { width: `${percent}%` } })),
        h('div', { className: 'dcu-details' },
          h('span', { className: 'dcu-used' }, wide ? t('used', { percent }) : t('usedShort', { percent })),
          h('span', { className: 'dcu-reset', title: reset ? t('resetAt', { time: reset }) : t('resetUnknown') },
            wide ? (reset ? t('resetAt', { time: reset }) : t('resetUnknown')) : (reset ? t('resetShort', { time: reset }) : '—'),
          ),
        ),
      );
    }

    const intervalKey = 'dsh-codex-usage.refresh-interval';
    const displaySettingsKey = 'dsh-codex-usage.display-settings';
    const defaultDisplaySettings = { enabled: true, showFiveHour: true, showWeekly: true };
    const intervals = [60000, 300000, 900000, 1800000];
    const readInterval = () => {
      try { const value = Number(window.localStorage.getItem(intervalKey)); return intervals.includes(value) ? value : 60000; }
      catch { return 60000; }
    };
    function readDisplaySettings() {
      try {
        const value = JSON.parse(window.localStorage.getItem(displaySettingsKey));
        if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaultDisplaySettings };
        return {
          enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
          showFiveHour: typeof value.showFiveHour === 'boolean' ? value.showFiveHour : true,
          showWeekly: typeof value.showWeekly === 'boolean' ? value.showWeekly : true,
        };
      } catch { return { ...defaultDisplaySettings }; }
    }
    const dockSettingsKey = 'dsh-codex-usage.dock-settings';
    const defaultDockSettings = { showFiveHour: true, showWeekly: true };
    function readDockSettings() {
      try {
        const value = JSON.parse(window.localStorage.getItem(dockSettingsKey));
        return {
          showFiveHour: typeof value?.showFiveHour === 'boolean' ? value.showFiveHour : true,
          showWeekly: typeof value?.showWeekly === 'boolean' ? value.showWeekly : true,
        };
      } catch { return { ...defaultDockSettings }; }
    }
    const signalChange = () => window.dispatchEvent(new Event('dsh-codex-usage-change'));
    const signalPreferenceChange = () => window.dispatchEvent(new Event('dsh-codex-usage-preferences-change'));

    function DockUsage({ snapshot, preferences, t, locale, statusMessage, card }) {
      const [open, setOpen] = React.useState(false);
      const [position, setPosition] = React.useState(undefined);
      const rootRef = React.useRef(null);
      const triggerRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const panelId = React.useId();
      const hideFiveHour = !snapshot?.windows.fiveHour && Boolean(snapshot?.windows.weekly);
      const limits = [
        ...(preferences.showFiveHour && !hideFiveHour ? [{ key: 'fiveHour', label: 'dockFiveHourShort' }] : []),
        ...(preferences.showWeekly ? [{ key: 'weekly', label: 'dockWeeklyShort' }] : []),
      ];
      const available = limits.length > 0;

      React.useEffect(() => {
        if (!open || !available) return;
        const panel = panelRef.current;
        const trigger = triggerRef.current;
        // Native top-layer rendering escapes composer clipping without moving DOM outside our slot.
        panel.showPopover?.();
        const place = () => {
          const rect = trigger.getBoundingClientRect();
          const width = panel.getBoundingClientRect().width;
          setPosition({
            left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
            bottom: Math.max(8, window.innerHeight - rect.top + 8),
            maxHeight: Math.max(0, rect.top - 16),
          });
        };
        const dismiss = (event) => {
          if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const escape = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.focus({ preventScroll: true });
        };
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
        observer?.observe(trigger);
        observer?.observe(panel);
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', escape, true);
        return () => {
          observer?.disconnect();
          window.removeEventListener('resize', place);
          window.removeEventListener('scroll', place, true);
          document.removeEventListener('pointerdown', dismiss);
          document.removeEventListener('keydown', escape, true);
          if (panel.isConnected) panel.hidePopover?.();
        };
      }, [open, available]);

      if (!available) return null;
      const readings = limits.map(({ key, label }) => {
        const limit = snapshot?.windows[key];
        const reset = resetTime(limit?.resetsAt, locale, key === 'weekly');
        return { key, label, percent: limit ? 100 - limit.usedPercent : undefined, reset };
      });
      const description = [t('title'), statusMessage, ...readings.map(({ label, percent, reset }) =>
        `${t(label)} ${percent === undefined ? t('unavailable') : t('used', { percent })} ${reset ? t('resetAt', { time: reset }) : t('resetUnknown')}`)].filter(Boolean).join(' · ');
      return h('span', { ref: rootRef, className: 'dcu-dock', onBlur: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); } },
        h('style', null, `
          [data-composer-dock]:has(.dcu-dock) { width: 100%; max-width: var(--dsh-composer-card-max-width, 100%); flex-wrap: wrap; }
          .dcu-dock, [data-composer-dock] > :has(> .dcu-dock) { order: 1000; margin-inline-start: auto; }
          .dcu-dock { display: inline-flex; flex: 0 1 auto; min-width: 0; max-width: 100%; }
          .dcu-dock-trigger { display: inline-flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 6px; min-width: 0; max-width: 100%; padding: 1px 8px; border: 0; border-radius: var(--dsw-radius-sm, 5px); background: transparent; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary, inherit)); font: inherit; font-size: var(--dsh-content-font-size-secondary, 13px); line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px)); font-variant-numeric: tabular-nums; cursor: pointer; }
          .dcu-dock-trigger:hover, .dcu-dock-trigger[aria-expanded='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary, inherit); }
          .dcu-dock-trigger:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
          .dcu-dock .dcu-logo { display: block; width: 16px; height: 16px; flex: 0 0 16px; }
          .dcu-dock-limit { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
          .dcu-dock-track { display: block; flex: 0 0 36px; width: 36px; height: 8px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 17%, transparent); }
          .dcu-dock-fill { display: block; height: 100%; border-radius: inherit; background: var(--dsw-alias-state-business-primary); transition: width 180ms ease-out; }
          .dcu-popover { position: fixed; inset: auto; box-sizing: border-box; width: min(280px, calc(100vw - 16px)); margin: 0; padding: 0; border: 0; border-radius: var(--dsw-radius-lg, 12px); background: var(--dsw-specific-menu, var(--dsw-alias-bg-overlay, white)); color: var(--dsw-alias-label-secondary, inherit); --dsw-elevation-stroke-color: var(--dsw-alias-border-l1); box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18)); backdrop-filter: var(--dsw-menu-backdrop-filter); overflow: auto; z-index: 1100; }
          .dcu-popover .dcu-card { padding: 13px 12px 11px; }
          @media (prefers-reduced-motion: reduce) { .dcu-dock-fill { transition: none; } }
        `),
        h('button', { ref: triggerRef, className: 'dcu-dock-trigger', type: 'button', 'aria-label': description, title: description, 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': open ? panelId : undefined, onClick: () => { setPosition(undefined); setOpen(!open); } },
          h(Logo),
          ...readings.flatMap(({ key, label, percent, reset }, index) => [
            index ? h('span', { key: `${key}-separator`, 'aria-hidden': true }, '・') : null,
            h('span', { key, className: 'dcu-dock-limit' },
              h('span', null, t(label)),
              h('span', { className: 'dcu-dock-track', role: 'progressbar', 'aria-label': t(key), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent, 'aria-valuetext': percent === undefined ? t('unavailable') : t('used', { percent }) },
                h('span', { className: 'dcu-dock-fill', style: { width: `${percent ?? 0}%` } })),
              h('span', null, reset ?? '—')),
          ])),
        open ? h('div', { ref: panelRef, id: panelId, className: 'dcu-popover', popover: 'manual', tabIndex: -1, role: 'dialog', 'aria-label': t('title'), style: position ?? { visibility: 'hidden' } }, card) : null,
      );
    }

    function AppServerCard({ wide, t, settings = false, dock = false }) {
      const [snapshot, setSnapshot] = React.useState(null);
      const [refreshing, setRefreshing] = React.useState(false);
      const [login, setLogin] = React.useState({ phase: 'loading' });
      const [callbackUrl, setCallbackUrl] = React.useState('');
      const [interval, setIntervalMs] = React.useState(readInterval);
      const [displaySettings, setDisplaySettings] = React.useState(readDisplaySettings);
      const [intervalOpen, setIntervalOpen] = React.useState(false);
      const [saveError, setSaveError] = React.useState(false);
      const [displaySaveError, setDisplaySaveError] = React.useState(false);
      const [dockSettings, setDockSettings] = React.useState(readDockSettings);
      const [dockSaveError, setDockSaveError] = React.useState(false);
      const changeDockSetting = (key, enabled) => {
        const next = { ...dockSettings, [key]: Boolean(enabled) };
        try { window.localStorage.setItem(dockSettingsKey, JSON.stringify(next)); setDockSettings(next); setDockSaveError(false); signalPreferenceChange(); }
        catch { setDockSaveError(true); }
      };
      const changeInterval = (event) => {
        const value = Number(event.target.value);
        if (!intervals.includes(value)) return;
        try { window.localStorage.setItem(intervalKey, String(value)); setIntervalMs(value); setSaveError(false); signalPreferenceChange(); }
        catch { setSaveError(true); }
      };
      const changeDisplaySetting = (key, enabled) => {
        const next = { ...displaySettings, [key]: Boolean(enabled) };
        try { window.localStorage.setItem(displaySettingsKey, JSON.stringify(next)); setDisplaySettings(next); setDisplaySaveError(false); signalPreferenceChange(); }
        catch { setDisplaySaveError(true); }
      };
      const loginWindow = React.useRef(null);
      const initialAuthRequest = React.useRef(null);
      const authVersion = React.useRef(0);
      const activeRequest = React.useRef(null);
      const locale = document.documentElement.lang || undefined;

      const load = React.useCallback(async (refresh, signal) => {
        const query = refresh ? '?refresh=1' : '';
        const response = await fetch(`${apiPath}${query}`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { accept: 'application/json' },
          signal,
        });
        if (!response.ok) throw new Error('Codex usage request failed.');
        return normalizeSnapshot(await response.json());
      }, []);

      const refresh = React.useCallback(async (force = false) => {
        activeRequest.current?.abort();
        const controller = new AbortController();
        activeRequest.current = controller;
        setRefreshing(true);
        let value;
        try {
          for (let attempt = 0; attempt < 3 && !controller.signal.aborted; attempt++) {
            try { value = await load(force || attempt > 0, controller.signal); }
            catch { value = null; }
            if (controller.signal.aborted || value?.status === 'ok' || value?.status === 'not-authenticated') break;
            if (attempt < 2) await new Promise((resolve) => {
              const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve(); };
              const timer = setTimeout(finish, attempt === 0 ? 1000 : 3000);
              controller.signal.addEventListener('abort', finish, { once: true });
              if (controller.signal.aborted) finish();
            });
          }
          if (!controller.signal.aborted) {
            const result = value ?? { status: 'unavailable', windows: { fiveHour: null, weekly: null } };
            setSnapshot((previous) => result.status !== 'ok' && result.status !== 'not-authenticated' && previous?.windows && (previous.windows.fiveHour || previous.windows.weekly)
              ? { ...result, windows: previous.windows, stale: true }
              : result);
          }
        } finally {
          if (activeRequest.current === controller) {
            activeRequest.current = null;
            setRefreshing(false);
          }
        }
      }, [load]);

      React.useEffect(() => {
        const sync = () => {
          setIntervalMs(readInterval());
          const next = readDisplaySettings();
          setDisplaySettings((current) => current.enabled === next.enabled && current.showFiveHour === next.showFiveHour && current.showWeekly === next.showWeekly ? current : next);
          const nextDock = readDockSettings();
          setDockSettings((current) => current.showFiveHour === nextDock.showFiveHour && current.showWeekly === nextDock.showWeekly ? current : nextDock);
        };
        window.addEventListener('dsh-codex-usage-preferences-change', sync);
        window.addEventListener('storage', sync);
        return () => {
          window.removeEventListener('dsh-codex-usage-preferences-change', sync);
          window.removeEventListener('storage', sync);
        };
      }, []);

      const shouldFetch = settings || (dock ? dockSettings.showFiveHour || dockSettings.showWeekly : displaySettings.enabled);
      React.useEffect(() => {
        if (!shouldFetch) return;
        void refresh(false);
        if (settings) return () => { activeRequest.current?.abort(); activeRequest.current = null; };
        const refreshOnChange = () => { void refresh(false); };
        window.addEventListener('dsh-codex-usage-change', refreshOnChange);
        const timer = setInterval(() => { void refresh(true); }, interval);
        return () => {
          clearInterval(timer);
          window.removeEventListener('dsh-codex-usage-change', refreshOnChange);
          activeRequest.current?.abort();
          activeRequest.current = null;
        };
      }, [refresh, interval, settings, shouldFetch]);

      const authAction = React.useCallback(async (action, input) => {
        const version = ++authVersion.current;
        initialAuthRequest.current?.abort();
        if (action === 'logout') activeRequest.current?.abort();
        try {
          const response = await fetch(`${apiPath}/auth?action=${action}`, { method: 'POST', credentials: 'same-origin', ...(action === 'submit' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: input }) } : {}) });
          if (!response.ok) throw new Error('Authentication failed');
          const value = await response.json();
          if (version !== authVersion.current) return;
          authVersion.current++;
          setLogin(value);
          if (action === 'logout') {
            activeRequest.current?.abort();
            setSnapshot({ status: 'not-authenticated', windows: { fiveHour: null, weekly: null } });
            signalChange();
          }
        } catch {
          if (version === authVersion.current) setLogin((previous) => ({ ...previous, error: action === 'logout' ? 'logoutFailed' : 'loginFailed', ...(action === 'start' ? { phase: 'failed' } : {}) }));
        }
      }, []);

      const startLogin = () => {
        loginWindow.current = window.open('', '_blank');
        void authAction('start');
      };
      React.useEffect(() => {
        if (login.phase === 'waiting' && login.authUrl && loginWindow.current) {
          try { loginWindow.current.location.href = login.authUrl; } catch {}
          loginWindow.current = null;
        } else if (['failed', 'idle'].includes(login.phase) && loginWindow.current) {
          loginWindow.current.close();
          loginWindow.current = null;
        }
      }, [login.phase, login.authUrl]);

      React.useEffect(() => {
        if (!settings) return;
        const controller = new AbortController();
        initialAuthRequest.current = controller;
        fetch(`${apiPath}/auth`, { credentials: 'same-origin', signal: controller.signal })
          .then((response) => { if (!response.ok) throw new Error('Authentication failed'); return response.json(); })
          .then((value) => { if (!controller.signal.aborted) setLogin(value); })
          .catch(() => { if (!controller.signal.aborted) setLogin((previous) => ({ ...previous, error: 'authStatusFailed' })); });
        return () => { controller.abort(); authVersion.current++; };
      }, [settings]);

      React.useEffect(() => {
        if (!['starting', 'waiting'].includes(login.phase)) return;
        const controller = new AbortController();
        const timer = setInterval(async () => {
          const version = authVersion.current;
          try {
            const response = await fetch(`${apiPath}/auth`, { credentials: 'same-origin', signal: controller.signal });
            if (!response.ok) throw new Error('Authentication failed');
            const value = await response.json();
            if (controller.signal.aborted || version !== authVersion.current) return;
            setLogin(value);
            if (value.phase === 'authenticated') { await refresh(true); signalChange(); }
          } catch { if (!controller.signal.aborted && version === authVersion.current) setLogin((previous) => ({ ...previous, error: 'authStatusFailed' })); }
        }, 2000);
        return () => { clearInterval(timer); controller.abort(); };
      }, [login.phase, refresh]);

      const status = snapshot?.status ?? 'loading';
      const connected = Boolean(login.account) || login.phase === 'authenticated' || status === 'ok';
      const statusMessage = snapshot?.stale || status === 'ok'
        ? null
        : t(status === 'loading' ? 'loading' : (statusKeys[status] ?? 'statusUnavailable'));

      const displaySettingRow = (key, labelKey, hintKey, id, footer = false) => {
        const preferences = footer ? dockSettings : displaySettings;
        return h('div', { className: 'dcu-settings-row' },
          h('div', { className: 'dcu-settings-copy' },
            h('label', { className: 'dcu-settings-label', id: `${id}-label`, htmlFor: id }, t(labelKey)),
            h('p', { className: 'dcu-settings-description' }, t(hintKey)),
            (footer ? dockSaveError && key === 'showFiveHour' : displaySaveError && key === 'enabled') ? h('p', { className: 'dcu-settings-description dcu-settings-error', role: 'alert' }, t('saveFailed')) : null),
          h('input', { id, className: 'dcu-settings-control dcu-settings-switch', type: 'checkbox', role: 'switch', checked: preferences[key], 'aria-checked': preferences[key], 'aria-labelledby': `${id}-label`, 'aria-controls': !footer && key === 'enabled' ? 'dcu-settings-display-children' : undefined, disabled: !footer && key !== 'enabled' && !displaySettings.enabled, onChange: (event) => (footer ? changeDockSetting : changeDisplaySetting)(key, event.target.checked) }));
      };

      if (settings) return h('div', { className: 'dcu-settings' },
        h('style', null, `
          .dcu-settings { width: 100%; color: var(--dsw-alias-label-primary, inherit); font: inherit; }
          .dcu-settings * { box-sizing: border-box; }
          .dcu-settings-title { margin: 0; color: var(--dsw-alias-label-primary, inherit); font-family: var(--dsw-font-family, inherit); font-size: 20px; font-weight: 600; line-height: 1.4; }
          .dcu-settings-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
          .dcu-settings-row:first-of-type { padding-top: 18px; }
          .dcu-settings-copy { flex: 1 1 auto; min-width: 0; }
          .dcu-settings-account-detail { overflow-wrap: anywhere; }
          .dcu-settings-label { display: block; font-size: 14px; font-weight: 400; line-height: 1.5; }
          .dcu-settings-description { margin: 4px 0 0; color: var(--dsw-alias-label-secondary, inherit); font-size: 12px; line-height: 1.5; }
          .dcu-settings-control { flex: 0 0 auto; }
          .dcu-settings button, .dcu-settings select, .dcu-settings input { font: inherit; color: inherit; }
          .dcu-settings .dcu-settings-button, .dcu-settings .dcu-settings-select { border: 0; border-radius: 10px; background: color-mix(in srgb, var(--dsw-alias-label-primary, currentColor) 4%, var(--dsw-alias-bg-base, white)); padding: 10px 14px; font-size: 14px; line-height: 1.4; }
          .dcu-settings-button { cursor: pointer; }
          .dcu-settings-button:disabled { opacity: .5; cursor: default; }
          .dcu-settings-switch { appearance: none; position: relative; width: 42px; height: 24px; margin: 0; padding: 0; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35)); border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary, currentColor) 12%, var(--dsw-alias-bg-base, white)); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease; }
          .dcu-settings-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--dsw-alias-bg-base, white); box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform 140ms ease; }
          .dcu-settings-switch:checked { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); }
          .dcu-settings-switch:checked::after { transform: translateX(18px); }
          .dcu-settings-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
           .dcu-settings-switch:disabled { cursor: not-allowed; }
           .dcu-settings-display-children { margin: 0 0 0 6px; padding-left: 14px; border-left: 2px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
           .dcu-settings-display-children[aria-disabled='true'] { opacity: .55; }
           .dcu-settings-display-children .dcu-settings-row { padding: 16px 0; }
           .dcu-settings-display-children .dcu-settings-row:last-child { border-bottom: 0; }

          @media (prefers-reduced-motion: reduce) { .dcu-settings-switch, .dcu-settings-switch::after { transition: none; } }
          .dcu-settings-select { cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 12px; white-space: nowrap; }
          .dcu-settings-chevron { display: block; flex: 0 0 16px; width: 16px; height: 16px; }
          .dcu-settings-dropdown { position: relative; }
          .dcu-settings-menu { position: absolute; z-index: 20; top: calc(100% + 5px); right: 0; min-width: 150px; padding: 5px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); border-radius: 12px; background: var(--dsw-alias-bg-overlay, white); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
          .dcu-settings .dcu-settings-option { display: flex; justify-content: space-between; width: 100%; border: 0; border-radius: 7px; padding: 9px 10px; background: transparent; text-align: left; cursor: pointer; font-size: 14px; }
          .dcu-settings-option:hover, .dcu-settings-option:focus-visible { background: color-mix(in srgb, var(--dsw-alias-label-primary, currentColor) 8%, transparent); }
          .dcu-settings-button:focus-visible, .dcu-settings-select:focus-visible, .dcu-settings input:focus-visible, .dcu-settings a:focus-visible, .dcu-settings summary:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
          .dcu-settings-extra { padding: 14px 0; font-size: 13px; line-height: 1.5; }
          .dcu-settings-extra p { margin: 0 0 8px; }
          .dcu-settings-extra a { color: var(--dsw-alias-brand-primary); }
          .dcu-settings-extra summary { cursor: pointer; color: var(--dsw-alias-label-secondary, inherit); }
          .dcu-settings-form { display: flex; gap: 8px; margin-top: 10px; }
          .dcu-settings-form input { flex: 1 1 auto; min-width: 0; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35)); border-radius: 8px; background: var(--dsw-alias-bg-base, transparent); padding: 8px 10px; }
          .dcu-settings-error { color: var(--dsw-alias-state-error-primary, #c33); }
          @media (max-width: 480px) { .dcu-settings-row { gap: 12px; } .dcu-settings-form { flex-wrap: wrap; } .dcu-settings-form input { flex-basis: 100%; } }
        `),
        h('h1', { className: 'dcu-settings-title' }, t('settingsTitle')),
        h('div', { className: 'dcu-settings-row' },
          h('div', { className: 'dcu-settings-copy' },
            h('span', { className: 'dcu-settings-label' }, t('account')),
            h('p', { className: 'dcu-settings-description', role: 'status' },
              login.error ? t(login.error) : login.phase === 'starting' ? t('loginStarting') : connected ? t('accountConnected') : login.phase === 'loading' ? t('loading') : login.phase === 'failed' ? t('loginFailed') : statusMessage || t('accountHint')),
            login.account ? ['email', 'plan', 'accountId'].map((key) => login.account[key] ? h('p', { key, className: 'dcu-settings-description dcu-settings-account-detail' }, `${t(key === 'email' ? 'accountEmail' : key === 'plan' ? 'accountPlan' : 'accountId')}: ${login.account[key]}`) : null) : null),
          h('div', { className: 'dcu-settings-control' },
            ['starting', 'waiting'].includes(login.phase)
              ? h('button', { className: 'dcu-settings-button', type: 'button', onClick: () => void authAction('cancel') }, t('cancelLogin'))
              : connected
                ? h('button', { className: 'dcu-settings-button', type: 'button', onClick: () => void authAction('logout') }, t('logout'))
                : login.phase !== 'loading' || login.error
                  ? h('button', { className: 'dcu-settings-button', type: 'button', onClick: startLogin }, t('login')) : null)),
        login.phase === 'waiting' ? h('div', { className: 'dcu-settings-extra' },
          h('p', null, t('browserPrompt'), ' ', h('a', { href: login.authUrl, target: '_blank', rel: 'noopener noreferrer' }, t('openBrowser'))),
          h('details', null, h('summary', null, t('manualPrompt')),
            h('form', { className: 'dcu-settings-form', onSubmit: (event) => { event.preventDefault(); void authAction('submit', callbackUrl); setCallbackUrl(''); } },
              h('input', { value: callbackUrl, onChange: (event) => setCallbackUrl(event.target.value), 'aria-label': t('manualPrompt'), autoComplete: 'off' }),
              h('button', { className: 'dcu-settings-button', type: 'submit', disabled: !callbackUrl.trim() }, t('submitCallback'))))) : null,
        displaySettingRow('enabled', 'sidebarDisplay', 'sidebarDisplayHint', 'dcu-sidebar-enabled'),
        h('div', { id: 'dcu-settings-display-children', className: 'dcu-settings-display-children', role: 'group', 'aria-labelledby': 'dcu-sidebar-enabled-label', 'aria-disabled': !displaySettings.enabled },
          displaySettingRow('showFiveHour', 'fiveHourDisplay', 'fiveHourDisplayHint', 'dcu-show-five-hour'),
          displaySettingRow('showWeekly', 'weeklyDisplay', 'weeklyDisplayHint', 'dcu-show-weekly')),
        h('div', { className: 'dcu-settings-row' },
          h('div', { className: 'dcu-settings-copy' },
            h('span', { className: 'dcu-settings-label', id: 'dcu-dock-display-label' }, t('dockDisplay')),
            h('p', { className: 'dcu-settings-description' }, t('dockDisplayHint')))),
        h('div', { className: 'dcu-settings-display-children', role: 'group', 'aria-labelledby': 'dcu-dock-display-label' },
          displaySettingRow('showFiveHour', 'fiveHourDisplay', 'dockFiveHourDisplayHint', 'dcu-dock-show-five-hour', true),
          displaySettingRow('showWeekly', 'weeklyDisplay', 'dockWeeklyDisplayHint', 'dcu-dock-show-weekly', true)),
        h('div', { className: 'dcu-settings-row' },
          h('div', { className: 'dcu-settings-copy' },
            h('span', { className: 'dcu-settings-label', id: 'dcu-refresh-label' }, t('refreshPeriod')),
            h('p', { className: 'dcu-settings-description' }, t('settingsHint')),
            saveError ? h('p', { className: 'dcu-settings-description dcu-settings-error', role: 'alert' }, t('saveFailed')) : null),
          h('div', { className: 'dcu-settings-dropdown dcu-settings-control', onBlur: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIntervalOpen(false); }, onKeyDown: (event) => { if (event.key === 'Escape') { setIntervalOpen(false); event.currentTarget.querySelector('button')?.focus(); } } },
            h('button', { type: 'button', className: 'dcu-settings-select', 'aria-labelledby': 'dcu-refresh-label dcu-refresh-value', 'aria-expanded': intervalOpen, 'aria-haspopup': 'listbox', onClick: () => setIntervalOpen(!intervalOpen) },
              h('span', { id: 'dcu-refresh-value' }, t(['everyMinute', 'everyFiveMinutes', 'everyFifteenMinutes', 'everyThirtyMinutes'][intervals.indexOf(interval)])),
              h('svg', { className: 'dcu-settings-chevron', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: false }, h('path', { d: 'M4 6l4 4 4-4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }))),
            intervalOpen ? h('div', { className: 'dcu-settings-menu', role: 'listbox', 'aria-labelledby': 'dcu-refresh-label' },
              ...['everyMinute', 'everyFiveMinutes', 'everyFifteenMinutes', 'everyThirtyMinutes'].map((key, index) => h('button', { key, type: 'button', role: 'option', 'aria-selected': interval === intervals[index], className: 'dcu-settings-option', onClick: () => { changeInterval({ target: { value: intervals[index] } }); setIntervalOpen(false); } }, t(key), interval === intervals[index] ? h('span', { 'aria-hidden': true }, '✓') : null))) : null)),
        h('div', { className: 'dcu-settings-row' },
          h('div', { className: 'dcu-settings-copy' },
            h('span', { className: 'dcu-settings-label' }, t('refreshTitle')),
            h('p', { className: 'dcu-settings-description' }, t('refreshHint'))),
          h('button', { className: 'dcu-settings-button dcu-settings-control', type: 'button', disabled: refreshing, onClick: () => { void refresh(true).then(signalChange); } }, t('refresh'))),
      );

      // Treat a recognized weekly window without a 5-hour window as a plan with no 5-hour limit.
      const hideFiveHour = !snapshot?.windows.fiveHour && Boolean(snapshot?.windows.weekly);

      const renderCard = (cardSettings, popover = false) => h('div', {
        className: `dcu-card${wide ? ' dcu-wide' : ''}${popover ? ' dcu-popover-card' : ''}`,
        role: 'group',
        'aria-label': t('title'),
      },
        h('style', null, `
          .dcu-card {
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            padding: 13px 8px 7px;
            color: inherit;
            font: inherit;
            font-family: var(--dsw-font-family, inherit);
            font-size: 12px;
            font-weight: 400;
            line-height: 1.4;
          }
          div:has(> .dcu-card:not(.dcu-popover-card)) {
            box-sizing: border-box;
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            flex: 0 0 100%;
            width: 100%;
            min-width: 0;
          }
          div:has(> .dcu-card:not(.dcu-popover-card)) > .dcu-card { flex: 0 0 100%; }
          div:has(> :has(> .dcu-card:not(.dcu-popover-card))) {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
          }
          .dcu-header {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            min-height: 20px;
            margin-bottom: 3px;
          }
          .dcu-logo { display: block; width: 16px; height: 16px; flex: 0 0 16px; }
          .dcu-title {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: inherit;
            font-weight: 400;
          }
          .dcu-refresh {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 22px;
            width: 22px;
            height: 22px;
            padding: 0;
            border: 0;
            border-radius: 5px;
            color: inherit;
            background: transparent;
            font: inherit;
            cursor: pointer;
          }
          .dcu-refresh:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-alias-state-business-primary); }
          .dcu-refresh:disabled { cursor: default; opacity: .65; }
          .dcu-auth-button { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 5px; padding: 3px 7px; color: inherit; background: transparent; font: inherit; font-size: inherit; cursor: pointer; }
          .dcu-notice a { color: var(--dsw-alias-state-business-primary); overflow-wrap: anywhere; }
          .dcu-notice {
            margin: 0 0 4px;
            color: inherit;
            font-size: inherit;
            opacity: .78;
          }
          .dcu-limit { min-width: 0; padding-top: 3px; }
          .dcu-limit + .dcu-limit {
            margin-top: 4px;
          }
          .dcu-limit-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 6px;
            font-size: inherit;
            font-weight: 400;
          }
          .dcu-track {
            width: 100%;
            height: 3px;
            overflow: hidden;
            border-radius: 999px;
            background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 17%, transparent);
          }
          .dcu-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--dsw-alias-state-business-primary);
            transition: width 180ms ease-out;
          }
          .dcu-details {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            margin-top: 6px;
            min-width: 0;
            font-size: inherit;
          }
          .dcu-used, .dcu-reset {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .dcu-reset { text-align: right; opacity: .78; }
          .dcu-empty { font-size: inherit; opacity: .72; }
          .dcu-card:not(.dcu-wide) { padding-right: 5px; padding-left: 5px; }
          .dcu-card:not(.dcu-wide) .dcu-header { gap: 4px; }
          .dcu-card:not(.dcu-wide) .dcu-title { display: none; }
          .dcu-card:not(.dcu-wide) .dcu-limit-title { font-size: inherit; }
          .dcu-card:not(.dcu-wide) .dcu-details { font-size: inherit; }
          @media (prefers-reduced-motion: reduce) { .dcu-fill { transition: none; } }
        `),
        h('header', { className: 'dcu-header' },
          h(Logo),
          h('span', { className: 'dcu-title' }, t('title')),
        ),
        statusMessage ? h('p', { className: 'dcu-notice', role: 'status', 'aria-live': 'polite' }, statusMessage) : null,
        h('div', { className: 'dcu-limits' },
          cardSettings.showFiveHour && !hideFiveHour ? h(LimitRow, {
            label: 'fiveHour', shortLabel: 'fiveHourShort',
            window: snapshot?.windows.fiveHour ?? null, wide, t, locale,
          }) : null,
          cardSettings.showWeekly ? h(LimitRow, {
            label: 'weekly', shortLabel: 'weeklyShort',
            window: snapshot?.windows.weekly ?? null, wide, t, locale,
          }) : null,
        ),
      );
      if (dock) return shouldFetch ? h(DockUsage, { snapshot, preferences: dockSettings, t, locale, statusMessage, card: renderCard(defaultDisplaySettings, true) }) : null;
      return displaySettings.enabled ? renderCard(displaySettings) : null;
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(namespace, dictionaries),
          'dsh-codex-usage: dictionaries',
        );
        const t = ctx.locale.bind(namespace);
        const Card = (props) => h(AppServerCard, { ...props, t });
        const Settings = () => h(AppServerCard, { settings: true, wide: true, t });
        const Dock = () => h(AppServerCard, { dock: true, wide: true, t });
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'dsh-codex-usage',
          order: 1000,
          label: () => t('title'),
        }, Dock));
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-codex-usage',
          order: 35,
          label: () => t('settingsTitle'),
        }, Settings));

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-codex-usage',
          order: -1000,
          label: () => t('title'),
        }, Card));
      },
    };
  },
});
