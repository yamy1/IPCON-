#!/usr/bin/env node
/**
 * 扫描 preset/ 目录，生成站点用的 index.json
 *
 * 目录约定：
 *   preset/材料名/打印机品牌/打印机型号/切片器/文件名.json
 *
 * 用法：
 *   node scripts/generate-index.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PRESET_DIR = path.join(ROOT, "preset");
const OUTPUT = path.join(ROOT, "index.json");

/** 递归收集目录下所有 .json 文件 */
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

/** 从相对路径解析元数据 */
function parsePresetPath(absPath) {
  const rel = path.relative(PRESET_DIR, absPath).split(path.sep);
  // 期望：材料 / 品牌 / 型号 / 切片器 / 文件名
  if (rel.length < 5) {
    console.warn(`跳过路径过短的文件: ${rel.join("/")}`);
    return null;
  }

  const [material, brand, model, slicer, ...rest] = rel;
  const filename = rest.join("/");
  const name = path.basename(filename, ".json");
  const stat = fs.statSync(absPath);

  // 尝试读取 JSON 内的可选元数据（兼容机型、显示名等）
  let meta = {};
  try {
    const raw = JSON.parse(fs.readFileSync(absPath, "utf8"));
    if (raw && typeof raw === "object") {
      meta = {
        displayName: raw.displayName || raw.name || null,
        compatibleModels: Array.isArray(raw.compatibleModels)
          ? raw.compatibleModels
          : Array.isArray(raw.compatible_printers)
            ? raw.compatible_printers
            : null,
        updatedAt: raw.updatedAt || raw.updated_at || null,
        description: raw.description || null,
      };
    }
  } catch (err) {
    console.warn(`无法解析 JSON 元数据: ${rel.join("/")} — ${err.message}`);
  }

  return {
    id: rel.join("/").replace(/\.json$/i, "").replace(/[\\/]/g, "--"),
    name: meta.displayName || name,
    filename,
    material,
    brand,
    model,
    slicer,
    compatibleModels: meta.compatibleModels || [model],
    description: meta.description || "",
    updatedAt: meta.updatedAt || stat.mtime.toISOString().slice(0, 10),
    path: `preset/${rel.join("/")}`,
  };
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) =>
    a.localeCompare(b, "zh-CN", { sensitivity: "base" })
  );
}

function main() {
  if (!fs.existsSync(PRESET_DIR)) {
    console.error(`找不到目录: ${PRESET_DIR}`);
    process.exit(1);
  }

  const files = walk(PRESET_DIR);
  const presets = files
    .map(parsePresetPath)
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));

  const index = {
    generatedAt: new Date().toISOString(),
    materials: uniqueSorted(presets.map((p) => p.material)),
    brands: uniqueSorted(presets.map((p) => p.brand)),
    models: uniqueSorted(presets.map((p) => p.model)),
    slicers: uniqueSorted(presets.map((p) => p.slicer)),
    presets,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(
    `已生成 ${OUTPUT}\n` +
      `  预设 ${presets.length} 个 | 材料 ${index.materials.length} | ` +
      `品牌 ${index.brands.length} | 型号 ${index.models.length} | ` +
      `切片器 ${index.slicers.length}`
  );
}

main();
