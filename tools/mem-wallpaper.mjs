#!/usr/bin/env node
// Замер ОЗУ вокруг обоев: сколько памяти занимает base64-строка обоев и её
// копии (STATE, localStorage, Blob для CSS-переменной).
//
//   node tools/mem-wallpaper.mjs [--size 2560x1440] [--quality 0.85] [--runs 3]
//
// Зачем: в сводке зафиксировано, что base64-обои (JPEG 2560×1440 ≈ 300–500 КБ)
// — главный реальный потребитель ОЗУ страницы, но копии никто не считал.
// Инструмент отвечает на вопросы фактами:
//   1) сколько байт base64 занимает строка самозамером (длина строки в UTF-16);
//   2) сколько добавляет живой heap страницы (CDP HeapProfiler.collectGarbage
//      + Performance.getMetrics JSHeapUsedSize) — до и после установки обоев;
//   3) сколько копий строки/Blob живёт одновременно.
//
// Механика: страница открывается через HTTP как в perf-measure.mjs (storage
// падает на localStorage), скрипт сам «рисует» JPEG нужного размера
// (--pattern noise — шум, худший случай для JPEG; --pattern photo — плавные
// градиенты, ближе к обычному фото), кладёт его в localStorage как
// customBackground и перезагружает вкладку. Замер идёт на «холодной» странице:
// loadState() → applyBackground() → Blob + blob-URL.
//
// GC вызывается принудительно (HeapProfiler.collectGarbage) — без него цифры
// плавают от мусора, который браузер ещё не собрал.
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
const SIZE = opt('size', '2560x1440');
const QUALITY = Number(opt('quality', 0.85));
const RUNS = Number(opt('runs', 3));
const PATTERN = opt('pattern', 'noise');
const [WIDTH, HEIGHT] = SIZE.split('x').map(Number);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Уборка браузера — та же схема, что в perf-measure.mjs: SIGTERM родителю →
// taskkill /T /F по pid → зачистка сирот с нашим --user-data-dir. Без этого
// дочерние процессы Edge переживают прогон и висят «новыми вкладками».
function killBrowserTree(child, profile) {
  if (child && child.pid) {
    try { child.kill(); } catch { /* уже мёртв */ }
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      try {
        process.kill(child.pid, 0);
      } catch {
        return;
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

async function removeProfileDir(profile) {
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(profile, { recursive: true, force: true }); return true; } catch { await sleep(300); }
  }
  return false;
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

// Нарисовать JPEG нужного размера прямо на странице (canvas → toDataURL).
// Два режима:
//   noise — чистый шум: худший случай для JPEG (верхняя граница размера);
//   photo — плавные градиенты + немного шума: ближе к реальному фото
//           (фото сжимается в разы лучше шума), это «обычный» случай.
const MAKE_IMAGE = `(() => {
  const c = document.createElement('canvas');
  c.width = ${WIDTH}; c.height = ${HEIGHT};
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  const photo = ${PATTERN === 'photo'};
  for (let y = 0; y < c.height; y += 1) {
    for (let x = 0; x < c.width; x += 1) {
      const i = (y * c.width + x) * 4;
      if (photo) {
        // Плавные градиенты по обеим осям + слабый шум: похоже на фото
        const grain = (Math.random() * 10) | 0;
        img.data[i] = (128 + 100 * Math.sin(x / 300) + grain) | 0;
        img.data[i + 1] = (128 + 90 * Math.cos(y / 260) + grain) | 0;
        img.data[i + 2] = (140 + 80 * Math.sin((x + y) / 480) + grain) | 0;
      } else {
        img.data[i] = (Math.random() * 256) | 0;
        img.data[i + 1] = (Math.random() * 256) | 0;
        img.data[i + 2] = (Math.random() * 256) | 0;
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', ${QUALITY});
})()`;

// Замер: что лежит в состоянии, в хранилище и в CSS; длина строки в байтах
// UTF-16 (V8 держит строку как одно- или двухбайтовую — считаем оба варианта).
const PROBE = `(() => {
  const dbg = window.__bgDebug || {};
  const raw = localStorage.getItem('customBackground');
  const inline = document.body.style.getPropertyValue('--user-wallpaper') || '';
  let storageValue = raw;
  try { storageValue = JSON.parse(raw); } catch (e) { /* строка как есть */ }
  return {
    stateChars: typeof dbg.len === 'number' ? dbg.len : 0,
    stateType: dbg.type || 'unknown',
    storageChars: typeof storageValue === 'string' ? storageValue.length : 0,
    inlineChars: inline.length,
    inlineIsBlob: inline.indexOf('blob:') !== -1,
    stateIsBlob: dbg.type === 'string' && (window.storeRef || '') === '',
    hasWallpaperClass: document.body.classList.contains('has-wallpaper')
  };
})()`;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// Живой heap в байтах. Performance.getMetrics отдаёт JSHeapUsedSize в байтах,
// и это ровно то, что видно в DevTools → Memory после принудительного GC.
async function heapBytes(s) {
  await s.send('HeapProfiler.collectGarbage').catch(() => {});
  await s.send('Runtime.evaluate', { expression: 'void 0' }).catch(() => {});
  const perf = await s.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
  const m = Object.fromEntries((perf.metrics || []).map((x) => [x.name, x.value]));
  return m.JSHeapUsedSize ?? null;
}

async function openTarget(dbgPort) {
  const created = await fetch(`http://127.0.0.1:${dbgPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!created.ok) throw new Error('json/new: HTTP ' + created.status);
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const s = session(ws);
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Performance.enable').catch(() => {});
  await s.send('HeapProfiler.enable').catch(() => {});
  return { target, ws, s };
}

async function goto(s, url) {
  const loaded = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout ожидания load')), 30000);
    const off = s.on((m) => {
      if (m.method === 'Page.loadEventFired') { clearTimeout(t); off(); resolve(); }
    });
  });
  await s.send('Page.navigate', { url });
  await loaded;
  await sleep(300);
}

async function evaluate(s, expression) {
  const r = await s.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

// Разбор живого heap по «удерживающим» объектам: снимок кучи + агрегация по
// типам. Нужен, чтобы отличить саму строку base64 от её копий (Blob-байты,
// строка в localStorage, внутренние строки V8) — иначе непонятно, что чинить.
async function heapComposition(s) {
  await s.send('HeapProfiler.collectGarbage').catch(() => {});
  const chunks = [];
  const off = s.on((m) => {
    if (m.method === 'HeapProfiler.addHeapSnapshotChunk') chunks.push(m.params.chunk);
  });
  try {
    await s.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, treatGlobalObjectsAsRoots: false });
  } finally {
    off();
  }
  const snap = JSON.parse(chunks.join(''));
  const strings = snap.strings || [];
  const nodes = snap.snapshot?.node_count ?? 0;
  const byType = new Map();
  // Поля узла в flat-массиве: node_fields = [type, name, id, self_size, edge_count, trace_node_id, detachedness]
  const fields = snap.snapshot?.meta?.node_fields || [];
  const typeIdx = fields.indexOf('type');
  const nameIdx = fields.indexOf('name');
  const sizeIdx = fields.indexOf('self_size');
  const stride = fields.length;
  const typeList = snap.snapshot?.meta?.node_types?.[0] || [];
  for (let i = 0; i < (snap.nodes?.length || 0); i += stride) {
    const type = typeList[snap.nodes[i + typeIdx]] || '?';
    const name = strings[snap.nodes[i + nameIdx]] || '';
    const size = snap.nodes[i + sizeIdx] || 0;
    if (!size) continue;
    // Для строк важен не только тип, но и «кто» их держит: (system), JS-строки, Blob-байты.
    const key = type === 'string' ? `string${name ? ' (' + name + ')' : ''}` : type;
    byType.set(key, (byType.get(key) || 0) + size);
  }
  return { nodes, byType: [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
}

async function main() {
  if (!EDGE) { console.error('Не найден Edge/Chrome. Задай BROWSER_BIN.'); process.exit(1); }
  const swept = sweepOldProfiles();
  if (swept) console.log(`убрано старых временных профилей: ${swept}`);
  const { server, port } = await startServer();
  const dbgPort = 9800 + Math.floor(Math.random() * 150);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-profile-'));
  const browser = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--disable-background-networking',
    '--js-flags=--expose-gc',
    'about:blank'
  ], { stdio: 'ignore' });

  const runs = [];
  try {
    await waitForDevtools(dbgPort);
    const url = `http://127.0.0.1:${port}/index.html`;

    for (let i = 0; i < RUNS; i += 1) {
      const { target, ws, s } = await openTarget(dbgPort);
      try {
        // 1. Холодная страница БЕЗ обоев — базовая линия.
        await goto(s, url);
        await evaluate(s, `localStorage.removeItem('customBackground'); localStorage.removeItem('shortcuts')`);
        await goto(s, url);
        const before = await heapBytes(s);

        // 2. Рисуем JPEG и кладём как обои (как это делает пользователь через
        //    «Свой фон»: compressImage → data:URL → STATE.customBackground).
        const dataUrl = await evaluate(s, MAKE_IMAGE);
        const dataUrlChars = dataUrl.length;
        await evaluate(s, `localStorage.setItem('customBackground', ${JSON.stringify(JSON.stringify(dataUrl))})`);

        // 3. Холодная страница С обоями: loadState → applyBackground → Blob.
        await goto(s, url);
        const after = await heapBytes(s);
        const probe = await evaluate(s, PROBE);
        // Разбор состава heap — только на последнем прогоне: снимок кучи
        // тяжёлый и на медианы не влияет.
        const composition = i === RUNS - 1 ? await heapComposition(s) : null;
        // Дополнительно: сколько занимает сама строка обоев вне страницы (факт
        // для отчёта) — оценка UTF-8/UTF-16 по длине символов.
        const sizes = await evaluate(s, `(() => {
          const raw = localStorage.getItem('customBackground') || '';
          let value = raw;
          try { value = JSON.parse(raw); } catch (e) {}
          const s = typeof value === 'string' ? value : '';
          return { chars: s.length, utf16Bytes: s.length * 2, jpegBytes: Math.round(s.length * 3 / 4) };
        })()`);

        runs.push({ before, after, delta: after - before, dataUrlChars, probe, composition, sizes });
        console.log(`прогон ${i + 1}: base64 ${Math.round(dataUrlChars / 1024)} КиБ, heap ${Math.round(before / 1024)} → ${Math.round(after / 1024)} КиБ (delta ${Math.round((after - before) / 1024)} КиБ)`);
      } finally {
        ws.close();
        await fetch(`http://127.0.0.1:${dbgPort}/json/close/${target.id}`).catch(() => {});
      }
    }

    const pick = (k) => runs.map((r) => r[k]).filter((v) => typeof v === 'number');
    const kb = (v) => (v === null ? '—' : `${Math.round(v / 1024)} КиБ`);
    console.log(`\n--- Обои ${SIZE}, JPEG q=${QUALITY} (прогонов: ${runs.length}) ---`);
    console.log(`base64 в строке (медиана)   ${Math.round(median(pick('dataUrlChars')) / 1024)} КиБ`);
    console.log(`исходный JPEG (медиана)     ${Math.round(median(pick('dataUrlChars')) * 0.75 / 1024)} КиБ`);
    console.log(`heap без обоев (медиана)    ${kb(median(pick('before')))}`);
    console.log(`heap с обоями (медиана)     ${kb(median(pick('after')))}`);
    console.log(`прирост heap (медиана)      ${kb(median(pick('delta')))}`);
    const last = runs[runs.length - 1].probe;
    console.log(`копии в состоянии страницы:`);
    console.log(`  STATE.customBackground    ${last.stateChars} символов${last.stateIsBlob ? ' (blob:)' : ''}`);
    console.log(`  localStorage              ${last.storageChars} символов`);
    console.log(`  CSS --user-wallpaper      ${last.inlineChars} символов${last.inlineIsBlob ? ' (blob:)' : ''}`);
    console.log(`  класс has-wallpaper       ${last.hasWallpaperClass ? 'да' : 'НЕТ'}`);
    const comp = runs[runs.length - 1].composition;
    if (comp) {
      console.log(`\nсостав живого heap после установки обоев (топ удержаний, ${comp.nodes} узлов):`);
      for (const [type, size] of comp.byType) {
        console.log(`  ${String(Math.round(size / 1024)).padStart(7)} КиБ  ${type}`);
      }
    }
    const sizes = runs[runs.length - 1].sizes;
    if (sizes) {
      console.log(`\nсама строка обоев: ${sizes.chars} символов = ${Math.round(sizes.utf16Bytes / 1024)} КиБ в UTF-16, JPEG ≈ ${Math.round(sizes.jpegBytes / 1024)} КиБ`);
    }
    const out = path.join(os.tmpdir(), 'mem-wallpaper.json');
    fs.writeFileSync(out, JSON.stringify({ size: SIZE, quality: QUALITY, runs }, null, 2));
    console.log('JSON: ' + out);
  } finally {
    browser.kill();
    server.close();
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
