# IPCON 耗材预设下载站

IPCON（ipcon 耗材）官方切片预设下载站点。纯静态页面，可直接部署到 **GitHub Pages**。

## 功能

- 按切片器（BambuStudio / OrcaSlicer / PrusaSlicer 等）筛选
- 按材料、打印机品牌、打印机型号联动筛选
- 预设列表展示：材料、打印机、兼容机型、更新时间
- 单个 JSON 下载 / 多选 ZIP 打包下载（JSZip）
- 中英文切换（默认中文）
- 页面启动时读取 `index.json` 渲染，无硬编码列表

## 目录结构

```text
.
├── index.html              # 页面
├── style.css               # 苯环 / 科技化学风样式
├── app.js                  # 筛选、i18n、下载逻辑
├── index.json              # 由脚本自动生成
├── assets/
│   └── logo.svg            # 可替换为正式 Logo（png/svg）
├── preset/
│   └── 材料/品牌/型号/切片器/文件名.json
└── scripts/
    └── generate-index.js   # 扫描 preset/ 生成 index.json
```

预设路径约定：

```text
preset/<材料>/<打印机品牌>/<打印机型号>/<切片器>/<文件名>.json
```

示例：

```text
preset/PLA/BambuLab/X1C/BambuStudio/IPCON_PLA_Generic.json
```

JSON 内可选字段（会写入 `index.json`）：

| 字段 | 说明 |
|------|------|
| `displayName` / `name` | 列表显示名 |
| `compatibleModels` | 兼容机型数组 |
| `updatedAt` | 更新日期 `YYYY-MM-DD` |
| `description` | 简述 |

## 本地预览

需要本机已安装 [Node.js](https://nodejs.org/)（仅生成索引时需要；预览可用任意静态服务器）。

### 1. 生成索引

新增或修改 `preset/` 下的文件后，运行：

```bash
node scripts/generate-index.js
```

会在仓库根目录生成 / 更新 `index.json`。

### 2. 启动本地服务器

因浏览器对 `file://` 下的 `fetch` 有限制，请用 HTTP 服务打开：

```bash
# Python 3
python3 -m http.server 8080

# 或 Node（任选其一）
npx --yes serve -l 8080
```

浏览器访问：<http://localhost:8080>

## 部署到 GitHub Pages

1. 将本仓库推送到 GitHub。
2. 仓库 **Settings → Pages**：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main`（或你的发布分支），目录选 `/ (root)`
3. 保存后等待一两分钟，站点地址形如：

   `https://<用户名>.github.io/IPCON-/`

若仓库名不是根域名站点，相对路径（`./`、`index.json`、`preset/...`）已兼容子路径部署。

### 推荐工作流

```bash
# 放入新预设
# ... 复制 JSON 到 preset/...

# 重新生成索引并提交
node scripts/generate-index.js
git add preset index.json
git commit -m "Add new filament presets"
git push
```

## 替换品牌 Logo

`index.html` 头部预留了 Logo 位置：

```html
<img class="brand-logo" src="assets/logo.svg" alt="ipcon" width="160" height="40" />
```

将正式图片放到 `assets/logo.png`（或 `.svg`），改掉 `src` 即可。当前 SVG 含简化苯环 +「ipcon」文字，可作占位。

## 设计说明

视觉围绕「苯环 / 高分子材料」展开：六边形背景装饰、分隔点、切片器切角与深色 + 青 / 蓝绿 / 琥珀配色，面向材料厂家官网风格，便于后续替换正式 VI。

## License

见仓库根目录 `LICENSE`。
