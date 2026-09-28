import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'schedule-sample.xlsx');

await import('../services/schedule-xlsx.js');
await import('../services/schedule-parser.js');

async function readFixture() {
  const bytes = fs.readFileSync(FIXTURE);
  const buffer = await new Blob([bytes]).arrayBuffer();
  return window.ScheduleXlsx.read(buffer);
}

// --- Чтение реального файла ------------------------------------------------

test('xlsx: разбирает реальный файл в карту ячеек и объединения', async () => {
  const sheet = await readFixture();
  assert.ok(sheet.values.size > 5000, `значений: ${sheet.values.size}`);
  assert.ok(sheet.merges.length > 600, `объединений: ${sheet.merges.length}`);
  // строки 68-115 в файле пустые (мусорное форматирование), данные кончаются на 67
  assert.ok(sheet.maxRow >= 67, `строк: ${sheet.maxRow}`);
  assert.ok(sheet.maxCol >= 320, `колонок: ${sheet.maxCol}`);
  // конкретная ячейка из реального файла: A14 — заголовок вуза
  assert.match(sheet.values.get('14,1') || '', /ВЯТСКИЙ ГОСУДАРСТВЕННЫЙ/);
});

test('parser: находит заголовок, блоки и группы реального файла', async () => {
  const sheet = await readFixture();
  const parsed = window.ScheduleParser.parse(sheet);
  assert.equal(parsed.headerRow, 25);
  assert.ok(parsed.blockCount >= 20, `блоков: ${parsed.blockCount}`);
  assert.ok(parsed.groups.length >= 50, `групп: ${parsed.groups.length}`);
  assert.ok(parsed.days.length >= 6, `дней: ${parsed.days.length}`);
  assert.ok(parsed.days.includes('ПОНЕДЕЛЬНИК 28.09'), parsed.days.join(', '));
});

test('parser: точное занятие группы ИСПк-302 из файла', async () => {
  const sheet = await readFixture();
  const parsed = window.ScheduleParser.parse(sheet);
  const group = parsed.groups.find(g => g.name.includes('ИСПк-302'));
  assert.ok(group, 'группа ИСПк-302 не найдена');
  const lesson = group.lessons.find(l =>
    l.day === 'ПОНЕДЕЛЬНИК 28.09' && l.time === '8.20-9.50');
  assert.ok(lesson, 'нет занятия в понедельник 28.09 на 8.20-9.50');
  assert.match(lesson.subject, /^МДК 05\.01/);
  assert.equal(lesson.kind, 'Пр. занятие');
  assert.equal(lesson.teacher, 'Сергеева Е.Г.');
  assert.equal(lesson.room, '1-113');
});

test('parser: повторяющиеся названия групп схлопываются в одну', async () => {
  const sheet = await readFixture();
  const parsed = window.ScheduleParser.parse(sheet);
  const ecoo = parsed.groups.filter(g => g.name.includes('ЭКОО-21'));
  assert.equal(ecoo.length, 1, `ЭКОО-21 найдено: ${ecoo.length}`);
  assert.ok(ecoo[0].lessons.length > 0, 'у ЭКОО-21 нет занятий');
  // данные из «старого» блока шаблона тоже попадают в общую группу
  assert.ok(ecoo[0].lessons.some(l => l.room === '15-265'), 'нет занятия в 15-265');
});

test('parser: spec и semester читаются из шапки блока', async () => {
  const sheet = await readFixture();
  const parsed = window.ScheduleParser.parse(sheet);
  const withSpec = parsed.groups.filter(g => g.spec);
  assert.ok(withSpec.length >= 60, `со специальностью: ${withSpec.length} из ${parsed.groups.length}`);
  assert.ok(parsed.groups.some(g => g.semester.includes('2026 - 2027')));
});

// --- Синтетические случаи (без файла) --------------------------------------

function makeSheet(values, merges = [], maxRow = 50, maxCol = 20) {
  return { values: new Map(Object.entries(values)), merges, maxRow, maxCol };
}

test('parser: day/часы берутся через merge-объединение', () => {
  const sheet = makeSheet({
    '2,3': 'Группа ТЕСТ-1',
    '3,1': 'День недели', '3,2': 'Часы', '3,3': 'Дисциплина,модуль',
    '3,4': 'Вид занятия', '3,5': 'Преподаватель', '3,6': 'Аудитория',
    '4,1': 'ПОНЕДЕЛЬНИК 28.09', '4,2': '8.20-9.50',
    '4,3': 'Математика', '4,4': 'Лекция, урок', '4,5': 'Иванов И.И.', '4,6': '5-403',
    '5,3': 'Физика', '5,4': 'Пр. занятие', '5,5': 'Петров П.П.', '5,6': '5-404'
  }, [[4, 1, 6, 1], [4, 2, 6, 2]]);

  const parsed = window.ScheduleParser.parse(sheet);
  assert.equal(parsed.headerRow, 3);
  assert.equal(parsed.groups.length, 1);
  const group = parsed.groups[0];
  assert.equal(group.name, 'Группа ТЕСТ-1');
  assert.equal(group.lessons.length, 2);
  // вторая строка — внутри объединения: day/часы наследуются от якоря
  assert.equal(group.lessons[1].day, 'ПОНЕДЕЛЬНИК 28.09');
  assert.equal(group.lessons[1].time, '8.20-9.50');
  assert.equal(group.lessons[1].subject, 'Физика');
});

test('parser: два блока с общими часами читаются независимо', () => {
  const sheet = makeSheet({
    '2,3': 'Группа А', '2,9': 'Группа Б',
    '3,1': 'День недели', '3,2': 'Часы', '3,3': 'Дисциплина', '3,4': 'Вид',
    '3,5': 'Преподаватель', '3,6': 'Аудитория',
    '3,7': 'День недели', '3,8': 'Часы', '3,9': 'Дисциплина', '3,10': 'Вид',
    '3,11': 'Преподаватель', '3,12': 'Аудитория',
    '4,1': 'ПОНЕДЕЛЬНИК 28.09', '4,2': '8.20-9.50',
    '4,3': 'Алгебра', '4,4': 'Лекция', '4,5': 'Сидоров С.С.', '4,6': '1-101',
    '4,7': 'ВТОРНИК 29.09', '4,8': '10.00-11.30',
    '4,9': 'Геометрия', '4,10': 'Пр. занятие', '4,11': 'Кузнецов К.К.', '4,12': '1-102'
  });

  const parsed = window.ScheduleParser.parse(sheet);
  assert.equal(parsed.groups.length, 2);
  assert.equal(parsed.groups[0].lessons[0].day, 'ПОНЕДЕЛЬНИК 28.09');
  assert.equal(parsed.groups[1].lessons[0].day, 'ВТОРНИК 29.09');
  assert.equal(parsed.groups[1].lessons[0].time, '10.00-11.30');
});

test('parser: файл без «День недели» даёт ошибку no-header', () => {
  const sheet = makeSheet({ '1,1': 'Просто таблица' });
  assert.throws(() => window.ScheduleParser.parse(sheet), err => err.code === 'no-header');
});

test('parser: norm схлопывает лишние пробелы (даты в старом шаблоне)', () => {
  assert.equal(window.ScheduleParser.norm('ПЯТНИЦА   01.09'), 'ПЯТНИЦА 01.09');
  assert.equal(window.ScheduleParser.norm('  Группа\tЭКОО-21 \n'), 'Группа ЭКОО-21');
});

// --- Порядок показа: неделя и время ---------------------------------------

test('parser: dayKey понимает день недели и дату', () => {
  assert.deepEqual(window.ScheduleParser.dayKey('ПОНЕДЕЛЬНИК 28.09'), { weekday: 0, date: 2809 });
  assert.deepEqual(window.ScheduleParser.dayKey('  пятница  02.10 '), { weekday: 4, date: 210 });
  assert.deepEqual(window.ScheduleParser.dayKey('ВОСКРЕСЕНЬЕ 04.10'), { weekday: 6, date: 410 });
  // без дня недели: уходит в конец недели, но не теряется
  assert.equal(window.ScheduleParser.dayKey('Уточнить у декана').weekday, 7);
});

test('parser: timeKey переводит время в минуты', () => {
  assert.equal(window.ScheduleParser.timeKey('8.20-9.50'), 500);
  assert.equal(window.ScheduleParser.timeKey(' 10.00-11.30 '), 600);
  assert.equal(window.ScheduleParser.timeKey('18:55-20.25'), 18 * 60 + 55);
  // неразобранное время — в конец дня, чтобы не ломать сортировку
  assert.equal(window.ScheduleParser.timeKey('по расписанию'), Number.MAX_SAFE_INTEGER);
});

test('parser: groupByDay сортирует неделю с понедельника, пары — по времени', () => {
  const lessons = [
    { day: 'ПЯТНИЦА 02.10', time: '8.20-9.50', subject: 'Физика' },
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '10.00-11.30', subject: 'Математика' },
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '8.20-9.50', subject: 'Алгебра' },
    { day: 'ВТОРНИК 29.09', time: '8.20-9.50', subject: 'Физика' }
  ];

  const sections = window.ScheduleParser.groupByDay(lessons);
  assert.deepEqual(sections.map(s => s.day),
    ['ПОНЕДЕЛЬНИК 28.09', 'ВТОРНИК 29.09', 'ПЯТНИЦА 02.10']);
  assert.deepEqual(sections[0].lessons.map(l => l.subject), ['Алгебра', 'Математика']);
  assert.equal(sections[0].date, 2809);
  // исходный массив не переставляется
  assert.equal(lessons[0].subject, 'Физика');
});

test('parser: groupByDay не теряет занятия без дня недели', () => {
  const sections = window.ScheduleParser.groupByDay([
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '8.20-9.50', subject: 'Математика' },
    { day: '', time: '10.00-11.30', subject: 'Консультация' }
  ]);
  assert.equal(sections.length, 2);
  assert.equal(sections[1].day, '');            // без дня — в конце
  assert.equal(sections[1].lessons[0].subject, 'Консультация');
});

test('parser: lessonStart собирает дату и время начала занятия', () => {
  const start = window.ScheduleParser.lessonStart({ day: 'ПОНЕДЕЛЬНИК 28.09', time: '8.20-9.50' }, 2026);
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 8);          // сентябрь
  assert.equal(start.getDate(), 28);
  assert.equal(start.getHours(), 8);
  assert.equal(start.getMinutes(), 20);
  // без дня недели или без разбираемого времени — null
  assert.equal(window.ScheduleParser.lessonStart({ day: '', time: '8.20-9.50' }, 2026), null);
  assert.equal(window.ScheduleParser.lessonStart({ day: 'ПОНЕДЕЛЬНИК 28.09', time: '' }, 2026), null);
});

test('parser: nextLesson — ближайшее не начавшееся занятие', () => {
  const lessons = [
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '8.20-9.50', subject: 'Математика' },
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '10.00-11.30', subject: 'Физика' },
    { day: 'ВТОРНИК 29.09', time: '8.20-9.50', subject: 'Алгебра' }
  ];

  // до первой пары понедельника
  const morning = new Date(2026, 8, 28, 7, 0);
  assert.equal(window.ScheduleParser.nextLesson(lessons, morning).time, '8.20-9.50');
  assert.equal(window.ScheduleParser.nextLesson(lessons, morning).day, 'ПОНЕДЕЛЬНИК 28.09');

  // между парами понедельника — ждём вторую
  const between = new Date(2026, 8, 28, 9, 55);
  const second = window.ScheduleParser.nextLesson(lessons, between);
  assert.equal(second.time, '10.00-11.30');
  assert.equal(second.day, 'ПОНЕДЕЛЬНИК 28.09');

  // ПЕРЕД последней парой вторника: «сегодня» подсвечиваться уже не будет
  const mondayEvening = new Date(2026, 8, 28, 18, 0);
  const next = window.ScheduleParser.nextLesson(lessons, mondayEvening);
  assert.equal(next.day, 'ВТОРНИК 29.09', 'должен подсвечиваться вторник, а не понедельник');
  assert.equal(next.time, '8.20-9.50');
  // начало занятия — точный момент, а не полночь
  assert.equal(next.start.getHours(), 8);
  assert.equal(next.start.getMinutes(), 20);
});

test('parser: nextLesson — неделя кончилась, подсвечивать нечего', () => {
  const lessons = [
    { day: 'ПОНЕДЕЛЬНИК 28.09', time: '8.20-9.50' },
    { day: 'ВТОРНИК 29.09', time: '8.20-9.50' }
  ];
  assert.equal(window.ScheduleParser.nextLesson(lessons, new Date(2026, 8, 30, 12, 0)), null);
  assert.equal(window.ScheduleParser.nextLesson(lessons, new Date(2026, 8, 28, 8, 0)).day, 'ПОНЕДЕЛЬНИК 28.09');
  // ровно в момент начала пара ещё считается предстоящей
  assert.equal(window.ScheduleParser.nextLesson(lessons, new Date(2026, 8, 28, 8, 0)).day, 'ПОНЕДЕЛЬНИК 28.09');
  assert.equal(window.ScheduleParser.nextLesson(lessons, new Date(2026, 8, 28, 8, 21)).day, 'ВТОРНИК 29.09');
});

test('parser: nextLesson — файл «из будущего» не теряется', () => {
  // неделя января, открытая в декабре: год в файле не написан
  const lessons = [{ day: 'ПОНЕДЕЛЬНИК 12.01', time: '8.20-9.50' }];
  const next = window.ScheduleParser.nextLesson(lessons, new Date(2026, 11, 28, 12, 0));
  assert.ok(next, 'неделя января должна считаться будущей');
  assert.equal(next.start.getFullYear(), 2027);
});

test('parser: неделя реального файла разбирается в порядке понедельник → суббота', async () => {
  const sheet = await readFixture();
  const parsed = window.ScheduleParser.parse(sheet);
  const group = parsed.groups.find(g => g.name.includes('ИСПк-302'));
  const sections = window.ScheduleParser.groupByDay(group.lessons);
  const weekdays = sections.map(s => window.ScheduleParser.dayKey(s.day).weekday);
  assert.ok(weekdays.length >= 3, `дней у ИСПк-302: ${weekdays.length}`);
  // ни один день не «перепрыгивает» назад по неделе
  for (let i = 1; i < weekdays.length; i++) {
    assert.ok(weekdays[i] >= weekdays[i - 1],
      `день ${sections[i].day} идёт раньше ${sections[i - 1].day}`);
  }
  // внутри дня пары отсортированы по времени
  sections.forEach(section => {
    const times = section.lessons.map(l => window.ScheduleParser.timeKey(l.time));
    assert.deepEqual(times, times.slice().sort((a, b) => a - b), section.day);
  });
});
