#!/usr/bin/env node
// Холодные замеры загрузки index.html в headless Edge/Chrome.
//
//   node tools/perf-measure.mjs [--label before] [--runs 12] [--throttle 1|4]
//
// Как работает:
//   1) поднимает локальный статический HTTP-сервер на корне репозитория
//      (cache-control: no-store — каждый прогон «холодный»; это соответствует
//      реальности: chrome-extension:// не проходит через HTTP-кэш);
//   2) запускает headless-браузер с CDP-портом и меряет через DevTools Protocol
//      (без puppeteer/зависимостей — только node:http + встроенный WebSocket);
//   3) для каждой страницы собирает FCP/DCL/load из Performance API, число
//      ресурсов, heap и проверяет функциональное состояние (state-loading снят,
//      сервисы определены, часы отрисованы, 0 JS-ошибок);
//   4) --throttle N даёт Emulation.setCPUThrottlingRate — имитацию слабого
//      устройства, где блокирующие скрипты больнее всего.
//
// Результат: таблица (медиана/min за прогоны) + путь к JSON.
import { spawn } from 'node:child_process';
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
const LABEL = opt('label', 'run');
const RUNS = Number(opt('runs', 12));
const THROTTLE = Number(opt('throttle', 1));
const EXTENSION = args.includes('--extension');

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

// Снимок состояния страницы: метрики + функциональные проверки.
const PROBE = `(() => {
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, p.startTime]));
  const styles = performance.getEntriesByType('stylesheet');
  const out = {
    fcp: paints['first-contentful-paint'] ?? null,
    domInteractive: nav.domInteractive ?? null,
    dcl: nav.domContentLoadedEventEnd ?? null,
    load: nav.loadEventEnd ?? null,
    responseEnd: nav.responseEnd ?? null,
    // Когда CSS (последняя таблица стилей) закончил загружаться — прямой эффект
    // от того, не перекрыт ли <link> блокирующими <script> в <head>.
    cssDone: styles.length ? Math.max(...styles.map((s) => s.responseEnd)) : null,
    // Ключевая для пользователя метрика: момент снятия html.state-loading,
    // т.е. когда контент СТАНОВИТСЯ ВИДИМЫМ (visibility: hidden → виден).
    tillVisible: (window.__perf && window.__perf.stateRemovedAt) ?? null,
    resources: performance.getEntriesByType('resource').length,
    heapKB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024) : null
  };
  const clock = document.getElementById('clock');
  const issues = [];
  if (document.documentElement.classList.contains('state-loading')) issues.push('state-loading НЕ снят');
  if (!window.WeatherService) issues.push('WeatherService отсутствует');
  if (!clock || !/^\\d{1,2}:\\d{2}/.test(clock.textContent)) issues.push('часы не отрисованы: ' + (clock ? clock.textContent : 'null'));
  out.issues = issues;
  return out;
})()`;

// Инъекция ДО любых скриптов страницы (через CDP, репозиторий не трогаем):
// фиксируем момент снятия html.state-loading — когда контент становится видимым.
const INJECT = `(function () {
  window.__perf = { stateRemovedAt: null, seenLoading: false };
  (function attach() {
    const de = document.documentElement;
    if (!de) return setTimeout(attach, 0);
    const check = () => {
      if (de.classList.contains('state-loading')) {
        window.__perf.seenLoading = true;
      } else if (window.__perf.seenLoading && window.__perf.stateRemovedAt === null) {
        window.__perf.stateRemovedAt = performance.now();
        obs.disconnect();
      }
    };
    const obs = new MutationObserver(check);
    obs.observe(de, { attributes: true, attributeFilter: ['class'] });
    check();
  })();
})();`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };


async function measureRun(url, dbgPort) {
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
    if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') {
      jsIssues.push('log: ' + m.params.entry.text);
    }
  });
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Performance.enable').catch(() => {});
  await s.send('Log.enable');
  await s.send('Network.enable');
  await s.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (THROTTLE !== 1) await s.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await s.send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT }).catch(() => {});

  const loaded = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout ожидания load')), 30000);
    const off2 = s.on((m) => {
      if (m.method === 'Page.loadEventFired') { clearTimeout(t); off2(); resolve(); }
    });
  });
  await s.send('Page.navigate', { url });
  await loaded;
  // Paint асинхронен и в headless фиксируется чуть позже load — даём отрисоваться,
  // иначе FCP не попадёт в выборку.
  await sleep(250);

  const ev = await s.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const perf = await s.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
  const cm = Object.fromEntries((perf.metrics || []).map((m) => [m.name, m.value]));
  const r = ev.result?.value || {};
  if ((r.fcp == null || r.fcp === 0) && cm.FirstContentfulPaint) r.fcp = cm.FirstContentfulPaint * 1000;
  r.issues = [...(r.issues || []), ...jsIssues];

  off();
  ws.close();
  await fetch(`http://127.0.0.1:${dbgPort}/json/close/${target.id}`).catch(() => {});
  return r;
}

function report(label, runs) {
  const pick = (k) => runs.map((r) => r[k]).filter((v) => typeof v === 'number');
  const line = (name, key, unit = 'мс') => {
    const vals = pick(key);
    if (!vals.length) return `${name.padEnd(16)} нет данных`;
    const med = median(vals).toFixed(1).padStart(7);
    const min = Math.min(...vals).toFixed(1).padStart(7);
    return `${name.padEnd(16)} медиана ${med} ${unit}   min ${min} ${unit}`;
  };
  const allIssues = [...new Set(runs.flatMap((r) => r.issues || []))];
  console.log(`\n--- ${label}  (прогонов: ${runs.length}, throttle ${THROTTLE}x) ---`);
  for (const [n, k, u] of [['Видимость (state-loading)', 'tillVisible', 'мс'], ['FCP', 'fcp', 'мс'], ['CSS готов', 'cssDone', 'мс'], ['DOM interactive', 'domInteractive', 'мс'], ['DOMContentLoaded', 'dcl', 'мс'], ['Load', 'load', 'мс'], ['JS heap', 'heapKB', 'КБ'], ['Ресурсов', 'resources', 'шт']]) {
    console.log(line(n, k, u));
  }
  console.log(allIssues.length ? 'ПРОБЛЕМЫ: ' + allIssues.join(' | ') : 'Функции: все проверки пройдены, JS-ошибок нет');
  return {
    label, throttle: THROTTLE, runs: runs.length,
    medians: Object.fromEntries(['tillVisible', 'fcp', 'cssDone', 'domInteractive', 'dcl', 'load', 'heapKB', 'resources']
      .map((k) => [k, pick(k).length ? median(pick(k)) : null])),
    issues: allIssues
  };
}

async function main() {
  if (!EDGE) { console.error('Не найден Edge/Chrome. Задай BROWSER_BIN.'); process.exit(1); }
  const { server, port } = await startServer();
  const dbgPort = 9400 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-profile-'));
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--disable-background-networking',
    ...(EXTENSION ? [`--load-extension=${ROOT}`, `--disable-extensions-except=${ROOT}`] : ['--disable-extensions']),
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    await waitForDevtools(dbgPort);
    const url = EXTENSION ? 'chrome://newtab/' : `http://127.0.0.1:${port}/index.html`;
    // 2 прогрева (компиляция кода) — в статистику не входят
    for (let i = 0; i < 2; i++) await measureRun(url, dbgPort);
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measureRun(url, dbgPort));
    const summary = report(`${LABEL} (${path.basename(EDGE)})`, runs);
    const out = path.join(os.tmpdir(), `perf-${LABEL}-${THROTTLE}x.json`);
    fs.writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log('JSON: ' + out);
  } finally {
    edge.kill();
    server.close();
    // Edge может ещё держать файлы профиля — ждём и глотаем EPERM, каталог
    // временный и всё равно удалится ОС.
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

