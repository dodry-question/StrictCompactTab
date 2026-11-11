// Разбор публичной стены сообщества ВК без логина, токена и cookies.
//
// VK отдаёт список постов двумя анонимными способами:
//   1) al_wall.php?act=get_wall&al=1&owner_id=...&offset=...&type=own —
//      страницы по 10 постов, offset работает (проверено);
//   2) widget_community.php?gid=...&mode=4 — ровно 10 последних постов.
// Основной путь — al_wall: расписаний может не быть среди 10 последних
// новостей, а постраничный обход находит их глубже. Виджет остаётся
// запасным вариантом на случай, если AJAX-эндпоинт изменится.
//
// Ответы VK содержат JSON, у которого кавычки закодированы как &quot;.
// Декодируем только окно вокруг подстроки "xlsx", а не всю страницу:
// страницы по 500–600 КБ, и полный decode + regex на каждом запросе —
// лишняя нагрузка и риск упереться в CPU-лимит бесплатного Worker.

export const VK_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8'
};

const XV_EXT_RE = /"type":"doc","doc":\{[^}]*?"ext":"xlsx"[^}]*?\}/g;
const WINDOW_BEFORE = 7000;
const WINDOW_AFTER = 2500;

export function decodeEntities(html) {
  return String(html)
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&');
}

function asPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function isVkDocUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'vk.com' || url.hostname.endsWith('.vk.com'));
  } catch (error) {
    return false;
  }
}

// Возвращает все xlsx-вложения из HTML. Один документ может встретиться
// несколько раз (в самом объекте doc и в подписи chip), поэтому дубли
// отбрасываются по doc.id.
export function extractXlsxDocs(html) {
  const source = String(html);
  const found = [];
  const seen = new Set();
  let cursor = 0;
  let scanned = 0;

  while (scanned < 200) {
    const hit = source.indexOf('xlsx', cursor);
    if (hit === -1) break;
    cursor = hit + 4;
    scanned += 1;

    const start = Math.max(0, hit - WINDOW_BEFORE);
    const end = Math.min(source.length, hit + WINDOW_AFTER);
    const chunk = decodeEntities(source.slice(start, end));

    let match;
    XV_EXT_RE.lastIndex = 0;
    while ((match = XV_EXT_RE.exec(chunk))) {
      let doc;
      try {
        doc = JSON.parse('{' + match[0] + '}').doc;
      } catch (error) {
        continue;
      }
      if (!doc || doc.ext !== 'xlsx') continue;
      const key = String(doc.id || doc.url || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);

      // В AJAX-ответе VK JSON вложен в JS-строку, поэтому слэши в URL
      // экранированы дважды: "https:\\/\\/vk.com". После JSON.parse
      // остаются символы "\/" — убираем их перед проверкой ссылки.
      const url = String(doc.url || '').split('\\/').join('/');
      if (!isVkDocUrl(url)) continue;
      const size = asPositiveInt(doc.size, 0);
      if (!size || size > 20 * 1024 * 1024) continue;

      const tail = chunk.slice(match.index + match[0].length, match.index + match[0].length + 2200);
      const postMatch = tail.match(/"from_id":-?\d+[\s\S]{0,400}?"id":(\d+)/);

      found.push({
        id: doc.id,
        title: typeof doc.title === 'string' ? doc.title : '',
        size,
        date: asPositiveInt(doc.date, 0),
        url,
        postId: postMatch ? Number(postMatch[1]) : null
      });
    }
  }

  return found;
}

// Свежее вложение: сначала по времени загрузки, затем по размеру.
// Повторные загрузки одного и того же расписания имеют разные doc.id и
// иногда чуть разный размер — берём последнюю загруженную версию.
export function chooseNewest(docs) {
  if (!Array.isArray(docs) || !docs.length) return null;
  return docs.slice().sort((a, b) => {
    if (b.date !== a.date) return b.date - a.date;
    return b.size - a.size;
  })[0];
}

function wallUrl(ownerId, offset) {
  return (
    'https://vk.com/al_wall.php?act=get_wall&al=1' +
    '&owner_id=' + encodeURIComponent(ownerId) +
    '&offset=' + offset +
    '&type=own'
  );
}

function widgetUrl(groupId) {
  return (
    'https://vk.com/widget_community.php?app=0&width=300px&_ver=1' +
    '&gid=' + encodeURIComponent(groupId) +
    '&mode=4&color1=FFFFFF&color2=000000&color3=000000'
  );
}

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: VK_HEADERS, redirect: 'follow' });
  if (!response || !response.ok) return '';
  return response.text();
}

// Ищет самое свежее xlsx-вложение на стене сообщества.
// Возвращает объект вложения или null, если расписания нет/стена недоступна.
export async function discoverLatest(env, fetchImpl = fetch) {
  const ownerId = String(env.VK_OWNER_ID || '-85060840');
  const groupId = ownerId.replace(/^-/, '');
  const pages = Math.min(20, Math.max(1, Number(env.SCHEDULE_MAX_PAGES) || 6));

  for (let page = 0; page < pages; page++) {
    let html;
    try {
      html = await fetchText(fetchImpl, wallUrl(ownerId, page * 10));
    } catch (error) {
      // Сеть недоступна — переходим к запасному способу, а не падаем
      break;
    }
    if (!html) break;

    const docs = extractXlsxDocs(html);
    if (docs.length) return chooseNewest(docs);

    // Страница без упоминаний стены — скорее всего заглушка/ошибка VK
    if (html.indexOf('wall-' + groupId + '_') === -1) break;
  }

  let widget;
  try {
    widget = await fetchText(fetchImpl, widgetUrl(groupId));
  } catch (error) {
    return null;
  }
  if (!widget) return null;

  const idRe = new RegExp('wall-' + groupId + '_(\\d+)', 'g');
  const ids = [...new Set([...widget.matchAll(idRe)].map((m) => Number(m[1])))]
    .filter((id) => Number.isFinite(id) && id > 0)
    .sort((a, b) => b - a);

  for (const id of ids) {
    let html;
    try {
      html = await fetchText(fetchImpl, 'https://vk.com/wall-' + groupId + '_' + id + '?embed=1');
    } catch (error) {
      continue;
    }
    const docs = extractXlsxDocs(html);
    if (docs.length) return chooseNewest(docs);
  }

  return null;
}

// Скачивает документ по ссылке из ответа VK. Проверяем и хост, и ZIP-магию:
// VK умеет отдавать HTML-заглушку со статусом 200, если ссылка устарела.
export async function downloadDoc(docUrl, fetchImpl = fetch, maxBytes = 12 * 1024 * 1024) {
  if (!isVkDocUrl(docUrl)) throw new Error('unsupported_doc_url');

  const limit = Math.min(25 * 1024 * 1024, Math.max(1024, Number(maxBytes) || 12 * 1024 * 1024));
  const response = await fetchImpl(docUrl, { headers: VK_HEADERS, redirect: 'follow' });
  if (!response || !response.ok) throw new Error('doc_http_' + (response ? response.status : '0'));

  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength < 1024 || buffer.byteLength > limit) {
    throw new Error('doc_bad_size');
  }

  const head = new Uint8Array(buffer.slice(0, 4));
  if (head[0] !== 0x50 || head[1] !== 0x4b || head[2] !== 0x03 || head[3] !== 0x04) {
    throw new Error('doc_not_xlsx');
  }

  return buffer;
}
