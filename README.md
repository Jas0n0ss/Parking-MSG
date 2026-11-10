# CarMsg 挪车码

隐私优先的纯静态挪车二维码生成器。在线使用：[parking.404x.io](https://parking.404x.io)

车主填写车牌与手机号，生成可下载或打印的车贴；扫码者可一键拨号、发送预设短信或保存联系人。所有内容在浏览器本地生成，没有后端、账号和统计脚本。

## 功能

- **全球手机号**：先选国家/地区（默认中国），支持搜索国家名、代码或区号；按国家校验号码，自动格式化为 E.164。
- **全球车牌**：车牌与手机号可分别选择国家/地区。中国车牌保留省级简称、城市归属识别和新能源 8 位支持；其他地区使用通用字符与长度校验，避免因格式差异误拦截。
- **多语言车贴**：车贴、打印页和扫码页使用同一语言，支持 English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español、Português、Italiano、Русский、العربية（RTL）。
- **主页面中英文切换**：右上角「中 / EN」切换生成器界面（默认中文，选择会记住）；车贴输出语言仍由预览区单独设置。
- **默认英文，可选自动**：首次生成默认 English；选择「自动 · 跟随车牌」时按车牌国家匹配支持的语言（如中国→中文、日本→日文、德国→德文），没有对应语言时回退英文。
- **成品输出**：1200 × 1600 PNG 车贴、A4 双联打印版（与下载 PNG 同款）、仅二维码 PNG，5 种二维码配色。
- **扫码页**：一键拨号、4 条短信模板、复制号码、下载 vCard、号码默认脱敏。
- **本地记录**：最近 6 条保存在 `localStorage`，可一键清空。
- **离线与主题**：Service Worker 缓存应用外壳，深浅色主题跟随系统或手动切换。

## 本地运行

没有构建步骤，启动静态服务器即可：

```bash
python3 -m http.server 8765
# 或
npx serve .
```

打开 <http://127.0.0.1:8765/>。请勿直接双击 `index.html`，`file://` 下 Service Worker 和剪贴板可能不可用。

## 第三方

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)（MIT）
- [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js)（MIT）
- [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)（MIT）
- 中国车牌归属地数据整理自[维基百科](https://zh.wikipedia.org/wiki/中华人民共和国民用机动车号牌)（CC BY-SA 4.0）

完整许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
