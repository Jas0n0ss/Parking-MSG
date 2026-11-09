/* Searchable country picker used by the phone and plate fields. */
(function () {
  'use strict';

  var COUNTRIES = window.CM_COUNTRIES || [];
  var I18N = window.CarMsgI18N;

  function uiText(key, vars) {
    return I18N && I18N.ui ? I18N.ui(key, vars) : '';
  }

  function uiLang() {
    return I18N && I18N.siteLang ? I18N.siteLang() : 'zh';
  }

  function fold(value) {
    var text = String(value || '').toLowerCase();
    try {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (error) {
      return text;
    }
  }

  function create(options) {
    var dialog = options.dialog;
    if (!dialog) return null;

    var title = options.title;
    var search = options.search;
    var list = options.list;
    var result = options.result;
    var empty = options.empty;
    var closeButton = options.close;
    var activeTarget = '';
    var activeTrigger = null;
    var onSelect = null;
    var selectedCode = 'CN';
    var rows = [];
    var rowRecords = [];
    var visibleRows = [];
    var labels = [];

    function build() {
      var fragment = document.createDocumentFragment();
      var addedPopularLabel = false;
      var addedAllLabel = false;

      COUNTRIES.forEach(function (country) {
        if (!addedPopularLabel && country.popular) {
          addedPopularLabel = true;
          addLabel(fragment, 'picker.popular');
        }
        if (!country.popular && !addedAllLabel) {
          addedAllLabel = true;
          addLabel(fragment, 'picker.all');
        }

        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'country-row';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        row.setAttribute('data-code', country.code);
        row.setAttribute('data-dial', country.dial);
        row.setAttribute('data-search', fold([
          country.name, country.zh, country.code, country.dial, '+' + country.dial
        ].join(' ')));

        var iso = document.createElement('span');
        iso.className = 'country-iso';
        iso.setAttribute('aria-hidden', 'true');
        iso.textContent = country.code;

        var copy = document.createElement('span');
        copy.className = 'country-name';
        var primary = document.createElement('strong');
        var secondary = document.createElement('small');
        copy.appendChild(primary);
        copy.appendChild(secondary);

        var dial = document.createElement('span');
        dial.className = 'country-dial';
        dial.textContent = '+' + country.dial;

        var check = document.createElement('span');
        check.className = 'country-check';
        check.setAttribute('aria-hidden', 'true');
        check.innerHTML = '<svg><use href="#i-check"></use></svg>';

        row.appendChild(iso);
        row.appendChild(copy);
        row.appendChild(dial);
        row.appendChild(check);

        row.addEventListener('click', function () {
          choose(country.code);
        });
        row.addEventListener('keydown', onRowKeydown);

        rows.push(row);
        rowRecords.push({ row: row, country: country, primary: primary, secondary: secondary });
        fragment.appendChild(row);
      });

      list.appendChild(fragment);
    }

    function addLabel(fragment, key) {
      var label = document.createElement('p');
      label.className = 'country-group-label';
      label.setAttribute('role', 'presentation');
      label.setAttribute('data-ui', key);
      label.textContent = uiText(key);
      labels.push(label);
      fragment.appendChild(label);
    }

    function refreshRows() {
      var lang = uiLang();
      rowRecords.forEach(function (record) {
        var primary = lang === 'en' ? record.country.name : record.country.zh;
        var secondary = lang === 'en' ? record.country.zh : record.country.name;
        record.primary.textContent = primary || secondary;
        record.secondary.textContent = secondary && secondary !== primary ? secondary : '';
        record.secondary.hidden = !secondary || secondary === primary;
      });
    }

    function filter(query) {
      var raw = fold(query).trim();
      var dialOnly = raw.charAt(0) === '+';
      var needle = dialOnly ? raw.slice(1) : raw;
      var count = 0;
      rows.forEach(function (row) {
        var haystack = row.getAttribute('data-search');
        var match = dialOnly
          ? row.getAttribute('data-dial') === needle
          : (!needle || haystack.indexOf(needle) !== -1);
        row.hidden = !match;
        if (match) count += 1;
      });
      labels.forEach(function (label) { label.hidden = !!needle; });
      empty.hidden = count !== 0;
      if (result) {
        result.textContent = needle
          ? uiText(count === 1 ? 'picker.resultsOne' : 'picker.results', { n: count })
          : '';
      }
      visibleRows = rows.filter(function (row) { return !row.hidden; });
      list.scrollTop = 0;
    }

    function onRowKeydown(event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' &&
          event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      var index = visibleRows.indexOf(event.currentTarget);
      if (index === -1) return;
      var next = index;
      if (event.key === 'ArrowDown') next = Math.min(visibleRows.length - 1, index + 1);
      if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = visibleRows.length - 1;
      if (visibleRows[next]) visibleRows[next].focus();
    }

    function setSelected(code) {
      selectedCode = code || 'CN';
      rows.forEach(function (row) {
        var selected = row.getAttribute('data-code') === selectedCode;
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        row.classList.toggle('is-selected', selected);
      });
    }

    function scrollSelectedIntoView() {
      var row = rows.filter(function (item) {
        return item.getAttribute('data-code') === selectedCode && !item.hidden;
      })[0];
      if (row) row.scrollIntoView({ block: 'center' });
    }

    function choose(code) {
      setSelected(code);
      var callback = onSelect;
      close();
      if (callback) callback(code);
    }

    function open(config) {
      if (dialog.open) return;
      activeTarget = config.target || '';
      activeTrigger = config.trigger || null;
      onSelect = config.onSelect || null;
      setSelected(config.selected || 'CN');
      title.textContent = uiText(config.target === 'plate'
        ? 'picker.title.plate'
        : 'picker.title.phone');
      search.value = '';
      filter('');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('has-dialog');
      if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () {
        search.focus();
        scrollSelectedIntoView();
      });
    }

    function close() {
      if (!dialog.open) return;
      dialog.close();
    }

    function cleanup() {
      document.body.classList.remove('has-dialog');
      if (activeTrigger) {
        activeTrigger.setAttribute('aria-expanded', 'false');
        try { activeTrigger.focus(); } catch (error) { /* ignore */ }
      }
      activeTarget = '';
      activeTrigger = null;
      onSelect = null;
    }

    function setLang() {
      refreshRows();
      filter(search.value);
    }

    function setup() {
      build();
      refreshRows();
      search.addEventListener('input', function () {
        filter(search.value);
      });
      search.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' && visibleRows.length) {
          event.preventDefault();
          visibleRows[0].focus();
        } else if (event.key === 'ArrowUp' && visibleRows.length) {
          event.preventDefault();
          visibleRows[visibleRows.length - 1].focus();
        }
      });
      closeButton.addEventListener('click', close);
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) close();
      });
      dialog.addEventListener('cancel', function (event) {
        event.preventDefault();
        close();
      });
      dialog.addEventListener('close', cleanup);
    }

    setup();

    return {
      open: open,
      close: close,
      setLang: setLang,
      get activeTarget() { return activeTarget; }
    };
  }

  window.CarMsgCountryPicker = { create: create };
})();
