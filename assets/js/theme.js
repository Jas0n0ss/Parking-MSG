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

  var uiLang = null;
  var uiRaw = null;
  try {
    uiRaw = window.localStorage.getItem('carmsg:ui-lang');
    if (uiRaw) {
      try { uiLang = JSON.parse(uiRaw); } catch (error) { uiLang = uiRaw; }
    }
  } catch (error) {
    /* Storage can be unavailable in private mode. */
  }
  document.documentElement.setAttribute('data-ui-lang', uiLang === 'en' ? 'en' : 'zh');

  var meta = document.getElementById('metaThemeColor');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#070b14' : '#f5f7fb');
  }

  window.__carmsgTheme = theme;
})();
