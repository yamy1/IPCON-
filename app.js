/**
 * IPCON 耗材预设下载站 — 前端逻辑
 * 数据全部来自 index.json；筛选 / 单文件下载 / 多选 ZIP 打包
 */

(() => {
  "use strict";

  const I18N = {
    zh: {
      "brand.tag": "耗材预设",
      "hero.kicker": "高分子材料 · 精密配方",
      "hero.sub": "为你的切片器一键获取官方耗材预设",
      "hero.cta": "浏览预设",
      "slicer.title": "选择切片器",
      "slicer.desc": "先选定你使用的切片软件，再筛选材料与打印机",
      "slicer.all": "全部切片器",
      "slicer.count": "{n} 个预设",
      "presets.title": "预设列表",
      "presets.desc": "按材料、打印机品牌与型号筛选，支持多选打包下载",
      "presets.empty": "没有符合条件的预设",
      "filter.material": "材料",
      "filter.brand": "打印机品牌",
      "filter.model": "打印机型号",
      "filter.all": "全部",
      "filter.reset": "重置",
      "toolbar.selectAll": "全选当前列表",
      "toolbar.downloadZip": "打包下载",
      "toolbar.results": "共 {n} 项",
      "meta.material": "材料",
      "meta.printer": "打印机",
      "meta.compatible": "兼容机型",
      "meta.slicer": "切片器",
      "meta.updated": "更新",
      "action.download": "下载 JSON",
      "status.loading": "正在加载预设数据…",
      "status.loadError": "无法加载 index.json，请先运行 node scripts/generate-index.js",
      "status.zipping": "正在打包…",
      "status.zipDone": "已开始下载 ZIP",
      "status.zipError": "打包失败，请稍后重试",
      "status.needSelect": "请先勾选至少一个预设",
      "footer.tagline": "高分子材料 · 官方切片预设",
      "footer.note": "预设仅供 IPCON 耗材使用。页面数据来自 index.json。",
    },
    en: {
      "brand.tag": "Presets",
      "hero.kicker": "Polymer materials · Precision formulas",
      "hero.sub": "Official filament presets for your slicer, one click away",
      "hero.cta": "Browse presets",
      "slicer.title": "Choose a slicer",
      "slicer.desc": "Pick your slicer first, then filter by material and printer",
      "slicer.all": "All slicers",
      "slicer.count": "{n} presets",
      "presets.title": "Preset library",
      "presets.desc": "Filter by material, brand and model. Multi-select for ZIP download",
      "presets.empty": "No presets match your filters",
      "filter.material": "Material",
      "filter.brand": "Printer brand",
      "filter.model": "Printer model",
      "filter.all": "All",
      "filter.reset": "Reset",
      "toolbar.selectAll": "Select all in list",
      "toolbar.downloadZip": "Download ZIP",
      "toolbar.results": "{n} results",
      "meta.material": "Material",
      "meta.printer": "Printer",
      "meta.compatible": "Compatible",
      "meta.slicer": "Slicer",
      "meta.updated": "Updated",
      "action.download": "Download JSON",
      "status.loading": "Loading presets…",
      "status.loadError": "Failed to load index.json. Run: node scripts/generate-index.js",
      "status.zipping": "Creating ZIP…",
      "status.zipDone": "ZIP download started",
      "status.zipError": "ZIP failed. Please try again",
      "status.needSelect": "Select at least one preset first",
      "footer.tagline": "Polymer materials · Official slicer presets",
      "footer.note": "Presets are for IPCON filaments. Data is loaded from index.json.",
    },
  };

  const state = {
    lang: localStorage.getItem("ipcon-lang") || "zh",
    data: null,
    slicer: "",
    material: "",
    brand: "",
    model: "",
    selected: new Set(),
  };

  const el = {
    slicerGrid: document.getElementById("slicerGrid"),
    filterMaterial: document.getElementById("filterMaterial"),
    filterBrand: document.getElementById("filterBrand"),
    filterModel: document.getElementById("filterModel"),
    resetFilters: document.getElementById("resetFilters"),
    selectAll: document.getElementById("selectAll"),
    resultCount: document.getElementById("resultCount"),
    downloadSelected: document.getElementById("downloadSelected"),
    selectedCount: document.getElementById("selectedCount"),
    presetList: document.getElementById("presetList"),
    emptyState: document.getElementById("emptyState"),
    statusMsg: document.getElementById("statusMsg"),
  };

  function t(key, vars = {}) {
    const table = I18N[state.lang] || I18N.zh;
    let text = table[key] || I18N.zh[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const active = btn.dataset.lang === state.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function showStatus(key, isError = false) {
    el.statusMsg.hidden = false;
    el.statusMsg.textContent = t(key);
    el.statusMsg.classList.toggle("is-error", isError);
  }

  function hideStatus() {
    el.statusMsg.hidden = true;
  }

  /** 当前筛选结果 */
  function filteredPresets() {
    if (!state.data) return [];
    return state.data.presets.filter((p) => {
      if (state.slicer && p.slicer !== state.slicer) return false;
      if (state.material && p.material !== state.material) return false;
      if (state.brand && p.brand !== state.brand) return false;
      if (state.model && p.model !== state.model) return false;
      return true;
    });
  }

  /** 根据当前切片器 / 品牌，刷新联动下拉选项 */
  function refreshFilterOptions() {
    const pool = state.data.presets.filter((p) => {
      if (state.slicer && p.slicer !== state.slicer) return false;
      return true;
    });

    const materials = unique(
      pool
        .filter((p) => !state.brand || p.brand === state.brand)
        .map((p) => p.material)
    );
    const brands = unique(
      pool
        .filter((p) => !state.material || p.material === state.material)
        .map((p) => p.brand)
    );
    const models = unique(
      pool
        .filter((p) => {
          if (state.material && p.material !== state.material) return false;
          if (state.brand && p.brand !== state.brand) return false;
          return true;
        })
        .map((p) => p.model)
    );

    fillSelect(el.filterMaterial, materials, state.material);
    fillSelect(el.filterBrand, brands, state.brand);
    fillSelect(el.filterModel, models, state.model);
  }

  function unique(arr) {
    return [...new Set(arr)].sort((a, b) =>
      a.localeCompare(b, "zh-CN", { sensitivity: "base" })
    );
  }

  function fillSelect(select, values, current) {
    const keep = values.includes(current) ? current : "";
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = t("filter.all");
    select.appendChild(all);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    select.value = keep;
    if (select === el.filterMaterial) state.material = keep;
    if (select === el.filterBrand) state.brand = keep;
    if (select === el.filterModel) state.model = keep;
  }

  function renderSlicers() {
    const counts = {};
    state.data.presets.forEach((p) => {
      counts[p.slicer] = (counts[p.slicer] || 0) + 1;
    });

    const slicers = state.data.slicers.length
      ? state.data.slicers
      : Object.keys(counts);

    el.slicerGrid.innerHTML = "";

    // 「全部」选项
    el.slicerGrid.appendChild(
      createSlicerChip("", t("slicer.all"), state.data.presets.length)
    );

    slicers.forEach((name) => {
      el.slicerGrid.appendChild(
        createSlicerChip(name, name, counts[name] || 0)
      );
    });
  }

  function createSlicerChip(value, label, count) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slicer-chip" + (state.slicer === value ? " is-active" : "");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", state.slicer === value ? "true" : "false");
    btn.dataset.slicer = value;
    btn.innerHTML =
      `<span class="chip-name">${escapeHtml(label)}</span>` +
      `<span class="chip-count">${escapeHtml(t("slicer.count", { n: count }))}</span>`;
    btn.addEventListener("click", () => {
      state.slicer = value;
      state.selected.clear();
      refreshFilterOptions();
      renderSlicers();
      renderList();
    });
    return btn;
  }

  function renderList() {
    const list = filteredPresets();
    el.presetList.innerHTML = "";
    el.emptyState.hidden = list.length > 0;
    el.resultCount.textContent = t("toolbar.results", { n: list.length });

    // 清理已不在列表中的勾选
    const ids = new Set(list.map((p) => p.id));
    [...state.selected].forEach((id) => {
      if (!ids.has(id)) state.selected.delete(id);
    });

    list.forEach((preset) => {
      el.presetList.appendChild(createPresetRow(preset));
    });

    const allSelected =
      list.length > 0 && list.every((p) => state.selected.has(p.id));
    el.selectAll.checked = allSelected;
    el.selectAll.indeterminate =
      !allSelected && list.some((p) => state.selected.has(p.id));

    updateSelectedUI();
  }

  function createPresetRow(preset) {
    const row = document.createElement("article");
    row.className =
      "preset-row" + (state.selected.has(preset.id) ? " is-selected" : "");
    row.dataset.id = preset.id;

    const compatible = (preset.compatibleModels || [preset.model]).join(", ");

    row.innerHTML = `
      <input class="preset-check" type="checkbox" ${
        state.selected.has(preset.id) ? "checked" : ""
      } aria-label="${escapeAttr(preset.name)}" />
      <div class="preset-main">
        <h3 class="preset-name">${escapeHtml(preset.name)}</h3>
        <div class="preset-meta">
          <span class="meta-tag">${escapeHtml(t("meta.material"))}: ${escapeHtml(preset.material)}</span>
          <span class="meta-tag cyan">${escapeHtml(t("meta.printer"))}: ${escapeHtml(preset.brand)} ${escapeHtml(preset.model)}</span>
          <span class="meta-tag amber">${escapeHtml(t("meta.compatible"))}: ${escapeHtml(compatible)}</span>
          <span class="meta-tag">${escapeHtml(t("meta.slicer"))}: ${escapeHtml(preset.slicer)}</span>
        </div>
      </div>
      <div class="preset-actions">
        <span class="preset-updated">${escapeHtml(t("meta.updated"))}: ${escapeHtml(preset.updatedAt || "—")}</span>
        <button type="button" class="btn-download">${escapeHtml(t("action.download"))}</button>
      </div>
    `;

    const checkbox = row.querySelector(".preset-check");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selected.add(preset.id);
      else state.selected.delete(preset.id);
      row.classList.toggle("is-selected", checkbox.checked);
      updateSelectedUI();
      // 同步全选状态
      const list = filteredPresets();
      const allSelected =
        list.length > 0 && list.every((p) => state.selected.has(p.id));
      el.selectAll.checked = allSelected;
      el.selectAll.indeterminate =
        !allSelected && list.some((p) => state.selected.has(p.id));
    });

    row.querySelector(".btn-download").addEventListener("click", () => {
      downloadSingle(preset);
    });

    return row;
  }

  function updateSelectedUI() {
    const n = state.selected.size;
    el.selectedCount.textContent = String(n);
    el.downloadSelected.disabled = n === 0;
  }

  /** 单文件下载 */
  async function downloadSingle(preset) {
    try {
      const res = await fetch(preset.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerDownload(blob, preset.filename || `${preset.name}.json`);
    } catch (err) {
      console.error(err);
      showStatus("status.zipError", true);
    }
  }

  /** 多选 ZIP 打包下载 */
  async function downloadZip() {
    if (!state.selected.size) {
      showStatus("status.needSelect", true);
      return;
    }
    if (typeof JSZip === "undefined") {
      showStatus("status.zipError", true);
      return;
    }

    showStatus("status.zipping");
    el.downloadSelected.disabled = true;

    try {
      const zip = new JSZip();
      const selected = state.data.presets.filter((p) =>
        state.selected.has(p.id)
      );

      await Promise.all(
        selected.map(async (preset) => {
          const res = await fetch(preset.path);
          if (!res.ok) throw new Error(`Failed: ${preset.path}`);
          const text = await res.text();
          // 在 ZIP 内保留材料/品牌/型号/切片器路径，避免重名覆盖
          const zipPath = [
            preset.material,
            preset.brand,
            preset.model,
            preset.slicer,
            preset.filename,
          ].join("/");
          zip.file(zipPath, text);
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `IPCON-presets-${stamp}.zip`);
      showStatus("status.zipDone");
      setTimeout(hideStatus, 2000);
    } catch (err) {
      console.error(err);
      showStatus("status.zipError", true);
    } finally {
      updateSelectedUI();
    }
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  function bindEvents() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.lang = btn.dataset.lang;
        localStorage.setItem("ipcon-lang", state.lang);
        applyI18n();
        refreshFilterOptions();
        renderSlicers();
        renderList();
      });
    });

    el.filterMaterial.addEventListener("change", () => {
      state.material = el.filterMaterial.value;
      state.selected.clear();
      refreshFilterOptions();
      renderList();
    });

    el.filterBrand.addEventListener("change", () => {
      state.brand = el.filterBrand.value;
      state.selected.clear();
      refreshFilterOptions();
      renderList();
    });

    el.filterModel.addEventListener("change", () => {
      state.model = el.filterModel.value;
      state.selected.clear();
      renderList();
    });

    el.resetFilters.addEventListener("click", () => {
      state.material = "";
      state.brand = "";
      state.model = "";
      state.selected.clear();
      refreshFilterOptions();
      renderList();
    });

    el.selectAll.addEventListener("change", () => {
      const list = filteredPresets();
      if (el.selectAll.checked) {
        list.forEach((p) => state.selected.add(p.id));
      } else {
        list.forEach((p) => state.selected.delete(p.id));
      }
      renderList();
    });

    el.downloadSelected.addEventListener("click", downloadZip);
  }

  async function init() {
    applyI18n();
    bindEvents();
    showStatus("status.loading");

    try {
      const res = await fetch("index.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      hideStatus();
      refreshFilterOptions();
      renderSlicers();
      renderList();
    } catch (err) {
      console.error(err);
      showStatus("status.loadError", true);
      el.emptyState.hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
