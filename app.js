/**
 * IPCON preset catalog — loads index.json, filters, single + ZIP download.
 */
(function () {
  "use strict";

  const I18N = {
    zh: {
      brandTag: "耗材预设",
      heroTitle: "聚合物级切片预设",
      heroLead:
        "为 IPCON 艾普创线材精调的切片配置，按切片软件与机型筛选，一键下载 JSON 或打包 ZIP。",
      ctaBrowse: "浏览预设",
      ctaHow: "如何导入",
      catalogTitle: "选择切片软件",
      catalogSub: "先选切片器，再按材料与打印机收窄结果。",
      filterMaterial: "材料",
      filterBrand: "打印机品牌",
      filterModel: "打印机型号",
      resetFilters: "重置筛选",
      selectAll: "全选当前列表",
      downloadZip: "下载选中 (ZIP)",
      emptyState: "没有匹配的预设，请调整筛选条件。",
      howTitle: "导入说明",
      howSub: "下载 JSON 后，在对应切片软件中导入线材预设即可使用。",
      howStep1: "选择切片器并筛选所需材料 / 机型。",
      howStep2: "下载单个 JSON，或勾选多项打包 ZIP。",
      howStep3: "在切片软件中打开「导入预设 / Import Config」，选择文件。",
      footerTag: "艾普创 · 3D 打印耗材预设",
      footerNote: "静态站点 · 数据来自 index.json",
      resultCount: "共 {n} 个预设",
      download: "下载",
      material: "材料",
      printer: "打印机",
      compatible: "兼容机型",
      updated: "更新",
      all: "全部",
      loadError: "无法加载 index.json，请确认已运行 scripts/generate-index.js 并通过本地服务器访问。",
      zipEmpty: "请先勾选至少一个预设。",
      zipName: "IPCON-presets.zip",
      langLabel: "中文",
      langIdle: "EN",
    },
    en: {
      brandTag: "Filament Presets",
      heroTitle: "Polymer-tuned slicer presets",
      heroLead:
        "Slicer profiles tuned for IPCON (艾普创) filament. Filter by slicer and printer, then download JSON or a ZIP pack.",
      ctaBrowse: "Browse presets",
      ctaHow: "How to import",
      catalogTitle: "Choose a slicer",
      catalogSub: "Pick a slicer first, then narrow by material and printer.",
      filterMaterial: "Material",
      filterBrand: "Printer brand",
      filterModel: "Printer model",
      resetFilters: "Reset filters",
      selectAll: "Select all in list",
      downloadZip: "Download selected (ZIP)",
      emptyState: "No matching presets. Try adjusting the filters.",
      howTitle: "Import guide",
      howSub: "After downloading JSON, import the filament preset in your slicer.",
      howStep1: "Choose a slicer and filter by material / printer.",
      howStep2: "Download a single JSON, or select several and pack a ZIP.",
      howStep3: "In your slicer, open Import Config / Import Preset and pick the file.",
      footerTag: "IPCON · 3D printing filament presets",
      footerNote: "Static site · data from index.json",
      resultCount: "{n} preset(s)",
      download: "Download",
      material: "Material",
      printer: "Printer",
      compatible: "Compatible",
      updated: "Updated",
      all: "All",
      loadError:
        "Could not load index.json. Run scripts/generate-index.js and serve over HTTP.",
      zipEmpty: "Select at least one preset first.",
      zipName: "IPCON-presets.zip",
      langLabel: "EN",
      langIdle: "中文",
    },
  };

  const state = {
    lang: localStorage.getItem("ipcon-lang") || "zh",
    catalog: null,
    slicer: "",
    material: "",
    brand: "",
    model: "",
    selected: new Set(),
    visibleIds: [],
  };

  const els = {
    langToggle: document.getElementById("langToggle"),
    slicerRail: document.getElementById("slicerRail"),
    filterMaterial: document.getElementById("filterMaterial"),
    filterBrand: document.getElementById("filterBrand"),
    filterModel: document.getElementById("filterModel"),
    resetFilters: document.getElementById("resetFilters"),
    resultCount: document.getElementById("resultCount"),
    selectAll: document.getElementById("selectAll"),
    downloadZip: document.getElementById("downloadZip"),
    presetList: document.getElementById("presetList"),
    emptyState: document.getElementById("emptyState"),
    loadError: document.getElementById("loadError"),
  };

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.zh[key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key) node.textContent = t(key);
    });
    const label = els.langToggle.querySelector("[data-lang-label]");
    const idle = els.langToggle.querySelector(".lang-toggle__idle");
    if (label) label.textContent = t("langLabel");
    if (idle) idle.textContent = t("langIdle");
    document.title =
      state.lang === "zh" ? "IPCON 艾普创 · 切片预设" : "IPCON · Filament Presets";
  }

  function fillSelect(select, values, selected) {
    const allLabel = t("all");
    select.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = allLabel;
    select.appendChild(optAll);
    values.forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
    select.value = values.includes(selected) ? selected : "";
  }

  function rebuildFilterOptions() {
    const presets = filteredBySlicer();
    const materials = unique(presets.map((p) => p.material));
    const brands = unique(
      presets
        .filter((p) => !state.material || p.material === state.material)
        .map((p) => p.brand)
    );
    const models = unique(
      presets
        .filter(
          (p) =>
            (!state.material || p.material === state.material) &&
            (!state.brand || p.brand === state.brand)
        )
        .map((p) => p.model)
    );

    fillSelect(els.filterMaterial, materials, state.material);
    fillSelect(els.filterBrand, brands, state.brand);
    fillSelect(els.filterModel, models, state.model);
    state.material = els.filterMaterial.value;
    state.brand = els.filterBrand.value;
    state.model = els.filterModel.value;
  }

  function unique(arr) {
    return [...new Set(arr)].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function filteredBySlicer() {
    if (!state.catalog) return [];
    return state.catalog.presets.filter(
      (p) => !state.slicer || p.slicer === state.slicer
    );
  }

  function filteredPresets() {
    return filteredBySlicer().filter((p) => {
      if (state.material && p.material !== state.material) return false;
      if (state.brand && p.brand !== state.brand) return false;
      if (state.model && p.model !== state.model) return false;
      return true;
    });
  }

  function renderSlicerRail() {
    const slicers = state.catalog.slicers;
    els.slicerRail.innerHTML = "";
    if (!state.slicer && slicers.length) state.slicer = slicers[0];

    slicers.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slicer-chip";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(name === state.slicer));
      btn.textContent = name;
      btn.addEventListener("click", () => {
        state.slicer = name;
        state.material = "";
        state.brand = "";
        state.model = "";
        state.selected.clear();
        rebuildFilterOptions();
        renderSlicerRail();
        renderList();
      });
      els.slicerRail.appendChild(btn);
    });
  }

  function renderList() {
    const list = filteredPresets();
    state.visibleIds = list.map((p) => p.id);
    els.presetList.innerHTML = "";
    els.emptyState.hidden = list.length > 0;
    els.resultCount.textContent = t("resultCount").replace("{n}", String(list.length));

    list.forEach((preset, index) => {
      const row = document.createElement("article");
      row.className = "preset-row";
      row.style.animationDelay = `${Math.min(index, 8) * 0.04}s`;
      row.setAttribute("role", "listitem");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "preset-row__check";
      check.checked = state.selected.has(preset.id);
      check.setAttribute("aria-label", preset.name);
      check.addEventListener("change", () => {
        if (check.checked) state.selected.add(preset.id);
        else state.selected.delete(preset.id);
        syncSelectionUi();
      });

      const meta = document.createElement("div");
      meta.className = "preset-row__meta";
      meta.innerHTML = `
        <h3>${escapeHtml(preset.name)}</h3>
        <div class="preset-row__tags">
          <span class="tag tag--amber">${escapeHtml(t("material"))}: ${escapeHtml(preset.material)}</span>
          <span class="tag">${escapeHtml(t("printer"))}: ${escapeHtml(preset.brand)} ${escapeHtml(preset.model)}</span>
          <span class="tag">${escapeHtml(preset.slicer)}</span>
        </div>
        <p class="preset-row__sub">${escapeHtml(t("compatible"))}: ${escapeHtml(
          (preset.compatibleModels || []).join(", ")
        )}</p>
      `;

      const actions = document.createElement("div");
      actions.className = "preset-row__actions";
      const updated = document.createElement("span");
      updated.className = "preset-row__updated";
      updated.textContent = `${t("updated")} ${preset.updated || "—"}`;
      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "btn btn--ghost btn--icon";
      dl.textContent = t("download");
      dl.addEventListener("click", () => downloadSingle(preset));
      actions.append(updated, dl);

      row.append(check, meta, actions);
      els.presetList.appendChild(row);
    });

    syncSelectionUi();
  }

  function syncSelectionUi() {
    const visibleSelected = state.visibleIds.filter((id) => state.selected.has(id));
    els.selectAll.checked =
      state.visibleIds.length > 0 && visibleSelected.length === state.visibleIds.length;
    els.selectAll.indeterminate =
      visibleSelected.length > 0 && visibleSelected.length < state.visibleIds.length;
    els.downloadZip.disabled = state.selected.size === 0;
    els.downloadZip.textContent = `${t("downloadZip")}${
      state.selected.size ? ` · ${state.selected.size}` : ""
    }`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function downloadSingle(preset) {
    const res = await fetch(encodePath(preset.path));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    triggerBlobDownload(blob, preset.file || `${preset.id}.json`);
  }

  function encodePath(relPath) {
    return relPath
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  async function downloadSelectedZip() {
    if (!state.selected.size) {
      alert(t("zipEmpty"));
      return;
    }
    if (typeof JSZip === "undefined") {
      alert("JSZip failed to load.");
      return;
    }

    const zip = new JSZip();
    const byId = new Map(state.catalog.presets.map((p) => [p.id, p]));
    const ids = [...state.selected];

    for (const id of ids) {
      const preset = byId.get(id);
      if (!preset) continue;
      const res = await fetch(encodePath(preset.path));
      if (!res.ok) throw new Error(`Failed: ${preset.path}`);
      const text = await res.text();
      // Keep folder structure inside the zip for easy import
      zip.file(preset.path.replace(/^preset\//, ""), text);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(blob, t("zipName"));
  }

  function bindEvents() {
    els.langToggle.addEventListener("click", () => {
      state.lang = state.lang === "zh" ? "en" : "zh";
      localStorage.setItem("ipcon-lang", state.lang);
      applyI18n();
      rebuildFilterOptions();
      renderList();
    });

    els.filterMaterial.addEventListener("change", () => {
      state.material = els.filterMaterial.value;
      state.brand = "";
      state.model = "";
      rebuildFilterOptions();
      renderList();
    });

    els.filterBrand.addEventListener("change", () => {
      state.brand = els.filterBrand.value;
      state.model = "";
      rebuildFilterOptions();
      renderList();
    });

    els.filterModel.addEventListener("change", () => {
      state.model = els.filterModel.value;
      renderList();
    });

    els.resetFilters.addEventListener("click", () => {
      state.material = "";
      state.brand = "";
      state.model = "";
      rebuildFilterOptions();
      renderList();
    });

    els.selectAll.addEventListener("change", () => {
      if (els.selectAll.checked) {
        state.visibleIds.forEach((id) => state.selected.add(id));
      } else {
        state.visibleIds.forEach((id) => state.selected.delete(id));
      }
      renderList();
    });

    els.downloadZip.addEventListener("click", () => {
      downloadSelectedZip().catch((err) => {
        console.error(err);
        alert(err.message || String(err));
      });
    });
  }

  async function init() {
    applyI18n();
    bindEvents();

    try {
      const res = await fetch("index.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.catalog = await res.json();
      renderSlicerRail();
      rebuildFilterOptions();
      renderList();
    } catch (err) {
      console.error(err);
      els.loadError.hidden = false;
      els.loadError.textContent = t("loadError");
      els.emptyState.hidden = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
