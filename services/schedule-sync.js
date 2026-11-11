// Запросы к Worker за расписанием. Сервер отдаёт только метаданные и файл;
// ссылки на VK и сам VK клиент не видит.

export function normalizeBaseUrl(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = 'https://' + raw;

  let url;
  try {
    url = new URL(raw);
  } catch (error) {
    return '';
  }

  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return '';
  if (url.username || url.password) return '';
  return url.origin;
}

function checkBaseUrl(baseUrl) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) throw new Error('bad_worker_url');
  return base;
}

export async function sha256Hex(data) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Один GET /schedule/latest.
 * options.refresh — просьба к серверу сходить в ВК прямо сейчас (ставится
 * один раз, когда пользователь включает рубильник Worker).
 * @returns {Promise<{ok: true, none: true} | {ok: true, none: false, schedule: any}>}
 */
export async function fetchLatestSchedule(baseUrl, options = {}) {
  const base = checkBaseUrl(baseUrl);
  const query = options && options.refresh ? '?refresh=1' : '';
  const response = await fetch(base + '/schedule/latest' + query, {
    cache: 'no-store',
    headers: { accept: 'application/json' }
  });

  if (response.status === 404) return { ok: true, none: true };
  if (!response.ok) throw new Error('schedule_http_' + response.status);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('schedule_bad_json', { cause: error });
  }

  if (!data || data.ok !== true || typeof data.hash !== 'string' || !data.hash) {
    throw new Error('schedule_bad_response');
  }

  return {
    ok: true,
    none: false,
    schedule: {
      hash: data.hash,
      title: typeof data.title === 'string' ? data.title : '',
      fileName: typeof data.fileName === 'string' ? data.fileName : '',
      size: Number(data.size) || 0,
      date: Number(data.date) || 0,
      postId: data.postId == null ? null : Number(data.postId),
      checkedAt: Number(data.checkedAt) || 0,
      stale: Boolean(data.stale)
    }
  };
}

/**
 * Один GET /schedule/file.
 * @returns {Promise<{buffer: ArrayBuffer, hash: string, headerHash: string}>}
 */
export async function fetchScheduleFile(baseUrl) {
  const base = checkBaseUrl(baseUrl);
  const response = await fetch(base + '/schedule/file', { cache: 'no-store' });
  if (!response.ok) throw new Error('schedule_file_http_' + response.status);

  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength < 1024) throw new Error('schedule_file_empty');

  const head = new Uint8Array(buffer.slice(0, 4));
  if (head[0] !== 0x50 || head[1] !== 0x4b || head[2] !== 0x03 || head[3] !== 0x04) {
    throw new Error('schedule_file_not_xlsx');
  }

  return {
    buffer,
    hash: await sha256Hex(buffer),
    headerHash: response.headers.get('x-schedule-hash') || ''
  };
}
