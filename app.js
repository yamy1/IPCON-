/**
 * IPCON 预设下载站 — 前端逻辑
 * 数据源：index.json（由 scripts/generate-index.js 生成）
 */

(() => {
  "use strict";

  const INDEX_URL = "index.json";

  /** 中英文文案（中文优先） */
  const I18N = {
    zh: {
      brandTag: "耗材预设",
      heroEyebrow: "高分子材料 · 切片预设",
      heroLead: "为你的打印机挑选经过调校的耗材预设，一键下载，直接导入切片器。",
      ctaBrowse: "浏览预设",
      ctaHow: "如何使用",
      presetsTitle: "预设下载",
      presetsDesc: "按切片器与机型筛选，支持单文件下载或多选打包。",
      filterSlicer: "切片器",
      filterMaterial: "材料",
      filterBrand: "打印机品牌",
      filterModel: "打印机型号",
      filterSearch: "搜索",
      searchPlaceholder: "名称 / 文件名…",
      selectAll: "全选当前列表",
      downloadSelected: "打包下载",
      colName: "预设",
      colMaterial: "材料",
      colPrinter: "打印机",
      colCompatible: "兼容机型",
      colSlicer: "切片器",
      colUpdated: "更新",
      colAction: "操作",
      loading: "正在加载预设…",
      empty: "没有符合条件的预设。",
      howTitle: "如何使用",
      howDesc: "三步将 IPCON 预设导入你的切片器。",
      step1Title: "筛选并下载",
      step1Desc: "选择切片器与机型，下载单个 JSON 或打包 ZIP。",
      step2Title: "导入切片器",
      step2Desc: "在 Bambu Studio / Orca / PrusaSlicer 等中导入耗材预设文件。",
      step3Title: "开始打印",
      step3Desc: "选择 IPCON 耗材配置，按推荐温度与速度开打。",
      footerTag: "IPCON 耗材 · 预设开放下载",
      all: "全部",
      download: "下载",
      resultCount: (n) => `共 ${n} 个预设`,
      toastDownloaded: "已开始下载",
      toastZipReady: "ZIP 打包完成",
      toastZipEmpty: "请先勾选至少一个预设",
      toastLoadError: "无法加载 index.json，请确认已运行 generate-index 脚本。",
      toastZipError: "打包失败，请重试",
      langSwitch: "EN",
    },
    en: {
      brandTag: "Filament Presets",
      heroEyebrow: "Polymer materials · Slicer presets",
      heroLead: "Pick tuned IPCON filament presets for your printer — download and import into your slicer.",
      ctaBrowse: "Browse presets",
      ctaHow: "How to use",
      presetsTitle: "Preset downloads",
      presetsDesc: "Filter by slicer and printer. Download one file or a ZIP pack.",
      filterSlicer: "Slicer",
      filterMaterial: "Material",
      filterBrand: "Printer brand",
      filterModel: "Printer model",
      filterSearch: "Search",
      searchPlaceholder: "Name / filename…",
      selectAll: "Select all in list",
      downloadSelected: "Download ZIP",
      colName: "Preset",
      colMaterial: "Material",
      colPrinter: "Printer",
      colCompatible: "Compatible",
      colSlicer: "Slicer",
      colUpdated: "Updated",
      colAction: "Action",
      loading: "Loading presets…",
      empty: "No presets match your filters.",
      howTitle: "How to use",
      howDesc: "Import IPCON presets into your slicer in three steps.",
      step1Title: "Filter & download",
      step1Desc: "Pick slicer and model, then download a JSON or ZIP.",
      step2Title: "Import",
      step2Desc: "Import the filament profile into Bambu Studio / Orca / PrusaSlicer.",
      step3Title: "Print",
      step3Desc: "Select the IPCON profile and print with the recommended settings.",
      footerTag: "IPCON filament · open preset downloads",
      all: "All",
      download: "Download",
      resultCount: (n) => `${n} preset${n === 1 ? "" : "s"}`,
      toastDownloaded: "Download started",
      toastZipReady: "ZIP ready",
      toastZipEmpty: "Select at least one preset",
      toastLoadError: "Failed to load index.json. Run the generate-index script first.",
      toastZipError: "ZIP failed. Please retry.",
      langSwitch: "中文",
    },
  };

  const state = {
    lang: localStorage.getItem("ipcon-lang") || "zh",
    data: null,
    selected: new Set(),
  };

  const els = {
    langToggle: document.getElementById("langToggle"),
    langLabel: document.getElementById("langLabel"),
    filterSlicer: document.getElementById("filterSlicer"),
    filterMaterial: document.getElementById("filterMaterial"),
    filterBrand: document.getElementById("filterBrand"),
    filterModel: document.getElementById("filterModel"),
    filterSearch: document.getElementById("filterSearch"),
    selectAll: document.getElementById("selectAll"),
    downloadSelected: document.getElementById("downloadSelected"),
    selectedCount: document.getElementById("selectedCount"),
    resultCount: document.getElementById("resultCount"),
    presetBody: document.getElementById("presetBody"),
    emptyState: document.getElementById("emptyState"),
    toast: document.getElementById("toast"),
    year: document.getElementById("year"),
  };

  function t(key) {
    const pack = I18N[state.lang] || I18N.zh;
    return pack[key] ?? I18N.zh[key] ?? key;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const val = t(key);
      if (typeof val === "string") node.textContent = val;
    });
    els.filterSearch.placeholder = t("searchPlaceholder");
    els.langLabel.textContent = t("langSwitch");
  }

  let toastTimer = null;
  function showToast(message) {
    els.toast.hidden = false;
    els.toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2600);
  }

  function fillSelect(select, values, keepValue) {
    const previous = keepValue ? select.value : "";
    const allLabel = t("all");
    select.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = allLabel;
    select.appendChild(optAll);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    if (previous && values.includes(previous)) select.value = previous;
    else select.value = "";
  }

  function populateFilters() {
    const { materials, brands, models, slicers } = state.data;
    fillSelect(els.filterSlicer, slicers, true);
    fillSelect(els.filterMaterial, materials, true);
    fillSelect(els.filterBrand, brands, true);
    // 型号随品牌联动
    syncModelOptions();
  }

  function syncModelOptions() {
    const brand = els.filterBrand.value;
    const models = brand
      ? [...new Set(
          state.data.presets
            .filter((p) => p.brand === brand)
            .map((p) => p.model)
        )].sort((a, b) => a.localeCompare(b, "zh-CN"))
      : state.data.models;
    fillSelect(els.filterModel, models, true);
  }

  function getFiltered() {
    const slicer = els.filterSlicer.value;
    const material = els.filterMaterial.value;
    const brand = els.filterBrand.value;
    const model = els.filterModel.value;
    const q = els.filterSearch.value.trim().toLowerCase();

    return state.data.presets.filter((p) => {
      if (slicer && p.slicer !== slicer) return false;
      if (material && p.material !== material) return false;
      if (brand && p.brand !== brand) return false;
      if (model && p.model !== model) return false;
      if (q) {
        const hay = [p.name, p.filename, p.material, p.brand, p.model, p.slicer]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderTable() {
    const list = getFiltered();
    els.resultCount.textContent = t("resultCount")(list.length);
    els.emptyState.hidden = list.length > 0;

    if (!list.length) {
      els.presetBody.innerHTML = "";
      els.selectAll.checked = false;
      els.selectAll.indeterminate = false;
      updateSelectionUI();
      return;
    }

    const rows = list
      .map((p) => {
        const checked = state.selected.has(p.id) ? "checked" : "";
        const compat = (p.compatibleModels || []).join(", ");
        return `
          <tr data-id="${escapeHtml(p.id)}">
            <td class="col-check">
              <input type="checkbox" class="row-check" data-id="${escapeHtml(p.id)}" ${checked} aria-label="${escapeHtml(p.name)}" />
            </td>
            <td>
              <span class="preset-name">${escapeHtml(p.name)}</span>
              <span class="preset-file">${escapeHtml(p.filename)}</span>
            </td>
            <td><span class="tag">${escapeHtml(p.material)}</span></td>
            <td>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</td>
            <td class="compat">${escapeHtml(compat)}</td>
            <td><span class="tag tag--amber">${escapeHtml(p.slicer)}</span></td>
            <td>${escapeHtml(p.updatedAt || "—")}</td>
            <td>
              <button type="button" class="btn btn--tiny download-one" data-path="${escapeHtml(p.path)}" data-filename="${escapeHtml(p.filename)}">
                ${t("download")}
              </button>
            </td>
          </tr>`;
      })
      .join("");

    els.presetBody.innerHTML = rows;

    const visibleIds = list.map((p) => p.id);
    const selectedVisible = visibleIds.filter((id) => state.selected.has(id));
    els.selectAll.checked = selectedVisible.length === visibleIds.length;
    els.selectAll.indeterminate =
      selectedVisible.length > 0 && selectedVisible.length < visibleIds.length;

    updateSelectionUI();
  }

  function updateSelectionUI() {
    const n = state.selected.size;
    els.selectedCount.textContent = String(n);
    els.downloadSelected.disabled = n === 0;
  }

  /** 对含空格的 preset 路径做分段编码，保证 fetch 可用 */
  function encodeAssetPath(path) {
    return path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  /** 触发浏览器下载 Blob / 链接 */
  function triggerDownload(blobOrUrl, filename) {
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof blobOrUrl !== "string") {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  async function downloadOne(path, filename) {
    const res = await fetch(encodeAssetPath(path));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    triggerDownload(blob, filename || path.split("/").pop());
    showToast(t("toastDownloaded"));
  }

  async function downloadZip() {
    if (!state.selected.size) {
      showToast(t("toastZipEmpty"));
      return;
    }
    if (typeof JSZip === "undefined") {
      showToast(t("toastZipError"));
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("ipcon-presets");
    const picked = state.data.presets.filter((p) => state.selected.has(p.id));

    els.downloadSelected.disabled = true;

    try {
      await Promise.all(
        picked.map(async (p) => {
          const res = await fetch(encodeAssetPath(p.path));
          if (!res.ok) throw new Error(`${p.path}: ${res.status}`);
          const text = await res.text();
          // ZIP 内保留相对目录，避免同名覆盖
          const zipPath = p.path.replace(/^preset\//, "");
          folder.file(zipPath, text);
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `IPCON-presets-${stamp}.zip`);
      showToast(t("toastZipReady"));
    } catch (err) {
      console.error(err);
      showToast(t("toastZipError"));
    } finally {
      updateSelectionUI();
    }
  }

  function bindEvents() {
    els.langToggle.addEventListener("click", () => {
      state.lang = state.lang === "zh" ? "en" : "zh";
      localStorage.setItem("ipcon-lang", state.lang);
      applyI18n();
      populateFilters();
      renderTable();
    });

    ["filterSlicer", "filterMaterial", "filterModel", "filterSearch"].forEach((id) => {
      els[id].addEventListener("input", () => {
        // 搜索用 input，下拉也兼容
        renderTable();
      });
      els[id].addEventListener("change", renderTable);
    });

    els.filterBrand.addEventListener("change", () => {
      syncModelOptions();
      renderTable();
    });

    els.selectAll.addEventListener("change", () => {
      const list = getFiltered();
      if (els.selectAll.checked) {
        list.forEach((p) => state.selected.add(p.id));
      } else {
        list.forEach((p) => state.selected.delete(p.id));
      }
      renderTable();
    });

    els.presetBody.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains("row-check")) return;
      const id = target.dataset.id;
      if (target.checked) state.selected.add(id);
      else state.selected.delete(id);
      updateSelectionUI();
      // 同步全选框状态
      const list = getFiltered();
      const selectedVisible = list.filter((p) => state.selected.has(p.id));
      els.selectAll.checked = selectedVisible.length === list.length && list.length > 0;
      els.selectAll.indeterminate =
        selectedVisible.length > 0 && selectedVisible.length < list.length;
    });

    els.presetBody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".download-one");
      if (!btn) return;
      btn.disabled = true;
      try {
        await downloadOne(btn.dataset.path, btn.dataset.filename);
      } catch (err) {
        console.error(err);
        showToast(t("toastLoadError"));
      } finally {
        btn.disabled = false;
      }
    });

    els.downloadSelected.addEventListener("click", downloadZip);
  }

  async function init() {
    els.year.textContent = String(new Date().getFullYear());
    applyI18n();
    bindEvents();

    try {
      const res = await fetch(INDEX_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      populateFilters();
      renderTable();
    } catch (err) {
      console.error(err);
      els.presetBody.innerHTML = `<tr class="loading-row"><td colspan="8">${escapeHtml(t("toastLoadError"))}</td></tr>`;
      showToast(t("toastLoadError"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
