/* Shared helpers for CarMsg pages. No third-party code, no network calls. */
(function () {
  'use strict';

  var PROVINCES = {
    京: '北京', 津: '天津', 沪: '上海', 渝: '重庆', 冀: '河北', 豫: '河南',
    云: '云南', 辽: '辽宁', 黑: '黑龙江', 湘: '湖南', 皖: '安徽', 鲁: '山东',
    新: '新疆', 苏: '江苏', 浙: '浙江', 赣: '江西', 鄂: '湖北', 桂: '广西',
    甘: '甘肃', 晋: '山西', 蒙: '内蒙古', 陕: '陕西', 吉: '吉林', 闽: '福建',
    贵: '贵州', 粤: '广东', 青: '青海', 藏: '西藏', 川: '四川', 宁: '宁夏',
    琼: '海南'
  };

  var PLATE_REGIONS = window.CM_PLATE_REGIONS || { provinces: PROVINCES, cities: {} };

  var CN_PLATE_RE = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}$/;
  var PHONE_RE = /^1[3-9]\d{9}$/;

  /* Examples are shown in the phone field. They are valid, format-only samples. */
  var PHONE_EXAMPLES = {
    CN: '13800138000', US: '4155551234', CA: '6045551234', GB: '07911123456',
    AU: '0412345678', NZ: '0211234567', IE: '0851234567', JP: '09012345678',
    KR: '01012345678', SG: '91234567', HK: '91234567', MO: '66123456',
    TW: '0912345678', DE: '015123456789', FR: '0612345678', IT: '3123456789',
    ES: '612345678', PT: '912345678', NL: '612345678', BE: '0470123456',
    CH: '0791234567', AT: '06641234567', SE: '0701234567', NO: '40123456',
    DK: '20123456', FI: '0401234567', PL: '512345678', CZ: '601123456',
    GR: '6912345678', TR: '05012345678', RU: '89123456789', UA: '0501234567',
    BR: '11987654321', MX: '5512345678', AR: '91123456789', CL: '912345678',
    CO: '3123456789', PE: '912345678', IN: '9876543210', PK: '03001234567',
    BD: '01712345678', LK: '0712345678', NP: '9812345678', AE: '0501234567',
    SA: '0512345678', QA: '33123456', KW: '50123456', BH: '36123456',
    OM: '91234567', IL: '0501234567', EG: '01001234567', ZA: '0821234567',
    NG: '08021234567', KE: '0712345678', GH: '0241234567', TH: '0812345678',
    MY: '0123456789', ID: '08123456789', VN: '0912345678', PH: '09171234567'
  };

  function phoneLib() {
    return window.libphonenumber || null;
  }

  function countryOf(code) {
    return (window.CM_COUNTRY_MAP || {})[code] || null;
  }

  function dialOf(code) {
    var country = countryOf(code);
    return country ? country.dial : '';
  }

  function plateExample(code) {
    var country = countryOf(code);
    return country ? country.plateExample : '';
  }

  var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function uiText(key, vars) {
    var i18n = window.CarMsgI18N;
    return i18n && typeof i18n.ui === 'function' ? i18n.ui(key, vars) : '';
  }

  function uiLang() {
    var i18n = window.CarMsgI18N;
    if (i18n && typeof i18n.siteLang === 'function') return i18n.siteLang();
    return document.documentElement.getAttribute('data-ui-lang') === 'en' ? 'en' : 'zh';
  }

  function normalizePlate(value, countryCode) {
    if (!countryCode || countryCode === 'CN') {
      return toHalfWidth(value)
        .replace(/[\s·•.\-]/g, '')
        .toUpperCase();
    }
    var text = toHalfWidth(value).toUpperCase();
    try {
      text = text.replace(/[^\p{L}\p{N}\s\-·./]/gu, '');
    } catch (error) {
      text = text.replace(/[^A-Z0-9\s\-·./]/g, '');
    }
    text = text.replace(/\s+/g, ' ').trim();
    var characters = Array.from(text);
    if (characters.length > 20) text = characters.slice(0, 20).join('');
    return text;
  }

  function isValidPlate(plate, countryCode) {
    if (!plate) return false;
    if (!countryCode || countryCode === 'CN') return CN_PLATE_RE.test(plate);
    var significant = plate;
    try {
      significant = plate.replace(/[^\p{L}\p{N}]/gu, '');
    } catch (error) {
      significant = plate.replace(/[^A-Z0-9]/g, '');
    }
    var length = Array.from(significant).length;
    return length >= 1 && length <= 12;
  }

  function normalizePhone(value) {
    return toHalfWidth(value).replace(/\D/g, '').slice(0, 18);
  }

  function safeFormat(parsed, kind) {
    try {
      return kind === 'national' ? parsed.formatNational() : parsed.formatInternational();
    } catch (error) {
      return parsed.number || '';
    }
  }

  function phoneInfo(value, countryCode) {
    var raw = toHalfWidth(value).trim();
    if (!raw) return null;
    var country = countryCode || 'CN';
    var dial = dialOf(country);
    var international = /^(\+|00)/.test(raw);
    var digits = raw.replace(/\D/g, '');
    if (international && raw.indexOf('00') === 0) digits = digits.slice(2);
    if (digits.length > 18) return null;

    var lib = phoneLib();
    if (!lib) {
      if ((country === 'CN' || international) && PHONE_RE.test(digits)) {
        var grouped = digits.slice(0, 3) + ' ' + digits.slice(3, 7) + ' ' + digits.slice(7);
        return {
          valid: true,
          e164: '+86' + digits,
          national: digits,
          country: 'CN',
          callingCode: '86',
          formatted: '+86 ' + grouped,
          formattedNational: grouped
        };
      }
      return null;
    }

    var parsed = null;
    var valid = false;
    try {
      if (international) {
        parsed = lib.parsePhoneNumberFromString('+' + digits);
        valid = !!(parsed && parsed.isValid());
      } else {
        parsed = lib.parsePhoneNumberFromString(digits, country);
        valid = !!(parsed && parsed.isValid());
        /* A pasted number may include the country code without a leading +. */
        if (!valid) {
          var withCode = lib.parsePhoneNumberFromString('+' + digits);
          if (withCode && withCode.isValid() && withCode.country === country) {
            parsed = withCode;
            valid = true;
          }
        }
      }
    } catch (error) {
      parsed = null;
      valid = false;
    }
    if (!parsed) return null;

    return {
      valid: valid,
      e164: parsed.number || '',
      national: parsed.nationalNumber || '',
      country: parsed.country || country,
      callingCode: parsed.countryCallingCode || dial,
      formatted: valid ? safeFormat(parsed) : '',
      formattedNational: valid ? safeFormat(parsed, 'national') : ''
    };
  }

  function detectPhone(value) {
    var raw = String(value || '').trim();
    if (!/^(\+|00)/.test(raw)) return null;
    var info = phoneInfo(raw, null);
    return info && info.valid && info.country ? info : null;
  }

  function isValidPhone(phone, countryCode) {
    var info = phoneInfo(phone, countryCode || 'CN');
    return !!(info && info.valid);
  }

  function formatPhone(phone, countryCode) {
    var info = phoneInfo(phone, countryCode || 'CN');
    if (info && info.valid) return info.formatted || info.formattedNational;
    var digits = normalizePhone(phone);
    if (digits.length === 11) {
      return digits.slice(0, 3) + ' ' + digits.slice(3, 7) + ' ' + digits.slice(7);
    }
    return digits;
  }

  function maskPhone(phone, countryCode) {
    var info = phoneInfo(phone, countryCode || 'CN');
    if (!info) return normalizePhone(phone);
    var national = info.national || '';
    var length = national.length;
    if (!length) return '';
    var front;
    var back;
    if (length >= 9) {
      front = 3;
      back = 4;
    } else if (length >= 7) {
      front = 2;
      back = 3;
    } else if (length >= 4) {
      front = 1;
      back = 2;
    } else {
      front = 0;
      back = 1;
    }
    var hidden = length - front - back;
    if (hidden < 1) {
      front = Math.max(0, Math.floor(length / 2));
      back = Math.max(1, length - front - 1);
      hidden = Math.max(0, length - front - back);
    }
    var masked = national.slice(0, front) +
      (hidden > 0 ? ' ' + new Array(hidden + 1).join('*') + ' ' : '') +
      national.slice(length - back);
    return '+' + (info.callingCode || dialOf(countryCode)) + ' ' + masked;
  }

  function phoneExample(countryCode) {
    var raw = PHONE_EXAMPLES[countryCode];
    if (!raw) return '';
    var info = phoneInfo(raw, countryCode);
    return info && info.valid ? (info.formattedNational || info.national) : '';
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function toHalfWidth(value) {
    return String(value || '').replace(/[\uFF01-\uFF5E]/g, function (character) {
      return String.fromCharCode(character.charCodeAt(0) - 0xFEE0);
    });
  }

  function regionOf(plate) {
    var value = String(plate || '');
    var provinceCode = value.charAt(0);
    var cityCode = value.charAt(1).toUpperCase();
    var provinces = PLATE_REGIONS.provinces || {};
    var entry = provinces[provinceCode];
    if (!entry) return null;
    var province = typeof entry === 'string' ? entry : entry.name;
    if (!province) return null;
    if (entry && entry.municipality) {
      return { province: province, city: '', label: province };
    }
    var city = ((PLATE_REGIONS.cities || {})[provinceCode] || {})[cityCode] || '';
    return {
      province: province,
      city: city,
      label: city ? province + ' · ' + city : province
    };
  }

  function provinceOf(plate) {
    var region = regionOf(plate);
    return region ? region.province : '';
  }

  function clampText(value, max) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    if (typeof Array.from === 'function') {
      return Array.from(text).slice(0, max).join('');
    }
    return text.slice(0, max);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  var storage = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        /* ignore */
      }
    }
  };

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  var TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.3 2.3 4.7-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16.2h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/></svg>'
  };

  var toastRegion = null;
  var toastTimer = null;

  function getToastRegion() {
    if (toastRegion) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'toast-region';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  function toast(message, type) {
    if (!message) return;
    var region = getToastRegion();
    region.textContent = '';
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    region.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, 2800);
  }

  var THEME_KEY = 'carmsg:theme';

  function applyTheme(theme, persist, source) {
    var next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.setAttribute('data-theme-source', source || (persist ? 'manual' : 'auto'));
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        /* ignore */
      }
    }
    var meta = document.getElementById('metaThemeColor');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#070b14' : '#f5f7fb');
    $$('[data-theme-toggle]').forEach(function (button) {
      var dark = next === 'dark';
      var label = dark
        ? button.getAttribute('data-theme-label-light')
        : button.getAttribute('data-theme-label-dark');
      if (!label) label = uiText(dark ? 'theme.light' : 'theme.dark');
      if (!label) label = dark ? '切换到浅色模式' : '切换到深色模式';
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
    return next;
  }

  function setupTheme() {
    var source = document.documentElement.getAttribute('data-theme-source') || 'auto';
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light', false, source);
    $$('[data-theme-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        var next = applyTheme(current === 'dark' ? 'light' : 'dark', true);
        button.classList.remove('is-turning');
        void button.offsetWidth;
        button.classList.add('is-turning');
        if (next) {
          /* The animation class is intentionally short-lived. */
          setTimeout(function () { button.classList.remove('is-turning'); }, 460);
        }
      });
    });
    if (window.matchMedia) {
      var query = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (event) {
        if (document.documentElement.getAttribute('data-theme-source') === 'auto') {
          applyTheme(event.matches ? 'dark' : 'light', false);
        }
      };
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  function setupHeader() {
    var header = $('.site-header');
    if (!header) return;
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  var offlineBanner = null;

  function offlineLabel() {
    return uiText('offline.text') || '当前离线，二维码仍可正常生成';
  }

  function refreshOfflineText() {
    if (!offlineBanner) return;
    var text = offlineBanner.querySelector('span');
    if (text) text.textContent = offlineLabel();
  }

  function setOnlineState(online) {
    if (!offlineBanner) {
      offlineBanner = document.createElement('div');
      offlineBanner.className = 'offline-banner';
      offlineBanner.setAttribute('role', 'status');
      offlineBanner.setAttribute('aria-live', 'polite');
      offlineBanner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5.5 12.3a10 10 0 0 1 13 0"/><path d="M9 15.8a5 5 0 0 1 6 0"/><path d="M12 19.2h.01"/><path d="m3 3 18 18"/></svg><span></span>';
      document.body.appendChild(offlineBanner);
      refreshOfflineText();
    }
    offlineBanner.classList.toggle('is-visible', !online);
  }

  function setupConnectivity() {
    setOnlineState(navigator.onLine);
    window.addEventListener('online', function () {
      setOnlineState(true);
      toast(uiText('toast.online') || '网络已恢复', 'success');
    });
    window.addEventListener('offline', function () {
      setOnlineState(false);
    });
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    window.addEventListener('load', function () {
      var swUrl;
      try {
        swUrl = new URL('sw.js', document.baseURI).href;
      } catch (error) {
        swUrl = 'sw.js';
      }
      navigator.serviceWorker.register(swUrl).catch(function () {
        /* Offline support is a bonus, never a blocker. */
      });
    });
  }

  function setupReveal() {
    document.documentElement.classList.add('reveal-ready');
    var items = $$('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      items.forEach(function (item) { item.classList.add('is-in'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });
    items.forEach(function (item) { observer.observe(item); });
  }

  function setupYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function timeAgo(timestamp) {
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    var now = new Date();
    var diff = now.getTime() - date.getTime();
    if (diff < 60 * 1000) return uiText('time.justNow') || '刚刚';
    if (diff < 60 * 60 * 1000) {
      return uiText('time.minutes', { n: Math.floor(diff / 60000) }) ||
        (Math.floor(diff / 60000) + ' 分钟前');
    }
    var clock = pad(date.getHours()) + ':' + pad(date.getMinutes());
    var sameDay = now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();
    if (sameDay) {
      return uiText('time.today', { time: clock }) || ('今天 ' + clock);
    }
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()) {
      return uiText('time.yesterday', { time: clock }) || ('昨天 ' + clock);
    }
    var month = uiLang() === 'en' ? MONTHS_EN[date.getMonth()] : (date.getMonth() + 1);
    if (now.getFullYear() === date.getFullYear()) {
      return uiText('time.monthDay', { month: month, day: date.getDate() }) ||
        ((date.getMonth() + 1) + '月' + date.getDate() + '日');
    }
    return uiText('time.yearMonthDay', {
      year: date.getFullYear(),
      month: month,
      day: date.getDate()
    }) || (date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日');
  }

  function pad(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function sanitizeFilename(name) {
    return String(name || 'carmsg')
      .replace(/[\\/:*?"<>|\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'carmsg';
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupTheme();
    setupHeader();
    setupConnectivity();
    setupServiceWorker();
    setupReveal();
    setupYear();
  });

  window.CarMsg = {
    $: $,
    $$: $$,
    PROVINCES: PROVINCES,
    normalizePlate: normalizePlate,
    isValidPlate: isValidPlate,
    plateExample: plateExample,
    normalizePhone: normalizePhone,
    phoneInfo: phoneInfo,
    detectPhone: detectPhone,
    phoneExample: phoneExample,
    isValidPhone: isValidPhone,
    formatPhone: formatPhone,
    maskPhone: maskPhone,
    countryOf: countryOf,
    dialOf: dialOf,
    provinceOf: provinceOf,
    regionOf: regionOf,
    clampText: clampText,
    debounce: debounce,
    storage: storage,
    copyText: copyText,
    downloadBlob: downloadBlob,
    toast: toast,
    timeAgo: timeAgo,
    sanitizeFilename: sanitizeFilename,
    refreshThemeLabels: function () {
      applyTheme(
        document.documentElement.getAttribute('data-theme') || 'light',
        false,
        document.documentElement.getAttribute('data-theme-source') || 'auto'
      );
    },
    refreshOfflineText: refreshOfflineText
  };
})();
