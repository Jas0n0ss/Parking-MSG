/* Canvas rendering for the QR code, the shareable card and the printable tag. */
(function () {
  'use strict';

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  var BRAND_FROM = '#3b82f6';
  var BRAND_TO = '#0e7490';

  function addRoundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    addRoundRect(ctx, x, y, width, height, radius);
  }

  function hexToRgb(hex) {
    var value = String(hex || '').replace('#', '');
    if (value.length === 3) {
      value = value.split('').map(function (character) { return character + character; }).join('');
    }
    if (value.length !== 6) return { r: 15, g: 23, b: 42 };
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgba(hex, alpha) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
  }

  function shade(hex, amount) {
    var rgb = hexToRgb(hex);
    var factor = Math.max(0, Math.min(1, 1 + amount));
    var toHex = function (channel) {
      return Math.round(Math.max(0, Math.min(255, channel * factor)))
        .toString(16)
        .padStart(2, '0');
    };
    return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }

  function drawCarGlyph(ctx, cx, cy, radius, color, lineWidth) {
    var r = radius;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth || Math.max(1.5, r * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* roof */
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.02);
    ctx.lineTo(-r * 0.29, -r * 0.28);
    ctx.quadraticCurveTo(-r * 0.23, -r * 0.42, -r * 0.05, -r * 0.42);
    ctx.lineTo(r * 0.05, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.23, -r * 0.42, r * 0.29, -r * 0.28);
    ctx.lineTo(r * 0.4, r * 0.02);
    ctx.stroke();

    /* body */
    roundRect(ctx, -r * 0.52, -r * 0.08, r * 1.04, r * 0.5, r * 0.14);
    ctx.stroke();

    /* headlights */
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.12);
    ctx.lineTo(-r * 0.22, r * 0.12);
    ctx.moveTo(r * 0.22, r * 0.12);
    ctx.lineTo(r * 0.38, r * 0.12);
    ctx.stroke();

    /* wheels */
    ctx.beginPath();
    ctx.arc(-r * 0.32, r * 0.46, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.32, r * 0.46, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBrandMark(ctx, x, y, size) {
    var gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, BRAND_FROM);
    gradient.addColorStop(0.55, '#1d4ed8');
    gradient.addColorStop(1, BRAND_TO);
    ctx.save();
    ctx.shadowColor = 'rgba(37, 99, 235, 0.28)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.1;
    roundRect(ctx, x, y, size, size, size * 0.28);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    drawCarGlyph(ctx, x + size / 2, y + size / 2, size * 0.27, '#ffffff', Math.max(1.5, size * 0.045));
  }

  function drawFinder(ctx, x, y, cell, color) {
    var outer = cell * 7;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, outer, outer, cell * 1.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + cell, y + cell, cell * 5, cell * 5, cell * 1);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.62);
    ctx.fill();
  }

  function renderQR(canvas, text, options) {
    var opts = options || {};
    var size = opts.size || 900;
    var color = opts.color || '#0f172a';
    var logo = opts.logo !== false;

    var qr = window.qrcode(0, 'H');
    qr.addData(text);
    qr.make();

    var count = qr.getModuleCount();
    var quiet = 4;
    var total = count + quiet * 2;
    var cell = Math.floor(size / total);
    var drawn = cell * total;
    var offset = Math.floor((size - drawn) / 2);

    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    var radius = Math.max(1, cell * 0.26);

    /* Regular modules, skipping the three finder patterns. */
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var row = 0; row < count; row += 1) {
      for (var col = 0; col < count; col += 1) {
        if (!qr.isDark(row, col)) continue;
        var isFinder =
          (row < 7 && col < 7) ||
          (row < 7 && col >= count - 7) ||
          (row >= count - 7 && col < 7);
        if (isFinder) continue;
        var x = offset + (col + quiet) * cell;
        var y = offset + (row + quiet) * cell;
        addRoundRect(ctx, x, y, cell, cell, radius);
      }
    }
    ctx.fill();

    drawFinder(ctx, offset + quiet * cell, offset + quiet * cell, cell, color);
    drawFinder(ctx, offset + quiet * cell + (count - 7) * cell, offset + quiet * cell, cell, color);
    drawFinder(ctx, offset + quiet * cell, offset + quiet * cell + (count - 7) * cell, cell, color);

    if (logo) {
      var diameter = size * 0.224;
      var cx = size / 2;
      var cy = size / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.2)';
      ctx.shadowBlur = size * 0.014;
      ctx.shadowOffsetY = size * 0.006;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, diameter * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      var gradient = ctx.createLinearGradient(cx - diameter / 2, cy - diameter / 2, cx + diameter / 2, cy + diameter / 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, shade(color, -0.32));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
      ctx.fill();

      drawCarGlyph(ctx, cx, cy, diameter * 0.3, '#ffffff', Math.max(1.5, diameter * 0.048));
    }

    canvas.setAttribute('role', 'img');
    if (!canvas.getAttribute('aria-label')) {
      canvas.setAttribute('aria-label', '包含车主联系方式的二维码');
    }
    return canvas;
  }

  function createQrCanvas(text, options) {
    var canvas = document.createElement('canvas');
    return renderQR(canvas, text, options);
  }

  function drawPoster(canvas, data) {
    var width = 1200;
    var height = 1600;
    var accent = data.accent || '#1d4ed8';
    var plate = data.plate || '';
    var plateDisplay = plate.length > 2 ? plate.slice(0, 2) + '·' + plate.slice(2) : plate;
    var owner = data.owner || '';
    var note = data.note || '临时停靠，请多包涵';

    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');

    /* background */
    ctx.fillStyle = '#f6f8ff';
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(180, 60, 0, 180, 60, 760);
    glow.addColorStop(0, rgba(accent, 0.16));
    glow.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    var glow2 = ctx.createRadialGradient(1080, 1480, 0, 1080, 1480, 620);
    glow2.addColorStop(0, 'rgba(14, 116, 144, 0.1)');
    glow2.addColorStop(1, 'rgba(14, 116, 144, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    /* tiny dot texture, only a hint of it */
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.045)';
    for (var dotX = 40; dotX < width; dotX += 36) {
      for (var dotY = 40; dotY < height; dotY += 36) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    /* cut guide */
    ctx.save();
    ctx.strokeStyle = rgba(accent, 0.28);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 14]);
    roundRect(ctx, 44, 44, width - 88, height - 88, 40);
    ctx.stroke();
    ctx.restore();

    /* brand row */
    drawBrandMark(ctx, 110, 105, 78);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 42px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CarMsg', 206, 148);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 21px ' + FONT;
    ctx.fillText('挪车码 · 扫码联系车主', 207, 178);

    /* privacy chip */
    ctx.save();
    ctx.fillStyle = rgba(accent, 0.09);
    roundRect(ctx, 900, 112, 190, 54, 27);
    ctx.fill();
    ctx.fillStyle = shade(accent, -0.08);
    ctx.font = '600 21px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('本地生成，不上传', 995, 146);
    ctx.restore();

    /* card */
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 26;
    roundRect(ctx, 90, 250, 1020, 1190, 46);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.07)';
    ctx.lineWidth = 2;
    roundRect(ctx, 91, 251, 1018, 1188, 45);
    ctx.stroke();
    ctx.restore();

    /* card header */
    ctx.textAlign = 'center';
    ctx.fillStyle = shade(accent, -0.12);
    ctx.font = '700 22px ' + FONT;
    ctx.fillText('临 时 停 靠 ， 扫 码 联 系 车 主', 600, 334);

    /* QR panel */
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    roundRect(ctx, 315, 372, 570, 570, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.07)';
    ctx.lineWidth = 2;
    roundRect(ctx, 316, 373, 568, 568, 33);
    ctx.stroke();
    ctx.restore();

    if (data.qrCanvas) {
      ctx.drawImage(data.qrCanvas, 340, 397, 520, 520);
    }

    /* plate badge */
    var plateText = plateDisplay;
    var plateFont = 70;
    ctx.font = '800 ' + plateFont + 'px ' + FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    var plateWidth = Math.max(400, Math.min(820, ctx.measureText(plateText).width + 128));
    var plateHeight = 128;
    var plateX = (width - plateWidth) / 2;
    var plateY = 1002;

    var plateGradient = ctx.createLinearGradient(plateX, plateY, plateX + plateWidth, plateY + plateHeight);
    plateGradient.addColorStop(0, '#1e40af');
    plateGradient.addColorStop(1, '#1d4ed8');

    ctx.save();
    ctx.shadowColor = 'rgba(30, 64, 175, 0.3)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, plateX, plateY, plateWidth, plateHeight, 18);
    ctx.fillStyle = plateGradient;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    roundRect(ctx, plateX + 8, plateY + 8, plateWidth - 16, plateHeight - 16, 13);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
    ctx.fillText(plateText, width / 2 + 2, plateY + plateHeight / 2 + 4);
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    /* owner + note */
    var ownerText = owner ? '车主：' + owner : '扫码后即可联系车主';
    ctx.fillStyle = '#475569';
    ctx.font = '600 31px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(ownerText, width / 2, 1184);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 27px ' + FONT;
    var noteLines = wrapText(ctx, note, 820, 2);
    for (var i = 0; i < noteLines.length; i += 1) {
      ctx.fillText(noteLines[i], width / 2, 1230 + i * 38);
    }

    /* divider */
    ctx.save();
    var lineGradient = ctx.createLinearGradient(240, 0, 960, 0);
    lineGradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
    lineGradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.12)');
    lineGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = lineGradient;
    ctx.fillRect(240, 1308, 720, 2);
    ctx.restore();

    /* instruction */
    ctx.fillStyle = '#0f172a';
    ctx.font = '750 37px ' + FONT;
    ctx.fillText('扫码联系车主，一键挪车', width / 2, 1372);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 24px ' + FONT;
    ctx.fillText('微信 / 相机 / 支付宝 扫码均可', width / 2, 1415);

    /* footer */
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px ' + FONT;
    ctx.fillText('CarMsg 挪车码 / car.msfts.org', width / 2, 1524);

    return canvas;
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    var characters = String(text || '').split('');
    var lines = [];
    var line = '';
    for (var i = 0; i < characters.length; i += 1) {
      var test = line + characters[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = characters[i];
        if (lines.length === maxLines) {
          var last = lines[maxLines - 1];
          while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
            last = last.slice(0, -1);
          }
          lines[maxLines - 1] = last + '…';
          return lines;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }

  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('Canvas export failed'));
      }, type || 'image/png', quality);
    });
  }

  window.CarMsgQR = {
    renderQR: renderQR,
    createQrCanvas: createQrCanvas,
    drawPoster: drawPoster,
    drawBrandMark: drawBrandMark,
    toBlob: toBlob
  };
})();
