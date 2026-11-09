/* Generator page logic. Everything runs locally in the browser. */
(function () {
  'use strict';

  var CM = window.CarMsg;
  var QR = window.CarMsgQR;
  var I18N = window.CarMsgI18N;
  var $ = CM.$;
  var $$ = CM.$$;

  var ACCENTS = {
    ink: { color: '#0f172a' },
    ocean: { color: '#1d4ed8' },
    violet: { color: '#6d28d9' },
    forest: { color: '#047857' },
    rose: { color: '#be123c' }
  };

  var state = {
    accent: 'ocean',
    siteLang: 'zh',
    plateCountry: 'CN',
    phoneCountry: 'CN',
    lang: 'en',
    resolvedLang: 'en',
    phone: null,
    valid: false,
    url: '',
    qrUrl: '',
    qrAccent: '',
    touchedPlate: false,
    touchedPhone: false,
    previewVisible: false,
    actionsVisible: false,
    formFocused: false,
    composing: false,
    lastValid: null,
    exporting: false,
    printing: false
  };

  var els = {};
  var picker = null;
  var scheduledRender = null;
  var scheduledSave = null;

  function init() {
    cacheElements();
    if (!els.plate) return;

    restoreSiteLang();
    restoreAccent();
    restoreLang();
    setupCountryPicker();
    setupEvents();
    setupSiteToggle();
    setupPreviewObserver();
    setupShare();
    applySiteLanguage();
    applyLanguage();
    updateNoteMeta();
    refreshFromInputs();

    /* Autofill and bfcache can restore values without firing input events. */
    window.addEventListener('pageshow', function () {
      setTimeout(refreshFromInputs, 60);
    });
    setTimeout(refreshFromInputs, 500);
  }

  function cacheElements() {
    els.form = $('#carForm');
    els.plate = $('#plate');
    els.plateWrap = $('#plateWrap');
    els.plateMsg = $('#plateMsg');
    els.plateHint = $('#plateHint');
    els.plateRegion = $('#plateRegion');
    els.plateRegionText = $('#plateRegionText');
    els.plateCountryBtn = $('#plateCountryBtn');
    els.plateCountryIso = $('#plateCountryIso');
    els.phone = $('#phone');
    els.phoneWrap = $('#phoneWrap');
    els.phoneMsg = $('#phoneMsg');
    els.phoneHint = $('#phoneHint');
    els.phoneCountryBtn = $('#phoneCountryBtn');
    els.phoneCountryIso = $('#phoneCountryIso');
    els.phoneCountryDial = $('#phoneCountryDial');
    els.phonePreview = $('#phonePreview');
    els.owner = $('#owner');
    els.note = $('#note');
    els.noteCounter = $('#noteCounter');
    els.noteChips = $('#noteChips');
    els.formStatus = $('#formStatus');
    els.langSelect = $('#langSelect');
    els.tagStage = $('#tagStage');
    els.tagCard = $('#tagCard');
    els.qrCanvas = $('#qrCanvas');
    els.plateDisplay = $('#plateDisplay');
    els.plateText = $('#plateText');
    els.plateCC = $('#plateCC');
    els.ownerDisplay = $('#ownerDisplay');
    els.ownerAvatar = $('#ownerAvatar');
    els.ownerName = $('#ownerName');
    els.noteDisplay = $('#noteDisplay');
    els.swatches = $('#swatches');
    els.downloadBtn = $('#downloadBtn');
    els.printBtn = $('#printBtn');
    els.copyBtn = $('#copyBtn');
    els.qrOnlyBtn = $('#qrOnlyBtn');
    els.shareBtn = $('#shareBtn');
    els.previewPanel = $('#previewPanel');
    els.workspaceActions = $('.workspace-actions');
    els.mobileBar = $('#mobileBar');
    els.mobilePlate = $('#mobilePlate');
    els.mobilePreview = $('#mobilePreview');
    els.mobileDownload = $('#mobileDownload');
    els.recentSection = $('#recentSection');
    els.recentList = $('#recentList');
    els.clearRecent = $('#clearRecent');
    els.printSheet = $('#printSheet');
    els.countryDialog = $('#countryDialog');
    els.countryDialogTitle = $('#countryDialogTitle');
    els.countrySearch = $('#countrySearch');
    els.countryList = $('#countryList');
    els.countryResult = $('#countryResult');
    els.countryEmpty = $('#countryEmpty');
    els.countryClose = $('#countryClose');
    els.footerCopy = $('#footerCopy');
    els.metaDescription = document.querySelector('meta[name="description"]');
    els.ogTitle = document.querySelector('meta[property="og:title"]');
    els.ogDescription = document.querySelector('meta[property="og:description"]');
    els.ogLocale = document.querySelector('meta[property="og:locale"]');
    els.twitterTitle = document.querySelector('meta[name="twitter:title"]');
    els.twitterDescription = document.querySelector('meta[name="twitter:description"]');
    els.appName = document.querySelector('meta[name="application-name"]');
    els.appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    els.ogSiteName = document.querySelector('meta[property="og:site_name"]');
  }

  function setupCountryPicker() {
    if (!window.CarMsgCountryPicker || !els.countryDialog) return;
    picker = window.CarMsgCountryPicker.create({
      dialog: els.countryDialog,
      title: els.countryDialogTitle,
      search: els.countrySearch,
      list: els.countryList,
      result: els.countryResult,
      empty: els.countryEmpty,
      close: els.countryClose
    });
    if (!picker) return;

    [els.plateCountryBtn, els.phoneCountryBtn].forEach(function (button) {
      if (!button) return;
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-country-target');
        picker.open({
          target: target,
          trigger: button,
          selected: target === 'plate' ? state.plateCountry : state.phoneCountry,
          onSelect: function (code) {
            if (target === 'plate') setPlateCountry(code);
            else setPhoneCountry(code);
          }
        });
      });
    });
  }

  function ui(key, vars) {
    return I18N.ui(key, vars);
  }

  function siteCountryName(code) {
    return I18N.countryName(code, state.siteLang);
  }

  function restoreSiteLang() {
    var stored = CM.storage.get('carmsg:ui-lang', 'zh');
    state.siteLang = stored === 'en' ? 'en' : 'zh';
  }

  function setupSiteToggle() {
    $$('[data-lang-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        var lang = button.getAttribute('data-lang-choice');
        if ((lang !== 'en' && lang !== 'zh') || lang === state.siteLang) return;
        state.siteLang = lang;
        CM.storage.set('carmsg:ui-lang', lang);
        applySiteLanguage();
      });
    });
  }

  function syncNotePresets() {
    $$('[data-note-index]').forEach(function (chip) {
      var index = chip.getAttribute('data-note-index');
      chip.setAttribute('data-note', ui('note.preset.' + index));
    });
  }

  function applySiteLanguage() {
    var isEn = state.siteLang === 'en';
    document.documentElement.lang = isEn ? 'en' : 'zh-CN';
    document.documentElement.setAttribute('data-ui-lang', state.siteLang);
    I18N.applyUI(state.siteLang, document);

    document.title = ui('meta.title');
    if (els.metaDescription) els.metaDescription.setAttribute('content', ui('meta.description'));
    if (els.ogTitle) els.ogTitle.setAttribute('content', ui('meta.title'));
    if (els.ogDescription) els.ogDescription.setAttribute('content', ui('meta.description'));
    if (els.ogLocale) els.ogLocale.setAttribute('content', isEn ? 'en_US' : 'zh_CN');
    if (els.twitterTitle) els.twitterTitle.setAttribute('content', ui('meta.title'));
    if (els.twitterDescription) els.twitterDescription.setAttribute('content', ui('meta.description'));
    if (els.appName) els.appName.setAttribute('content', ui('footer.brand'));
    if (els.appleTitle) els.appleTitle.setAttribute('content', ui('footer.brand'));
    if (els.ogSiteName) els.ogSiteName.setAttribute('content', ui('footer.brand'));
    if (els.footerCopy) {
      els.footerCopy.textContent = ui('footer.copy', { year: new Date().getFullYear() });
    }

    $$('[data-lang-choice]').forEach(function (button) {
      button.setAttribute('aria-pressed',
        button.getAttribute('data-lang-choice') === state.siteLang ? 'true' : 'false');
    });

    if (picker && picker.setLang) picker.setLang(state.siteLang);
    updateCountryUI();
    syncNotePresets();
    if (CM.refreshThemeLabels) CM.refreshThemeLabels();
    if (CM.refreshOfflineText) CM.refreshOfflineText();
    updatePlateRegion(CM.normalizePlate(els.plate.value, state.plateCountry));
    validatePlate(state.touchedPlate);
    validatePhone(state.touchedPhone);
    updateNoteMeta();
    renderRecents();

    if (!state.valid) {
      els.mobilePlate.textContent = ui('mobile.ready');
    }
    if (els.formStatus) {
      els.formStatus.textContent = state.valid
        ? ui('formStatus.valid')
        : ((state.touchedPlate || state.touchedPhone) ? ui('formStatus.invalid') : '');
    }
    state.lastValid = state.valid;
  }

  function setupEvents() {
    els.plate.addEventListener('compositionstart', function () {
      state.composing = true;
    });
    els.plate.addEventListener('compositionend', function () {
      state.composing = false;
      handlePlateInput();
    });
    els.plate.addEventListener('input', function () {
      if (!state.composing) handlePlateInput();
    });
    els.plate.addEventListener('blur', function () {
      state.touchedPlate = true;
      validatePlate(true);
      updateFromInputs(false);
    });

    els.phone.addEventListener('input', handlePhoneInput);
    els.phone.addEventListener('blur', function () {
      state.touchedPhone = true;
      validatePhone(true);
      updateFromInputs(false);
    });

    els.owner.addEventListener('input', function () {
      scheduleUpdate();
    });

    els.note.addEventListener('input', function () {
      updateNoteMeta();
      scheduleUpdate();
    });

    if (els.noteChips) {
      els.noteChips.addEventListener('click', function (event) {
        var chip = event.target.closest('[data-note]');
        if (!chip) return;
        els.note.value = chip.getAttribute('data-note');
        updateNoteMeta();
        updateFromInputs(false);
        els.note.focus();
      });
    }

    if (els.swatches) {
      els.swatches.addEventListener('click', function (event) {
        var swatch = event.target.closest('[data-accent]');
        if (!swatch) return;
        var accent = swatch.getAttribute('data-accent');
        if (!ACCENTS[accent] || accent === state.accent) return;
        state.accent = accent;
        CM.storage.set('carmsg:accent', accent);
        renderSwatches();
        updateFromInputs(true);
      });
    }

    if (els.langSelect) {
      els.langSelect.addEventListener('change', function () {
        var value = els.langSelect.value;
        var normalized = I18N.normalize(value);
        if (value !== 'auto' && (!normalized || !I18N.isSupported(normalized))) {
          value = 'en';
        }
        state.lang = value;
        CM.storage.set('carmsg:lang', value);
        applyLanguage();
        updateFromInputs(true);
      });
    }

    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
      finishFormEntry();
    });

    /* Enter in a single-line input means "done", not "download":
       validate, then release focus so the mobile dock can appear. */
    els.form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229 ||
          !event.target.matches('input')) return;
      event.preventDefault();
      finishFormEntry();
    });

    els.downloadBtn.addEventListener('click', downloadTag);
    els.printBtn.addEventListener('click', printTag);
    els.copyBtn.addEventListener('click', copyLink);
    els.qrOnlyBtn.addEventListener('click', downloadQrOnly);
    if (els.shareBtn) els.shareBtn.addEventListener('click', shareTag);

    els.mobilePreview.addEventListener('click', scrollToPreview);
    els.mobileDownload.addEventListener('click', downloadTag);

    els.form.addEventListener('focusin', function () {
      state.formFocused = true;
      updateMobileBar();
    });
    els.form.addEventListener('focusout', function (event) {
      if (!els.form.contains(event.relatedTarget)) {
        state.formFocused = false;
        updateMobileBar();
      }
    });

    els.recentList.addEventListener('click', handleRecentClick);
    els.clearRecent.addEventListener('click', handleClearRecent);

    window.addEventListener('resize', CM.debounce(updateMobileBar, 150));

    if (window.matchMedia) {
      var query = window.matchMedia('(max-width: 920px)');
      var onChange = function () { updateMobileBar(); };
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  function refreshFromInputs() {
    var plate = CM.normalizePlate(els.plate.value, state.plateCountry);
    if (els.plate.value !== plate) els.plate.value = plate;
    var digits = CM.normalizePhone(els.phone.value);
    if (els.phone.value !== digits) els.phone.value = digits;
    validatePlate(false);
    validatePhone(false);
    updateFromInputs(false);
  }

  function setPlateCountry(code) {
    if (!CM.countryOf(code) || code === state.plateCountry) return;
    state.plateCountry = code;
    els.plate.value = CM.normalizePlate(els.plate.value, code);
    updateCountryUI();
    /* A fresh form follows the plate country for the phone picker too. */
    if (code !== 'CN' && state.phoneCountry === 'CN' && !CM.normalizePhone(els.phone.value)) {
      state.phoneCountry = code;
      updateCountryUI();
    }
    if (state.lang === 'auto') applyLanguage();
    updatePlateRegion(els.plate.value);
    validatePlate(false);
    validatePhone(false);
    updateFromInputs(true);
  }

  function setPhoneCountry(code) {
    if (!CM.countryOf(code) || code === state.phoneCountry) return;
    state.phoneCountry = code;
    /* When the country is chosen before the plate, keep both pickers in step. */
    if (state.plateCountry === 'CN' && code !== 'CN' && !CM.normalizePhone(els.phone.value) &&
        !CM.normalizePlate(els.plate.value, state.plateCountry)) {
      state.plateCountry = code;
      if (state.lang === 'auto') applyLanguage();
      updatePlateRegion(els.plate.value);
      validatePlate(false);
    }
    updateCountryUI();
    validatePhone(false);
    updateFromInputs(true);
  }

  function updateCountryUI() {
    var plateCountry = CM.countryOf(state.plateCountry) || CM.countryOf('CN');
    var phoneCountry = CM.countryOf(state.phoneCountry) || CM.countryOf('CN');
    var plateName = siteCountryName(plateCountry.code);
    var phoneName = siteCountryName(phoneCountry.code);

    els.plateCountryIso.textContent = plateCountry.code;
    els.plateCountryBtn.setAttribute('aria-label',
      ui('plate.aria', { country: plateName }));
    els.plateHint.textContent = plateCountry.code === 'CN'
      ? ui('plate.hint.cn')
      : ui('plate.hint.other', { country: plateName });
    els.plate.placeholder = ui('plate.placeholder', { example: plateCountry.plateExample });

    els.phoneCountryIso.textContent = phoneCountry.code;
    els.phoneCountryDial.textContent = '+' + phoneCountry.dial;
    els.phoneCountryBtn.setAttribute('aria-label',
      ui('phone.aria', { country: phoneName, dial: phoneCountry.dial }));
    els.phoneHint.textContent = ui('phone.hint', {
      country: phoneName,
      dial: phoneCountry.dial
    });

    var example = CM.phoneExample(phoneCountry.code);
    els.phone.placeholder = example || ui('phone.placeholder');
  }

  function handlePlateInput() {
    var normalized = CM.normalizePlate(els.plate.value, state.plateCountry);
    if (els.plate.value !== normalized) {
      els.plate.value = normalized;
      try {
        els.plate.setSelectionRange(normalized.length, normalized.length);
      } catch (error) {
        /* Some input modes do not support selection. */
      }
    }
    updatePlateRegion(normalized);
    validatePlate(false);
    updateFromInputs(false);
  }

  function handlePhoneInput() {
    var raw = els.phone.value;
    var digits = CM.normalizePhone(raw);
    if (digits.length >= 8 && /^(\+|00)/.test(raw.trim())) {
      var detected = CM.detectPhone(raw);
      if (detected && CM.countryOf(detected.country)) {
        state.phoneCountry = detected.country;
        updateCountryUI();
        digits = detected.national || digits;
      }
    }
    if (els.phone.value !== digits) els.phone.value = digits;
    validatePhone(false);
    updateFromInputs(false);
  }

  function updatePlateRegion(plate) {
    if (state.plateCountry !== 'CN' || state.siteLang === 'en') {
      els.plateRegion.hidden = true;
      els.plateRegionText.textContent = '';
      return;
    }
    var region = CM.regionOf(plate);
    if (!region) {
      els.plateRegion.hidden = true;
      els.plateRegionText.textContent = '';
      return;
    }
    if (els.plateRegionText.textContent !== region.label) {
      els.plateRegionText.textContent = region.label;
    }
    els.plateRegion.hidden = false;
  }

  function validatePlate(force) {
    var plate = CM.normalizePlate(els.plate.value, state.plateCountry);
    var touched = force || state.touchedPlate;
    var example = CM.plateExample(state.plateCountry);
    if (!plate) {
      setFieldState(els.plateWrap, els.plateMsg, els.plate, touched ? 'invalid' : 'neutral',
        touched ? ui('error.plate.empty') : '');
      return false;
    }
    if (!CM.isValidPlate(plate, state.plateCountry)) {
      var shouldShow = touched || Array.from(plate).length >= 3;
      setFieldState(els.plateWrap, els.plateMsg, els.plate, shouldShow ? 'invalid' : 'neutral',
        shouldShow ? ui('error.plate.invalid', { example: example || '' }) : '');
      return false;
    }
    setFieldState(els.plateWrap, els.plateMsg, els.plate, 'valid', '');
    return true;
  }

  function validatePhone(force) {
    var raw = els.phone.value;
    var digits = CM.normalizePhone(raw);
    var touched = force || state.touchedPhone;
    var info = CM.phoneInfo(digits, state.phoneCountry);

    if (!digits) {
      state.phone = null;
      hidePhonePreview();
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, touched ? 'invalid' : 'neutral',
        touched ? ui('error.phone.empty') : '');
      return false;
    }

    if (info && info.valid) {
      state.phone = info;
      showPhonePreview(info);
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, 'valid', '');
      return true;
    }

    state.phone = null;
    hidePhonePreview();
    if (touched || digits.length >= 6) {
      var example = CM.phoneExample(state.phoneCountry);
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, 'invalid',
        example
          ? ui('error.phone.invalid', { example: example })
          : ui('error.phone.invalidGeneric'));
    } else {
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, 'neutral', '');
    }
    return false;
  }

  function showPhonePreview(info) {
    if (!els.phonePreview) return;
    var text = info.formatted || info.e164;
    var target = els.phonePreview.querySelector('span');
    if (target) target.textContent = text;
    els.phonePreview.hidden = false;
  }

  function hidePhonePreview() {
    if (!els.phonePreview) return;
    els.phonePreview.hidden = true;
  }

  function setFieldState(wrap, messageEl, input, type, text) {
    wrap.classList.remove('is-invalid', 'is-valid');
    messageEl.classList.remove('is-visible');
    var textNode = messageEl.querySelector('span');
    if (textNode) textNode.textContent = text || '';
    if (type === 'invalid') {
      wrap.classList.add('is-invalid');
      if (text) messageEl.classList.add('is-visible');
      input.setAttribute('aria-invalid', 'true');
    } else if (type === 'valid') {
      wrap.classList.add('is-valid');
      input.removeAttribute('aria-invalid');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  function finishFormEntry() {
    state.touchedPlate = true;
    state.touchedPhone = true;
    validatePlate(true);
    validatePhone(true);
    updateFromInputs(true);
    if (!state.valid) {
      focusFirstInvalid();
      return;
    }
    if (document.activeElement && els.form.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  function focusFirstInvalid() {
    var plate = CM.normalizePlate(els.plate.value, state.plateCountry);
    if (!CM.isValidPlate(plate, state.plateCountry)) {
      els.plate.focus();
      return;
    }
    if (!(state.phone && state.phone.valid)) {
      els.phone.focus();
    }
  }

  function scheduleUpdate() {
    if (scheduledRender) clearTimeout(scheduledRender);
    scheduledRender = setTimeout(function () {
      updateFromInputs(false);
    }, 140);
  }

  function getData() {
    return {
      plate: CM.normalizePlate(els.plate.value, state.plateCountry),
      plateCountry: state.plateCountry,
      phone: state.phone ? state.phone.e164 : '',
      phoneCountry: state.phone ? state.phone.country : state.phoneCountry,
      owner: CM.clampText(els.owner.value, 12),
      note: CM.clampText(els.note.value, 40),
      accent: state.accent,
      color: ACCENTS[state.accent].color,
      lang: state.lang,
      resolvedLang: state.resolvedLang
    };
  }

  function buildViewUrl(data) {
    var url = new URL('view.html', window.location.href);
    url.search = '';
    var params = new URLSearchParams();
    params.set('v', '1');
    params.set('plate', data.plate);
    if (data.plateCountry !== 'CN') params.set('pcc', data.plateCountry);
    params.set('phone', data.phone);
    params.set('lang', data.lang);
    if (data.owner) params.set('name', data.owner);
    if (data.note) params.set('note', data.note);
    url.hash = params.toString();
    return url.href;
  }

  function updateFromInputs(immediate) {
    var data = getData();
    var plateOk = CM.isValidPlate(data.plate, state.plateCountry);
    var phoneOk = !!(state.phone && state.phone.valid);
    var valid = plateOk && phoneOk;

    updateTagContent(data, plateOk);
    updateNoteMeta();
    updatePlateRegion(data.plate);

    if (valid) {
      state.url = buildViewUrl(data);
      var rendered = renderQrIfNeeded(data);
      state.valid = rendered;
      updateActions(rendered);
      if (rendered) {
        scheduleSave(data);
      } else {
        state.url = '';
      }
    } else {
      state.valid = false;
      state.url = '';
      state.qrUrl = '';
      state.qrAccent = '';
      els.tagCard.classList.remove('is-ready');
      updateActions(false);
    }

    updateMobileBar();
    announceValidity(state.valid);

    if (immediate) {
      /* Keep the API symmetrical for actions that need a synchronous refresh. */
    }
  }

  function announceValidity(valid) {
    if (state.lastValid === valid) return;
    var wasValid = state.lastValid;
    state.lastValid = valid;
    if (!els.formStatus) return;
    if (valid) {
      els.formStatus.textContent = ui('formStatus.valid');
    } else if (wasValid === true) {
      els.formStatus.textContent = ui('formStatus.invalid');
    }
  }

  function updateTagContent(data, plateOk) {
    var placeholder = I18N.t(state.resolvedLang, 'preview.platePlaceholder');
    if (data.plate) {
      var text = displayPlate(data.plate, data.plateCountry);
      els.plateText.textContent = text;
      els.plateDisplay.classList.toggle('is-placeholder', !plateOk);
      els.plateDisplay.classList.toggle('is-long', text.length > 9);
    } else {
      els.plateText.textContent = placeholder;
      els.plateDisplay.classList.add('is-placeholder');
      els.plateDisplay.classList.remove('is-long');
    }

    var intl = data.plateCountry !== 'CN' && plateOk;
    els.plateDisplay.classList.toggle('is-intl', intl);
    els.plateCC.hidden = !intl;
    els.plateCC.textContent = data.plateCountry;

    if (data.owner) {
      els.ownerDisplay.hidden = false;
      els.ownerAvatar.textContent = Array.from(data.owner)[0] || 'O';
      els.ownerName.textContent = data.owner;
    } else {
      els.ownerDisplay.hidden = true;
    }

    if (data.note) {
      els.noteDisplay.hidden = false;
      els.noteDisplay.textContent = data.note;
    } else {
      els.noteDisplay.hidden = true;
    }

    if (plateOk) {
      var shown = displayPlate(data.plate, data.plateCountry);
      els.qrCanvas.setAttribute('aria-label',
        I18N.t(state.resolvedLang, 'preview.plateAria', { plate: shown }));
      els.mobilePlate.textContent = shown;
    } else {
      els.qrCanvas.setAttribute('aria-label', I18N.t(state.resolvedLang, 'preview.qrAria'));
      els.mobilePlate.textContent = ui('mobile.ready');
    }
  }

  function applyLanguage() {
    state.resolvedLang = I18N.resolve(state.lang, state.plateCountry);
    I18N.apply(state.resolvedLang, document);
    var rtl = I18N.isRtl ? I18N.isRtl(state.resolvedLang) : false;
    els.tagCard.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    els.tagCard.setAttribute('lang', state.resolvedLang);
    els.printSheet.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    els.printSheet.setAttribute('lang', state.resolvedLang);
    if (els.langSelect && els.langSelect.value !== state.lang) {
      els.langSelect.value = state.lang;
    }
    if (!CM.normalizePlate(els.plate.value, state.plateCountry)) {
      els.plateText.textContent = I18N.t(state.resolvedLang, 'preview.platePlaceholder');
    }
  }

  function renderQrIfNeeded(data) {
    if (state.qrUrl === state.url && state.qrAccent === data.accent) {
      els.tagCard.classList.add('is-ready');
      return true;
    }
    try {
      QR.renderQR(els.qrCanvas, state.url, {
        size: 720,
        color: data.color,
        logo: true
      });
      state.qrUrl = state.url;
      state.qrAccent = data.accent;
      var wasReady = els.tagCard.classList.contains('is-ready');
      els.tagCard.classList.add('is-ready');
      if (!wasReady) {
        els.tagCard.classList.remove('is-just-ready');
        void els.tagCard.offsetWidth;
        els.tagCard.classList.add('is-just-ready');
        setTimeout(function () { els.tagCard.classList.remove('is-just-ready'); }, 520);
      }
      return true;
    } catch (error) {
      state.qrUrl = '';
      state.qrAccent = '';
      els.tagCard.classList.remove('is-ready');
      CM.toast(ui('toast.qrFail'), 'error');
      return false;
    }
  }

  function updateActions(valid) {
    [els.downloadBtn, els.printBtn, els.copyBtn, els.qrOnlyBtn].forEach(function (button) {
      if (button) button.disabled = !valid;
    });
    if (els.shareBtn) els.shareBtn.disabled = !valid;
    els.tagStage.dataset.accent = state.accent;
  }

  function displayPlate(plate, country) {
    if (!plate) return '';
    if (!country || country === 'CN') {
      return plate.length > 2 ? plate.slice(0, 2) + '·' + plate.slice(2) : plate;
    }
    return plate;
  }

  function updateNoteMeta() {
    var length = els.note.value.length;
    els.noteCounter.textContent = length + ' / 40';
    els.noteCounter.classList.toggle('is-full', length >= 40);
    if (!els.noteChips) return;
    var chips = els.noteChips.querySelectorAll('[data-note]');
    Array.prototype.forEach.call(chips, function (chip) {
      var active = chip.getAttribute('data-note') === els.note.value;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderSwatches() {
    if (!els.swatches) return;
    var swatches = els.swatches.querySelectorAll('[data-accent]');
    Array.prototype.forEach.call(swatches, function (swatch) {
      var active = swatch.getAttribute('data-accent') === state.accent;
      swatch.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    els.tagStage.dataset.accent = state.accent;
  }

  function restoreAccent() {
    var stored = CM.storage.get('carmsg:accent', 'ocean');
    state.accent = ACCENTS[stored] ? stored : 'ocean';
    renderSwatches();
  }

  function restoreLang() {
    var stored = CM.storage.get('carmsg:lang', 'en');
    var normalized = I18N.normalize(stored);
    state.lang = stored === 'auto' || (normalized && I18N.isSupported(normalized))
      ? (stored === 'auto' ? 'auto' : normalized)
      : 'en';
  }

  function downloadTag() {
    updateFromInputs(true);
    if (!state.valid || state.exporting) return;
    state.exporting = true;
    els.downloadBtn.setAttribute('aria-busy', 'true');
    els.mobileDownload.setAttribute('aria-busy', 'true');
    var data = getData();
    var qrCanvas;
    var poster = document.createElement('canvas');
    try {
      qrCanvas = QR.createQrCanvas(state.url, { size: 900, color: data.color, logo: true });
      QR.drawPoster(poster, {
        plate: data.plate,
        pcc: data.plateCountry,
        owner: data.owner,
        note: data.note,
        accent: data.color,
        lang: state.resolvedLang,
        qrCanvas: qrCanvas
      });
    } catch (error) {
      state.exporting = false;
      els.downloadBtn.removeAttribute('aria-busy');
      els.mobileDownload.removeAttribute('aria-busy');
      CM.toast(ui('toast.tagFail'), 'error');
      return;
    }
    QR.toBlob(poster, 'image/png').then(function (blob) {
      CM.downloadBlob(blob, 'CarMsg_Parking_Tag_' + CM.sanitizeFilename(data.plate) + '.png');
      CM.toast(ui('toast.tagDownload'), 'success');
      saveRecentNow(data);
    }).catch(function () {
      CM.toast(ui('toast.tagFail'), 'error');
    }).then(function () {
      state.exporting = false;
      els.downloadBtn.removeAttribute('aria-busy');
      els.mobileDownload.removeAttribute('aria-busy');
    });
  }

  function downloadQrOnly() {
    updateFromInputs(true);
    if (!state.valid || state.exporting) return;
    state.exporting = true;
    els.qrOnlyBtn.setAttribute('aria-busy', 'true');
    var data = getData();
    var qrCanvas;
    try {
      qrCanvas = QR.createQrCanvas(state.url, { size: 1000, color: data.color, logo: true });
    } catch (error) {
      state.exporting = false;
      els.qrOnlyBtn.removeAttribute('aria-busy');
      CM.toast(ui('toast.qrFail'), 'error');
      return;
    }
    QR.toBlob(qrCanvas, 'image/png').then(function (blob) {
      CM.downloadBlob(blob, 'CarMsg_QR_' + CM.sanitizeFilename(data.plate) + '.png');
      CM.toast(ui('toast.qrDownload'), 'success');
      saveRecentNow(data);
    }).catch(function () {
      CM.toast(ui('toast.downloadFail'), 'error');
    }).then(function () {
      state.exporting = false;
      els.qrOnlyBtn.removeAttribute('aria-busy');
    });
  }

  function printTag() {
    updateFromInputs(true);
    if (!state.valid || state.printing) return;
    state.printing = true;
    var data = getData();
    var source;
    try {
      source = QR.createQrCanvas(state.url, { size: 900, color: data.color, logo: true })
        .toDataURL('image/png');
    } catch (error) {
      state.printing = false;
      CM.toast(ui('toast.printFail'), 'error');
      return;
    }

    I18N.apply(state.resolvedLang, els.printSheet);
    var images = $$('.print-qr', els.printSheet);
    images.forEach(function (image) {
      image.src = source;
    });
    $$('.print-plate', els.printSheet).forEach(function (element) {
      element.textContent = displayPlate(data.plate, data.plateCountry);
    });
    $$('.print-owner', els.printSheet).forEach(function (element) {
      element.textContent = data.owner
        ? I18N.t(state.resolvedLang, 'print.ownerLabel') + data.owner
        : '';
      element.hidden = !data.owner;
    });
    $$('.print-note', els.printSheet).forEach(function (element) {
      element.textContent = data.note || I18N.t(state.resolvedLang, 'print.noteFallback');
    });

    var pending = images.map(function (image) {
      if (image.decode) return image.decode().catch(function () {});
      return new Promise(function (resolve) {
        if (image.complete) resolve();
        else image.onload = resolve;
      });
    });

    saveRecentNow(data);
    Promise.all(pending).then(function () {
      setTimeout(function () {
        try {
          window.print();
        } finally {
          state.printing = false;
        }
      }, 80);
    });
  }

  function copyLink() {
    updateFromInputs(true);
    if (!state.valid) return;
    CM.copyText(state.url).then(function (ok) {
      if (ok) {
        CM.toast(ui('toast.linkCopied'), 'success');
        saveRecentNow(getData());
      } else {
        CM.toast(ui('toast.copyFail'), 'error');
      }
    });
  }

  function shareTag() {
    updateFromInputs(true);
    if (!state.valid || typeof navigator.share !== 'function') return;
    var data = getData();
    navigator.share({
      title: ui('share.title', { plate: displayPlate(data.plate, data.plateCountry) }),
      text: ui('share.text'),
      url: state.url
    }).then(function () {
      saveRecentNow(data);
    }).catch(function (error) {
      if (error && error.name === 'AbortError') return;
      copyLink();
    });
  }

  function setupShare() {
    if (els.shareBtn && typeof navigator.share === 'function') {
      els.shareBtn.hidden = false;
    }
  }

  function scrollToPreview() {
    if (!els.previewPanel) return;
    els.previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.previewPanel.classList.remove('is-highlight');
    void els.previewPanel.offsetWidth;
    els.previewPanel.classList.add('is-highlight');
    setTimeout(function () { els.previewPanel.classList.remove('is-highlight'); }, 1000);
  }

  function setupPreviewObserver() {
    if (!('IntersectionObserver' in window)) {
      state.previewVisible = false;
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === els.previewPanel) state.previewVisible = entry.isIntersecting;
        if (entry.target === els.workspaceActions) state.actionsVisible = entry.isIntersecting;
      });
      updateMobileBar();
    }, { threshold: 0.22 });
    observer.observe(els.previewPanel);
    if (els.workspaceActions) observer.observe(els.workspaceActions);
  }

  function updateMobileBar() {
    if (!els.mobileBar) return;
    var mobile = window.matchMedia && window.matchMedia('(max-width: 920px)').matches;
    var visible = state.valid && mobile && !state.previewVisible &&
      !state.actionsVisible && !state.formFocused;
    els.mobileBar.classList.toggle('is-visible', visible);
    document.body.classList.toggle('has-mobile-bar', visible);
  }

  /* ---------------------------------------------------------------------
     Recent records
     --------------------------------------------------------------------- */

  function getRecents() {
    var list = CM.storage.get('carmsg:recent', []);
    return Array.isArray(list) ? list.filter(isValidRecord) : [];
  }

  function isValidRecord(record) {
    if (!record || typeof record !== 'object') return false;
    var pcc = CM.countryOf(record.pcc) ? record.pcc : 'CN';
    var plate = CM.normalizePlate(record.plate || '', pcc);
    var phone = CM.phoneInfo(record.phone || '', pcc);
    return CM.isValidPlate(plate, pcc) && !!(phone && phone.valid);
  }

  function scheduleSave(data) {
    if (scheduledSave) clearTimeout(scheduledSave);
    scheduledSave = setTimeout(function () {
      saveRecentNow(data);
    }, 1500);
  }

  function saveRecentNow(data) {
    if (!data || !CM.isValidPlate(data.plate, data.plateCountry) || !data.phone) return;
    var list = getRecents();
    var record = {
      plate: data.plate,
      pcc: data.plateCountry,
      phone: data.phone,
      owner: data.owner || '',
      note: data.note || '',
      accent: ACCENTS[data.accent] ? data.accent : 'ocean',
      lang: data.lang,
      ts: Date.now()
    };
    var index = -1;
    for (var i = 0; i < list.length; i += 1) {
      var existing = CM.phoneInfo(list[i].phone, list[i].pcc || 'CN');
      var existingNumber = existing ? existing.e164 : list[i].phone;
      if (list[i].plate === record.plate && existingNumber === record.phone &&
          (list[i].pcc || 'CN') === record.pcc) {
        index = i;
        break;
      }
    }
    if (index >= 0) list.splice(index, 1);
    list.unshift(record);
    list = list.slice(0, 6);
    if (CM.storage.set('carmsg:recent', list)) {
      renderRecents();
    }
  }

  function renderRecents() {
    var list = getRecents();
    if (!list.length) {
      els.recentSection.hidden = true;
      els.recentList.textContent = '';
      resetClearButton();
      return;
    }
    els.recentSection.hidden = false;
    var fragment = document.createDocumentFragment();
    list.forEach(function (record, index) {
      var pcc = CM.countryOf(record.pcc) ? record.pcc : 'CN';
      var card = document.createElement('article');
      card.className = 'recent-card';

      var main = document.createElement('button');
      main.type = 'button';
      main.className = 'recent-main';
      main.setAttribute('data-index', String(index));
      main.setAttribute('aria-label', ui('recent.load', { plate: displayPlate(record.plate, pcc) }));

      var plate = document.createElement('span');
      plate.className = 'recent-plate';
      plate.textContent = displayPlate(record.plate, pcc);

      var meta = document.createElement('span');
      meta.className = 'recent-meta';
      var parts = [];
      if (record.owner) parts.push(record.owner);
      parts.push(CM.maskPhone(record.phone, pcc));
      parts.push(CM.timeAgo(record.ts));
      meta.textContent = parts.join(' / ');

      main.appendChild(plate);
      main.appendChild(meta);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'recent-del';
      remove.setAttribute('data-del', String(index));
      remove.setAttribute('aria-label', ui('recent.delete', { plate: displayPlate(record.plate, pcc) }));
      remove.innerHTML = '<svg aria-hidden="true"><use href="#i-trash"></use></svg>';

      card.appendChild(main);
      card.appendChild(remove);
      fragment.appendChild(card);
    });
    els.recentList.textContent = '';
    els.recentList.appendChild(fragment);
    resetClearButton();
  }

  function handleRecentClick(event) {
    var remove = event.target.closest('[data-del]');
    if (remove) {
      var deleteIndex = Number(remove.getAttribute('data-del'));
      var list = getRecents();
      list.splice(deleteIndex, 1);
      CM.storage.set('carmsg:recent', list);
      renderRecents();
      CM.toast(ui('recent.deleted'), 'success');
      return;
    }

    var main = event.target.closest('[data-index]');
    if (!main) return;
    var index = Number(main.getAttribute('data-index'));
    var records = getRecents();
    if (!records[index]) return;
    loadRecord(records[index]);
  }

  function loadRecord(record) {
    var pcc = CM.countryOf(record.pcc) ? record.pcc : 'CN';
    var phone = CM.phoneInfo(record.phone, pcc);
    if (!phone || !phone.valid) return;

    state.plateCountry = pcc;
    state.phoneCountry = CM.countryOf(phone.country) ? phone.country : pcc;
    if (record.lang) {
      var lang = I18N.normalize(record.lang);
      if (record.lang === 'auto' || (lang && I18N.isSupported(lang))) {
        state.lang = record.lang === 'auto' ? 'auto' : lang;
      }
    }

    els.plate.value = CM.normalizePlate(record.plate, pcc);
    els.phone.value = phone.national || CM.normalizePhone(record.phone);
    els.owner.value = record.owner || '';
    els.note.value = record.note || '';
    state.touchedPlate = true;
    state.touchedPhone = true;
    if (ACCENTS[record.accent]) {
      state.accent = record.accent;
      CM.storage.set('carmsg:accent', record.accent);
    }
    updateCountryUI();
    renderSwatches();
    applyLanguage();
    updatePlateRegion(els.plate.value);
    updateNoteMeta();
    validatePlate(true);
    validatePhone(true);
    updateFromInputs(true);
    CM.toast(ui('recent.loaded', { plate: displayPlate(record.plate, pcc) }), 'success');

    if (window.matchMedia && window.matchMedia('(max-width: 980px)').matches) {
      var generator = document.getElementById('generator');
      if (generator) generator.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () {
        els.previewPanel.classList.remove('is-highlight');
        void els.previewPanel.offsetWidth;
        els.previewPanel.classList.add('is-highlight');
      }, 350);
    }
  }

  var clearTimer = null;

  function handleClearRecent() {
    if (els.clearRecent.getAttribute('data-confirm') === '1') {
      CM.storage.remove('carmsg:recent');
      renderRecents();
      CM.toast(ui('recent.cleared'), 'success');
      return;
    }
    els.clearRecent.setAttribute('data-confirm', '1');
    els.clearRecent.classList.add('is-danger');
    var label = els.clearRecent.querySelector('span');
    if (label) label.textContent = ui('recent.confirm');
    clearTimeout(clearTimer);
    clearTimer = setTimeout(resetClearButton, 3200);
  }

  function resetClearButton() {
    if (!els.clearRecent) return;
    els.clearRecent.removeAttribute('data-confirm');
    els.clearRecent.classList.remove('is-danger');
    var label = els.clearRecent.querySelector('span');
    if (label) label.textContent = ui('recent.clear');
    clearTimeout(clearTimer);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
