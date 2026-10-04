// Разбор листа расписания в группы и занятия.
//
// Устройство файла (проверено на реальном расписании Колледжа ВятГУ):
//   - строка заголовков содержит повторяющиеся блоки колонок
//     «День недели | Часы | Дисциплина,модуль | Вид занятия | Преподаватель | Аудитория»;
//     после «Часы» может идти несколько групп по 4 колонки (общие потоки),
//     и тогда «День/Часы» одни на несколько групп;
//   - строкой выше лежат названия групп (объединённые ячейки над своими колонками);
//   - день и часы объединены вертикально на блок строк (обычно 7 пар),
//     поэтому значение читается через merge-диапазон.
// Файл меняется каждую неделю, поэтому строки и колонки ищутся по тексту.
(function () {
  'use strict';

  function norm(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function lower(value) {
    return norm(value).toLowerCase().replace(/ё/g, 'е');
  }

  // Значение ячейки: сначала прямое, затем якорь объединения.
  // Диапазон объединения ОБРЕЗАЕТСЯ по данным: Excel и Google Sheets часто
  // оставляют объединение «на всю колонку» (r2 = 1048576), и без обрезки
  // одно такое объединение раздувало карту на миллион записей (замерено:
  // +233 МБ heap и ~230 мс на одном разборе файла).
  function makeGetter(sheet) {
    const { values, merges } = sheet;
    const lastRow = sheet.maxRow || 0;
    const mergesByRow = new Map();
    merges.forEach(entry => {
      const r1 = Math.max(entry[0], 1);
      const r2 = Math.min(entry[2], lastRow);
      if (r2 < r1) return;   // объединение целиком за пределами данных
      for (let r = r1; r <= r2; r++) {
        if (!mergesByRow.has(r)) mergesByRow.set(r, []);
        mergesByRow.get(r).push(entry);
      }
    });
    return function at(row, col) {
      const direct = values.get(row + ',' + col);
      if (direct !== undefined) return direct;
      const list = mergesByRow.get(row);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const entry = list[i];
          if (row >= entry[0] && row <= entry[2] && col >= entry[1] && col <= entry[3]) {
            const anchor = values.get(entry[0] + ',' + entry[1]);
            if (anchor !== undefined) return anchor;
          }
        }
      }
      return '';
    };
  }

  function classify(header) {
    const h = lower(header);
    if (!h) return '';
    if (h.indexOf('день недел') === 0) return 'day';
    if (h.indexOf('час') === 0) return 'hours';
    if (h.indexOf('дисциплин') === 0 || h.indexOf('предмет') === 0) return 'subject';
    if (h.indexOf('вид') === 0) return 'kind';
    if (h.indexOf('преподав') === 0) return 'teacher';
    if (h.indexOf('аудитор') === 0) return 'room';
    return '';
  }

  function findHeaderRow(at, sheet) {
    for (let r = 1; r <= sheet.maxRow; r++) {
      for (let c = 1; c <= sheet.maxCol; c++) {
        if (classify(at(r, c)) === 'day') return r;
      }
    }
    return 0;
  }

  // Строка заголовков → блоки { dayCol, hoursCol, groups: [{subjectCol, ...}] }
  function parseBlocks(at, headerRow, maxCol) {
    const blocks = [];
    let block = null;
    let group = null;

    const finishGroup = () => {
      if (block && group && group.subjectCol) block.groups.push(group);
      group = null;
    };

    for (let c = 1; c <= maxCol; c++) {
      const kind = classify(at(headerRow, c));
      if (!kind) continue;
      if (kind === 'day') {
        finishGroup();
        block = { dayCol: c, hoursCol: 0, groups: [] };
        blocks.push(block);
      } else if (!block) {
        continue;
      } else if (kind === 'hours') {
        block.hoursCol = c;
      } else {
        if (!group) group = {};
        group[kind + 'Col'] = c;
        if (kind === 'room') finishGroup();
      }
    }
    finishGroup();
    return blocks;
  }

  // Ближайшая непустая ячейка в строке: сначала точное значение (или якорь
  // объединения), затем поиск слева/справа в радиусе 6 колонок.
  // Нужно из-за кривизны файла: шапка специальности местами смещена на
  // колонку вправо относительно «Дня недели», а названия групп — объединения.
  function readNearestLabel(at, row, col) {
    let label = at(row, col);
    if (label) return label;
    for (let d = 1; d <= 6 && !label; d++) label = at(row, col - d);
    for (let d = 1; d <= 6 && !label; d++) label = at(row, col + d);
    return label;
  }

  // --- Порядок показа: неделя с понедельника, внутри дня — пары по времени ---
  // Файл идёт «как получилось»: блоки колонок лежат горизонтально, и внутри
  // одного дня пары иногда идут вразнобой (остатки прошлых недель). Поэтому
  // для показа сортируем сами, а не полагаемся на порядок строк.
  const WEEKDAYS = [
    ['понедельник', 'monday'],
    ['вторник', 'tuesday'],
    ['среда', 'wednesday'],
    ['четверг', 'thursday'],
    ['пятница', 'friday'],
    ['суббота', 'saturday'],
    ['воскресенье', 'sunday']
  ];

  // «ПОНЕДЕЛЬНИК 28.09» → { weekday: 0, date: 2809 }
  function dayKey(day) {
    const text = lower(day);
    let weekday = WEEKDAYS.length;
    for (let i = 0; i < WEEKDAYS.length; i++) {
      if (text.indexOf(WEEKDAYS[i][0]) >= 0 || text.indexOf(WEEKDAYS[i][1]) >= 0) {
        weekday = i;
        break;
      }
    }
    const date = /(\d{1,2})[.\-/](\d{1,2})/.exec(text);
    return {
      weekday: weekday,
      date: date ? Number(date[1]) * 100 + Number(date[2]) : 0
    };
  }

  // «8.20-9.50» → 500 (минуты от полуночи); неразобранное время — в конец.
  // Регулярка ЯКОРНАЯ (^): берём начало пары. Без якоря «9.5-10.45» читалась
  // как 10:45 вместо 9:05 — движок пропускал однозначные минуты и цеплял
  // конец диапазона, из-за чего пары сортировались неверно и подсветка
  // «следующих пар» уезжала.
  function timeKey(time) {
    const m = /^(\d{1,2})\s*[.:]\s*(\d{1,2})/.exec(norm(time));
    if (!m) return Number.MAX_SAFE_INTEGER;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  // Момент начала занятия. Года в файле нет, поэтому берём год из now и
  // раскатываем файл «из прошлого»/«из будущего» (см. resolveLessonYear).
  function lessonStart(lesson, year) {
    const date = /(\d{1,2})[.\-/](\d{1,2})/.exec(norm(lesson.day));
    if (!date) return null;
    const minutes = timeKey(lesson.time);
    if (minutes === Number.MAX_SAFE_INTEGER) return null;
    return new Date(year, Number(date[2]) - 1, Number(date[1]),
      Math.floor(minutes / 60), minutes % 60, 0, 0);
  }

  const HALF_YEAR = 182 * 86400000;

  // Расписание публикуют на конкретную неделю, а год в файле не написан.
  // Если все даты файла оказались далеко в прошлом — это «будущая» неделя
  // (например, файл января, открытый в декабре), и наоборот.
  function resolveLessonYear(lessons, now) {
    const year = now.getFullYear();
    const times = lessons
      .map(lesson => lessonStart(lesson, year))
      .filter(Boolean)
      .map(date => date.getTime());
    if (!times.length) return year;
    if (Math.max(...times) < now.getTime() - HALF_YEAR) return year + 1;
    if (Math.min(...times) > now.getTime() + HALF_YEAR) return year - 1;
    return year;
  }

  // Ближайшее занятие, которое ещё не началось. Возвращает { start, day, time }
  // или null, если неделя закончилась. Именно его день подсвечивается:
  // если сегодня пары уже кончились, подсветится завтрашний.
  function nextLesson(lessons, now) {
    const today = now || new Date();
    const year = resolveLessonYear(lessons, today);
    let best = null;
    lessons.forEach(lesson => {
      const start = lessonStart(lesson, year);
      if (!start || start.getTime() <= today.getTime()) return;
      if (!best || start.getTime() < best.start.getTime()) {
        best = { start, day: lesson.day || '', time: lesson.time || '' };
      }
    });
    return best;
  }

  window.ScheduleParser = {
    norm,
    dayKey,
    timeKey,
    lessonStart,
    nextLesson,

    // Занятия → [{ day, date, lessons }]: неделя по порядку, пары по времени
    groupByDay(lessons) {
      const buckets = new Map();
      lessons.forEach(lesson => {
        const day = lesson.day || '';
        if (!buckets.has(day)) buckets.set(day, []);
        buckets.get(day).push(lesson);
      });
      return [...buckets.keys()]
        .map(day => ({ day: day, key: dayKey(day), lessons: buckets.get(day) }))
        .sort((a, b) => (a.key.weekday - b.key.weekday) || (a.key.date - b.key.date))
        .map(entry => ({
          day: entry.day,
          date: entry.key.date,
          lessons: entry.lessons.slice().sort((a, b) => timeKey(a.time) - timeKey(b.time))
        }));
    },

    // Лист → группы и занятия
    parse(sheet) {
      const at = makeGetter(sheet);

      const headerRow = findHeaderRow(at, sheet);
      if (!headerRow) {
        const error = /** @type {Error & { code: string }} */ (new Error('Не найден столбец «День недели»'));
        error.code = 'no-header';
        throw error;
      }

      const blocks = parseBlocks(at, headerRow, sheet.maxCol);

      const groupRow = headerRow - 1;
      const specRow = headerRow - 5;
      const semesterRow = headerRow - 3;
      blocks.forEach(block => {
        block.spec = specRow > 0 ? readNearestLabel(at, specRow, block.dayCol) : '';
        block.semester = semesterRow > 0 ? readNearestLabel(at, semesterRow, block.dayCol) : '';
        block.groups.forEach(group => {
          group.label = norm(readNearestLabel(at, groupRow, group.subjectCol));
        });
      });

      // Занятия: строки ниже заголовка; день/часы — из блока, дисциплины — из колонок.
      const buckets = new Map();
      const order = [];
      const days = [];
      const seenDays = new Set();

      for (let r = headerRow + 1; r <= sheet.maxRow; r++) {
        blocks.forEach(block => {
          const day = norm(at(r, block.dayCol));
          const time = block.hoursCol ? norm(at(r, block.hoursCol)) : '';
          block.groups.forEach(group => {
            if (!group.label) return;
            const subject = norm(at(r, group.subjectCol));
            const kind = group.kindCol ? norm(at(r, group.kindCol)) : '';
            const teacher = group.teacherCol ? norm(at(r, group.teacherCol)) : '';
            const room = group.roomCol ? norm(at(r, group.roomCol)) : '';
            if (!subject && !kind && !teacher && !room) return;

            if (!buckets.has(group.label)) {
              buckets.set(group.label, { spec: '', semester: '', lessons: [] });
              order.push(group.label);
            }
            const bucket = buckets.get(group.label);
            if (!bucket.spec && block.spec) bucket.spec = block.spec;
            if (!bucket.semester && block.semester) bucket.semester = block.semester;
            bucket.lessons.push({ day: day, time: time, subject: subject, kind: kind, teacher: teacher, room: room });
            if (day && !seenDays.has(day)) {
              seenDays.add(day);
              days.push(day);
            }
          });
        });
      }

      const groups = order.map((label, index) => {
        const bucket = buckets.get(label);
        return {
          id: 'g' + index,
          name: label,
          spec: bucket.spec,
          semester: bucket.semester,
          lessons: bucket.lessons
        };
      });

      return { headerRow: headerRow, groups: groups, days: days, blockCount: blocks.length };
    }
  };
})();

// Экспорт для будущих import (шаг «в»); мост window.ScheduleParser задаётся внутри IIFE.
const ScheduleParser = window.ScheduleParser;
export { ScheduleParser };
