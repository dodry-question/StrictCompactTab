// ESLint (flat config) для Strict Compact Tab.
//
// Особенность архитектуры: большая часть кода — classic-скрипты, которые
// общаются через глобальную область видимости (window.* и общие функции вида
// saveState/renderTopbar). Поэтому:
//   * no-undef ВЫКЛЮЧЕН — корректность имён и кросс-файловых глобалов
//     проверяет TypeScript в режиме checkJs (см. tsconfig.json), чтобы не
//     дублировать проверку и не вести руками список глобалов;
//   * no-unused-vars ВЫКЛЮЧЕН — в этой архитектуре он даёт ложные срабатывания,
//     поэтому реально неиспользуемый код ищет tsc (noUnusedLocals).
import js from '@eslint/js';

export default [
  {
    // assets/ — бинарная графика и минифицированная сторонняя библиотека
    // (material-color-utilities.min.js): линтить их бессмысленно.
    ignores: ['node_modules/**', 'assets/**', '**/*.zip', 'tests/fixtures/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'off',
      // no-unused-vars ВЫКЛЮЧЕН: приложение собрано из classic-скриптов, которые
      // вызывают функции друг друга через глобальную область видимости. ESLint
      // не видит кросс-файловые связи и давал ~92 ложных срабатывания из 93.
      // Реально неиспользуемый код ловит tsc (noUnusedLocals) — он видит всю
      // программу целиком и не путает «используется в другом файле» с «мёртвый».
      'no-unused-vars': 'off',
      eqeqeq: ['warn', 'smart'],
      'no-empty': ['warn', { allowEmptyCatch: true }]
    }
  }
];
