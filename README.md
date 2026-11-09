# CarMsg 挪车码

隐私优先的纯静态挪车二维码生成器。在线使用：[parking.404x.io](https://parking.404x.io)

车主填写车牌与手机号，生成可下载或打印的车贴；扫码者可一键拨号、发送预设短信或保存联系人。所有内容在浏览器本地生成，没有后端、账号和统计脚本。

## 功能

- **全球手机号**：先选国家/地区（默认中国），支持搜索国家名、代码或区号；按国家校验号码，自动格式化为 E.164。
- **全球车牌**：车牌与手机号可分别选择国家/地区。中国车牌保留省级简称、城市归属识别和新能源 8 位支持；其他地区使用通用字符与长度校验，避免因格式差异误拦截。
- **多语言车贴**：车贴、打印页和扫码页使用同一语言，支持 English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español、Português、Italiano、Русский、العربية（RTL）。
- **主页面中英文切换**：右上角「中 / EN」切换生成器界面（默认中文，选择会记住）；车贴输出语言仍由预览区单独设置。
- **默认英文，可选自动**：首次生成默认 English；选择「自动 · 跟随车牌」时按车牌国家匹配支持的语言（如中国→中文、日本→日文、德国→德文），没有对应语言时回退英文。
- **成品输出**：1200 × 1600 PNG 车贴、A4 三联打印版、仅二维码 PNG，5 种二维码配色。
- **扫码页**：一键拨号、4 条短信模板、复制号码、下载 vCard、号码默认脱敏。
- **本地记录**：最近 6 条保存在 `localStorage`，可一键清空。
- **离线与主题**：Service Worker 缓存应用外壳，深浅色主题跟随系统或手动切换。

## 隐私

- 联系信息放在 URL 的 `#` 之后（如 `view.html#v=1&plate=...&phone=...&lang=en`），浏览器不会把 hash 发送给服务器。
- 旧版 `view.html?plate=...&phone=...` 链接仍可打开。
- 不加载统计、广告、外部字体或 CDN 资源；第三方 JS 全部自托管。
- 二维码本身包含可解码的号码。建议使用备用号码，并像保管名片一样保管车贴。

## 目录

```text
.
├── index.html                 # 生成器
├── view.html                  # 扫码后的联系页
├── 404.html
├── assets/
│   ├── css/{base,index,view}.css
│   ├── js/
│   │   ├── theme.js           # 首屏主题
│   │   ├── qrcode.js          # qrcode-generator
│   │   ├── libphonenumber.js  # 全球号码校验
│   │   ├── countries.js       # 国家/地区、区号、语言、车牌示例
│   │   ├── i18n.js            # 车贴与扫码页文案
│   │   ├── plate-data.js      # 中国省市号牌数据
│   │   ├── common.js          # 车牌、号码、存储、主题等公共逻辑
│   │   ├── qr-render.js       # 二维码、车贴、打印绘制
│   │   ├── country-picker.js  # 可搜索国家选择器
│   │   ├── app.js
│   │   └── view.js
│   ├── icons/
│   └── og-cover.png
├── manifest.webmanifest
├── sw.js
└── THIRD_PARTY_NOTICES.md
```

## 本地运行

没有构建步骤，启动静态服务器即可：

```bash
python3 -m http.server 8765
# 或
npx serve .
```

打开 <http://127.0.0.1:8765/>。请勿直接双击 `index.html`，`file://` 下 Service Worker 和剪贴板可能不可用。

## 部署

当前使用 GitHub Pages + 自定义域名 `parking.404x.io`。推送到 `main` 后自动发布；页面资源使用相对路径。`404.html` 使用根路径资源，若部署到子目录需同步调整。

修改 CSS / JS 后请递增 `sw.js` 中的 `CACHE_VERSION`（如 `carmsg-v12` → `carmsg-v13`），避免旧缓存长期生效。

## 常用修改

| 想改什么 | 位置 |
| --- | --- |
| 文案与页面结构 | `index.html` / `view.html` |
| 主题色、圆角、阴影 | `assets/css/base.css` 顶部变量 |
| 二维码配色 | `index.html` 的 `.swatch` 与 `assets/js/app.js` 的 `ACCENTS` |
| 国家、区号、语言映射 | `assets/js/countries.js` |
| 多语言文案 | `assets/js/i18n.js` |
| 短信模板 | `assets/js/i18n.js` 的 `sms.t0`–`sms.t3` |
| 车贴 PNG 排版 | `assets/js/qr-render.js` 的 `drawPoster()` |
| 打印排版 | `assets/css/index.css` 的 `@media print` |

## 兼容性

现代 Chrome、Edge、Firefox、Safari。使用 `<dialog>`、`color-mix()`、`backdrop-filter` 等现代特性；旧浏览器会降级，不影响二维码生成与核心操作。

## 第三方

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)（MIT）
- [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js)（MIT）
- [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)（MIT）
- 中国车牌归属地数据整理自[维基百科](https://zh.wikipedia.org/wiki/中华人民共和国民用机动车号牌)（CC BY-SA 4.0）

完整许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
