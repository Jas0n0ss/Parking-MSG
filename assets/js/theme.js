/* Runs synchronously in <head> so the first paint already has the right theme. */
(function () {
  var KEY = 'carmsg:theme';
  var theme = null;
  try {
    theme = window.localStorage.getItem(KEY);
  } catch (error) {
    /* Storage can be unavailable in private mode. */
  }
  var source = 'stored';
  if (theme !== 'light' && theme !== 'dark') {
    source = 'auto';
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme-source', source);
  document.documentElement.classList.add('js');

  var meta = document.getElementById('metaThemeColor');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#070b14' : '#f5f7fb');
  }

  window.__carmsgTheme = theme;

  /* Safety net: never leave reveal sections permanently hidden if a later
     script fails to load. setupReveal() marks the document as ready. */
  window.setTimeout(function () {
    if (document.documentElement.classList.contains('reveal-ready')) return;
    var items = document.querySelectorAll('[data-reveal]');
    for (var i = 0; i < items.length; i += 1) {
      items[i].classList.add('is-in');
    }
  }, 2000);
})();
