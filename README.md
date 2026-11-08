# IPCON 耗材预设站

IPCON（ipcon 耗材）3D 打印切片预设下载站点。纯静态页面，可直接部署到 **GitHub Pages**。

## 功能

- 按切片器、材料、打印机品牌 / 型号筛选
- 从 `index.json` 动态渲染预设列表（不硬编码）
- 单个 JSON 下载 / 多选 ZIP 打包下载（JSZip）
- 中英文切换（默认中文）
- 苯环 / 高分子材料视觉风格，Logo 可替换

## 目录结构

```text
.
├── index.html                 # 首页
├── style.css                  # 样式（苯环科技风）
├── app.js                     # 筛选 / 下载 / 多语言
├── index.json                 # 由脚本扫描 preset/ 生成
├── assets/
│   └── logo.svg               # 品牌 Logo（可替换为正式图片）
├── preset/
│   └── <材料>/<品牌>/<型号>/<切片器>/<文件名>.json
├── scripts/
│   └── generate-index.js      # 生成 index.json
└── README.md
```

预设路径约定：

```text
preset/材料名/打印机品牌/打印机型号/切片器/文件名.json
```

示例：

```text
preset/PLA/Bambu Lab/X1 Carbon/BambuStudio/IPCON_PLA_Basic_X1C.json
```

## 本地预览

### 1. 生成索引

新增或修改 `preset/` 下的文件后，先重新生成 `index.json`：

```bash
node scripts/generate-index.js
```

### 2. 启动本地静态服务

不要用 `file://` 直接打开（浏览器会拦截 `fetch`）。任选一种：

```bash
# Python
python3 -m http.server 8080

# 或 Node（需已安装 serve）
npx --yes serve -l 8080 .
```

浏览器打开：<http://localhost:8080>

## 部署到 GitHub Pages

1. 将仓库推送到 GitHub
2. 仓库 **Settings → Pages**
3. Source 选择 `Deploy from a branch`
4. Branch 选 `main`（或你的发布分支），文件夹选 `/ (root)`
5. 保存后等待构建完成，访问 `https://<user>.github.io/<repo>/`

每次添加预设后记得：

```bash
node scripts/generate-index.js
git add preset index.json
git commit -m "Add filament presets"
git push
```

## 替换 Logo

将正式 Logo 放到 `assets/`（例如 `assets/logo.png`），然后修改 `index.html` / `style.css` 中对 `assets/logo.svg` 的引用即可。页头已预留品牌 Logo 位置。

## 技术说明

- 前端：HTML + CSS + 原生 JavaScript
- ZIP：通过 CDN 加载 [JSZip](https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js)
- 索引字段：`materials` / `brands` / `models` / `slicers` / `presets`
