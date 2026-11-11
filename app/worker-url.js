// Один адрес Worker на всё расширение: и для облака, и для расписания, и для
// погоды. В настройках два поля (в облачном разделе и в разделе расписания),
// но значение у них общее — введённый адрес зеркалится во второе поле.
//
// Здесь же рубильник. По умолчанию он ВЫКЛЮЧЕН: пока пользователь сам его не
// включил, расширение не отправляет Worker ни одного запроса. Адрес при этом
// сохраняется, но поля неактивны — выключенный сервер не должен выглядеть
// работающим.

import { storage } from '../storage/storage.js';
import { normalizeBaseUrl } from '../services/schedule-sync.js';
import { ShortcutIcons } from '../services/shortcut-icons.js';

const STORAGE_KEY = 'workerBaseUrl';
const ENABLED_KEY = 'workerEnabled';

let current = '';
let enabled = false;
const inputs = new Set();
const enabledListeners = new Set();
const toggle = /** @type {HTMLInputElement} */ (document.getElementById('worker-enabled'));

// Адрес читается асинхронно, а кнопки «Скачать»/«Проверить» нажимают раньше,
// чем придёт ответ storage. Промис даёт обработчикам дождаться значения,
// вместо того чтобы отправить запрос на пустой адрес.
let resolveReady = null;
export const workerUrlReady = new Promise((resolve) => { resolveReady = resolve; });

function applyToInputs() {
  inputs.forEach((input) => {
    if (input.value !== current) input.value = current;
    input.disabled = !enabled;
  });
}

export function isWorkerEnabled() {
  return enabled;
}

// Пустая строка = «к Worker обращаться нельзя». Все потребители (облако,
// расписание, погода) читают адрес только отсюда, поэтому рубильник гасит
// трафик целиком, а не отдельными проверками в каждом модуле.
export function getWorkerUrl() {
  return enabled ? current : '';
}

// Подписка на включение: расписанию нужен ровно один поход за свежими
// метаданными в момент включения, дальше их держит сервер.
export function onWorkerEnabled(listener) {
  if (typeof listener === 'function') enabledListeners.add(listener);
}

function setEnabled(next) {
  const value = Boolean(next);
  const turnedOn = value && !enabled;
  enabled = value;
  if (toggle && toggle.checked !== value) toggle.checked = value;
  applyToInputs();
  storage.set({ [ENABLED_KEY]: value });
  if (turnedOn) enabledListeners.forEach((listener) => listener());
}

export function loadWorkerUrl(callback) {
  storage.get([STORAGE_KEY, ENABLED_KEY], (result) => {
    current = normalizeBaseUrl(result && result[STORAGE_KEY]);
    enabled = Boolean(result && result[ENABLED_KEY]);
    if (toggle) toggle.checked = enabled;
    applyToInputs();
    if (resolveReady) {
      resolveReady(getWorkerUrl());
      resolveReady = null;
    }
    if (typeof callback === 'function') callback(getWorkerUrl());
  });
}

export function bindWorkerUrlInputs(elements) {
  (elements || []).forEach((input) => {
    if (!input) return;
    inputs.add(input);
    if (input.value !== current) input.value = current;
    input.disabled = !enabled;

    input.addEventListener('change', () => {
      const raw = String(input.value || '').trim();
      const next = normalizeBaseUrl(raw);

      // Невалидный адрес не сохраняем и не зеркалим: пользователь должен
      // увидеть, что именно он ввёл, и исправить, а не потерять текст.
      if (raw && !next) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        return;
      }

      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      input.value = next;
      current = next;
      applyToInputs();

      const payload = {};
      payload[STORAGE_KEY] = next || null;
      storage.set(payload);
    });
  });
}

if (toggle) {
  toggle.addEventListener('change', () => setEnabled(toggle.checked));
}

// Иконки ярлыков кешируются на устройстве, но забирать их байты можно только
// через Worker: сам Google не отдаёт CORS-заголовки, а fetch без них браузер
// режет. Рубильник выключен — иконки грузятся напрямую, как раньше.
ShortcutIcons.setProxyBase(getWorkerUrl);

// Модуль подключается один раз; поля уже есть в разметке к моменту
// выполнения app/* (скрипты идут после body).
bindWorkerUrlInputs([
  document.getElementById('cloud-worker-url'),
  document.getElementById('schedule-worker-url')
]);
loadWorkerUrl();