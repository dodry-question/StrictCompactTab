import { TRANSLATIONS } from '../i18n/translations.js';

// --- ПЛАГИН «РАСПИСАНИЕ ЗАНЯТИЙ» (файл .xlsx из группы ВК) ---
// Кнопка в правом нижнем углу + панель, выезжающая снизу. В отличие от
// погодной шторки панель НЕ затемняет и НЕ блюрит страницу: под ней остаются
// ярлыки и часы, а по высоте она ровно такая, сколько нужно содержимому
// (внутренняя прокрутка — только страховка для очень длинной недели).
//
// Разбор файла живёт в services/schedule-xlsx.js и services/schedule-parser.js,
// этот модуль отвечает только за интерфейс.
//
// ПОРЯДОК ПОДКЛЮЧЕНИЯ: файл подключён в index.html ДО app/input-keys.js,
// потому что там вызывается loadState(), а он зовёт syncScheduleEnabled() —
// к этому моменту функция обязана уже существовать.
const scheduleFab = document.getElementById('schedule-fab');
const schedulePanel = document.getElementById('schedule-panel');
const scheduleSubtitle = document.getElementById('schedule-subtitle');
const scheduleDrop = document.getElementById('schedule-drop');
const scheduleFileInput = /** @type {HTMLInputElement} */ (document.getElementById('schedule-file-input'));
const scheduleError = document.getElementById('schedule-error');
const scheduleGroupsView = document.getElementById('schedule-groups');
const scheduleGroupsList = document.getElementById('schedule-groups-list');
const scheduleGroupsSearch = /** @type {HTMLInputElement} */ (document.getElementById('schedule-group-search'));
const scheduleGroupsNone = document.getElementById('schedule-groups-none');
const scheduleView = document.getElementById('schedule-view');
const scheduleChangeBtn = document.getElementById('schedule-change-group');
const scheduleDeleteBtn = document.getElementById('schedule-delete');
const scheduleVkLink = document.getElementById('schedule-vk');
const scheduleCloseBtn = document.getElementById('schedule-close');
const scheduleEnabledCb = /** @type {HTMLInputElement} */ (document.getElementById('schedule-enabled'));

const SCHEDULE_VK_URL = 'https://vk.ru/kollegevyatsu';
const SCHEDULE_STORAGE_KEY = 'scheduleData';
const SCHEDULE_STYLE_HREF = 'css/components/schedule-panel.css';

// 20 КБ стилей не должны разбираться при каждой новой вкладке, если плагином
// не пользуются, поэтому <link> в index.html отсутствует, а таблица стилей
// подмешивается в <head> в момент включения галки. Мерцания не видно: в этот
// момент панель закрыта (body ещё без класса schedule-on).
let scheduleStyleInjected = false;

function ensureScheduleStyles() {
  if (scheduleStyleInjected) return;
  scheduleStyleInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SCHEDULE_STYLE_HREF;
  link.setAttribute('data-schedule-style', '');

  // Пока таблица стилей не применена, правило в css/base/variables-and-reset.css
  // держит панель и кнопку скрытыми (html:not(.schedule-ready)). Флаг ставится
  // по событию load — тогда панель не может мелькнуть неоформленной.
  const markReady = () => document.documentElement.classList.add('schedule-ready');
  link.addEventListener('load', markReady);
  link.addEventListener('error', () => {
    // Файла нет — лучше показать панель (пусть неоформленную), чем тихо
    // сломать плагин: пользователь хотя бы увидит, что что-то не так
    console.warn('Schedule: не удалось применить стили', SCHEDULE_STYLE_HREF);
    markReady();
  });

  document.head.appendChild(link);
}

// Распарсенный файл лежит в хранилище под своим ключом и НАМЕРЕННО не в STATE:
// ~150 КБ расписания не должны попадать в JSON-бэкап настроек. Выбранная
// группа — настройка, поэтому она в STATE.scheduleGroup.
let scheduleData = null;      // null — файл ещё не загружали (ленивое чтение)
let scheduleMode = 'drop';    // drop | groups | schedule
let scheduleBusy = false;
let scheduleReturnFocus = null;
let scheduleNextKey = '';     // день подсвеченных «следующих пар» (для таймера)

function scheduleDict() {
  return TRANSLATIONS[STATE.language] || TRANSLATIONS.en;
}

function scheduleLocale() {
  return STATE.language === 'ru' ? 'ru-RU' : 'en-GB';
}

function isSchedulePanelOpen() {
  return !!(schedulePanel && schedulePanel.classList.contains('is-open'));
}

// Вызывается из loadState(): синхронизирует галку в настройках и кнопку
function syncScheduleEnabled() {
  const on = !!STATE.scheduleEnabled;
  if (scheduleEnabledCb) scheduleEnabledCb.checked = on;
  document.body.classList.toggle('schedule-on', on);
  if (on) ensureScheduleStyles();
  else closeSchedulePanel();
}

// --- открытие / закрытие ---------------------------------------------------

function openSchedulePanel() {
  if (!STATE.scheduleEnabled || !schedulePanel || !scheduleFab) return;
  scheduleReturnFocus = document.activeElement;
  schedulePanel.classList.add('is-open');
  schedulePanel.setAttribute('aria-hidden', 'false');
  scheduleFab.setAttribute('aria-expanded', 'true');
  document.body.classList.add('schedule-open');
  // Старое сообщение об ошибке не должно пережить переоткрытие панели
  showScheduleError('');
  // Пока файл читается из хранилища — показываем прошлую надпись, а не пустоту
  loadScheduleData().then(() => {
    // Пока ждали хранилище, панель могли уже закрыть — тогда фокус внутрь
    // закрытой (visibility: hidden) панели ставить нельзя
    if (isSchedulePanelOpen()) renderSchedulePanel(true);
  });
}

function closeSchedulePanel() {
  if (!schedulePanel) return;
  schedulePanel.classList.remove('is-open');
  schedulePanel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('schedule-open');
  if (scheduleFab) scheduleFab.setAttribute('aria-expanded', 'false');
  if (scheduleReturnFocus && scheduleReturnFocus.isConnected &&
      typeof scheduleReturnFocus.focus === 'function') {
    scheduleReturnFocus.focus();
  }
  scheduleReturnFocus = null;
}

function toggleSchedulePanel() {
  if (isSchedulePanelOpen()) closeSchedulePanel();
  else openSchedulePanel();
}

function focusSchedulePanel() {
  // Фокус не на кнопке закрытия: иначе первый же Enter закрыл бы панель
  let target = scheduleCloseBtn;
  if (scheduleMode === 'groups' && scheduleGroupsSearch) target = scheduleGroupsSearch;
  else if (scheduleMode === 'drop' && scheduleDrop) target = scheduleDrop;
  if (target && typeof target.focus === 'function') target.focus();
}

// --- хранилище -------------------------------------------------------------

// Запись могла остаться от другой версии расширения или повредиться. Без
// проверки renderSchedulePanel падал бы на groups.some(...) — и кнопка
// расписания просто перестала бы что-либо делать.
function readScheduleData(raw) {
  return (raw && Array.isArray(raw.groups)) ? raw : null;
}

function loadScheduleData() {
  return new Promise(resolve => {
    if (scheduleData !== null) { resolve(scheduleData); return; }
    storage.get([SCHEDULE_STORAGE_KEY], result => {
      scheduleData = readScheduleData(result && result[SCHEDULE_STORAGE_KEY]);
      resolve(scheduleData);
    });
  });
}

function saveScheduleData(data) {
  return new Promise(resolve => {
    const payload = {};
    payload[SCHEDULE_STORAGE_KEY] = data || null;
    storage.set(payload, () => {
      scheduleData = data || null;
      resolve(scheduleData);
    });
  });
}

// --- загрузка файла --------------------------------------------------------

function isScheduleFile(file) {
  if (!file) return false;
  if (file.name && /\.xlsx$/i.test(file.name)) return true;
  // при перетаскивании из архива расширения иногда нет — верим типу
  return (file.type || '') === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function scheduleDroppedFile(event) {
  const dt = event && event.dataTransfer;
  if (!dt) return null;
  if (dt.files && dt.files.length) return dt.files[0];
  // часть браузеров отдаёт файл только через items
  if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      if (dt.items[i].kind === 'file') return dt.items[i].getAsFile();
    }
  }
  return null;
}

function showScheduleError(message) {
  if (!scheduleError) return;
  scheduleError.textContent = message || '';
  scheduleError.hidden = !message;
}

async function handleScheduleFile(file) {
  if (!file) return;
  const dict = scheduleDict();

  // Файл читается 40–200 мс; раньше повторный файл в этот момент молча
  // игнорировался и пользователь не понимал, почему ничего не происходит
  if (scheduleBusy) {
    showScheduleError(dict.scheduleBusy);
    return;
  }
  if (!isScheduleFile(file)) {
    showScheduleError(dict.scheduleError);
    return;
  }

  showScheduleError('');
  scheduleBusy = true;
  if (scheduleSubtitle) scheduleSubtitle.textContent = dict.scheduleParsing;

  try {
    const buffer = await file.arrayBuffer();
    const sheet = await window.ScheduleXlsx.read(buffer);
    const parsed = window.ScheduleParser.parse(sheet);

    if (!parsed.groups.length) {
      showScheduleError(dict.scheduleUnsupported);
      if (scheduleSubtitle) scheduleSubtitle.textContent = '';
      return;
    }

    await saveScheduleData({
      fileName: file.name || '',
      fileTime: file.lastModified || Date.now(),
      headerRow: parsed.headerRow,
      groups: parsed.groups
    });

    // Новый файл — новый список: сбрасываем поиск, иначе группа не найдётся
    if (scheduleGroupsSearch) scheduleGroupsSearch.value = '';

    // Расписание обновляется каждую неделю, поэтому выбранная группа должна
    // пережить замену файла: id после каждого разбора генерируются заново,
    // ищем ту же группу по названию, а не по id
    saveState();
    renderSchedulePanel();
  } catch (error) {
    console.error('Schedule: не удалось разобрать файл', error);
    showScheduleError(error && error.code === 'no-header' ? dict.scheduleUnsupported : dict.scheduleError);
    if (scheduleSubtitle) scheduleSubtitle.textContent = '';
    // Старое расписание остаётся на экране, но сообщение об ошибке НЕ должно
    // тут же стираться: рендер сам его сбрасывает
    if (scheduleData) scheduleShowView(STATE.scheduleGroup ? 'schedule' : 'groups');
  } finally {
    scheduleBusy = false;
  }
}

async function deleteScheduleFile() {
  if (scheduleBusy) return;
  if (!confirm(scheduleDict().scheduleDeleteConfirm)) return;

  scheduleBusy = true;
  try {
    // Запись в chrome.storage АСИНХРОННА. Без await панель успевала бы
    // перерисоваться со старым файлом: пользователь видел список групп
    // удалённого расписания, а клик по группе или по поиску уже ломал
    // вид (данных нет, а список нарисован).
    await saveScheduleData(null);
    STATE.scheduleGroup = null;
    saveState();
    showScheduleError('');
    if (scheduleGroupsSearch) scheduleGroupsSearch.value = '';
    renderSchedulePanel();
  } finally {
    scheduleBusy = false;
  }
}

function selectScheduleGroup(name) {
  STATE.scheduleGroup = name;
  saveState();
  scheduleShowView('schedule');
  renderScheduleGroup();
}

// --- виды панели -----------------------------------------------------------

function scheduleShowView(mode) {
  scheduleMode = mode;
  if (scheduleDrop) scheduleDrop.hidden = mode !== 'drop';
  if (scheduleGroupsView) scheduleGroupsView.hidden = mode !== 'groups';
  if (scheduleView) scheduleView.hidden = mode !== 'schedule';
  if (scheduleChangeBtn) scheduleChangeBtn.hidden = mode !== 'schedule';
  if (scheduleDeleteBtn) scheduleDeleteBtn.hidden = mode === 'drop';
  if (scheduleVkLink) scheduleVkLink.hidden = mode === 'drop';
}

function renderSchedulePanel(focusFirst) {
  // Сообщение об ошибке здесь НЕ сбрасывается: иначе сообщение о неудачной
  // загрузке файла жило бы ноль миллисекунд (catch звал этот рендер сразу
  // после showScheduleError). Сброс делают точки входа: открытие панели,
  // начало загрузки файла и удаление файла.
  if (!scheduleData) {
    scheduleShowView('drop');
    if (scheduleSubtitle) scheduleSubtitle.textContent = '';
    if (focusFirst) focusSchedulePanel();
    return;
  }

  // Группа могла исчезнуть из нового файла — тогда снова показываем выбор
  if (!scheduleData.groups.some(group => group.name === STATE.scheduleGroup)) {
    STATE.scheduleGroup = null;
    saveState();
  }

  const ready = !!STATE.scheduleGroup;
  scheduleShowView(ready ? 'schedule' : 'groups');
  if (ready) renderScheduleGroup();
  else renderScheduleGroups();
  if (focusFirst) focusSchedulePanel();
}

// Вызывается из applyLanguage(): подписи, которые рисует код, зависят от языка
function refreshSchedulePanel() {
  if (!isSchedulePanelOpen()) return;
  if (scheduleMode === 'schedule') renderScheduleGroup();
  else if (scheduleMode === 'groups') renderScheduleGroups();
}

// --- список групп ----------------------------------------------------------

function scheduleSearchQuery() {
  const value = scheduleGroupsSearch ? scheduleGroupsSearch.value : '';
  return String(value || '').trim().toLowerCase().replace(/ё/g, 'е');
}

function scheduleGroupMatches(group, query) {
  const haystack = (group.name + ' ' + (group.spec || '') + ' ' + (group.semester || ''))
    .toLowerCase().replace(/ё/g, 'е');
  return haystack.indexOf(query) >= 0;
}

function renderScheduleGroups() {
  const dict = scheduleDict();
  const stamp = scheduleData && scheduleData.fileTime
    ? new Date(scheduleData.fileTime).toLocaleDateString(scheduleLocale())
    : '';
  scheduleSubtitle.textContent = [
    scheduleData ? scheduleData.fileName : '',
    stamp ? dict.scheduleUpdated + ': ' + stamp : ''
  ].filter(Boolean).join(' · ');

  if (scheduleGroupsSearch) scheduleGroupsSearch.placeholder = dict.scheduleGroupSearch || '';
  renderScheduleGroupsList();
}

// Групп в файле десятки, поэтому список всегда сортируется по алфавиту
// и фильтруется строкой поиска по названию, специальности и семестру.
// Очищается ТОЛЬКО контейнер списка: при innerHTML на самом #schedule-groups
// поле поиска и заголовок «Выберите свою группу» уничтожались бы вместе с
// кнопками, и строка поиска переставала бы работать после первого рендера.
function renderScheduleGroupsList() {
  if (!scheduleGroupsList) return;
  const query = scheduleSearchQuery();
  const groups = ((scheduleData && scheduleData.groups) || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, scheduleLocale()));

  scheduleGroupsList.innerHTML = '';
  let shown = 0;
  groups.forEach(group => {
    if (query && !scheduleGroupMatches(group, query)) return;
    shown += 1;
    scheduleGroupsList.appendChild(buildScheduleGroupButton(group));
  });

  if (scheduleGroupsNone) scheduleGroupsNone.hidden = shown !== 0;
  if (scheduleGroupsList) scheduleGroupsList.hidden = shown === 0;
}

function buildScheduleGroupButton(group) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'schedule-group-btn';
  if (group.name === STATE.scheduleGroup) button.classList.add('is-selected');
  button.setAttribute('data-group', group.name);

  const name = document.createElement('span');
  name.className = 'schedule-group-name';
  name.textContent = group.name;
  button.appendChild(name);

  if (group.spec) {
    const spec = document.createElement('span');
    spec.className = 'schedule-group-spec';
    spec.textContent = group.spec;
    button.appendChild(spec);
  }

  const lessons = (group.lessons || []).length;
  if (lessons) {
    const count = document.createElement('span');
    count.className = 'schedule-group-count';
    count.textContent = String(lessons);
    button.appendChild(count);
  }

  button.addEventListener('click', () => selectScheduleGroup(group.name));
  return button;
}

// --- само расписание -------------------------------------------------------

function renderScheduleGroup() {
  if (!scheduleView) return;
  const dict = scheduleDict();
  const group = ((scheduleData && scheduleData.groups) || [])
    .find(item => item.name === STATE.scheduleGroup);

  if (!group) {
    STATE.scheduleGroup = null;
    saveState();
    renderSchedulePanel();
    return;
  }

  if (scheduleSubtitle) {
    scheduleSubtitle.textContent = [group.name, group.spec, group.semester]
      .filter(Boolean)
      .join(' · ');
  }

  // Перерисовка целиком схлопывает скролл-контейнер, поэтому запоминаем
  // позицию: иначе перерисовка по таймеру возвращала бы читателя наверх
  const bodyEl = document.getElementById('schedule-body');
  const savedScroll = bodyEl ? bodyEl.scrollTop : 0;

  scheduleView.innerHTML = '';
  const lessons = group.lessons || [];
  if (!lessons.length) {
    const empty = document.createElement('p');
    empty.className = 'schedule-empty';
    empty.textContent = dict.scheduleEmpty;
    scheduleView.appendChild(empty);
    scheduleNextKey = '';
    return;
  }

  // Подсвечивается не «сегодня», а день СЛЕДУЮЩИХ пар: если сегодня всё уже
  // закончилось, обводка уедет на завтра. Если неделя кончилась — не
  // подсвечивается ничего, чтобы не показывать устаревшую подсказку.
  // В ключ входит и ВРЕМЯ: за день может смениться несколько пар, и значок
  // обязан показывать ближайшую из них, а не первую утреннюю.
  const next = window.ScheduleParser.nextLesson(lessons, new Date());
  scheduleNextKey = next ? next.day + '|' + next.time : '';

  window.ScheduleParser.groupByDay(lessons).forEach(section => {
    const block = document.createElement('section');
    block.className = 'schedule-day';

    const title = document.createElement('h3');
    title.className = 'schedule-day-title';
    const titleText = document.createElement('span');
    titleText.className = 'schedule-day-text';
    titleText.textContent = section.day || dict.scheduleNoDay;
    title.appendChild(titleText);
    block.appendChild(title);

    if (next && section.day && section.day === next.day) {
      block.classList.add('is-next');
      const badge = document.createElement('span');
      badge.className = 'schedule-day-badge';
      badge.textContent = next.time;
      title.appendChild(badge);
    }

    const rows = document.createElement('div');
    rows.className = 'schedule-lessons';
    section.lessons.forEach(lesson => rows.appendChild(buildScheduleLesson(lesson)));
    block.appendChild(rows);

    scheduleView.appendChild(block);
  });

  if (bodyEl) bodyEl.scrollTop = savedScroll;
}

function buildScheduleLesson(lesson) {
  const row = document.createElement('div');
  row.className = 'schedule-lesson';

  const time = document.createElement('span');
  time.className = 'schedule-lesson-time';
  time.textContent = lesson.time || '';
  row.appendChild(time);

  const main = document.createElement('div');
  main.className = 'schedule-lesson-main';

  const subject = document.createElement('span');
  subject.className = 'schedule-lesson-subject';
  subject.textContent = lesson.subject || '';
  main.appendChild(subject);

  if (lesson.kind) {
    const kind = document.createElement('span');
    kind.className = 'schedule-lesson-kind';
    kind.textContent = lesson.kind;
    main.appendChild(kind);
  }

  const meta = [lesson.teacher, lesson.room].filter(Boolean).join(' · ');
  if (meta) {
    const extra = document.createElement('span');
    extra.className = 'schedule-lesson-meta';
    extra.textContent = meta;
    main.appendChild(extra);
  }

  row.appendChild(main);
  return row;
}

// --- события ---------------------------------------------------------------

if (scheduleFab) {
  scheduleFab.addEventListener('click', toggleSchedulePanel);
}
if (scheduleCloseBtn) scheduleCloseBtn.addEventListener('click', closeSchedulePanel);
if (scheduleChangeBtn) {
  scheduleChangeBtn.addEventListener('click', () => {
    scheduleShowView('groups');
    renderScheduleGroups();
  });
}
if (scheduleDeleteBtn) scheduleDeleteBtn.addEventListener('click', deleteScheduleFile);
if (scheduleVkLink) scheduleVkLink.setAttribute('href', SCHEDULE_VK_URL);
if (scheduleGroupsSearch) {
  scheduleGroupsSearch.addEventListener('input', renderScheduleGroupsList);
}

// Галка в настройках
if (scheduleEnabledCb) {
  scheduleEnabledCb.addEventListener('change', () => {
    STATE.scheduleEnabled = scheduleEnabledCb.checked;
    saveState();
    syncScheduleEnabled();
  });
}

// Выбор файла кликом по зоне переноса и через системный диалог
if (scheduleDrop) {
  scheduleDrop.addEventListener('click', () => {
    if (scheduleFileInput) scheduleFileInput.click();
  });
  scheduleDrop.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (scheduleFileInput) scheduleFileInput.click();
    }
  });
}
if (scheduleFileInput) {
  scheduleFileInput.addEventListener('change', () => {
    const file = scheduleFileInput.files && scheduleFileInput.files[0];
    scheduleFileInput.value = '';   // чтобы тот же файл можно было выбрать снова
    if (file) handleScheduleFile(file);
  });
}

// Перетаскивание в ЛЮБУЮ точку панели: список групп занимает почти всю панель,
// поэтому ловим файл на самой панели, а не только на зоне переноса
if (schedulePanel) {
  schedulePanel.addEventListener('dragover', event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    schedulePanel.classList.add('is-dragover');
  });
  schedulePanel.addEventListener('dragleave', event => {
    if (!event.relatedTarget || !schedulePanel.contains(/** @type {Node} */ (event.relatedTarget))) {
      schedulePanel.classList.remove('is-dragover');
    }
  });
  schedulePanel.addEventListener('drop', event => {
    event.preventDefault();
    schedulePanel.classList.remove('is-dragover');
    handleScheduleFile(scheduleDroppedFile(event));
  });
}

// На новой вкладке брошенный файл иначе ОТКРЫЛСЯ бы в браузере вместо
// загрузки в плагин — пока панель открыта, перехватываем drop на документе
document.addEventListener('dragover', event => {
  if (isSchedulePanelOpen() && event.dataTransfer) event.preventDefault();
});
document.addEventListener('drop', event => {
  if (!isSchedulePanelOpen()) return;
  event.preventDefault();
  if (schedulePanel && schedulePanel.contains(/** @type {Node} */ (event.target))) return;   // панель уже обработала
  handleScheduleFile(scheduleDroppedFile(event));
});

// Клик мимо панели закрывает её. Оверлея и блюра здесь нет: страница под
// панелью остаётся живой, поэтому закрытие и есть «клик мимо».
document.addEventListener('click', event => {
  if (!isSchedulePanelOpen()) return;
  if (schedulePanel.contains(/** @type {Node} */ (event.target))) return;
  if (scheduleFab && scheduleFab.contains(/** @type {Node} */ (event.target))) return;
  closeSchedulePanel();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !isSchedulePanelOpen()) return;
  // Непустое поле поиска сначала очищается, панель закрывается вторым Escape.
  // Проверяем именно ВИДИМЫЙ список групп: после выбора группы поле остаётся
  // внутри скрытого блока, и Escape молча чистил бы то, чего не видно.
  if (scheduleMode === 'groups' && scheduleGroupsSearch && scheduleGroupsSearch.value) {
    scheduleGroupsSearch.value = '';
    renderScheduleGroupsList();
    return;
  }
  event.preventDefault();
  closeSchedulePanel();
});

// Смена режима макета закрывает панель: в Дзене кнопки расписания не видно
document.addEventListener('change', event => {
  const id = event.target && /** @type {HTMLElement} */ (event.target).id;
  if (id === 'layout-zen-mode' || id === 'layout-mist-mode' ||
      id === 'layout-ios-mode' || id === 'layout-stealth-mode') {
    closeSchedulePanel();
  }
});

// Подсветка «следующих пар» не должна устареть, пока панель открыта: раз в
// минуту сверяем день И ВРЕМЯ ближайшего занятия, и как только только что
// начавшаяся пара закончилась, обводка и значок сами переезжают дальше —
// в том числе на следующую пару того же дня.
setInterval(() => {
  if (scheduleMode !== 'schedule' || !isSchedulePanelOpen() || !STATE.scheduleGroup) return;
  const group = ((scheduleData && scheduleData.groups) || [])
    .find(item => item.name === STATE.scheduleGroup);
  if (!group) return;
  const next = window.ScheduleParser.nextLesson(group.lessons || [], new Date());
  if ((next ? next.day + '|' + next.time : '') !== scheduleNextKey) renderScheduleGroup();
}, 60000);

// Мосты для потребителей и тестов (state-render, appearance — typeof-гард,
// schedule-ui.test зовёт через globalThis): уберём в фазе 3 шага «в».
// Внутренние let (scheduleData, scheduleMode, ...) снаружи не трогают —
// accessors не нужны.
window.syncScheduleEnabled = syncScheduleEnabled;
window.refreshSchedulePanel = refreshSchedulePanel;
window.handleScheduleFile = handleScheduleFile;
window.isSchedulePanelOpen = isSchedulePanelOpen;
window.closeSchedulePanel = closeSchedulePanel;
export {
  syncScheduleEnabled,
  openSchedulePanel,
  closeSchedulePanel,
  toggleSchedulePanel,
  isSchedulePanelOpen,
  refreshSchedulePanel,
  handleScheduleFile,
  scheduleData
};
