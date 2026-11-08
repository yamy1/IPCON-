# IPCON 耗材预设站

IPCON（ipcon 耗材）3D 打印切片器预设下载网站。纯静态站点，可直接部署到 **GitHub Pages**。

## 功能

- 按切片器 / 材料 / 打印机品牌 / 型号筛选
- 从 `index.json` 渲染预设列表
- 单文件 JSON 下载、多选 ZIP 打包下载（JSZip）
- 中英文切换（默认中文）
- 苯环主题视觉（高分子材料感）

## 目录结构

```
.
├── index.html              # 首页
├── style.css               # 样式
├── app.js                  # 前端逻辑
├── index.json              # 由脚本扫描 preset/ 生成
├── assets/                 # Logo / favicon（可替换正式图片）
├── scripts/
│   └── generate-index.js   # 扫描 preset/ → index.json
├── preset/                 # 预设文件
│   └── 材料/品牌/型号/切片器/文件.json
└── package.json
```

预设路径约定：

```text
preset/<材料>/<打印机品牌>/<打印机型号>/<切片器>/<文件名>.json
```

示例：

```text
preset/PLA/Bambu Lab/X1 Carbon/BambuStudio/IPCON_PLA_X1C.json
```

## 本地预览

需要 Node.js ≥ 18。

```bash
# 1. 扫描预设，生成 index.json
npm run generate-index

# 2. 启动静态服务器（推荐）
npm run preview
# 浏览器打开 http://localhost:4173
```

也可用任意静态服务器，例如：

```bash
python3 -m http.server 4173
# 或
npx serve -l 4173 .
```

> 注意：请用 HTTP 服务打开页面，不要直接用 `file://`，否则 `fetch('index.json')` 可能被浏览器拦截。

## 新增 / 更新预设

1. 按目录约定把 `.json` 放入 `preset/`
2. 运行：

```bash
npm run generate-index
```

3. 提交 `preset/` 与更新后的 `index.json`

`index.json` 字段说明：

| 字段 | 说明 |
|------|------|
| `materials` / `brands` / `models` / `slicers` | 筛选项去重列表 |
| `presets[]` | 每条预设的名称、路径、兼容机型、更新时间等 |

## 部署到 GitHub Pages

1. 仓库 Settings → Pages → Source 选 **Deploy from a branch**
2. Branch 选 `main`（或发布分支），文件夹选 `/ (root)`
3. 保存后访问：`https://<用户名>.github.io/IPCON-/`

若仓库名不是根域名站点，前端相对路径（`index.json`、`preset/...`、`assets/...`）已兼容子路径部署。

可选：在推送前本地再跑一次 `npm run generate-index`，确保索引与预设同步。

## 替换品牌 Logo

将正式 Logo 放到 `assets/logo.svg`（或改 `index.html` 中的 `img` 路径指向 PNG）。页面已预留品牌 Logo 位置。

## 技术说明

- 无构建步骤：HTML + CSS + 原生 JS
- ZIP：通过 CDN 加载 [JSZip](https://github.com/Stuk/jszip)
- 索引脚本：纯 Node.js，无额外依赖
