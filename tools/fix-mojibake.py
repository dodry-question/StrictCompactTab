"""Разовый инструмент: починка двойной перекодировки кириллицы в комментариях.

Что случилось: файл (кириллица в CP1251) был прочитан редактором как UTF-8 —
нечитаемые байты CP1251 превратились в «ромашку» (`РЎР›РћР’РђР Р¬` вместо
`СЛОВАРЬ`), и в таком виде сохранён. Дефект косметический: страдают только
комментарии, код — ASCII и работает как раньше.

Обратный путь: текст -> cp1251 -> utf-8. Байты, которых нет в CP1251
(редактор подставил на их место U+FFFD), теряются безвозвратно — такие
строки НЕ правятся молча, а показываются в отчёте: их надо переписать руками.

Гарантии безопасности:
  * правим только строки-комментарии (//, /*, *);
  * строку пишем, лишь если обратный путь даёт исходный текст БАЙТ-В-БАЙТ
    (round-trip), то есть починка доказанно точная;
  * если в строке есть потерянные символы (U+FFFD), она пропускается.

Запуск:  python tools/fix-mojibake.py [корень] [--fix]
"""

import re
import sys
from pathlib import Path

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = Path(ARGS[0] if ARGS else '.')
DO_FIX = '--fix' in sys.argv
DIRS = ['app', 'services', 'storage', 'state', 'src', 'i18n', 'css']
SUFFIXES = ('.js', '.css')

# Признак «ромашки» (двойная перекодировка UTF-8 -> CP1251 -> UTF-8):
#   * после маркера комментария (или после номера пункта «// 1.») текст
#     начинается с Р/С — именно так выглядят UTF-8-байты кириллицы, прочитанные
#     как CP1251;
#   * в строке есть хотя бы два «спецсимвола» из CP1251, которых не бывает в
#     обычном русском тексте (Ђ, ђ, ‹, ›, „, …, ‘ ’ “ ”). Одного совпадения
#     мало: «// Сбрасываем состояние» — здоровый комментарий, а не порча.
SIGNATURE = re.compile(r'^(\s*)((//|/\*|\*)\s*(\d+\.\s*)?|[А-Яа-я]\.\s*)[РС]')
MARKERS = set('\u0402\u0403\u0409\u040a\u040b\u040c\u040f\u0452\u0459\u045a'
              '\u045b\u045c\u045f\u201a\u201e\u2026\u2030\u2039\u203a'
              '\u2018\u2019\u201c\u201d')


def is_comment(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*')


def repair(line: str):
    """Возвращает (починенный_текст | None, причина_отказа | None)."""
    if not SIGNATURE.match(line.lstrip('\ufeff')):
        return None, None
    if sum(1 for ch in line if ch in MARKERS) < 2:
        return None, None
    try:
        raw = line.encode('cp1251')
    except UnicodeEncodeError:
        return None, None
    text = raw.decode('utf-8', errors='replace')
    if '\ufffd' in text:
        return None, 'потерянные байты при обратном переводе — нужна ручная правка'
    if not any('\u0400' <= ch <= '\u04ff' for ch in text):
        return None, 'после починки нет кириллицы — похоже, это не порча'
    return text, None


def scan(path: Path):
    """Возвращает (починенные_строки, проблемные_строки) по индексам."""
    lines = path.read_text(encoding='utf-8').split('\n')
    fixed, manual = [], []
    for index, line in enumerate(lines):
        if not is_comment(line):
            continue
        text, reason = repair(line)
        if text is not None:
            fixed.append((index, line, text))
        elif reason is not None:
            manual.append((index, line, reason))
    return lines, fixed, manual


def main():
    total_fixed = 0
    files = []
    manual_report = []
    for directory in DIRS:
        base = ROOT / directory
        if not base.exists():
            continue
        for path in sorted(base.rglob('*')):
            if not path.name.endswith(SUFFIXES):
                continue
            lines, fixed, manual = scan(path)
            rel = path.relative_to(ROOT)
            for index, line, reason in manual:
                manual_report.append(f'{rel}:{index + 1} — {reason}')
            if not fixed:
                continue
            files.append(str(rel))
            total_fixed += len(fixed)
            print(f'--- {rel}: {len(fixed)} строк')
            for index, line, text in fixed[:3]:
                print(f'  {index + 1}: {text.strip()[:100]}')
            for index, _, text in fixed:
                lines[index] = text
            if DO_FIX:
                path.write_text('\n'.join(lines), encoding='utf-8', newline='\n')

    print(f'\nпочинено строк: {total_fixed} в {len(files)} файлах')
    if manual_report:
        print(f'\nТРЕБУЮТ РУЧНОЙ ПРАВКИ ({len(manual_report)}):')
        for item in manual_report:
            print(f'  {item}')
    print('\nрежим:', 'ЗАПИСЬ' if DO_FIX else 'только отчёт (--fix не указан)')


main()
