#!/usr/bin/env node
/**
 * Scan preset/ and write index.json for the static frontend.
 * Expected path: preset/<material>/<brand>/<model>/<slicer>/<file>.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PRESET_DIR = path.join(ROOT, "preset");
const OUT_FILE = path.join(ROOT, "index.json");

function walk(dir, parts = []) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full, [...parts, entry.name]));
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;

    // material / brand / model / slicer / filename
    if (parts.length < 4) {
      console.warn(`Skip (path too shallow): ${path.relative(ROOT, full)}`);
      continue;
    }

    const [material, brand, model, slicer, ...rest] = parts;
    if (rest.length) {
      // Extra nesting beyond the expected 4 levels — still treat first four as catalog keys
      // and keep relative path accurate.
    }

    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (err) {
      console.warn(`Skip (invalid JSON): ${path.relative(ROOT, full)} — ${err.message}`);
      continue;
    }

    const stat = fs.statSync(full);
    const updated =
      meta.updated ||
      (stat.mtime instanceof Date ? stat.mtime.toISOString().slice(0, 10) : "");

    const compatible =
      Array.isArray(meta.compatible_printers) && meta.compatible_printers.length
        ? meta.compatible_printers
        : [`${brand} ${model}`];

    found.push({
      id: path
        .relative(PRESET_DIR, full)
        .replace(/\\/g, "/")
        .replace(/\.json$/i, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase(),
      name: meta.name || entry.name.replace(/\.json$/i, ""),
      material,
      brand,
      model,
      slicer,
      file: entry.name,
      path: path.relative(ROOT, full).replace(/\\/g, "/"),
      compatibleModels: compatible,
      updated,
      version: meta.version || "",
    });
  }

  return found;
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function main() {
  const presets = walk(PRESET_DIR).sort((a, b) => {
    const key = (p) => `${p.slicer}|${p.material}|${p.brand}|${p.model}|${p.file}`;
    return key(a).localeCompare(key(b), "zh-CN");
  });

  const index = {
    generatedAt: new Date().toISOString(),
    materials: uniqueSorted(presets.map((p) => p.material)),
    brands: uniqueSorted(presets.map((p) => p.brand)),
    models: uniqueSorted(presets.map((p) => p.model)),
    slicers: uniqueSorted(presets.map((p) => p.slicer)),
    presets,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${path.relative(ROOT, OUT_FILE)} — ${presets.length} preset(s), ` +
      `${index.materials.length} material(s), ${index.slicers.length} slicer(s).`
  );
}

main();
