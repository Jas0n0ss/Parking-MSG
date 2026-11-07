/* Contact page logic: parse the link, render the card, wire up call / SMS. */
(function () {
  'use strict';

  var CM = window.CarMsg;
  var $ = CM.$;

  var state = {
    data: null,
    revealed: false,
    templateIndex: 0
  };

  var els = {};

  var TEMPLATES = [
    function (plate) {
      return '您好，您的车（' + plate + '）挡住我的车了，请尽快挪车，谢谢！';
    },
    function (plate) {
      return '您好，您的车（' + plate + '）占用了我的车位，麻烦挪一下车，谢谢！';
    },
    function (plate) {
      return '您好，您的车（' + plate + '）车窗好像没有关好，方便的话请查看一下。';
    },
    function (plate) {
      return '您好，您的车（' + plate + '）车灯好像没有关，提醒您留意一下。';
    }
  ];

  function init() {
    cacheElements();
    bindEvents();
    loadFromUrl();
    window.addEventListener('hashchange', loadFromUrl);
  }

  function loadFromUrl() {
    var result = readPayload();
    if (!result.data) {
      showError(result.error);
      return;
    }
    state.data = result.data;
    state.revealed = false;
    state.templateIndex = 0;
    els.contactCard.hidden = false;
    els.errorCard.hidden = true;
    document.title = '联系车主 · ' + displayPlate(state.data.plate) + ' · CarMsg';
    render();
  }

  function cacheElements() {
    els.contactCard = $('#contactCard');
    els.errorCard = $('#errorCard');
    els.errorText = $('#errorText');
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
  }

  function readPayload() {
    var params = null;
    try {
      if (window.location.hash && window.location.hash.length > 1) {
        var hashParams = new URLSearchParams(window.location.hash.slice(1));
        if (hashParams.has('plate') || hashParams.has('phone')) {
          params = hashParams;
        }
      }
      if (!params) {
        params = new URLSearchParams(window.location.search);
      }
    } catch (error) {
      return { error: 'invalid' };
    }

    var rawPlate = params.get('plate');
    var rawPhone = params.get('phone');
    if (!rawPlate || !rawPhone) {
      return { error: 'missing' };
    }

    var plate = CM.normalizePlate(rawPlate);
    var phone = CM.normalizePhone(rawPhone);
    if (!CM.isValidPlate(plate) || !CM.isValidPhone(phone)) {
      return { error: 'invalid' };
    }

    return {
      data: {
        plate: plate,
        phone: phone,
        owner: CM.clampText(params.get('name') || params.get('owner') || '', 12),
        note: CM.clampText(params.get('note') || '', 40)
      }
    };
  }

  function render() {
    var data = state.data;
    els.plateText.textContent = displayPlate(data.plate);

    if (data.owner) {
      els.ownerLine.hidden = false;
      els.ownerText.textContent = data.owner;
    } else {
      els.ownerLine.hidden = true;
    }

    if (data.note) {
      els.noteBlock.hidden = false;
      els.noteText.textContent = data.note;
    } else {
      els.noteBlock.hidden = true;
    }

    els.callBtn.href = 'tel:+86' + data.phone;
    renderPhone();
    selectTemplate(0);
  }

  function bindEvents() {
    els.revealBtn.addEventListener('click', function () {
      state.revealed = !state.revealed;
      renderPhone();
    });

    els.copyBtn.addEventListener('click', function () {
      CM.copyText(state.data.phone).then(function (ok) {
        if (ok) CM.toast('手机号已复制', 'success');
        else CM.toast('复制失败，请长按号码手动复制', 'error');
      });
    });

    els.vcardBtn.addEventListener('click', downloadVcard);

    els.smsChips.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-template]');
      if (!chip) return;
      var index = Number(chip.getAttribute('data-template'));
      if (!TEMPLATES[index]) return;
      selectTemplate(index);
    });
  }

  function renderPhone() {
    var phone = state.data.phone;
    els.phoneText.textContent = state.revealed ? CM.formatPhone(phone) : CM.maskPhone(phone);
    els.revealBtn.setAttribute('aria-pressed', state.revealed ? 'true' : 'false');
    els.revealBtn.setAttribute('aria-label', state.revealed ? '隐藏完整号码' : '显示完整号码');
    els.revealBtn.setAttribute('title', state.revealed ? '隐藏完整号码' : '显示完整号码');
  }

  function selectTemplate(index) {
    state.templateIndex = index;
    var message = TEMPLATES[index](state.data.plate);
    els.smsPreviewText.textContent = message;
    els.smsBtn.href = 'sms:+86' + state.data.phone + '?body=' + encodeURIComponent(message);

    var chips = els.smsChips.querySelectorAll('[data-template]');
    Array.prototype.forEach.call(chips, function (chip) {
      var active = Number(chip.getAttribute('data-template')) === index;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

  }

  function downloadVcard() {
    var data = state.data;
    var displayName = data.owner ? '车主 ' + data.owner : '车主 ' + displayPlate(data.plate);
    var vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:;' + vcardEscape(data.owner || '车主') + ';;',
      'FN:' + vcardEscape(displayName),
      'ORG:CarMsg',
      'TEL;TYPE=CELL:+86' + data.phone,
      'NOTE:' + vcardEscape('通过 CarMsg 挪车码保存，' + displayPlate(data.plate)),
      'END:VCARD'
    ].join('\r\n');

    var blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    CM.downloadBlob(blob, 'CarMsg_' + CM.sanitizeFilename(displayPlate(data.plate)) + '.vcf');
    CM.toast('联系人名片已下载', 'success');
  }

  function vcardEscape(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function displayPlate(plate) {
    if (!plate) return '';
    return plate.length > 2 ? plate.slice(0, 2) + '·' + plate.slice(2) : plate;
  }

  function showError(reason) {
    state.data = null;
    els.contactCard.hidden = true;
    els.errorCard.hidden = false;
    document.title = '挪车码无效 · CarMsg';
    if (reason === 'missing') {
      els.errorText.textContent = '链接可能被截断，缺少车牌号或手机号。请让车主重新生成一张挪车码。';
    } else if (reason === 'invalid') {
      els.errorText.textContent = '链接中的车牌号或手机号格式不正确，可能是复制时出现了错误。';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
