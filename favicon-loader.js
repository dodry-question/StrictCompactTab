(function() {
  var link = document.querySelector('.page-favicon');
  if (!link) return;

  // Формат значения в localStorage менялся: storage/storage.js пишет строку
  // «как есть», а loadState писал через JSON.stringify (с кавычками). Наивный
  // JSON.parse падал на «сыром» data-URL, и вкладка на долю секунды показывала
  // иконку расширения вместо пользовательской. Поэтому принимаем оба формата.
  var raw;
  try { raw = localStorage.getItem('customFavicon'); } catch (e) { raw = null; }

  if (raw) {
    var url = raw;
    try {
      var parsed = JSON.parse(raw);
      if (typeof parsed === 'string') url = parsed;
    } catch (e) {
      // не JSON — значит уже строка, берём как есть
    }
    if (url && url.indexOf('data:') === 0) {
      link.setAttribute('href', url);
      return;
    }
  }

  // Своей иконки нет — ставим компактную иконку расширения (3,4 КБ) СИНХРОННО,
  // прямо в <head>, чтобы вкладка не успела показать иконку по умолчанию.
  // Значение совпадает с тем, что ставит applyFavicon() при чтении состояния,
  // поэтому иконка не переключается второй раз.
  link.setAttribute('href', 'assets/icon-48.png');
})();
