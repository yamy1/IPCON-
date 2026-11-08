/**
 * IPCON preset browser — loads index.json, filters, and downloads.
 * No framework; works as a static GitHub Pages site.
 */

(() => {
  "use strict";

  const I18N = {
    zh: {
      brandTag: "耗材预设",
      eyebrow: "ipcon 耗材",
      heroTitle: "IPCON",
      heroLead: "精准调校的切片预设，按材料与机型一键下载。",
      ctaBrowse: "浏览预设",
      ctaHow: "如何导入",
      slicerTitle: "选择切片器",
      slicerDesc: "先选切片器，再按材料与打印机筛选预设。",
      filterMaterial: "材料",
      filterBrand: "打印机品牌",
      filterModel: "打印机型号",
      filterSearch: "搜索",
      searchPlaceholder: "名称 / 材料 / 机型…",
      resetFilters: "重置",
      resultSuffix: "个预设",
      selectAll: "全选当前",
      downloadSelected: "打包下载",
      downloadOne: "下载",
      emptyText: "没有匹配的预设，请调整筛选条件。",
      howTitle: "如何导入",
      howDesc: "下载 JSON 后，在对应切片器中导入耗材配置即可使用。",
      howStep1: "选择切片器与机型，下载单个或多个预设。",
      howStep2: "打开切片器 → 耗材 / Filament 设置 → 导入配置。",
      howStep3: "选择下载的 JSON（或解压 ZIP 后选择文件）完成导入。",
      footerNote: "IPCON · 高分子材料与 3D 打印耗材",
      footerGenerated: "索引生成时间",
      allOption: "全部",
      allSlicers: "全部切片器",
      metaMaterial: "材料",
      metaPrinter: "打印机",
      metaCompatible: "兼容机型",
      metaUpdated: "更新",
      loading: "正在加载预设索引…",
      loadError: "无法加载 index.json。请确认已运行 scripts/generate-index.js，并通过本地 HTTP 服务打开页面（不要直接用 file://）。",
      zipMissing: "JSZip 未加载，无法打包下载。请检查网络或 CDN。",
      zipEmpty: "请先勾选至少一个预设。",
      zipDone: "已开始下载 ZIP。",
      downloadFail: "下载失败，请稍后重试。",
      chipCount: (n) => `${n} 个文件`,
    },
    en: {
      brandTag: "Filament Presets",
      eyebrow: "ipcon materials",
      heroTitle: "IPCON",
      heroLead: "Tuned slicer presets for IPCON filaments — filter by material and printer, then download.",
      ctaBrowse: "Browse presets",
      ctaHow: "How to import",
      slicerTitle: "Choose a slicer",
      slicerDesc: "Pick a slicer first, then refine by material and printer.",
      filterMaterial: "Material",
      filterBrand: "Printer brand",
      filterModel: "Printer model",
      filterSearch: "Search",
      searchPlaceholder: "Name / material / model…",
      resetFilters: "Reset",
      resultSuffix: "presets",
      selectAll: "Select visible",
      downloadSelected: "Download ZIP",
      downloadOne: "Download",
      emptyText: "No matching presets. Try adjusting filters.",
      howTitle: "How to import",
      howDesc: "Download the JSON and import it as a filament profile in your slicer.",
      howStep1: "Choose slicer and printer, then download one or more presets.",
      howStep2: "Open your slicer → Filament settings → Import config.",
      howStep3: "Select the downloaded JSON (or unzip the archive first).",
      footerNote: "IPCON · polymer materials & 3D printing filaments",
      footerGenerated: "Index generated",
      allOption: "All",
      allSlicers: "All slicers",
      metaMaterial: "Material",
      metaPrinter: "Printer",
      metaCompatible: "Compatible",
      metaUpdated: "Updated",
      loading: "Loading preset index…",
      loadError: "Failed to load index.json. Run scripts/generate-index.js and open the site via a local HTTP server (not file://).",
      zipMissing: "JSZip is unavailable; ZIP download cannot run.",
      zipEmpty: "Select at least one preset first.",
      zipDone: "ZIP download started.",
      downloadFail: "Download failed. Please try again.",
      chipCount: (n) => `${n} file${n === 1 ? "" : "s"}`,
    },
  };

  const state = {
    lang: localStorage.getItem("ipcon-lang") || "zh",
    data: null,
    slicer: "",
    material: "",
    brand: "",
    model: "",
    search: "",
    selected: new Set(),
  };

  const els = {
    slicerGrid: document.getElementById("slicerGrid"),
    filterMaterial: document.getElementById("filterMaterial"),
    filterBrand: document.getElementById("filterBrand"),
    filterModel: document.getElementById("filterModel"),
    filterSearch: document.getElementById("filterSearch"),
    resetFilters: document.getElementById("resetFilters"),
    resultCount: document.getElementById("resultCount"),
    selectAll: document.getElementById("selectAll"),
    downloadSelected: document.getElementById("downloadSelected"),
    selectedCount: document.getElementById("selectedCount"),
    presetList: document.getElementById("presetList"),
    emptyState: document.getElementById("emptyState"),
    statusBanner: document.getElementById("statusBanner"),
    generatedAt: document.getElementById("generatedAt"),
  };

  function t(key) {
    const dict = I18N[state.lang] || I18N.zh;
    return dict[key] ?? I18N.zh[key] ?? key;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const value = t(key);
      if (typeof value === "string") node.textContent = value;
    });
    els.filterSearch.placeholder = t("searchPlaceholder");
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === state.lang);
    });
  }

  function setStatus(message, isError = false) {
    if (!message) {
      els.statusBanner.hidden = true;
      els.statusBanner.textContent = "";
      return;
    }
    els.statusBanner.hidden = false;
    els.statusBanner.textContent = message;
    els.statusBanner.classList.toggle("is-error", isError);
  }

  function fillSelect(select, values, current) {
    const allLabel = t("allOption");
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);

    values.forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });

    select.value = values.includes(current) ? current : "";
  }

  function uniqueFrom(presets, key) {
    return [...new Set(presets.map((p) => p[key]))].sort((a, b) =>
      a.localeCompare(b, "zh-CN", { sensitivity: "base" })
    );
  }

  function filteredPresets() {
    if (!state.data) return [];
    const q = state.search.trim().toLowerCase();

    return state.data.presets.filter((p) => {
      if (state.slicer && p.slicer !== state.slicer) return false;
      if (state.material && p.material !== state.material) return false;
      if (state.brand && p.brand !== state.brand) return false;
      if (state.model && p.model !== state.model) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.filename,
        p.material,
        p.brand,
        p.model,
        p.slicer,
        ...(p.compatible || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  function syncDependentFilters() {
    // Cascade options from the currently slicer-scoped set.
    let pool = state.data.presets;
    if (state.slicer) pool = pool.filter((p) => p.slicer === state.slicer);

    const materials = uniqueFrom(pool, "material");
    if (state.material && !materials.includes(state.material)) state.material = "";

    let brandPool = pool;
    if (state.material) brandPool = brandPool.filter((p) => p.material === state.material);
    const brands = uniqueFrom(brandPool, "brand");
    if (state.brand && !brands.includes(state.brand)) state.brand = "";

    let modelPool = brandPool;
    if (state.brand) modelPool = modelPool.filter((p) => p.brand === state.brand);
    const models = uniqueFrom(modelPool, "model");
    if (state.model && !models.includes(state.model)) state.model = "";

    fillSelect(els.filterMaterial, materials, state.material);
    fillSelect(els.filterBrand, brands, state.brand);
    fillSelect(els.filterModel, models, state.model);
    state.material = els.filterMaterial.value;
    state.brand = els.filterBrand.value;
    state.model = els.filterModel.value;
  }

  function slicerCounts() {
    const counts = {};
    state.data.presets.forEach((p) => {
      counts[p.slicer] = (counts[p.slicer] || 0) + 1;
    });
    return counts;
  }

  function renderSlicers() {
    const counts = slicerCounts();
    const slicers = state.data.slicers.length
      ? state.data.slicers
      : Object.keys(counts).sort();

    const frag = document.createDocumentFragment();

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `slicer-chip${state.slicer === "" ? " is-active" : ""}`;
    allBtn.setAttribute("role", "option");
    allBtn.setAttribute("aria-selected", state.slicer === "" ? "true" : "false");
    allBtn.innerHTML = `
      <span class="chip-name">${t("allSlicers")}</span>
      <span class="chip-count">${t("chipCount")(state.data.presets.length)}</span>
    `;
    allBtn.addEventListener("click", () => {
      state.slicer = "";
      renderSlicers();
      syncDependentFilters();
      renderList();
    });
    frag.appendChild(allBtn);

    slicers.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slicer-chip${state.slicer === name ? " is-active" : ""}`;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", state.slicer === name ? "true" : "false");
      btn.innerHTML = `
        <span class="chip-name">${escapeHtml(name)}</span>
        <span class="chip-count">${t("chipCount")(counts[name] || 0)}</span>
      `;
      btn.addEventListener("click", () => {
        state.slicer = name;
        renderSlicers();
        syncDependentFilters();
        renderList();
      });
      frag.appendChild(btn);
    });

    els.slicerGrid.replaceChildren(frag);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateSelectionUi(visibleIds) {
    const visibleSelected = visibleIds.filter((id) => state.selected.has(id));
    els.selectedCount.textContent = String(state.selected.size);
    els.downloadSelected.disabled = state.selected.size === 0;
    els.selectAll.checked =
      visibleIds.length > 0 && visibleSelected.length === visibleIds.length;
    els.selectAll.indeterminate =
      visibleSelected.length > 0 && visibleSelected.length < visibleIds.length;
  }

  function renderList() {
    const list = filteredPresets();
    els.resultCount.textContent = String(list.length);
    els.emptyState.hidden = list.length > 0;

    const frag = document.createDocumentFragment();
    const visibleIds = list.map((p) => p.id);

    list.forEach((preset) => {
      const card = document.createElement("article");
      card.className = `preset-card${state.selected.has(preset.id) ? " is-selected" : ""}`;
      card.dataset.id = preset.id;

      const compatible = (preset.compatible || []).join(" · ") || "—";

      card.innerHTML = `
        <label class="preset-check">
          <input type="checkbox" ${state.selected.has(preset.id) ? "checked" : ""} aria-label="${escapeHtml(preset.name)}" />
        </label>
        <div class="preset-main">
          <h3 class="preset-title">${escapeHtml(preset.name)}</h3>
          <div class="preset-meta">
            <span class="pill"><strong>${t("metaMaterial")}</strong> ${escapeHtml(preset.material)}</span>
            <span class="pill"><strong>${t("metaPrinter")}</strong> ${escapeHtml(preset.brand)} / ${escapeHtml(preset.model)}</span>
            <span class="pill pill-amber"><strong>${escapeHtml(preset.slicer)}</strong></span>
            <span class="pill"><strong>${t("metaCompatible")}</strong> ${escapeHtml(compatible)}</span>
          </div>
        </div>
        <div class="preset-side">
          <span class="updated">${t("metaUpdated")} ${escapeHtml(preset.updatedAt || "—")}</span>
          <button type="button" class="btn btn-ghost btn-download" data-action="download-one">${t("downloadOne")}</button>
        </div>
      `;

      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selected.add(preset.id);
        else state.selected.delete(preset.id);
        card.classList.toggle("is-selected", checkbox.checked);
        updateSelectionUi(visibleIds);
      });

      card.querySelector('[data-action="download-one"]').addEventListener("click", () => {
        downloadSingle(preset);
      });

      frag.appendChild(card);
    });

    els.presetList.replaceChildren(frag);
    updateSelectionUi(visibleIds);
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadSingle(preset) {
    try {
      const res = await fetch(encodePath(preset.path));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerBlobDownload(blob, preset.filename);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(t("downloadFail"), true);
    }
  }

  function encodePath(path) {
    // Encode each segment so spaces in printer names work on GitHub Pages.
    return path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  async function downloadZip() {
    if (!state.selected.size) {
      setStatus(t("zipEmpty"), true);
      return;
    }
    if (typeof JSZip === "undefined") {
      setStatus(t("zipMissing"), true);
      return;
    }

    const byId = new Map(state.data.presets.map((p) => [p.id, p]));
    const zip = new JSZip();
    const folder = zip.folder("IPCON-presets");

    try {
      els.downloadSelected.disabled = true;
      const entries = [...state.selected]
        .map((id) => byId.get(id))
        .filter(Boolean);

      for (const preset of entries) {
        const res = await fetch(encodePath(preset.path));
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${preset.path}`);
        const text = await res.text();
        // Keep folder structure inside the ZIP for clarity.
        const zipPath = `${preset.material}/${preset.brand}/${preset.model}/${preset.slicer}/${preset.filename}`;
        folder.file(zipPath, text);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `IPCON-presets-${stamp}.zip`);
      setStatus(t("zipDone"));
    } catch (err) {
      console.error(err);
      setStatus(t("downloadFail"), true);
    } finally {
      updateSelectionUi(filteredPresets().map((p) => p.id));
    }
  }

  function bindEvents() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.lang = btn.dataset.lang;
        localStorage.setItem("ipcon-lang", state.lang);
        applyI18n();
        if (state.data) {
          if (state.data.generatedAt) {
            const d = new Date(state.data.generatedAt);
            els.generatedAt.textContent = Number.isNaN(d.getTime())
              ? state.data.generatedAt
              : d.toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US");
          }
          renderSlicers();
          syncDependentFilters();
          renderList();
        }
      });
    });

    els.filterMaterial.addEventListener("change", () => {
      state.material = els.filterMaterial.value;
      syncDependentFilters();
      renderList();
    });
    els.filterBrand.addEventListener("change", () => {
      state.brand = els.filterBrand.value;
      syncDependentFilters();
      renderList();
    });
    els.filterModel.addEventListener("change", () => {
      state.model = els.filterModel.value;
      renderList();
    });
    els.filterSearch.addEventListener("input", () => {
      state.search = els.filterSearch.value;
      renderList();
    });
    els.resetFilters.addEventListener("click", () => {
      state.material = "";
      state.brand = "";
      state.model = "";
      state.search = "";
      els.filterSearch.value = "";
      syncDependentFilters();
      renderList();
    });

    els.selectAll.addEventListener("change", () => {
      const visible = filteredPresets();
      if (els.selectAll.checked) {
        visible.forEach((p) => state.selected.add(p.id));
      } else {
        visible.forEach((p) => state.selected.delete(p.id));
      }
      renderList();
    });

    els.downloadSelected.addEventListener("click", () => {
      downloadZip();
    });
  }

  async function init() {
    applyI18n();
    bindEvents();
    setStatus(t("loading"));

    try {
      const res = await fetch("index.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      setStatus("");

      if (state.data.generatedAt) {
        const d = new Date(state.data.generatedAt);
        els.generatedAt.textContent = Number.isNaN(d.getTime())
          ? state.data.generatedAt
          : d.toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US");
        els.generatedAt.dateTime = state.data.generatedAt;
      }

      renderSlicers();
      syncDependentFilters();
      renderList();
    } catch (err) {
      console.error(err);
      setStatus(t("loadError"), true);
      els.emptyState.hidden = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
