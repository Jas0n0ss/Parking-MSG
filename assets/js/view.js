/* Contact page logic: parse the link, render the card, wire up call / SMS. */
(function () {
  'use strict';

  var CM = window.CarMsg;
  var I18N = window.CarMsgI18N;
  var $ = CM.$;

  var state = {
    data: null,
    revealed: false,
    templateIndex: 0,
    lang: 'en'
  };

  var els = {};

  function init() {
    cacheElements();
    bindEvents();
    loadFromUrl();
    window.addEventListener('hashchange', loadFromUrl);
  }

  function cacheElements() {
    els.contactCard = $('#contactCard');
    els.contactTitle = $('#contactTitle');
    els.errorCard = $('#errorCard');
    els.errorTitle = $('#errorTitle');
    els.errorText = $('#errorText');
    els.plateCC = $('#plateCC');
    els.plateText = $('#plateText');
    els.ownerLine = $('#ownerLine');
    els.ownerText = $('#ownerText');
    els.noteBlock = $('#noteBlock');
    els.noteText = $('#noteText');
    els.phoneText = $('#phoneText');
    els.revealBtn = $('#revealBtn');
    els.callBtn = $('#callBtn');
    els.smsBtn = $('#smsBtn');
    els.copyBtn = $('#copyBtn');
    els.vcardBtn = $('#vcardBtn');
    els.smsChips = $('#smsChips');
    els.smsPreviewText = $('#smsPreviewText');
    els.footerCopy = $('#footerCopy');
    els.metaDescription = document.querySelector('meta[name="description"]');
    els.themeToggle = $('[data-theme-toggle]');
  }

  function readParams() {
    try {
      if (window.location.hash && window.location.hash.length > 1) {
        var hashParams = new URLSearchParams(window.location.hash.slice(1));
        if (hashParams.has('plate') || hashParams.has('phone') ||
            hashParams.has('lang') || hashParams.has('pcc')) {
          return hashParams;
        }
      }
      return new URLSearchParams(window.location.search);
    } catch (error) {
      return null;
    }
  }

  function loadFromUrl() {
    var params = readParams();
    if (!params) {
      setLanguage('en');
      showError('invalid');
      return;
    }

    var pcc = String(params.get('pcc') || 'CN').toUpperCase();
    if (!CM.countryOf(pcc)) pcc = 'CN';

    var rawPlate = params.get('plate');
    var rawPhone = params.get('phone');
    var langSetting = params.get('lang');
    if (!langSetting && !rawPlate && !rawPhone) langSetting = 'en';

    /* Legacy links without ?lang keep their original Chinese output. New links
       always carry lang explicitly, so the default for new tags stays English. */
    if (!langSetting) langSetting = 'auto';
    setLanguage(I18N.resolve(langSetting, pcc));

    if (!rawPlate || !rawPhone) {
      showError('missing');
      return;
    }

    var plate = CM.normalizePlate(rawPlate, pcc);
    if (!CM.isValidPlate(plate, pcc)) {
      showError('invalid');
      return;
    }

    var phone = CM.phoneInfo(rawPhone, pcc);
    if (!phone || !phone.valid) {
      showError('invalid');
      return;
    }

    state.data = {
      plate: plate,
      pcc: pcc,
      phone: phone,
      lang: state.lang,
      owner: CM.clampText(params.get('name') || params.get('owner') || '', 12),
      note: CM.clampText(params.get('note') || '', 40)
    };
    state.revealed = false;
    state.templateIndex = 0;
    els.contactCard.hidden = false;
    els.errorCard.hidden = true;
    document.title = I18N.t(state.lang, 'page.titleWithPlate', {
      plate: displayPlate(plate, pcc)
    });
    render();
  }

  function setLanguage(lang) {
    state.lang = lang || 'en';
    var html = document.documentElement;
    html.lang = state.lang;
    html.setAttribute('data-page-lang', state.lang);
    html.setAttribute('data-ui-lang', state.lang.indexOf('zh') === 0 ? 'zh' : 'en');
    I18N.apply(state.lang, document);
    document.title = I18N.t(state.lang, 'page.title');
    if (els.metaDescription) {
      els.metaDescription.setAttribute('content', I18N.t(state.lang, 'page.description'));
    }
    if (els.themeToggle) {
      els.themeToggle.setAttribute('data-theme-label-dark', I18N.t(state.lang, 'theme.dark'));
      els.themeToggle.setAttribute('data-theme-label-light', I18N.t(state.lang, 'theme.light'));
      var dark = html.getAttribute('data-theme') === 'dark';
      var label = I18N.t(state.lang, dark ? 'theme.light' : 'theme.dark');
      els.themeToggle.setAttribute('aria-label', label);
      els.themeToggle.setAttribute('title', label);
    }
    if (els.footerCopy) {
      els.footerCopy.textContent = I18N.t(state.lang, 'footer.copy', {
        year: new Date().getFullYear()
      });
    }
    if (CM.refreshOfflineText) CM.refreshOfflineText();
  }

  function render() {
    var data = state.data;
    var plate = displayPlate(data.plate, data.pcc);

    els.plateText.textContent = plate;
    els.plateCC.hidden = data.pcc === 'CN';
    els.plateCC.textContent = data.pcc;
    els.contactTitle.classList.toggle('is-intl', data.pcc !== 'CN');
    els.contactTitle.classList.toggle('is-long', plate.length > 9);

    els.ownerLine.hidden = !data.owner;
    els.ownerText.textContent = data.owner || '';

    els.noteBlock.hidden = !data.note;
    els.noteText.textContent = data.note || '';

    els.callBtn.href = 'tel:' + data.phone.e164;
    renderPhone();
    selectTemplate(0);
  }

  function bindEvents() {
    els.revealBtn.addEventListener('click', function () {
      state.revealed = !state.revealed;
      renderPhone();
    });

    els.copyBtn.addEventListener('click', function () {
      if (!state.data) return;
      CM.copyText(state.data.phone.e164).then(function (ok) {
        if (ok) CM.toast(I18N.t(state.lang, 'toast.copied'), 'success');
        else CM.toast(I18N.t(state.lang, 'toast.copyFail'), 'error');
      });
    });

    els.vcardBtn.addEventListener('click', downloadVcard);

    els.smsChips.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-template]');
      if (!chip) return;
      var index = Number(chip.getAttribute('data-template'));
      if (!(index >= 0 && index < 4)) return;
      selectTemplate(index);
    });
  }

  function renderPhone() {
    if (!state.data) return;
    var phone = state.data.phone;
    var text = state.revealed
      ? (phone.formatted || phone.e164)
      : CM.maskPhone(phone.e164, phone.country);
    els.phoneText.textContent = text;
    els.phoneText.classList.toggle('is-long', text.length > 17);
    els.revealBtn.setAttribute('aria-pressed', state.revealed ? 'true' : 'false');
    els.revealBtn.setAttribute('aria-label', I18N.t(state.lang, state.revealed ? 'phone.hide' : 'phone.show'));
    els.revealBtn.setAttribute('title', I18N.t(state.lang, state.revealed ? 'phone.hide' : 'phone.show'));
  }

  function selectTemplate(index) {
    if (!state.data) return;
    state.templateIndex = index;
    var plate = displayPlate(state.data.plate, state.data.pcc);
    var message = I18N.t(state.lang, 'sms.t' + index, { plate: plate });
    els.smsPreviewText.textContent = message;
    els.smsBtn.href = 'sms:' + state.data.phone.e164 + '?body=' + encodeURIComponent(message);

    var chips = els.smsChips.querySelectorAll('[data-template]');
    Array.prototype.forEach.call(chips, function (chip) {
      var active = Number(chip.getAttribute('data-template')) === index;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function downloadVcard() {
    if (!state.data) return;
    var data = state.data;
    var plate = displayPlate(data.plate, data.pcc);
    var prefix = I18N.t(state.lang, 'vcard.prefix');
    var displayName = data.owner ? prefix + ' ' + data.owner : prefix + ' ' + plate;
    var vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:;' + vcardEscape(data.owner || prefix) + ';;',
      'FN:' + vcardEscape(displayName),
      'ORG:CarMsg',
      'TEL;TYPE=CELL:' + data.phone.e164,
      'NOTE:' + vcardEscape(I18N.t(state.lang, 'vcard.note', { plate: plate })),
      'END:VCARD'
    ].join('\r\n');

    var blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    CM.downloadBlob(blob, 'CarMsg_' + CM.sanitizeFilename(plate) + '.vcf');
    CM.toast(I18N.t(state.lang, 'toast.vcard'), 'success');
  }

  function vcardEscape(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function displayPlate(plate, pcc) {
    if (!plate) return '';
    if (!pcc || pcc === 'CN') {
      return plate.length > 2 ? plate.slice(0, 2) + '·' + plate.slice(2) : plate;
    }
    return plate;
  }

  function showError(reason) {
    state.data = null;
    state.revealed = false;
    if (els.contactCard) els.contactCard.hidden = true;
    if (els.errorCard) els.errorCard.hidden = false;
    document.title = I18N.t(state.lang, 'error.docTitle');
    if (els.errorTitle) els.errorTitle.textContent = I18N.t(state.lang, 'error.title');
    if (els.errorText) {
      els.errorText.textContent = I18N.t(state.lang, reason === 'missing' ? 'error.missing' : 'error.invalid');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
