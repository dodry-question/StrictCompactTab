// Иконки ярлыков: мгновенная отрисовка + кэш на устройстве.
//
// Проблема, которую это решает. Раньше в трёх местах (services/shortcut-renderer.js,
// app/navigation.js, app/shortcuts-migration.js) было написано одно и то же:
//
//   img.src = item.customIcon || 'https://www.google.com/s2/favicons?sz=128&domain=…'
//
// Плитка сразу попадала на экран ПУСТОЙ, а иконка доезжала по сети через
// google.com. На новой вкладке это читалось как «мелькают пустые окна»:
// карточки без иконок, потом иконки, потом у некоторых запрос падал и
// подставлялась запасная заглушка. Плюс каждое открытие вкладки отправляло
// Google список всех твоих доменов.
//
// Теперь:
//   1) на элемент мгновенно ставится ЛОКАЛЬНАЯ заглушка — пустых окон не бывает;
//   2) иконка лежит в localStorage, поэтому со второго раза рисуется сразу и
//      без сети (localStorage синхронный — первый кадр не ждёт promises);
//   3) обновляется не чаще раза в сутки и только в фоне: даже устаревшая
//      иконка показывается сразу, а свежая дорисовывается, когда придёт;
//   4) один запрос на домен, сколько бы плиток его ни показывали;
//   5) кэш ограничен по числу записей и по весу, при переполнении отключается.
//
// Байты иконки можно прочитать только через Worker (см. cloudflare/src/favicons.js):
// Google не отдаёт CORS-заголовки, а без них fetch из страницы расширения
// режется браузером. Пока рубильник Worker выключен, работает прежний путь
// через <img> — картинка показывается, но хранит её браузерный HTTP-кэш.
const ShortcutIcons = (function () {
  'use strict';

  const CACHE_KEY = 'shortcutIconCache';
  const CACHE_LIMIT = 200;
  const CACHE_CHARS = 1200000;   // ~1.2 МБ символов: localStorage не бездонный
  const REFRESH_MS = 24 * 60 * 60 * 1000;

  // Нейтральный глиф-заглушка: рисуется мгновенно, не требует сети.
  // Светлый круг с точкой — читается как «иконка ещё подгружается».
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="9" fill="none" stroke="white" stroke-opacity="0.35" stroke-width="1.6"/>' +
    '<circle cx="12" cy="12" r="3.2" fill="white" fill-opacity="0.35"/>' +
    '</svg>'
  );

  // То, что раньше ставилось в img.onerror: сайт недоступен или иконки нет.
  const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" ' +
    'stroke-opacity="0.7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'
  );

  let cache = null;
  let cacheBroken = false;   // localStorage переполнен — больше не пробуем писать
  let proxyBase = () => '';

  // Ключ → плитки, которые ждут эту иконку. Один запрос на домен.
  const pending = new Map();

  function readCache() {
    if (cache) return cache;
    cache = {};
    if (cacheBroken) return cache;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const key of Object.keys(parsed)) {
            const value = parsed[key];
            // Записи прошлых версий — просто строка с адресом иконки, без
            // времени. Показываем её сразу и обновляем в фоне.
            if (typeof value === 'string') cache[key] = { src: value, ts: 0 };
            else if (value && typeof value.src === 'string') {
              cache[key] = { src: value.src, ts: Number(value.ts) || 0 };
            }
          }
        }
      }
    } catch (e) {
      cacheBroken = true;
    }
    return cache;
  }

  function prune() {
    const keys = Object.keys(cache);
    let chars = 0;
    for (const key of keys) chars += cache[key].src.length;
    if (keys.length <= CACHE_LIMIT && chars <= CACHE_CHARS) return;

    // Вытесняем самые давно обновлённые: их всё равно пора перечитать.
    const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts);
    let count = keys.length;
    for (const key of oldest) {
      if (count <= CACHE_LIMIT && chars <= CACHE_CHARS) break;
      chars -= cache[key].src.length;
      count -= 1;
      delete cache[key];
    }
  }

  function writeCache() {
    if (cacheBroken) return;
    try {
      prune();
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      cacheBroken = true;
      cache = {};
    }
  }

  function hostname(item) {
    try { return new URL(item.url).hostname; } catch (e) { return String(item.url || ''); }
  }

  function cacheKey(item, size) {
    return size + '|' + hostname(item);
  }

  function remoteUrl(item, size) {
    return 'https://www.google.com/s2/favicons?sz=' + size + '&domain=' + encodeURIComponent(hostname(item));
  }

  function apply(img, key, source) {
    // Пока иконка ехала, плитку могли перерисовать под другой ярлык.
    if (!img || img.dataset.iconKey !== key) return;
    img.src = source;
    img.classList.remove('icon-pending');
    img.classList.add('is-loaded');
  }

  function finish(key, source) {
    const targets = pending.get(key);
    pending.delete(key);
    if (!cacheBroken) {
      readCache()[key] = { src: source, ts: Date.now() };
      writeCache();
    }
    if (targets) targets.forEach((img) => apply(img, key, source));
  }

  // Путь без Worker: картинку показывает браузер, прочитать её байты нельзя.
  function probeDirect(key, item, size) {
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => finish(key, probe.src);
    // Недоступный сайт тоже запоминаем: иначе мёртвый домен дёргался бы при
    // каждом открытии вкладки.
    probe.onerror = () => finish(key, FALLBACK);
    probe.src = remoteUrl(item, size);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('icon_read_failed'));
      reader.readAsDataURL(blob);
    });
  }

  // Путь через Worker: байты приходят с CORS и ложатся на устройство.
  async function loadViaProxy(key, item, size, base) {
    try {
      const response = await fetch(
        base + '/favicon?size=' + size + '&domain=' + encodeURIComponent(hostname(item)),
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('icon_http_' + response.status);

      const blob = await response.blob();
      if (!blob || !blob.size || blob.size > 128 * 1024) throw new Error('icon_bad_body');
      if (!/^image\//i.test(blob.type || '')) throw new Error('icon_not_image');

      finish(key, await blobToDataUrl(blob));
    } catch (error) {
      // Сервер недоступен — иконка всё равно нужна, берём напрямую.
      probeDirect(key, item, size);
    }
  }

  function startLoad(key, item, size, img) {
    const waiting = pending.get(key);
    if (waiting) {
      waiting.add(img);
      return;
    }
    pending.set(key, new Set([img]));

    const base = proxyBase();
    if (base && typeof FileReader === 'function') loadViaProxy(key, item, size, base);
    else probeDirect(key, item, size);
  }

  return {
    PLACEHOLDER,
    FALLBACK,
    REFRESH_MS,

    // Адрес Worker приходит из app/worker-url.js: сервис не знает ни про
    // настройки, ни про рубильник — выключенный сервер для него пустая строка.
    setProxyBase(resolver) {
      proxyBase = typeof resolver === 'function' ? resolver : () => '';
    },

    // size: 128 для плиток сетки, 64 для пилюль Mist
    attach(img, item, size) {
      if (!img || !item) return img;

      // Загруженная пользователем иконка — уже локальная, рисуется сразу
      if (item.customIcon) {
        img.src = item.customIcon;
        img.classList.add('is-loaded');
        return img;
      }

      const key = cacheKey(item, size);
      img.dataset.iconKey = key;
      const entry = readCache()[key];

      // Из кэша — мгновенно, даже если запись пора обновить: открытие новой
      // вкладки не должно ждать сеть.
      if (entry) {
        img.src = entry.src;
        img.classList.add('is-loaded');
        if (Date.now() - entry.ts >= REFRESH_MS) startLoad(key, item, size, img);
        return img;
      }

      // Первый раз по этому домену: заглушка сейчас, иконка — через мгновение
      img.src = PLACEHOLDER;
      img.classList.add('icon-pending');
      startLoad(key, item, size, img);
      return img;
    },

    // Сброс кэша (например, при полном сбросе настроек)
    clear() {
      cache = null;
      cacheBroken = false;
      pending.clear();
      try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* пусто */ }
    }
  };
})();

export { ShortcutIcons };