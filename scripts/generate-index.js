#!/usr/bin/env node
/**
 * Scan preset/ and generate index.json for the IPCON preset site.
 *
 * Expected path layout:
 *   preset/<material>/<brand>/<model>/<slicer>/<filename>.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PRESET_DIR = path.join(ROOT, "preset");
const OUTPUT = path.join(ROOT, "index.json");

function walk(dir, relative = "") {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(abs, rel));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push({ abs, rel });
    }
  }

  return files;
}

function uniqueSorted(list) {
  return [...new Set(list)].sort((a, b) =>
    a.localeCompare(b, "zh-CN", { sensitivity: "base" })
  );
}

function formatDate(mtime) {
  const d = new Date(mtime);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readCompatible(fileAbs) {
  try {
    const raw = JSON.parse(fs.readFileSync(fileAbs, "utf8"));
    if (Array.isArray(raw.compatible_printers) && raw.compatible_printers.length) {
      return raw.compatible_printers;
    }
    if (typeof raw.name === "string" && raw.name.trim()) {
      return [raw.name];
    }
  } catch {
    // Ignore invalid JSON content; still list the file path.
  }
  return [];
}

function main() {
  const files = walk(PRESET_DIR);
  const presets = [];
  const materials = [];
  const brands = [];
  const models = [];
  const slicers = [];

  for (const file of files) {
    const parts = file.rel.split("/");
    // material / brand / model / slicer / filename.json
    if (parts.length < 5) {
      console.warn(`[skip] unexpected path depth: preset/${file.rel}`);
      continue;
    }

    const material = parts[0];
    const brand = parts[1];
    const model = parts[2];
    const slicer = parts[3];
    const filename = parts[parts.length - 1];
    const filePath = `preset/${file.rel}`.replace(/\\/g, "/");
    const stat = fs.statSync(file.abs);
    const compatible = readCompatible(file.abs);
    if (!compatible.length) compatible.push(`${brand} ${model}`);

    materials.push(material);
    brands.push(brand);
    models.push(model);
    slicers.push(slicer);

    presets.push({
      id: filePath,
      name: filename.replace(/\.json$/i, ""),
      filename,
      material,
      brand,
      model,
      slicer,
      compatible,
      updatedAt: formatDate(stat.mtimeMs),
      path: filePath,
    });
  }

  presets.sort((a, b) => {
    const byMaterial = a.material.localeCompare(b.material, "zh-CN");
    if (byMaterial !== 0) return byMaterial;
    const byBrand = a.brand.localeCompare(b.brand, "zh-CN");
    if (byBrand !== 0) return byBrand;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  const index = {
    generatedAt: new Date().toISOString(),
    materials: uniqueSorted(materials),
    brands: uniqueSorted(brands),
    models: uniqueSorted(models),
    slicers: uniqueSorted(slicers),
    presets,
  };

  fs.writeFileSync(OUTPUT, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(
    `Generated index.json with ${presets.length} preset(s), ` +
      `${index.materials.length} material(s), ${index.slicers.length} slicer(s).`
  );
}

main();
