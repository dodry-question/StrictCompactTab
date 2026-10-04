#!/usr/bin/env node
// UI-смоук для повторяемой проверки раскладки и видимости элементов.
//
//   node tools/ui-smoke.mjs                          # все проверки на 1920x1080
//   node tools/ui-smoke.mjs --width 1912 --height 912
//   node tools/ui-smoke.mjs --extension              # в реальном расширении (chrome://newtab/)
//   node tools/ui-smoke.mjs --only mist              # только сценарии с 'mist' в имени
//   node tools/ui-smoke.mjs --verbose
//
// Выход: код 1, если хотя бы один сценарий провалился (годится для CI).
//
// Зачем: два прошлых бага раскладки (контент Mist Standard за нижним краем
// экрана; ярлыки, оторванные от панели категорий) ловились одноразовыми
// CDP-скриптами, которые потом выбрасывались. Здесь те же проверки живут
// постоянно и падают с exit != 0, то есть могут попасть в CI.
//
// Что проверяется (по каждому сценарию):
//   1) страница вообще поднялась: снят html.state-loading, часы отрисованы;
//   2) нет JS-ошибок и ошибок в консоли за время загрузки;
//   3) ВИДИМОСТЬ: у каждой проверяемой группы (часы, поиск, вкладки, ярлыки,
//      панель расписания) есть элементы, и все они внутри окна (не ниже
//      нижнего края и не выше верхнего), не схлопнуты в нулевой размер и не
//      скрыты css-ом (rect нулевой или visibility:hidden);
//   4) ПОРЯДОК: ярлыки в Mist идут ПОД вкладками (а не прижаты к низу экрана
//      с пустотой) — проверяется по вертикали: верх первого ряда ярлыков
//      находится в пределах 220 px от низа панели вкладок;
//   5) горизонтальный выход за окно тоже считается провалом.
//
// Сценарии: classic (обычная сетка), mist-center, mist-split, mist-zen,
// zen (режим Zen), schedule (панель расписания открыта). Состояние задаётся
// через localStorage ДО загрузки страницы — так проверка воспроизводима.
//
// Ограничения (честно): это проверка по геометрии DOM, а не визуальное
// сравнение скриншотов: она ловит «элемент уехал/схлопнулся/исчез», но не
// ловит «цвет стал не тот». Пиксельные эталоны сознательно не вводились —
// они шумят между версиями браузера и сглаживанием шрифтов.
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EDGE = process.env.BROWSER_BIN || [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].find((p) => fs.existsSync(p));

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
// --only принимает и «--only mist», и «--only=mist».
const ONLY_RAW = opt('only', '') || (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const WIDTH = Number(opt('width', 1920));
const HEIGHT = Number(opt('height', 1080));
const EXTENSION = args.includes('--extension');
const VERBOSE = args.includes('--verbose');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xlsx': 'application/octet-stream'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Сценарии: что положить в состояние. Ключи совпадают с PERSIST_KEYS.
// Иконка — локальная SVG-заглушка (data:URL): без неё приложение просит
// favicon у сайтов-примеров, в консоль сыпятся 404 и шум мешает искать
// настоящие ошибки. Так проверка полностью офлайн.
let iconSeq = 0;
const SHORTCUT = (id, name, url) => {
  iconSeq += 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="hsl(${(iconSeq * 37) % 360} 60% 50%)"/><text x="4" y="6" font-size="5" text-anchor="middle" fill="white">${iconSeq}</text></svg>`;
  return { id, name, url, customIcon: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` };
};
const SCENARIOS = [
  {
    name: 'classic',
    what: 'обычная сетка, 10 ярлыков',
    state: { layoutMistMode: false, layoutZenMode: false },
    shortcuts: Array.from({ length: 10 }, (_, i) => SHORTCUT(`sc_${i}`, `Site ${i + 1}`, `https://example${i}.com`))
  },
  {
    name: 'mist-center',
    what: 'Mist Standard (падение панели за нижний край — регрессия bcd0788)',
    state: { layoutMistMode: true, layoutZenMode: false, mistPreset: 'center', mistPerRow: 6 },
    expectPills: 10,
    shortcuts: Array.from({ length: 10 }, (_, i) => SHORTCUT(`sc_${i}`, `Site ${i + 1}`, `https://example${i}.com`))
  },
  {
    name: 'mist-center-small',
    what: 'Mist Standard, в категории 2 ярлыка (пилюли вообще не отображались)',
    state: { layoutMistMode: true, layoutZenMode: false, mistPreset: 'center' },
    expectPills: 1,
    shortcuts: [
      { id: 'f_prog', name: 'programing', isFolder: true, children: [SHORTCUT('sc_a', 'GitHub', 'https://github.com'), SHORTCUT('sc_b', 'MDN', 'https://developer.mozilla.org')] },
      SHORTCUT('sc_c', 'Home site', 'https://example.com')
    ]
  },
  {
    name: 'mist-split',
    what: 'Mist Split',
    state: { layoutMistMode: true, layoutZenMode: false, mistPreset: 'split' },
    expectPills: 8,
    shortcuts: Array.from({ length: 8 }, (_, i) => SHORTCUT(`sc_${i}`, `Site ${i + 1}`, `https://example${i}.com`))
  },
  {
    name: 'mist-zen',
    what: 'Mist Zen Drop (ярлыки по требованию)',
    state: { layoutMistMode: true, layoutZenMode: false, mistPreset: 'zen' },
    expectPills: 8,
    shortcuts: Array.from({ length: 8 }, (_, i) => SHORTCUT(`sc_${i}`, `Site ${i + 1}`, `https://example${i}.com`))
  },
  {
    name: 'zen',
    what: 'режим Zen (без виджетов и ярлыков)',
    state: { layoutMistMode: false, layoutZenMode: true },
    shortcuts: []
  }
];

// Проверки в браузере. Возвращает массив проблем (пустой = всё хорошо).
// Работает с реальной геометрией: getBoundingClientRect + computedStyle.
const CHECKS = `(() => {
  const problems = [];
  const winH = window.innerHeight;
  const winW = window.innerWidth;

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  // Прямоугольники элементов, реально видимых в окне
  function rects(selector) {
    return Array.from(document.querySelectorAll(selector))
      .filter(visible)
      .map((el) => el.getBoundingClientRect());
  }

  function checkInside(label, rs, opts) {
    const o = opts || {};
    if (!rs.length) {
      if (!o.optional) problems.push(label + ': не найдено ни одного видимого элемента');
      return;
    }
    rs.forEach((r, i) => {
      if (r.bottom > winH + 1) problems.push(label + ' [' + i + ']: нижний край ' + Math.round(r.bottom) + ' > окна ' + winH);
      if (r.top < -1 && !o.allowAbove) problems.push(label + ' [' + i + ']: верхний край ' + Math.round(r.top) + ' < 0');
      if (r.right > winW + 1) problems.push(label + ' [' + i + ']: правый край ' + Math.round(r.right) + ' > окна ' + winW);
      if (r.left < -1) problems.push(label + ' [' + i + ']: левый край ' + Math.round(r.left) + ' < 0');
    });
  }

  const mode = document.body.className;
  const isMist = document.body.classList.contains('mode-mist');
  const isZen = document.body.classList.contains('mode-zen');

  // 1. Каркас страницы
  if (document.documentElement.classList.contains('state-loading')) problems.push('html.state-loading не снят — контент невидим');
  const clock = document.getElementById('clock');
  if (!clock || !/\\d{1,2}:\\d{2}/.test(clock.textContent || '')) problems.push('часы не отрисованы: ' + (clock ? clock.textContent : 'нет элемента'));

  // 2. Основные группы
  const searchForm = document.querySelector('.search-form, #search-form');
  if (searchForm && visible(searchForm)) checkInside('поиск', [searchForm.getBoundingClientRect()]);

  if (!isZen) {
    const container = document.getElementById('shortcuts-container');
    if (container) {
      const cards = rects('#shortcuts-container .shortcut-card');
      const pills = rects('#shortcuts-container .mist-pill');
      checkInside(isMist ? 'пилюли Mist' : 'ярлыки', isMist ? pills : cards);

      // 3. Порядок в Mist: ярлыки должны идти ПОД вкладками, вплотную к ним
      const tabs = document.getElementById('mist-tabs');
      if (isMist && tabs && visible(tabs)) {
        const tabsRect = tabs.getBoundingClientRect();
        const firstRow = (pills.length ? pills : cards).reduce(
          (min, r) => (min === null || r.top < min ? r.top : min), null);
        if (firstRow !== null) {
          const gap = firstRow - tabsRect.bottom;
          if (gap < -2) problems.push('ярлыки выше панели категорий на ' + Math.round(-gap) + ' px');
          if (gap > 220) problems.push('ярлыки оторваны от панели категорий: зазор ' + Math.round(gap) + ' px (регрессия 90893cf)');
        }
      }
    } else if (isMist) {
      problems.push('нет #shortcuts-container в режиме Mist');
    }
  }

  // 4. Панель расписания (если открыта — обязана быть внутри окна)
  const schedulePanel = document.getElementById('schedule-panel');
  if (schedulePanel && visible(schedulePanel)) {
    checkInside('панель расписания', [schedulePanel.getBoundingClientRect()]);
  }

  return {
    problems,
    info: {
      mode: mode,
      innerWidth: winW,
      innerHeight: winH,
      scrollHeight: document.documentElement.scrollHeight,
      cards: document.querySelectorAll('#shortcuts-container .shortcut-card').length,
      pillsVisible: rects('#shortcuts-container .mist-pill').length
    }
  };
})()`;

async function waitForDevtools(port, timeout = 20000) {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch { /* ещё не поднялся */ }
    if (Date.now() - t0 > timeout) throw new Error('DevTools не поднялся за ' + timeout + ' мс');
    await sleep(150);
  }
}

function session(ws) {
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(typeof e.data === 'string' ? e.data : e.data.toString());
    if (m.id !== undefined && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else {
      for (const fn of listeners) fn(m);
    }
  });
  return {
    send: (method, params = {}) => new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    }),
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = path.resolve(ROOT, '.' + path.posix.normalize(p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Уборка браузера — та же схема, что в perf-measure.mjs: SIGTERM родителю →
// taskkill /T /F по pid → зачистка сирот строго по нашему --user-data-dir.
function killBrowserTree(child, profile) {
  if (child && child.pid) {
    try { child.kill(); } catch { /* уже мёртв */ }
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      try {
        process.kill(child.pid, 0);
      } catch {
        break;
      }
      spawnSync('cmd', ['/c', 'timeout', '/t', '1', '/nobreak'], { stdio: 'ignore' });
    }
    if (process.platform === 'win32') {
      try { spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* пусто */ }
    } else {
      try { process.kill(child.pid, 'SIGKILL'); } catch { /* пусто */ }
    }
  }
  if (process.platform === 'win32' && profile) {
    const marker = `--user-data-dir=${profile}`;
    const query = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe' or Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${marker.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    try {
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', query], { stdio: 'ignore', timeout: 15000 });
    } catch { /* нет прав — не критично */ }
  }
}

// Переход на страницу с ожиданием load. Без ожидания следующий
// Runtime.evaluate может попасть в контекст ЕЩЁ НЕ ЗАГРУЖЕННОЙ страницы и
// настройка состояния молча уедет в никуда (первый прогон так и вышло:
// все сценарии приходили с пустым списком ярлыков).
async function navigate(s, url, timeout = 30000) {
  const loaded = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout ожидания load: ' + url)), timeout);
    const off = s.on((m) => {
      if (m.method === 'Page.loadEventFired') { clearTimeout(t); off(); resolve(); }
    });
  });
  await s.send('Page.navigate', { url });
  await loaded;
  await sleep(300);
}

// Открыть новую вкладку и поднять CDP-сессию с включёнными доменами.
async function openTarget(dbgPort) {
  const created = await fetch(`http://127.0.0.1:${dbgPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!created.ok) throw new Error('json/new: HTTP ' + created.status);
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const s = session(ws);
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Log.enable');
  return { target, ws, s };
}

// Найти id загруженного расширения.
//
// В headless он нигде не публикуется: chrome://extensions не рендерится, в
// /json/list его нет, в Preferences тоже. Зато работает переопределение новой
// вкладки (chrome_url_overrides.newtab): если открыть НОВУЮ вкладку и перейти
// на chrome://newtab/, адрес превращается в chrome-extension://<id>/index.html.
// Именно этот URL и нужен смоуку, чтобы писать в chrome.storage.local.
async function findExtensionUrl(s) {
  await navigate(s, 'chrome://newtab/').catch(() => {});
  for (let i = 0; i < 25; i += 1) {
    const ev = await s.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
    const href = ev.result?.value || '';
    const m = /^(chrome-extension:\/\/[a-p]{32}\/index\.html)/.exec(href);
    if (m) return m[1];
    await sleep(200);
  }
  return null;
}

async function runScenario(dbgPort, url, scenario) {
  const created = await fetch(`http://127.0.0.1:${dbgPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!created.ok) throw new Error('json/new: HTTP ' + created.status);
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const s = session(ws);
  const jsIssues = [];
  const off = s.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {};
      jsIssues.push('JS: ' + (d.exception?.description || d.text || 'exception'));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      const text = m.params.entry.text || '';
      // Сетевые 404 (favicon сайтов-примеров) — не дефект приложения и не
      // JS-ошибка: в смоуке они только мешают. Реальные ошибки кода приходят
      // через Runtime.exceptionThrown.
      const isNetworkNoise = /Failed to load resource|net::ERR|404 \(\)/.test(text);
      if (!isNetworkNoise) jsIssues.push('log: ' + text);
    }
  });
  try {
    await s.send('Page.enable');
    await s.send('Runtime.enable');
    await s.send('Log.enable');
    await s.send('Network.enable');
    await s.send('Network.setCacheDisabled', { cacheDisabled: true });

    // Страница нужного origin, чтобы дальнейшая запись попала куда нужно.
    await navigate(s, url);

    // Состояние кладём ДО перезагрузки: так сценарий воспроизводим. В
    // расширении хранилище — chrome.storage.local (асинхронное), в HTTP-режиме
    // приложение падает на localStorage. Раньше в extension-режиме сценарии
    // молча шли на дефолтном состоянии: localStorage расширения пуст, а
    // chrome.storage никто не заполнял.
    const applied = await s.send('Runtime.evaluate', {
      expression: `(async () => {
        const shortcuts = ${JSON.stringify(JSON.stringify(scenario.shortcuts))};
        const state = ${JSON.stringify(scenario.state)};
        const useChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
        if (useChrome) {
          await chrome.storage.local.clear();
          const payload = { shortcuts: JSON.parse(shortcuts) };
          Object.entries(state).forEach(([k, v]) => { payload[k] = v; });
          await chrome.storage.local.set(payload);
          return { store: 'chrome.storage.local', keys: Object.keys(payload).length };
        }
        localStorage.clear();
        localStorage.setItem('shortcuts', shortcuts);
        Object.entries(state).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
        return { store: 'localStorage', keys: Object.keys(localStorage).length };
      })()`,
      returnByValue: true,
      awaitPromise: true
    });
    const seeded = applied.result?.value || {};

    await navigate(s, url);

    // Ждём, пока приложение снимет state-loading (контент стал видимым),
    // иначе геометрия меряется до отрисовки ярлыков.
    for (let i = 0; i < 40; i += 1) {
      const ready = await s.send('Runtime.evaluate', {
        expression: `!document.documentElement.classList.contains('state-loading')`,
        returnByValue: true
      });
      if (ready.result?.value === true) break;
      await sleep(100);
    }
    await sleep(250);

    const ev = await s.send('Runtime.evaluate', { expression: CHECKS, returnByValue: true });
    const result = ev.result?.value || { problems: ['проверка не вернула результат'], info: {} };
    const problems = [...result.problems, ...jsIssues];
    // Ожидаемое число пилюль: ловит «ярлыки вообще пропали» одним сравнением.
    if (typeof scenario.expectPills === 'number'
      && result.info?.pillsVisible !== scenario.expectPills) {
      problems.push(`видимых пилюль ${result.info?.pillsVisible}, ожидалось ${scenario.expectPills}`);
    }
    return { problems, info: { ...result.info, seeded }, scenario };
  } finally {
    off();
    ws.close();
    await fetch(`http://127.0.0.1:${dbgPort}/json/close/${target.id}`).catch(() => {});
  }
}

// Страховка на старте: каталоги perf/mem/ui-smoke-profile-* старше часа —
// мусор от прогонов, которые не дожили до уборки. См. perf-measure.mjs.
function sweepOldProfiles() {
  const tmp = os.tmpdir();
  let removed = 0;
  try {
    for (const entry of fs.readdirSync(tmp, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!/^(perf|mem|ui-smoke)-profile-/.test(entry.name)) continue;
      const full = path.join(tmp, entry.name);
      try {
        const ageMs = Date.now() - fs.statSync(full).mtimeMs;
        if (ageMs > 60 * 60 * 1000) {
          fs.rmSync(full, { recursive: true, force: true });
          removed += 1;
        }
      } catch { /* занят другим процессом — пропускаем */ }
    }
  } catch { /* нет доступа к %TEMP% — не критично */ }
  return removed;
}

async function main() {
  if (!EDGE) { console.error('Не найден Edge/Chrome. Задай BROWSER_BIN.'); process.exit(1); }
  const swept = sweepOldProfiles();
  if (swept) console.log(`убрано старых временных профилей: ${swept}`);
  const { server, port } = await startServer();
  const dbgPort = 9500 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-smoke-profile-'));
  const browser = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--disable-background-networking',
    ...(EXTENSION ? [`--load-extension=${ROOT}`, `--disable-extensions-except=${ROOT}`] : ['--disable-extensions']),
    'about:blank'
  ], { stdio: 'ignore' });

  let failed = 0;
  const results = [];
  try {
    await waitForDevtools(dbgPort);
    // В extension-режиме состояние живёт в chrome.storage.local, поэтому
    // «сеять» его надо на странице самого расширения (её URL узнаём через
    // переопределение новой вкладки).
    let extensionUrl = null;
    if (EXTENSION) {
      const probe = await openTarget(dbgPort);
      try {
        extensionUrl = await findExtensionUrl(probe.s);
      } finally {
        probe.ws.close();
        await fetch(`http://127.0.0.1:${dbgPort}/json/close/${probe.target.id}`).catch(() => {});
      }
      if (!extensionUrl) {
        console.error('Не удалось определить URL расширения (chrome://newtab/ не переопределился) — сценарии пропущены.');
        process.exit(1);
      }
    }
    const url = EXTENSION ? extensionUrl : `http://127.0.0.1:${port}/index.html`;

    const scenarios = SCENARIOS.filter((s) => !ONLY_RAW || s.name === ONLY_RAW);
    if (!scenarios.length) {
      console.error(`Нет сценариев по фильтру --only ${ONLY_RAW}. Есть: ${SCENARIOS.map((s) => s.name).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n--- UI-смоук ${WIDTH}x${HEIGHT} (${EXTENSION ? 'реальное расширение: ' + url : 'HTTP'}) ---`);
    for (const scenario of scenarios) {
      const r = await runScenario(dbgPort, url, scenario);
      results.push({ scenario: scenario.name, what: scenario.what, problems: r.problems, info: r.info });
      const ok = r.problems.length === 0;
      if (!ok) failed += 1;
      const info = r.info || {};
      console.log(`${ok ? 'OK  ' : 'ПРОВАЛ'} ${scenario.name.padEnd(18)} ${scenario.what}`);
      if (VERBOSE || !ok) {
        console.log(`       окно ${info.innerWidth}x${info.innerHeight}, карточек ${info.cards}, видимых пилюль ${info.pillsVisible}, режим: ${info.mode}`);
      }
      for (const p of r.problems) console.log(`       - ${p}`);
    }
  } finally {
    killBrowserTree(browser, profile);
    server.close();
    for (let i = 0; i < 10; i++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
    }
  }

  const out = path.join(os.tmpdir(), 'ui-smoke.json');
  fs.writeFileSync(out, JSON.stringify({ size: `${WIDTH}x${HEIGHT}`, extension: EXTENSION, results }, null, 2));
  console.log(`\nсценариев: ${results.length}, с проблемами: ${failed}`);
  console.log('JSON: ' + out);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
