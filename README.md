# CarMsg 挪车码

> 一张二维码，让挪车更从容。
> A privacy-first, serverless QR code generator for contacting a car owner.

线上地址：[car.msfts.org](https://car.msfts.org)

CarMsg 是一个纯静态的挪车二维码生成器。车主填写车牌和手机号后，会得到一张可以下载、打印的车贴；访客扫码即可一键拨号、发送预设挪车短信，或把车主保存为联系人。

整个生成过程都在浏览器本地完成，没有后端、没有账号、没有统计脚本，也不加载任何第三方字体或 CDN 资源。

---

## 功能亮点

### 生成端

- **实时预览**：车牌、手机号校验通过后自动生成二维码，边输入边看效果。
- **车牌识别**：支持 31 个省级行政区号牌与 8 位新能源车牌，自动识别到省 + 城市（地级市 / 自治州 / 地区，例如 `广东省 · 深圳市`）。
- **手机号校验**：11 位手机号格式校验，错误提示和成功状态清晰可见。
- **常用留言**：8 个快捷预设（马上就走、10 分钟内、车上有小孩/老人、未接请短信等），点选即可填入。
- **二维码配色**：曜石黑、深海蓝、暮光紫、松林绿、胭脂红 5 种配色，选择会记住。
- **高清车贴 PNG**：1200 × 1600 的成品车贴，包含品牌、车牌、车主称呼、留言和扫码提示。
- **A4 打印**：一键打印 3 张 190 × 82 mm 车贴，带虚线裁切框，二维码使用 900 px 原图，打印清晰。
- **最近生成**：最近 6 条记录只保存在浏览器 `localStorage`，可一键清空。
- **移动端悬浮操作条**：手机上预览不在视野内时，底部出现「预览 / 下载」快捷条；滚动到预览、共享操作条或聚焦表单时自动隐藏。
- **深浅色主题**：跟随系统，也可以手动切换并记住选择。
- **离线可用**：Service Worker 缓存应用外壳，断网时仍可生成二维码。
- **PWA**：支持添加到主屏幕，带应用图标与快捷入口。

### 扫码端

- **大字号车牌**：模拟蓝色车牌样式，扫一眼就能确认车辆。
- **一键拨号**：超大拨号按钮，直接调用系统电话。
- **快捷短信**：4 种预设文案（挡住我了 / 占用车位 / 车窗未关 / 车灯未关），自动填好短信内容。
- **复制号码**：一键复制完整手机号。
- **保存联系人**：下载 `.vcf` 名片，直接存入通讯录。
- **隐私脱敏**：手机号默认显示为 `138 **** 5678`，点击眼睛才展开完整号码。
- **错误处理**：链接不完整、车牌或号码格式错误时，显示友好的错误页，不会白屏。
- **XSS 防护**：所有链接参数均通过 `textContent` 渲染，不拼接 HTML。

---

## 隐私设计

这个项目的核心原则是：**二维码里可以包含号码，但号码不该经过服务器。**

- 联系信息放在 URL 的 `#` 之后（`view.html#v=1&plate=...&phone=...`）。浏览器不会把 hash 发送给服务器，因此不会出现在静态托管平台的访问日志里。
- 旧版链接 `view.html?plate=...&phone=...` 仍然兼容，但新生成的二维码使用 hash。
- 页面不加载任何第三方脚本、统计、广告、外部字体或图标库。
- 「最近生成」只存在本机 `localStorage`，不参与任何同步。
- 扫码页设置 `noindex, nofollow`，并默认脱敏显示手机号。
- 二维码本身是可解码的。**请使用备用号码，并像保管名片一样保管车贴。**

---

## 目录结构

```text
.
├── index.html                 # 生成器首页
├── view.html                  # 扫码后的联系车主页
├── 404.html                   # 自定义 404
├── assets/
│   ├── css/
│   │   ├── base.css           # 设计系统、布局、通用组件
│   │   ├── index.css          # 生成器页面样式（含打印样式）
│   │   └── view.css           # 联系车主页 + 404 样式
│   ├── js/
│   │   ├── theme.js           # 首屏主题初始化，避免闪烁
│   │   ├── plate-data.js      # 省级 + 地级市车牌代码数据
│   │   ├── common.js          # 校验、存储、复制、Toast、主题等公共逻辑
│   │   ├── qrcode.js          # 内置 qrcode-generator（MIT）
│   │   ├── qr-render.js       # Canvas 二维码 / 海报 / 品牌图形绘制
│   │   ├── app.js             # 生成器交互
│   │   └── view.js            # 联系页交互
│   ├── icons/                 # PWA / Apple Touch 图标
│   ├── favicon.svg
│   └── og-cover.png           # 社交分享封面
├── manifest.webmanifest
├── sw.js                      # Service Worker
├── robots.txt
├── sitemap.xml
├── CNAME
├── .nojekyll                  # 告诉 GitHub Pages 跳过 Jekyll
├── THIRD_PARTY_NOTICES.md
└── README.md
```

---

## 本地运行

项目没有任何构建步骤，直接启动一个静态服务器即可：

```bash
# Python
python3 -m http.server 8765

# 或 Node
npx serve .
```

打开 <http://127.0.0.1:8765/>。

> 不要直接双击 `index.html`：`file://` 协议下 Service Worker 不会注册，剪贴板 API 也可能受限。其他功能仍可使用。
>
> 在本地生成的车贴二维码会指向 `localhost`，只适合本机 / 同一局域网测试；正式使用请部署到公网域名。

---

## 部署

当前使用 GitHub Pages + 自定义域名：

- `CNAME` 指向 `car.msfts.org`
- 推送到 `main` 分支后由 GitHub Pages 自动发布
- 主页面资源使用相对路径，部署到子目录也能正常工作
- `404.html` 使用根路径资源，以便在任意错误地址下都能正确加载样式；如果部署到子目录，请同步调整其中的 `/assets/...` 与 `/#...` 链接

### 修改静态资源后

`sw.js` 使用缓存优先 + 后台更新。修改 CSS / JS 后，请把 `CACHE_VERSION` 递增（例如 `carmsg-v3` → `carmsg-v4`），避免老用户长时间看到旧资源：

```js
const CACHE_VERSION = 'carmsg-v4';
```

---

## 常用自定义

| 想改什么 | 位置 |
| --- | --- |
| 品牌名、文案、页面结构 | `index.html` / `view.html` |
| 主题色、圆角、阴影 | `assets/css/base.css` 顶部 CSS 变量 |
| 二维码配色 | `index.html` 的 `.swatch` 与 `assets/js/app.js` 的 `ACCENTS` |
| 最近记录数量 | `assets/js/app.js` 中 `list.slice(0, 6)` |
| 短信模板 | `assets/js/view.js` 的 `TEMPLATES` |
| 打印排版 | `assets/css/index.css` 的 `@media print` |
| 车贴 PNG 排版 | `assets/js/qr-render.js` 的 `drawPoster()` |

---

## 兼容性

- 现代 Chrome / Edge / Firefox / Safari
- 使用 `backdrop-filter`、`color-mix()`、`aspect-ratio` 等现代 CSS；旧浏览器会降级为纯色背景，不影响核心功能
- 二维码使用 Canvas 绘制，支持高 DPI 屏幕与打印
- 已针对 390 px 手机、平板和 1440 px 桌面布局做适配

---

## 可访问性

- 语义化结构、跳过导航链接、清晰的焦点样式与 `aria-*` 状态。
- 表单错误就地提示并通过 `role="alert"` / `aria-describedby` 关联；二维码生成状态通过 live region 播报。
- 正文与表单辅助文字不小于 12px（车贴微缩预览按印刷比例缩放），主要触控目标不小于 24px；移动端底部操作条会为安全区与键盘焦点预留空间。
- 支持 `prefers-reduced-motion`；通过 axe-core WCAG A/AA 扫描（首页与联系页覆盖深浅色，404 覆盖浅色）。
- 已测试 320 / 375 / 390 / 768 / 1024 / 1440 宽度及 844 × 390 横屏。

---

## 致谢

- QR 编码基于 [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)（Kazuhiko Arase，MIT License），已内置到 `assets/js/qrcode.js`。
- 设计、文案与前端实现由 CarMsg 项目维护者完成。

---

如果这个项目帮你少打了一个电话、少吵了一架，欢迎点一个 Star。
