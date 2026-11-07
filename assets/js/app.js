/* Generator page logic. Everything runs locally in the browser. */
(function () {
  'use strict';

  var CM = window.CarMsg;
  var QR = window.CarMsgQR;
  var $ = CM.$;
  var $$ = CM.$$;

  var ACCENTS = {
    ink: { label: '曜石黑', color: '#0f172a' },
    ocean: { label: '深海蓝', color: '#1d4ed8' },
    violet: { label: '暮光紫', color: '#6d28d9' },
    forest: { label: '松林绿', color: '#047857' },
    rose: { label: '胭脂红', color: '#be123c' }
  };

  var state = {
    accent: 'ocean',
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
  var scheduledRender = null;
  var scheduledSave = null;

  function init() {
    cacheElements();
    if (!els.plate) return;

    restoreAccent();
    setupEvents();
    setupPreviewObserver();
    setupShare();
    renderRecents();
    updateNoteMeta();
    updateFromInputs(false);
    validatePlate(false);
    validatePhone(false);

    /* Autofill and bfcache can restore values without firing input events. */
    window.addEventListener('pageshow', function () {
      setTimeout(function () { updateFromInputs(false); }, 60);
    });
    setTimeout(function () { updateFromInputs(false); }, 500);
  }

  function cacheElements() {
    els.form = $('#carForm');
    els.plate = $('#plate');
    els.plateWrap = $('#plateWrap');
    els.plateMsg = $('#plateMsg');
    els.plateRegion = $('#plateRegion');
    els.plateRegionText = $('#plateRegionText');
    els.phone = $('#phone');
    els.phoneWrap = $('#phoneWrap');
    els.phoneMsg = $('#phoneMsg');
    els.owner = $('#owner');
    els.note = $('#note');
    els.noteCounter = $('#noteCounter');
    els.noteChips = $('#noteChips');
    els.formStatus = $('#formStatus');
    els.tagStage = $('#tagStage');
    els.tagCard = $('#tagCard');
    els.qrCanvas = $('#qrCanvas');
    els.plateDisplay = $('#plateDisplay');
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
    els.shareDivider = $('#shareDivider');
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

    els.phone.addEventListener('input', function () {
      var digits = CM.normalizePhone(els.phone.value);
      if (els.phone.value !== digits) els.phone.value = digits;
      validatePhone(false);
      updateFromInputs(false);
    });
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

  function handlePlateInput() {
    var normalized = CM.normalizePlate(els.plate.value);
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

  function updatePlateRegion(plate) {
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
    var plate = CM.normalizePlate(els.plate.value);
    var touched = force || state.touchedPlate;
    if (!plate) {
      setFieldState(els.plateWrap, els.plateMsg, els.plate, touched ? 'invalid' : 'neutral',
        touched ? '请输入车牌号' : '');
      return false;
    }
    if (!CM.isValidPlate(plate)) {
      var shouldShow = touched || plate.length >= 7;
      setFieldState(els.plateWrap, els.plateMsg, els.plate, shouldShow ? 'invalid' : 'neutral',
        shouldShow ? '车牌号格式有误，例如 粤B12345' : '');
      return false;
    }
    setFieldState(els.plateWrap, els.plateMsg, els.plate, 'valid', '');
    return true;
  }

  function validatePhone(force) {
    var phone = CM.normalizePhone(els.phone.value);
    var touched = force || state.touchedPhone;
    if (!phone) {
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, touched ? 'invalid' : 'neutral',
        touched ? '请输入手机号' : '');
      return false;
    }
    if (phone.length < 11) {
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, touched ? 'invalid' : 'neutral',
        touched ? '手机号应为 11 位' : '');
      return false;
    }
    if (!CM.isValidPhone(phone)) {
      setFieldState(els.phoneWrap, els.phoneMsg, els.phone, 'invalid',
        '请输入有效的手机号，例如 13812345678');
      return false;
    }
    setFieldState(els.phoneWrap, els.phoneMsg, els.phone, 'valid', '');
    return true;
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
    var plate = CM.normalizePlate(els.plate.value);
    var phone = CM.normalizePhone(els.phone.value);
    if (!CM.isValidPlate(plate)) {
      els.plate.focus();
      return;
    }
    if (!CM.isValidPhone(phone)) {
      els.phone.focus();
      return;
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
      plate: CM.normalizePlate(els.plate.value),
      phone: CM.normalizePhone(els.phone.value),
      owner: CM.clampText(els.owner.value, 12),
      note: CM.clampText(els.note.value, 40),
      accent: state.accent,
      color: ACCENTS[state.accent].color
    };
  }

  function buildViewUrl(data) {
    var url = new URL('view.html', window.location.href);
    url.search = '';
    var params = new URLSearchParams();
    params.set('v', '1');
    params.set('plate', data.plate);
    params.set('phone', data.phone);
    if (data.owner) params.set('name', data.owner);
    if (data.note) params.set('note', data.note);
    url.hash = params.toString();
    return url.href;
  }

  function updateFromInputs(immediate) {
    var data = getData();
    var plateOk = CM.isValidPlate(data.plate);
    var phoneOk = CM.isValidPhone(data.phone);
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
      els.formStatus.textContent = '二维码已生成，可以下载车贴。';
    } else if (wasValid === true) {
      els.formStatus.textContent = '信息不完整，二维码已暂停生成。';
    }
  }

  function updateTagContent(data, plateOk) {
    if (data.plate) {
      els.plateDisplay.textContent = displayPlate(data.plate);
      els.plateDisplay.classList.toggle('is-placeholder', !plateOk);
    } else {
      els.plateDisplay.textContent = '你的车牌';
      els.plateDisplay.classList.add('is-placeholder');
    }

    if (data.owner) {
      els.ownerDisplay.hidden = false;
      els.ownerAvatar.textContent = data.owner.charAt(0);
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

    els.qrCanvas.setAttribute('aria-label',
      plateOk ? displayPlate(data.plate) + ' 的挪车二维码' : '包含车主联系方式的二维码');
    if (plateOk) {
      els.mobilePlate.textContent = displayPlate(data.plate);
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
      CM.toast('二维码生成失败，请刷新页面后重试', 'error');
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

  function displayPlate(plate) {
    if (!plate) return '';
    return plate.length > 2 ? plate.slice(0, 2) + '·' + plate.slice(2) : plate;
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
        owner: data.owner,
        note: data.note,
        accent: data.color,
        qrCanvas: qrCanvas
      });
    } catch (error) {
      state.exporting = false;
      els.downloadBtn.removeAttribute('aria-busy');
      els.mobileDownload.removeAttribute('aria-busy');
      CM.toast('车贴生成失败，请稍后再试', 'error');
      return;
    }
    QR.toBlob(poster, 'image/png').then(function (blob) {
      CM.downloadBlob(blob, 'CarMsg_挪车贴_' + data.plate + '.png');
      CM.toast('高清车贴已开始下载', 'success');
      saveRecentNow(data);
    }).catch(function () {
      CM.toast('车贴生成失败，请稍后再试', 'error');
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
      CM.toast('二维码生成失败，请稍后再试', 'error');
      return;
    }
    QR.toBlob(qrCanvas, 'image/png').then(function (blob) {
      CM.downloadBlob(blob, 'CarMsg_二维码_' + data.plate + '.png');
      CM.toast('二维码图片已下载', 'success');
      saveRecentNow(data);
    }).catch(function () {
      CM.toast('下载失败，请稍后再试', 'error');
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
      CM.toast('打印准备失败，请稍后再试', 'error');
      return;
    }
    var images = $$('.print-qr', els.printSheet);
    images.forEach(function (image) {
      image.src = source;
    });
    $$('.print-plate', els.printSheet).forEach(function (element) {
      element.textContent = displayPlate(data.plate);
    });
    $$('.print-owner', els.printSheet).forEach(function (element) {
      element.textContent = data.owner ? '车主：' + data.owner : '';
      element.hidden = !data.owner;
    });
    $$('.print-note', els.printSheet).forEach(function (element) {
      element.textContent = data.note || '临时停靠，请多包涵';
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
        CM.toast('二维码链接已复制', 'success');
        saveRecentNow(getData());
      } else {
        CM.toast('复制失败，请手动复制地址栏链接', 'error');
      }
    });
  }

  function shareTag() {
    updateFromInputs(true);
    if (!state.valid || typeof navigator.share !== 'function') return;
    var data = getData();
    navigator.share({
      title: 'CarMsg 挪车码：' + displayPlate(data.plate),
      text: '扫码或打开链接即可联系车主，请文明沟通。',
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
      if (els.shareDivider) els.shareDivider.hidden = false;
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
    return record && typeof record === 'object' &&
      CM.isValidPlate(record.plate) && CM.isValidPhone(record.phone);
  }

  function scheduleSave(data) {
    if (scheduledSave) clearTimeout(scheduledSave);
    scheduledSave = setTimeout(function () {
      saveRecentNow(data);
    }, 1500);
  }

  function saveRecentNow(data) {
    if (!data || !CM.isValidPlate(data.plate) || !CM.isValidPhone(data.phone)) return;
    var list = getRecents();
    var record = {
      plate: data.plate,
      phone: data.phone,
      owner: data.owner || '',
      note: data.note || '',
      accent: ACCENTS[data.accent] ? data.accent : 'ocean',
      ts: Date.now()
    };
    var index = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].plate === record.plate && list[i].phone === record.phone) {
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
      var card = document.createElement('article');
      card.className = 'recent-card';

      var main = document.createElement('button');
      main.type = 'button';
      main.className = 'recent-main';
      main.setAttribute('data-index', String(index));
      main.setAttribute('aria-label', '载入 ' + displayPlate(record.plate) + ' 的挪车码');

      var plate = document.createElement('span');
      plate.className = 'recent-plate';
      plate.textContent = displayPlate(record.plate);

      var meta = document.createElement('span');
      meta.className = 'recent-meta';
      var parts = [];
      if (record.owner) parts.push(record.owner);
      parts.push(CM.maskPhone(record.phone));
      parts.push(CM.timeAgo(record.ts));
      meta.textContent = parts.join(' / ');

      main.appendChild(plate);
      main.appendChild(meta);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'recent-del';
      remove.setAttribute('data-del', String(index));
      remove.setAttribute('aria-label', '删除 ' + displayPlate(record.plate) + ' 的记录');
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
      var removed = list.splice(deleteIndex, 1)[0];
      CM.storage.set('carmsg:recent', list);
      renderRecents();
      CM.toast('记录已删除', 'success');
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
    els.plate.value = record.plate;
    els.phone.value = record.phone;
    els.owner.value = record.owner || '';
    els.note.value = record.note || '';
    state.touchedPlate = true;
    state.touchedPhone = true;
    if (ACCENTS[record.accent]) {
      state.accent = record.accent;
      CM.storage.set('carmsg:accent', record.accent);
    }
    renderSwatches();
    updatePlateRegion(record.plate);
    updateNoteMeta();
    validatePlate(true);
    validatePhone(true);
    updateFromInputs(true);
    CM.toast('已载入 ' + displayPlate(record.plate) + ' 的记录', 'success');

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
      CM.toast('本机记录已清空', 'success');
      return;
    }
    els.clearRecent.setAttribute('data-confirm', '1');
    els.clearRecent.classList.add('is-danger');
    var label = els.clearRecent.querySelector('span');
    if (label) label.textContent = '再点一次清空';
    clearTimeout(clearTimer);
    clearTimer = setTimeout(resetClearButton, 3200);
  }

  function resetClearButton() {
    if (!els.clearRecent) return;
    els.clearRecent.removeAttribute('data-confirm');
    els.clearRecent.classList.remove('is-danger');
    var label = els.clearRecent.querySelector('span');
    if (label) label.textContent = '清空记录';
    clearTimeout(clearTimer);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
