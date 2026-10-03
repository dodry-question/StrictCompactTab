// Иконки ярлыков: мгновенная отрисовка + локальный кэш.
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
// Те��ь:
//   1) на элемент мгновенно ставится ЛОКАЛЬНАЯ заглушка — пустых окон не бывает;
//   2) иконка кэшируется в localStorage как data:URL, поэтому со второго раза
//      она рисуется сразу и без сети (localStorage синхронный — первый кадр
//      не ждёт promises);
//   3) реальная иконка дорисовывается мягким проявлением, без «щелчка»;
//   4) кэш ограничен по размеру, при переполнении молча отключается.
(function () {
  'use strict';

  const CACHE_KEY = 'shortcutIconCache';
  const CACHE_LIMIT = 200;

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

  function readCache() {
    if (cache) return cache;
    cache = {};
    if (cacheBroken) return cache;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') cache = parsed;
      }
    } catch (e) {
      cacheBroken = true;
    }
    return cache;
  }

  function writeCache() {
    if (cacheBroken) return;
    try {
      // Ограничение не только по числу записей, но и по весу: при переполнении
      // localStorage лучше сбросить кэш целиком, чем ломать запись вкладки.
      const keys = Object.keys(cache);
      if (keys.length > CACHE_LIMIT) {
        for (const key of keys.slice(0, keys.length - CACHE_LIMIT)) delete cache[key];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      cacheBroken = true;
      cache = {};
    }
  }

  function cacheKey(item, size) {
    let hostname;
    try { hostname = new URL(item.url).hostname; } catch (e) { hostname = String(item.url || ''); }
    return size + '|' + hostname;
  }

  function remoteUrl(item, size) {
    let hostname;
    try { hostname = new URL(item.url).hostname; } catch (e) { hostname = String(item.url || ''); }
    return 'https://www.google.com/s2/favicons?sz=' + size + '&domain=' + encodeURIComponent(hostname);
  }

  window.ShortcutIcons = {
    PLACEHOLDER,
    FALLBACK,

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
      const cached = readCache()[key];

      // Из кэша — мгновенно, без сети и без мигания
      if (cached) {
        img.src = cached;
        img.classList.add('is-loaded');
        return img;
      }

      // Первый раз по этому домену: заглушка сейчас, иконка — через мгновение
      img.src = PLACEHOLDER;
      img.classList.add('icon-pending');

      const probe = new Image();
      probe.referrerPolicy = 'no-referrer';
      const ready = (source) => {
        img.src = source;
        img.classList.remove('icon-pending');
        img.classList.add('is-loaded');
      };
      probe.onload = () => {
        ready(probe.src);
        if (!cacheBroken) {
          readCache()[key] = probe.src;
          writeCache();
        }
      };
      probe.onerror = () => ready(FALLBACK);
      probe.src = remoteUrl(item, size);
      return img;
    },

    // Сброс кэша (например, при полном сбросе настроек)
    clear() {
      cache = {};
      cacheBroken = false;
      try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* пусто */ }
    }
  };
})();
