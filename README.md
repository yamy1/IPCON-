# IPCON 耗材 · 切片预设站

IPCON（ipcon）3D 打印线材切片预设下载站。纯静态站点（HTML / CSS / JS），数据来自 `index.json`，可部署到 GitHub Pages。

## 功能

- 按切片软件（BambuStudio、OrcaSlicer、PrusaSlicer、ElegooSlicer 等）浏览
- 按材料、打印机品牌、型号筛选
- 单文件 JSON 下载；多选后 ZIP 打包下载（JSZip CDN）
- 中文默认，ZH / EN 切换

## 预设目录结构

```text
preset/<材料名>/<打印机品牌>/<打印机型号>/<切片器>/<文件名>.json
```

示例：

```text
preset/PLA/Bambu Lab/X1 Carbon/BambuStudio/IPCON_PLA_Generic.json
```

## 生成本地索引

新增或修改 `preset/` 后，重新生成 `index.json`：

```bash
node scripts/generate-index.js
```

前端只读取 `index.json`，不会硬编码目录数据。

## 本地预览

请用本地 HTTP 服务打开（`file://` 下 `fetch` 可能失败）：

```bash
# 任选其一
npx --yes serve .
python3 -m http.server 8080
```

然后访问提示的地址（如 `http://localhost:3000` 或 `http://localhost:8080`）。

## GitHub Pages 部署

1. 仓库 Settings → Pages → Source 选 **Deploy from a branch**
2. Branch 选 `main`（或本站所在分支），Folder 选 `/ (root)`
3. 保存后等待构建；站点地址形如 `https://<user>.github.io/IPCON-/`

若仓库名不是用户主站，资源路径已使用相对路径，可直接在子路径下工作。

## 项目结构

```text
index.html              # 页面
style.css               # 样式（苯环 / 聚合物主题）
app.js                  # 筛选、i18n、下载
index.json              # 由脚本生成的目录索引
scripts/generate-index.js
preset/                 # 预设 JSON
assets/logo.svg         # Logo 占位（可替换图片）
```

## Logo 占位

`assets/logo.svg` 为可替换槽位。换成最终 PNG/SVG 时，保持 `index.html` 中 `.brand__logo-slot` 内的 `<img>` 引用即可。
