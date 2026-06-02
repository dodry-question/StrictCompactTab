(function() {
  try {
    const val = localStorage.getItem('customFavicon');
    if (val) {
      const url = JSON.parse(val);
      if (url) {
        document.querySelector('.page-favicon').href = url;
        return;
      }
    }
  } catch (e) {}
  document.querySelector('.page-favicon').href = 'assets/favicon.png';
})();
