// Облачная синхронизация настроек: одно нажатие — ровно один запрос.
//
// «Сохранить в облако» делает ОДИН PUT /sync/<slot> с зашифрованным
// конвертом. «Скачать из облака» делает ОДИН GET /sync/<slot>. Ключ
// шифрования выводится из кода на устройстве; сервер видит только slot
// и auth и не может прочитать настройки.
//
// В облако уходят только настройки и ярлыки. Обои, расписание, кеши и сам
// код остаются локальными (см. services/cloud-payload.js), поэтому скачивание
// не затирает то, что привязано к конкретному устройству.

import { storage } from '../storage/storage.js';
import { STATE } from '../state/store.js';
import { TRANSLATIONS } from '../i18n/translations.js';

import { BackupValidate } from './backup-validate.js';
import { buildCloudPayload, mergeLocalOnly } from '../services/cloud-payload.js';
import {
  generateCode,
  normalizeCode,
  deriveCode,
  encryptPayload,
  decryptPayload
} from '../services/cloud-sync.js';
import { normalizeBaseUrl } from '../services/schedule-sync.js';
import { getWorkerUrl, isWorkerEnabled, workerUrlReady } from './worker-url.js';

const CONFIG_KEY = 'cloudSyncConfig';

const workerInput = /** @type {HTMLInputElement} */ (document.getElementById('cloud-worker-url'));
const codeInput = /** @type {HTMLInputElement} */ (document.getElementById('cloud-sync-code'));
const masterCb = /** @type {HTMLInputElement} */ (document.getElementById('cloud-master'));
const newBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cloud-new-code'));
const copyBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cloud-copy-code'));
const uploadBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cloud-save'));
const downloadBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cloud-load'));
const forgetBtn = /** @type {HTMLButtonElement} */ (document.getElementById('cloud-forget'));
const statusEl = document.getElementById('cloud-status');
const roleHintEl = document.getElementById('cloud-role-hint');

let currentConfig = { code: '', master: false, lastUploadAt: 0, lastDownloadAt: 0 };
let busy = false;

function t(key, fallback) {
  const dict = TRANSLATIONS[STATE.language] || TRANSLATIONS.en || TRANSLATIONS.ru || {};
  return dict[key] || fallback || key;
}

function setStatus(message, kind) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.remove('is-error', 'is-success', 'is-busy');
  if (kind) statusEl.classList.add('is-' + kind);
}

function markCodeInvalid(invalid) {
  if (!codeInput) return;
  codeInput.classList.toggle('is-invalid', Boolean(invalid));
  if (invalid) codeInput.setAttribute('aria-invalid', 'true');
  else codeInput.removeAttribute('aria-invalid');
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    code: normalizeCode(source.code) || '',
    master: Boolean(source.master),
    lastUploadAt: Number(source.lastUploadAt) || 0,
    lastDownloadAt: Number(source.lastDownloadAt) || 0
  };
}

function saveConfig(config) {
  const payload = {};
  payload[CONFIG_KEY] = config && config.code ? config : null;
  storage.set(payload);
}

function updateRoleHint() {
  if (!roleHintEl) return;
  roleHintEl.textContent = currentConfig.master ? t('cloudRoleMaster') : t('cloudRoleReader');
}

function syncActionState() {
  if (uploadBtn) {
    uploadBtn.disabled = busy || !currentConfig.master;
    uploadBtn.title = currentConfig.master ? '' : t('cloudReadOnlyTitle');
  }
  [downloadBtn, newBtn, copyBtn, forgetBtn].forEach((button) => {
    if (button) button.disabled = busy;
  });
}

function setBusy(next) {
  busy = Boolean(next);
  syncActionState();
}

function applyConfigToUi() {
  if (codeInput) codeInput.value = currentConfig.code;
  if (masterCb) masterCb.checked = currentConfig.master;
  updateRoleHint();
  syncActionState();
}

/**
 * Адрес Worker: приоритет у поля в облачном разделе (пользователь мог
 * вписать его и не успеть уйти из поля). null — введено нечто невалидное,
 * '' — адрес вообще не задан.
 */
function resolveBaseUrl() {
  if (!isWorkerEnabled()) return '';
  if (workerInput) {
    const raw = String(workerInput.value || '').trim();
    if (raw) return normalizeBaseUrl(raw) || null;
  }
  return getWorkerUrl();
}

/**
 * Код из поля ввода, иначе сохранённый. null — в поле невалидный текст.
 */
function resolveCode() {
  const typed = codeInput ? String(codeInput.value || '').trim() : '';
  if (typed) return normalizeCode(typed);
  return currentConfig.code || '';
}

function getAllData() {
  return new Promise((resolve) => {
    storage.getAll((data) => resolve(data));
  });
}

function getStoredConfig() {
  return new Promise((resolve) => {
    storage.get([CONFIG_KEY], (result) => {
      resolve(normalizeConfig(result && result[CONFIG_KEY]));
    });
  });
}

function httpError(key, status) {
  setStatus(t(key) + ' HTTP ' + status, 'error');
}

// ---------------------------------------------------------------------------
// Кнопки
// ---------------------------------------------------------------------------

async function handleUpload() {
  if (busy) return;
  await workerUrlReady;

  const base = resolveBaseUrl();
  if (base === null) {
    setStatus(t('cloudBadWorker'), 'error');
    return;
  }
  if (!base) {
    setStatus(isWorkerEnabled() ? t('cloudNeedWorker') : t('workerOff'), 'error');
    return;
  }

  const code = resolveCode();
  if (!code) {
    markCodeInvalid(true);
    setStatus(t('cloudBadCode'), 'error');
    return;
  }
  markCodeInvalid(false);

  setBusy(true);
  setStatus(t('cloudUploading'), 'busy');

  try {
    const derived = await deriveCode(code);
    const payload = buildCloudPayload(await getAllData());
    const envelope = await encryptPayload(payload, derived);

    // Ровно один запрос на нажатие.
    const response = await fetch(base + '/sync/' + derived.slot, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-sync-auth': derived.auth
      },
      body: JSON.stringify(envelope)
    });

    if (response.status === 403) {
      currentConfig.master = false;
      if (masterCb) masterCb.checked = false;
      saveConfig(currentConfig);
      updateRoleHint();
      setStatus(t('cloudForbidden'), 'error');
      return;
    }
    if (response.status === 413) {
      setStatus(t('cloudTooLarge'), 'error');
      return;
    }
    if (!response.ok) {
      httpError('cloudUploadFailed', response.status);
      return;
    }

    currentConfig = {
      code,
      master: true,
      lastUploadAt: Date.now(),
      lastDownloadAt: currentConfig.lastDownloadAt
    };
    saveConfig(currentConfig);
    if (codeInput) codeInput.value = code;
    if (masterCb) masterCb.checked = true;
    updateRoleHint();
    setStatus(t('cloudUploaded'), 'success');
  } catch (error) {
    console.error('Cloud upload failed:', error);
    setStatus(t(error && error.message === 'invalid_state' ? 'cloudBadData' : 'cloudNetwork'), 'error');
  } finally {
    setBusy(false);
  }
}

async function handleDownload() {
  if (busy) return;
  await workerUrlReady;

  const base = resolveBaseUrl();
  if (base === null) {
    setStatus(t('cloudBadWorker'), 'error');
    return;
  }
  if (!base) {
    setStatus(isWorkerEnabled() ? t('cloudNeedWorker') : t('workerOff'), 'error');
    return;
  }

  const code = resolveCode();
  if (!code) {
    markCodeInvalid(true);
    setStatus(t('cloudBadCode'), 'error');
    return;
  }
  markCodeInvalid(false);

  if (typeof window.confirm === 'function' && !window.confirm(t('cloudConfirmDownload'))) {
    return;
  }

  setBusy(true);
  setStatus(t('cloudDownloading'), 'busy');

  try {
    const derived = await deriveCode(code);

    // Ровно один запрос на нажатие.
    const response = await fetch(base + '/sync/' + derived.slot, { cache: 'no-store' });

    if (response.status === 404) {
      setStatus(t('cloudEmpty'), 'error');
      return;
    }
    if (!response.ok) {
      httpError('cloudDownloadFailed', response.status);
      return;
    }

    let envelope;
    try {
      envelope = await response.json();
    } catch (error) {
      setStatus(t('cloudBadData'), 'error');
      return;
    }

    let remote;
    try {
      remote = await decryptPayload(envelope, derived);
    } catch (error) {
      setStatus(t(error && error.code === 'decrypt_failed' ? 'cloudWrongCode' : 'cloudBadData'), 'error');
      return;
    }

    const result = BackupValidate.sanitize(remote);
    if (!result.ok) {
      setStatus(t('cloudBadData'), 'error');
      return;
    }

    const localRaw = await getAllData();
    const merged = mergeLocalOnly(result.value, localRaw);
    merged[CONFIG_KEY] = {
      code,
      master: currentConfig.master,
      lastUploadAt: currentConfig.lastUploadAt,
      lastDownloadAt: Date.now()
    };

    storage.clearAndSet(merged, () => {
      if (typeof window.alert === 'function') window.alert(t('cloudDownloaded'));
      window.location.reload();
    });
  } catch (error) {
    console.error('Cloud download failed:', error);
    setStatus(t('cloudNetwork'), 'error');
  } finally {
    setBusy(false);
  }
}

function handleNewCode() {
  if (busy) return;

  const code = generateCode();
  if (codeInput) codeInput.value = code;
  markCodeInvalid(false);

  currentConfig = {
    code,
    master: true,
    lastUploadAt: currentConfig.lastUploadAt,
    lastDownloadAt: currentConfig.lastDownloadAt
  };
  saveConfig(currentConfig);
  if (masterCb) masterCb.checked = true;
  updateRoleHint();
  syncActionState();
  setStatus(t('cloudNewCodeHint'), 'success');
}

async function handleCopyCode() {
  if (busy) return;

  const code = resolveCode();
  if (!code) {
    setStatus(t('cloudNeedCode'), 'error');
    return;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(code);
    } else if (codeInput) {
      codeInput.select();
      document.execCommand('copy');
    }
    setStatus(t('cloudCopied'), 'success');
  } catch (error) {
    setStatus(t('cloudCopyFailed'), 'error');
  }
}

function handleForget() {
  if (busy) return;
  if (typeof window.confirm === 'function' && !window.confirm(t('cloudForgetConfirm'))) {
    return;
  }

  currentConfig = { code: '', master: false, lastUploadAt: 0, lastDownloadAt: 0 };
  saveConfig(currentConfig);
  if (codeInput) codeInput.value = '';
  if (masterCb) masterCb.checked = false;
  markCodeInvalid(false);
  updateRoleHint();
  syncActionState();
  setStatus(t('cloudForgotten'), '');
}

// ---------------------------------------------------------------------------
// События
// ---------------------------------------------------------------------------

if (codeInput) {
  codeInput.addEventListener('change', () => {
    const raw = String(codeInput.value || '').trim();
    if (!raw) {
      markCodeInvalid(false);
      currentConfig = Object.assign({}, currentConfig, { code: '' });
      saveConfig(currentConfig);
      syncActionState();
      return;
    }

    const code = normalizeCode(raw);
    if (!code) {
      markCodeInvalid(true);
      setStatus(t('cloudBadCode'), 'error');
      return;
    }

    markCodeInvalid(false);
    codeInput.value = code;
    currentConfig = Object.assign({}, currentConfig, {
      code,
      master: Boolean(masterCb && masterCb.checked)
    });
    saveConfig(currentConfig);
    syncActionState();
    setStatus('', '');
  });
}

if (masterCb) {
  masterCb.addEventListener('change', () => {
    currentConfig.master = Boolean(masterCb.checked);
    saveConfig(currentConfig);
    updateRoleHint();
    syncActionState();
  });
}

// connect-src берётся из манифеста в момент его загрузки: если манифест
// обновили, а расширение не перезагрузили, запрос к Worker режется старым
// CSP. Браузер сообщает об этом отдельным событием — показываем причину,
// иначе она выглядит как обычная потеря сети.
window.addEventListener('securitypolicyviolation', (event) => {
  const blocked = event && event.blockedURI ? String(event.blockedURI) : '';
  if (blocked.indexOf('workers.dev') === -1) return;
  setStatus(t('cloudReloadExtension'), 'error');
});

if (newBtn) newBtn.addEventListener('click', handleNewCode);
if (copyBtn) copyBtn.addEventListener('click', handleCopyCode);
if (uploadBtn) uploadBtn.addEventListener('click', handleUpload);
if (downloadBtn) downloadBtn.addEventListener('click', handleDownload);
if (forgetBtn) forgetBtn.addEventListener('click', handleForget);

getStoredConfig().then((config) => {
  currentConfig = config;
  applyConfigToUi();
});

export {
  CONFIG_KEY,
  handleUpload,
  handleDownload,
  handleNewCode,
  handleForget,
  resolveBaseUrl
};
