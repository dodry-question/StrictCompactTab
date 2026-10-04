// Чтение .xlsx без сторонних библиотек: xlsx — это ZIP с XML внутри.
// 1) разбираем центральный каталог архива и распаковываем нужные записи через
//    DecompressionStream('deflate-raw') (Chrome 103+ / Firefox 113+ / Node 18+);
// 2) XML разбираем регулярками — Excel/Sheets отдают предсказуемую разметку.
// Результат — плоская карта значений «строка,колонка» + список объединений.
const ScheduleXlsx = (function () {
  'use strict';

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function decodeXml(text) {
    return text
      .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  function parseZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    // End Of Central Directory — ищем с конца (позиция 0x06054b50)
    let eocd = -1;
    const from = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= from; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not-a-zip');
    const count = u16(view, eocd + 10);
    let offset = u32(view, eocd + 16);
    const entries = new Map();
    const decoder = new TextDecoder('utf-8');
    for (let i = 0; i < count; i++) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const method = u16(view, offset + 10);
      const compressedSize = u32(view, offset + 20);
      const nameLen = u16(view, offset + 28);
      const extraLen = u16(view, offset + 30);
      const commentLen = u16(view, offset + 32);
      const localOffset = u32(view, offset + 42);
      const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
      entries.set(name, { method, compressedSize, localOffset });
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return { bytes, view, entries };
  }

  async function readEntry(zip, name) {
    const entry = zip.entries.get(name);
    if (!entry) return null;
    const off = entry.localOffset;
    if (zip.view.getUint32(off, true) !== 0x04034b50) throw new Error('bad-local-header');
    const nameLen = u16(zip.view, off + 26);
    const extraLen = u16(zip.view, off + 28);
    const start = off + 30 + nameLen + extraLen;
    const data = zip.bytes.subarray(start, start + entry.compressedSize);
    const raw = entry.method === 0 ? data : await inflateRaw(data);
    return new TextDecoder('utf-8').decode(raw);
  }

  function columnIndex(letters) {
    let n = 0;
    for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }

  function parseSharedStrings(xml) {
    const out = [];
    const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(xml))) {
      const parts = m[1].match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
      out.push(parts
        .map(p => decodeXml(p.replace(/<t(?:\s[^>]*)?>/g, '').replace(/<\/t>/g, '')))
        .join(''));
    }
    return out;
  }

  function parseSheet(xml, shared) {
    const values = new Map();
    const merges = [];
    let maxRow = 0;
    let maxCol = 0;
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let m;
    while ((m = cellRe.exec(xml))) {
      const attrs = m[1];
      const inner = m[2] || '';
      const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
      if (!ref) continue;
      const col = columnIndex(ref[1]);
      const row = Number(ref[2]);
      const type = (/t="([^"]+)"/.exec(attrs) || [])[1] || '';
      let text = null;
      if (type === 'inlineStr') {
        const t = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(inner);
        text = t ? decodeXml(t[1]) : null;
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        if (v) {
          const raw = decodeXml(v[1]);
          text = type === 's' ? (shared[Number(raw)] ?? '') : raw;
        }
      }
      if (text !== null && text !== '') {
        values.set(row + ',' + col, text);
        if (row > maxRow) maxRow = row;
        if (col > maxCol) maxCol = col;
      }
    }
    const mergeRe = /<mergeCell ref="([A-Z]+\d+):([A-Z]+\d+)"\s*\/>/g;
    while ((m = mergeRe.exec(xml))) {
      const a = /([A-Z]+)(\d+)/.exec(m[1]);
      const b = /([A-Z]+)(\d+)/.exec(m[2]);
      merges.push([Number(a[2]), columnIndex(a[1]), Number(b[2]), columnIndex(b[1])]);
    }
    return { values, merges, maxRow, maxCol };
  }

  return {
    async read(arrayBuffer) {
      const zip = parseZip(arrayBuffer);
      const sharedXml = await readEntry(zip, 'xl/sharedStrings.xml');
      const shared = sharedXml ? parseSharedStrings(sharedXml) : [];
      const sheetName = [...zip.entries.keys()].find(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n));
      if (!sheetName) throw new Error('no-sheet');
      const sheetXml = await readEntry(zip, sheetName);
      if (!sheetXml) throw new Error('no-sheet');
      return parseSheet(sheetXml, shared);
    }
  };
})();

export { ScheduleXlsx };
