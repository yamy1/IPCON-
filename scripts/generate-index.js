#!/usr/bin/env node
/**
 * 扫描 preset/ 目录，生成根目录 index.json
 * 目录约定：preset/材料名/打印机品牌/打印机型号/切片器/文件名.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PRESET_DIR = path.join(ROOT, "preset");
const OUTPUT = path.join(ROOT, "index.json");

/** 递归收集所有 .json 预设文件 */
function walkJsonFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(full, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

/** 从相对路径解析材料 / 品牌 / 型号 / 切片器 */
function parsePresetPath(absPath) {
  const rel = path.relative(PRESET_DIR, absPath);
  const parts = rel.split(path.sep);
  if (parts.length < 5) {
    console.warn(`[skip] 路径层级不足（需要 材料/品牌/型号/切片器/文件）: ${rel}`);
    return null;
  }
  const [material, brand, model, slicer, ...rest] = parts;
  const filename = rest.join("/");
  return { material, brand, model, slicer, filename, relPath: `preset/${rel.split(path.sep).join("/")}` };
}

/** 读取预设内的更新时间，失败则用文件 mtime */
function resolveUpdatedAt(absPath, parsedJson) {
  const candidates = [
    parsedJson?.updated_at,
    parsedJson?.updatedAt,
    parsedJson?.version_update_date,
  ].filter(Boolean);

  if (candidates.length) return String(candidates[0]);

  const mtime = fs.statSync(absPath).mtime;
  return mtime.toISOString().slice(0, 10);
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function main() {
  const files = walkJsonFiles(PRESET_DIR);
  const presets = [];

  for (const abs of files) {
    const meta = parsePresetPath(abs);
    if (!meta) continue;

    let body = {};
    try {
      body = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch (err) {
      console.warn(`[warn] 无法解析 JSON，仍会收录: ${meta.relPath} (${err.message})`);
    }

    const displayName =
      (Array.isArray(body.name) ? body.name[0] : body.name) ||
      meta.filename.replace(/\.json$/i, "");

    const compatible =
      body.compatible_printers ||
      body.compatible_printers_condition ||
      [meta.model];

    presets.push({
      id: meta.relPath,
      name: displayName,
      material: meta.material,
      brand: meta.brand,
      model: meta.model,
      slicer: meta.slicer,
      filename: meta.filename,
      path: meta.relPath,
      compatibleModels: Array.isArray(compatible) ? compatible : [String(compatible)],
      updatedAt: resolveUpdatedAt(abs, body),
    });
  }

  presets.sort((a, b) => {
    const keys = ["material", "brand", "model", "slicer", "filename"];
    for (const k of keys) {
      const cmp = String(a[k]).localeCompare(String(b[k]), "zh-CN");
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  const index = {
    generatedAt: new Date().toISOString(),
    materials: uniqueSorted(presets.map((p) => p.material)),
    brands: uniqueSorted(presets.map((p) => p.brand)),
    models: uniqueSorted(presets.map((p) => p.model)),
    slicers: uniqueSorted(presets.map((p) => p.slicer)),
    presets,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(`✓ 已生成 ${path.relative(ROOT, OUTPUT)}`);
  console.log(`  预设 ${presets.length} 个 | 材料 ${index.materials.length} | 品牌 ${index.brands.length} | 型号 ${index.models.length} | 切片器 ${index.slicers.length}`);
}

main();
