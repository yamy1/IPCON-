# IPCON 耗材 · 切片预设站

IPCON（ipcon 耗材）3D 打印线材切片预设下载站。纯静态页面（HTML / CSS / JS），数据来自 `index.json`，可部署到 **GitHub Pages**。

站点地址（启用 Pages 后）：<https://yamy1.github.io/IPCON-Filament-library/>

## 功能

- 按切片软件（BambuStudio、OrcaSlicer、PrusaSlicer、ElegooSlicer 等）浏览
- 按材料、打印机品牌、型号联动筛选
- 预设列表：材料、打印机、兼容机型、更新时间
- 单文件 JSON 下载；多选后 ZIP 打包下载（JSZip CDN）
- 中文默认，ZH / EN 切换
- 页面启动时只读取 `index.json` 渲染（无硬编码目录）

## 目录结构

```text
.
├── index.html                 # 页面
├── style.css                  # 苯环 / 科技化学风样式
├── app.js                     # 筛选、i18n、下载
├── index.json                 # 由脚本生成
├── .nojekyll                  # 让 GitHub Pages 跳过 Jekyll
├── assets/
│   ├── logo.png               # 官方 Logo（透明底，站点使用）
│   ├── logo-header.png        # 页头 / 页脚缩小版
│   ├── favicon.png
│   └── ipcon-official-logo.jpg # 品牌色板原稿
├── preset/
│   └── 材料/品牌/型号/切片器/文件名.json
└── scripts/
    └── generate-index.js      # 扫描 preset/ → index.json
```

预设路径约定：

```text
preset/<材料名>/<打印机品牌>/<打印机型号>/<切片器>/<文件名>.json
```

示例：

```text
preset/PLA/Bambu Lab/X1 Carbon/BambuStudio/IPCON_PLA_Generic.json
```

## 本地预览

### 1. 生成索引

新增或修改 `preset/` 后执行：

```bash
node scripts/generate-index.js
```

会在仓库根目录生成 / 更新 `index.json`。

### 2. 启动本地服务器

浏览器对 `file://` 下的 `fetch` 有限制，请用 HTTP 服务打开：

```bash
# Python 3
python3 -m http.server 8080

# 或 Node
npx --yes serve -l 8080
```

访问：<http://localhost:8080>


