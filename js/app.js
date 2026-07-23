let state = {
  tab: "dashboard",
  wrFilter: { category: "", season: "", occasion: "", q: "" },
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  calOverlayCycle: false,
  jrQuery: "",
  pinBuffer: "",
  pinMode: null // 'unlock' | 'setup'
};

function t(key, params) { return I18N.t(key, params); }

function init() {
  Store.load();
  I18N.setLang(Store.data.settings.lang || "en");
  applyTheme();
  render();
}

function applyTheme() {
  const theme = Store.data.settings.theme || "system";
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

function switchTab(tab) {
  state.tab = tab;
  render();
}

function closeModal() {
  const el = document.getElementById("modal-root");
  if (el) el.innerHTML = "";
}

function openModal(html) {
  const el = document.getElementById("modal-root");
  el.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><div class="modal-inner-wrap"><div class="modal" data-stop>${html}</div></div></div>`;
}

document.addEventListener("click", function (e) {
  const stopEl = e.target.closest("[data-stop]");
  const backdrop = e.target.closest("[data-action='backdrop-close']");
  if (backdrop && !stopEl.contains(e.target)) { /* unreachable guard */ }
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-action");
  const id = actionEl.getAttribute("data-id");
  handleAction(action, id, actionEl, e);
});

function handleAction(action, id, el, e) {
  switch (action) {
    case "backdrop-close":
      if (e.target === el) closeModal();
      break;
    case "switch-tab": switchTab(el.getAttribute("data-tab")); break;
    case "toggle-theme": openThemeMenu(); break;
    case "toggle-lang":
      I18N.setLang(I18N.lang === "en" ? "fr" : "en");
      Store.data.settings.lang = I18N.lang;
      Store.save();
      render();
      break;
    case "close-modal": closeModal(); break;

    case "open-add-item": openItemModal(); break;
    case "open-edit-item": openItemModal(id); break;
    case "save-item": saveItem(id); break;
    case "delete-item": deleteItem(id); break;
    case "toggle-item-favorite": toggleItemFavorite(id); break;
    case "mark-item-worn": markItemWorn(id); break;
    case "set-item-status": setItemStatus(id, el.value !== undefined ? el.value : el.getAttribute("data-status")); break;
    case "wr-filter-chip": setWrFilter(el.getAttribute("data-key"), el.getAttribute("data-value")); break;

    case "open-add-outfit": openOutfitModal(); break;
    case "open-outfit-detail": openOutfitDetail(id); break;
    case "save-outfit": saveOutfit(); break;
    case "delete-outfit": deleteOutfit(id); break;
    case "toggle-outfit-favorite": toggleOutfitFavorite(id); break;
    case "outfit-mark-worn": outfitMarkWorn(id); break;
    case "outfit-suggest-random": suggestRandomOutfit(); break;
    case "outfit-link-event": linkOutfitToEvent(id, el.value); break;

    case "cy-log-day": openCycleLogModal(); break;
    case "cy-save-day": saveCycleDay(); break;
    case "cy-delete-entry": deleteCycleEntry(id); break;
    case "cy-pin-key": pinKeyPress(el.getAttribute("data-key")); break;
    case "cy-unlock-attempt": break;

    case "cal-prev-month": changeMonth(-1); break;
    case "cal-next-month": changeMonth(1); break;
    case "cal-day-click": openDayModal(el.getAttribute("data-date")); break;
    case "open-add-event": openEventModal(el.getAttribute("data-date")); break;
    case "save-event": saveEvent(); break;
    case "delete-event": deleteEvent(id); break;
    case "toggle-cal-overlay": state.calOverlayCycle = !state.calOverlayCycle; render(); break;

    case "open-add-journal": openJournalModal(); break;
    case "save-journal": saveJournal(); break;
    case "delete-journal": deleteJournal(id); break;
    case "jr-mood": selectJournalMood(el.getAttribute("data-mood")); break;

    case "set-lang": setLanguage(el.getAttribute("data-lang")); break;
    case "set-theme-choice": setThemeChoice(el.getAttribute("data-theme")); break;
    case "save-profile": saveProfile(); break;
    case "toggle-pin-enable": togglePinEnable(); break;
    case "save-pin": savePin(); break;
    case "export-data": exportData(); break;
    case "erase-data": eraseData(); break;
    default: break;
  }
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    ${renderTopbar()}
    <div id="modal-root"></div>
    <main id="main">${renderMain()}</main>
    ${renderFab()}
    ${renderTabbar()}
  `;
}

function renderTopbar() {
  const titles = {
    dashboard: t("dash_title"), wardrobe: t("wr_title"), outfits: t("ot_title"),
    cycle: t("cy_title"), calendar: t("cal_title"), journal: t("jr_title"), settings: t("set_title")
  };
  return `
  <div class="topbar">
    <h1>${titles[state.tab] || t("app_name")}</h1>
    <div class="topbar-actions">
      <button class="icon-btn" data-action="toggle-lang" title="Language">${I18N.lang.toUpperCase()}</button>
      <button class="icon-btn" data-action="toggle-theme" title="Theme">🌓</button>
    </div>
  </div>`;
}

function renderTabbar() {
  const tabs = [
    ["dashboard", "🏠", "tab_dashboard"],
    ["wardrobe", "👗", "tab_wardrobe"],
    ["outfits", "🧥", "tab_outfits"],
    ...(Store.data.settings.hideCycleTab ? [] : [["cycle", "🩷", "tab_cycle"]]),
    ["calendar", "📅", "tab_calendar"],
    ["journal", "📓", "tab_journal"],
    ["settings", "⚙️", "tab_settings"]
  ];
  return `<div class="tabbar">
    ${tabs.map(([key, ico, label]) => `
      <button class="tab-btn ${state.tab === key ? "active" : ""}" data-action="switch-tab" data-tab="${key}">
        <span class="ico">${ico}</span><span>${t(label)}</span>
      </button>`).join("")}
  </div>`;
}

function renderFab() {
  const map = {
    wardrobe: "open-add-item", outfits: "open-add-outfit", journal: "open-add-journal"
  };
  const action = map[state.tab];
  if (!action) return "";
  if (state.tab === "journal" && isLocked("journal")) return "";
  return `<button class="fab" data-action="${action}">+</button>`;
}

function renderMain() {
  switch (state.tab) {
    case "dashboard": return renderDashboard();
    case "wardrobe": return renderWardrobe();
    case "outfits": return renderOutfits();
    case "cycle": return renderCycle();
    case "calendar": return renderCalendar();
    case "journal": return renderJournal();
    case "settings": return renderSettings();
    default: return "";
  }
}

// ---------- helpers ----------
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(I18N.lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function photoOrPh(photo, icon) {
  return photo ? `<img src="${photo}">` : `<div class="item-photo-ph">${icon}</div>`;
}

// ================= DASHBOARD =================
function renderDashboard() {
  const d = Store.data;
  const today = todayISO();
  const todayEvents = d.events.filter(e => e.date === today);
  const neverWorn = d.items.filter(i => !i.wornDates || i.wornDates.length === 0).length;
  const monthsTracked = new Set(d.cycleEntries.map(e => e.date.slice(0, 7))).size;
  const suggested = d.outfits.length ? d.outfits[Math.floor(Math.random() * d.outfits.length)] : null;
  const cyclePhase = d.cycleEntries.length ? computeCyclePhase(today) : null;

  return `
  <div class="stat-grid">
    <div class="stat-card"><div class="num">${d.items.length}</div><div class="label">${t("dash_items")}</div></div>
    <div class="stat-card"><div class="num">${d.outfits.length}</div><div class="label">${t("dash_outfits")}</div></div>
    <div class="stat-card"><div class="num">${d.journalEntries.length}</div><div class="label">${t("dash_journal_entries")}</div></div>
    <div class="stat-card"><div class="num">${neverWorn}</div><div class="label">${t("dash_never_worn")}</div></div>
  </div>
  <div class="card">
    <h3>${t("dash_today_event")}</h3>
    ${todayEvents.length ? todayEvents.map(e => `<div class="list-row"><span>${escapeHtml(e.title)}</span><span class="muted">${e.time || ""}</span></div>`).join("") : `<p class="muted">${t("dash_no_event")}</p>`}
  </div>
  <div class="card">
    <h3>${t("dash_suggested_outfit")}</h3>
    ${suggested ? `<div class="list-row"><span>${escapeHtml(suggested.name)}</span><button class="btn sm" data-action="open-outfit-detail" data-id="${suggested.id}">${t("common_edit")}</button></div>` : `<p class="muted">${t("dash_no_outfit")}</p>`}
  </div>
  <div class="card">
    <h3>${t("dash_cycle_status")}</h3>
    ${cyclePhase ? `<p>${t("cy_phase_" + cyclePhase)} · ${t("dash_cycle_months")}: ${monthsTracked}</p>` : `<p class="muted">${t("dash_no_cycle_data")}</p>`}
  </div>`;
}

// ================= WARDROBE =================
const CATEGORIES = ["top", "bottom", "dress", "shoes", "bag", "accessory", "outerwear"];
const SEASONS = ["all", "spring", "summer", "autumn", "winter"];
const OCCASIONS = ["daily", "work", "sport", "party"];
const STATUSES = ["available", "laundry", "lent", "lost", "given"];

function renderWardrobe() {
  const d = Store.data;
  let items = d.items.slice();
  const f = state.wrFilter;
  if (f.category) items = items.filter(i => i.category === f.category);
  if (f.season) items = items.filter(i => i.season === f.season);
  if (f.occasion) items = items.filter(i => (i.tags || []).includes(f.occasion) || i.occasion === f.occasion);
  if (f.q) items = items.filter(i => JSON.stringify(i).toLowerCase().includes(f.q.toLowerCase()));

  const favCount = d.items.filter(i => i.favorite).length;
  const neverCount = d.items.filter(i => !i.wornDates || !i.wornDates.length).length;
  const recentCount = d.items.filter(i => i.wornDates && i.wornDates.length && daysBetween(i.wornDates[i.wornDates.length - 1], todayISO()) <= 7).length;

  return `
  <input type="text" placeholder="${t("common_search")}" value="${escapeHtml(f.q)}" oninput="state.wrFilter.q=this.value; renderWardrobeList();" style="margin-bottom:10px" />
  <div class="chip-group" style="margin-bottom:10px">
    ${CATEGORIES.map(c => `<span class="chip ${f.category === c ? "selected" : ""}" data-action="wr-filter-chip" data-key="category" data-value="${c}">${t("wr_cat_" + c)}</span>`).join("")}
  </div>
  <div class="chip-group" style="margin-bottom:10px">
    ${SEASONS.map(s => `<span class="chip ${f.season === s ? "selected" : ""}" data-action="wr-filter-chip" data-key="season" data-value="${s}">${t("wr_season_" + s)}</span>`).join("")}
  </div>
  <div class="chip-group" style="margin-bottom:14px">
    ${OCCASIONS.map(o => `<span class="chip ${f.occasion === o ? "selected" : ""}" data-action="wr-filter-chip" data-key="occasion" data-value="${o}">${t("wr_occasion_" + o)}</span>`).join("")}
  </div>
  <div class="card">
    <h3>${t("wr_stats_title")}</h3>
    <div class="stat-grid mb-0">
      <div class="stat-card"><div class="num">${favCount}</div><div class="label">${t("wr_stats_favorites")}</div></div>
      <div class="stat-card"><div class="num">${recentCount}</div><div class="label">${t("wr_stats_recent")}</div></div>
      <div class="stat-card"><div class="num">${neverCount}</div><div class="label">${t("wr_stats_never")}</div></div>
    </div>
  </div>
  <div id="wr-list">${renderWardrobeGrid(items)}</div>`;
}

function renderWardrobeGrid(items) {
  if (!items.length) return `<div class="empty-state"><span class="ico">👗</span>${t("wr_empty")}</div>`;
  return `<div class="item-grid">${items.map(i => `
    <div class="item-card" data-action="open-edit-item" data-id="${i.id}">
      ${photoOrPh(i.photo, "👕")}
      <div class="item-info">
        <div class="name">${escapeHtml(i.brand || t("wr_cat_" + i.category))}</div>
        <div class="meta">${t("wr_cat_" + i.category)} · ${escapeHtml(i.color || "")}</div>
        <span class="badge">${i.wornDates && i.wornDates.length ? t("wr_times_worn", { n: i.wornDates.length }) : t("wr_never_worn")}</span>
      </div>
    </div>`).join("")}</div>`;
}

function setWrFilter(key, value) {
  state.wrFilter[key] = state.wrFilter[key] === value ? "" : value;
  render();
}
function renderWardrobeList() {
  const d = Store.data;
  let items = d.items.slice();
  const f = state.wrFilter;
  if (f.category) items = items.filter(i => i.category === f.category);
  if (f.season) items = items.filter(i => i.season === f.season);
  if (f.occasion) items = items.filter(i => (i.tags || []).includes(f.occasion) || i.occasion === f.occasion);
  if (f.q) items = items.filter(i => JSON.stringify(i).toLowerCase().includes(f.q.toLowerCase()));
  document.getElementById("wr-list").innerHTML = renderWardrobeGrid(items);
}

function openItemModal(id) {
  const item = id ? Store.data.items.find(i => i.id === id) : null;
  openModal(`
    <div class="modal-header"><h2>${item ? t("common_edit") : t("wr_add_item")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="photo-upload" id="photo-upload-box">
      ${item && item.photo ? `<img src="${item.photo}" id="photo-preview">` : `<div id="photo-preview-ph">📷 ${t("common_choose_photo")}</div>`}
      <input type="file" accept="image/*" id="f-photo-input">
    </div>
    <div class="field"><label>${t("wr_category")}</label>
      <select id="f-category">${CATEGORIES.map(c => `<option value="${c}" ${item && item.category === c ? "selected" : ""}>${t("wr_cat_" + c)}</option>`).join("")}</select>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_color")}</label><input id="f-color" value="${escapeHtml(item ? item.color : "")}"></div>
      <div class="field"><label>${t("wr_material")}</label><input id="f-material" value="${escapeHtml(item ? item.material : "")}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_brand")}</label><input id="f-brand" value="${escapeHtml(item ? item.brand : "")}"></div>
      <div class="field"><label>${t("wr_size")}</label><input id="f-size" value="${escapeHtml(item ? item.size : "")}"></div>
    </div>
    <div class="field"><label>${t("wr_season")}</label>
      <select id="f-season">${SEASONS.map(s => `<option value="${s}" ${item && item.season === s ? "selected" : ""}>${t("wr_season_" + s)}</option>`).join("")}</select>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_purchase_date")}</label><input type="date" id="f-purchase" value="${item ? item.purchaseDate || "" : ""}"></div>
      <div class="field"><label>${t("wr_price")} (${t("common_optional")})</label><input type="number" id="f-price" value="${item ? item.price || "" : ""}"></div>
    </div>
    <div class="field"><label>${t("common_tags")} (${t("common_tags_hint")})</label><input id="f-tags" value="${item ? (item.tags || []).join(", ") : ""}"></div>
    <div class="field"><label>${t("wr_status")}</label>
      <select id="f-status">${STATUSES.map(s => `<option value="${s}" ${item && item.status === s ? "selected" : ""}>${t("wr_status_" + s)}</option>`).join("")}</select>
    </div>
    ${item ? `
    <p class="muted">${item.wornDates && item.wornDates.length ? t("wr_times_worn", { n: item.wornDates.length }) : t("wr_never_worn")}${item.wornDates && item.wornDates.length ? " · " + t("wr_last_worn", { date: fmtDate(item.wornDates[item.wornDates.length - 1]) }) : ""}</p>
    <div class="grid-2" style="margin-bottom:12px">
      <button class="btn secondary" data-action="toggle-item-favorite" data-id="${item.id}">${item.favorite ? "★ " : "☆ "}${t("common_favorite")}</button>
      <button class="btn secondary" data-action="mark-item-worn" data-id="${item.id}">${t("ot_mark_worn_today")}</button>
    </div>
    ` : ""}
    <button class="btn block" data-action="save-item" data-id="${item ? item.id : ""}">${t("common_save")}</button>
    ${item ? `<button class="btn secondary block" style="margin-top:8px" data-action="delete-item" data-id="${item.id}">${t("common_delete")}</button>` : ""}
  `);
  let pendingPhoto = item ? item.photo : null;
  const input = document.getElementById("f-photo-input");
  input.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      resizeImageFile(this.files[0], 800, (dataUrl) => {
        pendingPhoto = dataUrl;
        document.getElementById("photo-upload-box").querySelector("img, #photo-preview-ph").outerHTML = `<img src="${dataUrl}" id="photo-preview">`;
      });
    }
  });
  window.__pendingPhoto = () => pendingPhoto;
}

function saveItem(id) {
  const photo = window.__pendingPhoto ? window.__pendingPhoto() : null;
  const data = {
    photo,
    category: document.getElementById("f-category").value,
    color: document.getElementById("f-color").value,
    material: document.getElementById("f-material").value,
    brand: document.getElementById("f-brand").value,
    size: document.getElementById("f-size").value,
    season: document.getElementById("f-season").value,
    purchaseDate: document.getElementById("f-purchase").value,
    price: document.getElementById("f-price").value,
    tags: document.getElementById("f-tags").value.split(",").map(s => s.trim()).filter(Boolean),
    status: document.getElementById("f-status").value
  };
  if (id) {
    const item = Store.data.items.find(i => i.id === id);
    Object.assign(item, data);
  } else {
    Store.data.items.push(Object.assign({ id: uid(), favorite: false, wornDates: [] }, data));
  }
  Store.save();
  closeModal();
  render();
}

function deleteItem(id) {
  if (!confirm(t("common_confirm_delete"))) return;
  Store.data.items = Store.data.items.filter(i => i.id !== id);
  Store.save();
  closeModal();
  render();
}
function toggleItemFavorite(id) {
  const item = Store.data.items.find(i => i.id === id);
  item.favorite = !item.favorite;
  Store.save();
  render();
  openItemModal(id);
}
function markItemWorn(id) {
  const item = Store.data.items.find(i => i.id === id);
  item.wornDates = item.wornDates || [];
  item.wornDates.push(todayISO());
  Store.save();
  render();
  openItemModal(id);
}

// ================= OUTFITS =================
function renderOutfits() {
  const d = Store.data;
  return `
  <button class="btn block" style="margin-bottom:12px" data-action="outfit-suggest-random">🎲 ${t("ot_suggest_random")}</button>
  ${d.outfits.length ? d.outfits.map(o => renderOutfitCard(o)).join("") : `<div class="empty-state"><span class="ico">🧥</span>${t("ot_empty")}</div>`}
  `;
}
function renderOutfitCard(o) {
  const cover = o.wornLog && o.wornLog.length && o.wornLog[o.wornLog.length - 1].photo;
  return `<div class="card" data-action="open-outfit-detail" data-id="${o.id}" style="cursor:pointer">
    <div class="row-between">
      <h3>${escapeHtml(o.name)} ${o.favorite ? "⭐" : ""}</h3>
      <span class="muted">${o.occasion ? t("wr_occasion_" + o.occasion) : ""}</span>
    </div>
    ${cover ? `<img src="${cover}" style="width:100%;border-radius:10px;max-height:160px;object-fit:cover">` : ""}
    <p class="muted">${o.wornLog ? o.wornLog.length : 0} × worn</p>
  </div>`;
}

function openOutfitModal() {
  const items = Store.data.items;
  openModal(`
    <div class="modal-header"><h2>${t("ot_add_outfit")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("ot_name")}</label><input id="f-oname"></div>
    <div class="field"><label>${t("ot_select_items")}</label>
      <div class="item-grid" style="max-height:240px;overflow-y:auto">
        ${items.map(i => `<label class="item-card" style="display:block">
          <input type="checkbox" class="f-oitem" value="${i.id}" style="position:absolute;margin:6px">
          ${photoOrPh(i.photo, "👕")}
          <div class="item-info"><div class="name">${t("wr_cat_" + i.category)}</div></div>
        </label>`).join("") || `<p class="muted">${t("wr_empty")}</p>`}
      </div>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("ot_occasion")}</label>
        <select id="f-oocc">${OCCASIONS.map(o => `<option value="${o}">${t("wr_occasion_" + o)}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${t("ot_weather")}</label>
        <select id="f-oweather">
          <option value="sunny">${t("ot_weather_sunny")}</option>
          <option value="rainy">${t("ot_weather_rainy")}</option>
          <option value="cold">${t("ot_weather_cold")}</option>
          <option value="mild">${t("ot_weather_mild")}</option>
        </select>
      </div>
    </div>
    <button class="btn block" data-action="save-outfit">${t("common_save")}</button>
  `);
}

function saveOutfit() {
  const name = document.getElementById("f-oname").value || "Outfit";
  const itemIds = Array.from(document.querySelectorAll(".f-oitem:checked")).map(el => el.value);
  const outfit = {
    id: uid(), name, itemIds,
    occasion: document.getElementById("f-oocc").value,
    weather: document.getElementById("f-oweather").value,
    favorite: false, wornLog: [], linkedEventId: null
  };
  Store.data.outfits.push(outfit);
  Store.save();
  closeModal();
  render();
}

function openOutfitDetail(id) {
  const o = Store.data.outfits.find(x => x.id === id);
  const items = Store.data.items.filter(i => o.itemIds.includes(i.id));
  const upcoming = Store.data.events.filter(e => e.date >= todayISO());
  openModal(`
    <div class="modal-header"><h2>${escapeHtml(o.name)}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="item-grid">${items.map(i => `<div class="item-card">${photoOrPh(i.photo, "👕")}</div>`).join("")}</div>
    <div class="field" style="margin-top:12px">
      <button class="btn secondary block" data-action="toggle-outfit-favorite" data-id="${o.id}">${o.favorite ? "★ " + t("common_favorite") : "☆ " + t("common_favorite")}</button>
    </div>
    <button class="btn block" data-action="outfit-mark-worn" data-id="${o.id}">${t("ot_mark_worn_today")}</button>
    <div class="field" style="margin-top:12px"><label>${t("ot_link_event")}</label>
      <select data-action="outfit-link-event" data-id="${o.id}">
        <option value="">${t("common_none")}</option>
        ${upcoming.length ? upcoming.map(e => `<option value="${e.id}" ${o.linkedEventId === e.id ? "selected" : ""}>${escapeHtml(e.title)} (${fmtDate(e.date)})</option>`).join("") : `<option disabled>${t("ot_no_event_available")}</option>`}
      </select>
    </div>
    <h3 style="margin-top:14px">${t("ot_history")}</h3>
    ${o.wornLog && o.wornLog.length ? o.wornLog.slice().reverse().map(w => `<div class="list-row"><span>${t("ot_worn_on", { date: fmtDate(w.date) })}</span></div>`).join("") : `<p class="muted">${t("common_empty_generic")}</p>`}
    <button class="btn secondary block" style="margin-top:14px" data-action="delete-outfit" data-id="${o.id}">${t("common_delete")}</button>
  `);
}

function deleteOutfit(id) {
  if (!confirm(t("common_confirm_delete"))) return;
  Store.data.outfits = Store.data.outfits.filter(o => o.id !== id);
  Store.save();
  closeModal();
  render();
}
function toggleOutfitFavorite(id) {
  const o = Store.data.outfits.find(x => x.id === id);
  o.favorite = !o.favorite;
  Store.save();
  render();
  openOutfitDetail(id);
}
function outfitMarkWorn(id) {
  const o = Store.data.outfits.find(x => x.id === id);
  o.wornLog = o.wornLog || [];
  o.wornLog.push({ date: todayISO(), photo: null });
  Store.save();
  render();
  openOutfitDetail(id);
}
function linkOutfitToEvent(id, eventId) {
  const o = Store.data.outfits.find(x => x.id === id);
  o.linkedEventId = eventId || null;
  Store.save();
}
function suggestRandomOutfit() {
  const d = Store.data.outfits;
  if (!d.length) { render(); return; }
  const pick = d[Math.floor(Math.random() * d.length)];
  openOutfitDetail(pick.id);
}

// ================= CYCLE =================
function computeCycleStats() {
  const entries = Store.data.cycleEntries.filter(e => e.flow && e.flow !== "none").sort((a, b) => a.date.localeCompare(b.date));
  const periods = [];
  entries.forEach(e => {
    const last = periods[periods.length - 1];
    if (last && daysBetween(last.end, e.date) <= 1) last.end = e.date;
    else periods.push({ start: e.date, end: e.date });
  });
  const starts = periods.map(p => p.start);
  const cycleLengths = [];
  for (let i = 1; i < starts.length; i++) cycleLengths.push(daysBetween(starts[i - 1], starts[i]));
  const avgCycle = cycleLengths.length ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null;
  const lastStart = starts[starts.length - 1] || null;
  const nextPeriod = lastStart && avgCycle ? addDays(lastStart, avgCycle) : null;
  const ovulation = nextPeriod ? addDays(nextPeriod, -14) : null;
  const fertileStart = ovulation ? addDays(ovulation, -5) : null;
  const fertileEnd = ovulation ? addDays(ovulation, 1) : null;
  return { periods, avgCycle, lastStart, nextPeriod, ovulation, fertileStart, fertileEnd };
}

function computeCyclePhase(dateISO) {
  const stats = computeCycleStats();
  for (const p of stats.periods) {
    if (dateISO >= p.start && dateISO <= p.end) return "menstrual";
  }
  if (!stats.lastStart) return "unknown";
  if (dateISO < stats.lastStart) return "unknown";
  const cycleDay = daysBetween(stats.lastStart, dateISO) + 1;
  const avg = stats.avgCycle || 28;
  const ovulationDay = avg - 14;
  if (cycleDay <= 5) return "menstrual";
  if (cycleDay < ovulationDay - 2) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

function isLocked(section) {
  const s = Store.data.settings;
  if (section === "cycle" && s.hideCycleTab) return false;
  if (!s.pinEnabled) return false;
  return !Store.data.unlocked;
}

function renderLockScreen(msgKey) {
  const dots = state.pinBuffer.length;
  return `<div class="lock-screen">
    <span class="ico">🔒</span>
    <p>${t(msgKey)}</p>
    <div class="pin-dots">${[0, 1, 2, 3].map(i => `<span class="${i < dots ? "filled" : ""}"></span>`).join("")}</div>
    <div class="pin-keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-action="cy-pin-key" data-key="${n}">${n}</button>`).join("")}
      <button data-action="cy-pin-key" data-key="clear">C</button>
      <button data-action="cy-pin-key" data-key="0">0</button>
      <button data-action="cy-pin-key" data-key="back">⌫</button>
    </div>
  </div>`;
}

function pinKeyPress(key) {
  if (key === "clear") state.pinBuffer = "";
  else if (key === "back") state.pinBuffer = state.pinBuffer.slice(0, -1);
  else if (state.pinBuffer.length < 4) state.pinBuffer += key;
  if (state.pinBuffer.length === 4) {
    if (state.pinBuffer === Store.data.settings.pin) {
      Store.data.unlocked = true;
      state.pinBuffer = "";
    } else {
      state.pinBuffer = "";
    }
  }
  render();
}

function renderCycle() {
  if (isLocked("cycle")) return renderLockScreen("cy_locked_msg");
  const stats = computeCycleStats();
  const entries = Store.data.cycleEntries.slice().sort((a, b) => b.date.localeCompare(a.date));
  return `
  <button class="btn block" style="margin-bottom:12px" data-action="cy-log-day">${t("cy_log_day")}</button>
  <div class="card">
    <h3>${t("cy_prediction")}</h3>
    ${stats.avgCycle ? `
      <p>${t("cy_next_period", { date: fmtDate(stats.nextPeriod) })}</p>
      <p>${t("cy_fertile_window", { start: fmtDate(stats.fertileStart), end: fmtDate(stats.fertileEnd) })}</p>
      <p class="muted">${t("cy_avg_cycle", { n: stats.avgCycle })}</p>
    ` : `<p class="muted">${t("cy_not_enough_data")}</p>`}
  </div>
  ${renderQuarterlyAnalysis()}
  <div class="card">
    <h3>${t("cy_history")}</h3>
    ${entries.length ? entries.map(e => `
      <div class="list-row">
        <span>${fmtDate(e.date)} · ${t("cy_flow_" + e.flow)}</span>
        <button class="icon-btn" data-action="cy-delete-entry" data-id="${e.id}">✕</button>
      </div>`).join("") : `<p class="muted">${t("cy_empty")}</p>`}
  </div>`;
}

function renderQuarterlyAnalysis() {
  const cutoff = addDays(todayISO(), -90);
  const recent = Store.data.cycleEntries.filter(e => e.date >= cutoff);
  if (recent.length < 3) return `<div class="card"><h3>${t("cy_analysis_title")}</h3><p class="muted">${t("cy_analysis_empty")}</p></div>`;
  const symptomCounts = {};
  recent.forEach(e => (e.symptoms || []).forEach(s => symptomCounts[s] = (symptomCounts[s] || 0) + 1));
  const sorted = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);
  return `<div class="card">
    <h3>${t("cy_analysis_title")}</h3>
    <p class="muted">${t("cy_analysis_body")}</p>
    ${sorted.length ? sorted.map(([s, n]) => `<div class="list-row"><span>${t("cy_symptom_" + s)}</span><span>${n}</span></div>`).join("") : `<p class="muted">${t("common_empty_generic")}</p>`}
  </div>`;
}

function openCycleLogModal() {
  openModal(`
    <div class="modal-header"><h2>${t("cy_log_day")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("common_date")}</label><input type="date" id="f-cydate" value="${todayISO()}"></div>
    <div class="field"><label>${t("cy_flow")}</label>
      <select id="f-cyflow">
        <option value="none">${t("cy_flow_none")}</option>
        <option value="light">${t("cy_flow_light")}</option>
        <option value="medium">${t("cy_flow_medium")}</option>
        <option value="heavy">${t("cy_flow_heavy")}</option>
      </select>
    </div>
    <div class="field"><label>${t("cy_symptoms")}</label>
      <div class="chip-group">
        ${["cramps", "fatigue", "headache", "bloating", "backpain"].map(s => `<span class="chip" data-toggle-symptom="${s}">${t("cy_symptom_" + s)}</span>`).join("")}
      </div>
    </div>
    <div class="field"><label>${t("common_mood")}</label>
      <div class="mood-row" id="cy-mood-row">
        ${["😀", "🙂", "😐", "😔", "😣"].map(m => `<button data-mood="${m}">${m}</button>`).join("")}
      </div>
    </div>
    <button class="btn block" data-action="cy-save-day">${t("common_save")}</button>
  `);
  const selectedSymptoms = new Set();
  let selectedMood = "";
  document.querySelectorAll("[data-toggle-symptom]").forEach(chip => {
    chip.addEventListener("click", () => {
      const s = chip.getAttribute("data-toggle-symptom");
      chip.classList.toggle("selected");
      if (selectedSymptoms.has(s)) selectedSymptoms.delete(s); else selectedSymptoms.add(s);
    });
  });
  document.querySelectorAll("#cy-mood-row button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cy-mood-row button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMood = btn.getAttribute("data-mood");
    });
  });
  window.__cyGetSymptoms = () => Array.from(selectedSymptoms);
  window.__cyGetMood = () => selectedMood;
}

function saveCycleDay() {
  const entry = {
    id: uid(),
    date: document.getElementById("f-cydate").value || todayISO(),
    flow: document.getElementById("f-cyflow").value,
    symptoms: window.__cyGetSymptoms ? window.__cyGetSymptoms() : [],
    mood: window.__cyGetMood ? window.__cyGetMood() : ""
  };
  Store.data.cycleEntries = Store.data.cycleEntries.filter(e => e.date !== entry.date);
  Store.data.cycleEntries.push(entry);
  Store.save();
  closeModal();
  render();
}
function deleteCycleEntry(id) {
  Store.data.cycleEntries = Store.data.cycleEntries.filter(e => e.id !== id);
  Store.save();
  render();
}

// ================= CALENDAR =================
function changeMonth(delta) {
  state.calMonth += delta;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  render();
}

function renderCalendar() {
  const y = state.calYear, m = state.calMonth;
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString(I18N.lang === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" });
  const dowLabels = I18N.lang === "fr" ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const events = Store.data.events;
  const today = todayISO();

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="calendar-day muted"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasEvent = events.some(e => e.date === dateISO);
    const phase = state.calOverlayCycle ? computeCyclePhase(dateISO) : null;
    const phaseColor = phase && phase !== "unknown" ? `var(--cycle-${phase})` : "";
    cells += `<div class="calendar-day ${dateISO === today ? "today" : ""}" data-action="cal-day-click" data-date="${dateISO}" style="${phaseColor ? `background:${phaseColor}22;border:1px solid ${phaseColor}` : ""}">
      ${day}${hasEvent ? '<span class="evt-dot"></span>' : ""}
    </div>`;
  }

  const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  return `
  <div class="month-nav">
    <button class="icon-btn" data-action="cal-prev-month">‹</button>
    <span class="label">${monthLabel}</span>
    <button class="icon-btn" data-action="cal-next-month">›</button>
  </div>
  <div class="calendar-grid">
    ${dowLabels.map(l => `<div class="dow">${l}</div>`).join("")}
    ${cells}
  </div>
  <div class="field" style="margin-top:14px">
    <label><input type="checkbox" data-action="toggle-cal-overlay" ${state.calOverlayCycle ? "checked" : ""}> ${t("cal_overlay_cycle")}</label>
  </div>
  <div class="card">
    <h3>${t("cal_upcoming")}</h3>
    ${upcoming.length ? upcoming.map(e => `<div class="list-row"><span>${fmtDate(e.date)} — ${escapeHtml(e.title)}</span></div>`).join("") : `<p class="muted">${t("cal_empty")}</p>`}
  </div>`;
}

function openDayModal(dateISO) {
  const events = Store.data.events.filter(e => e.date === dateISO);
  openModal(`
    <div class="modal-header"><h2>${fmtDate(dateISO)}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    ${events.length ? events.map(e => `
      <div class="list-row">
        <span>${e.time || ""} ${escapeHtml(e.title)}</span>
        <button class="icon-btn" data-action="delete-event" data-id="${e.id}">✕</button>
      </div>`).join("") : `<p class="muted">${t("cal_empty")}</p>`}
    <button class="btn block" style="margin-top:12px" data-action="open-add-event" data-date="${dateISO}">${t("cal_add_event")}</button>
  `);
}

function openEventModal(dateISO) {
  const outfits = Store.data.outfits;
  openModal(`
    <div class="modal-header"><h2>${t("cal_add_event")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("cal_event_title")}</label><input id="f-etitle"></div>
    <div class="grid-2">
      <div class="field"><label>${t("common_date")}</label><input type="date" id="f-edate" value="${dateISO || todayISO()}"></div>
      <div class="field"><label>${t("cal_event_time")}</label><input type="time" id="f-etime"></div>
    </div>
    <div class="field"><label>${t("cal_event_location")}</label><input id="f-eloc"></div>
    <div class="field"><label>${t("cal_event_category")}</label>
      <select id="f-ecat">
        <option value="personal">${t("cal_event_cat_personal")}</option>
        <option value="work">${t("cal_event_cat_work")}</option>
        <option value="health">${t("cal_event_cat_health")}</option>
        <option value="social">${t("cal_event_cat_social")}</option>
      </select>
    </div>
    <div class="field"><label>${t("common_notes")}</label><textarea id="f-enotes"></textarea></div>
    <div class="field"><label>${t("cal_linked_outfit")}</label>
      <select id="f-eoutfit">
        <option value="">${t("common_none")}</option>
        ${outfits.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")}
      </select>
    </div>
    <button class="btn block" data-action="save-event">${t("common_save")}</button>
  `);
}

function saveEvent() {
  const event = {
    id: uid(),
    title: document.getElementById("f-etitle").value || "Event",
    date: document.getElementById("f-edate").value || todayISO(),
    time: document.getElementById("f-etime").value,
    location: document.getElementById("f-eloc").value,
    category: document.getElementById("f-ecat").value,
    notes: document.getElementById("f-enotes").value,
    outfitId: document.getElementById("f-eoutfit").value || null
  };
  Store.data.events.push(event);
  if (event.outfitId) {
    const o = Store.data.outfits.find(x => x.id === event.outfitId);
    if (o) o.linkedEventId = event.id;
  }
  Store.save();
  closeModal();
  render();
}
function deleteEvent(id) {
  Store.data.events = Store.data.events.filter(e => e.id !== id);
  Store.save();
  closeModal();
  render();
}

// ================= JOURNAL =================
function renderJournal() {
  if (isLocked("journal")) return renderLockScreen("jr_locked_msg");
  const d = Store.data.journalEntries.slice().sort((a, b) => b.date.localeCompare(a.date));
  let filtered = d;
  if (state.jrQuery) {
    const q = state.jrQuery.toLowerCase();
    filtered = d.filter(e => (e.text || "").toLowerCase().includes(q) || (e.tags || []).some(tag => tag.toLowerCase().includes(q)) || e.date.includes(q));
  }
  return `
  <input type="text" placeholder="${t("jr_search_placeholder")}" value="${escapeHtml(state.jrQuery)}" oninput="state.jrQuery=this.value; renderJournalList();" style="margin-bottom:12px">
  <p class="muted">${t("jr_entries_count", { n: d.length })}</p>
  <div id="jr-list">${renderJournalList_(filtered, !!state.jrQuery)}</div>`;
}
function renderJournalList_(entries, isFiltered) {
  if (!entries.length) return `<div class="empty-state"><span class="ico">📓</span>${isFiltered ? t("jr_no_results") : t("jr_empty")}</div>`;
  return entries.map(e => `
    <div class="j-entry">
      <div class="row-between">
        <span class="date">${fmtDate(e.date)} ${e.mood || ""}</span>
        <button class="icon-btn" data-action="delete-journal" data-id="${e.id}">✕</button>
      </div>
      ${(e.photos || []).map(p => `<img src="${p}">`).join("")}
      <p>${escapeHtml(e.text)}</p>
      ${e.cyclePhase && e.cyclePhase !== "unknown" ? `<span class="badge">${t("cy_phase_" + e.cyclePhase)}</span>` : ""}
      <div class="tags">${(e.tags || []).map(tag => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>`).join("");
}
function renderJournalList() {
  const d = Store.data.journalEntries.slice().sort((a, b) => b.date.localeCompare(a.date));
  const q = state.jrQuery.toLowerCase();
  const filtered = q ? d.filter(e => (e.text || "").toLowerCase().includes(q) || (e.tags || []).some(tag => tag.toLowerCase().includes(q)) || e.date.includes(q)) : d;
  document.getElementById("jr-list").innerHTML = renderJournalList_(filtered, !!q);
}

function selectJournalMood(mood) {
  window.__jrMood = mood;
  document.querySelectorAll("#jr-mood-row button").forEach(b => b.classList.toggle("selected", b.getAttribute("data-mood") === mood));
}

function openJournalModal() {
  const outfits = Store.data.outfits;
  const today = todayISO();
  const phase = Store.data.cycleEntries.length ? computeCyclePhase(today) : "unknown";
  openModal(`
    <div class="modal-header"><h2>${t("jr_new_entry")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="photo-upload" id="jr-photo-box">
      <div id="jr-photo-ph">📷 ${t("common_choose_photo")}</div>
      <input type="file" accept="image/*" id="f-jphoto" multiple>
    </div>
    <div id="jr-photo-preview" class="item-grid" style="margin-top:8px"></div>
    <div class="field"><label>${t("common_date")}</label><input type="date" id="f-jdate" value="${today}"></div>
    <div class="field"><textarea id="f-jtext" placeholder="${t("jr_write_placeholder")}"></textarea></div>
    <div class="field"><label>${t("common_mood")}</label>
      <div class="mood-row" id="jr-mood-row">
        ${["😀", "🙂", "😐", "😔", "😣"].map(m => `<button data-action="jr-mood" data-mood="${m}">${m}</button>`).join("")}
      </div>
    </div>
    <div class="field"><label>${t("common_tags")} (${t("common_tags_hint")})</label><input id="f-jtags"></div>
    <div class="field"><label>${t("jr_link_outfit")}</label>
      <select id="f-joutfit">
        <option value="">${t("common_none")}</option>
        ${outfits.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")}
      </select>
    </div>
    <p class="muted">${t("jr_link_cycle")}: ${phase !== "unknown" ? t("cy_phase_" + phase) : t("common_none")}</p>
    <button class="btn block" data-action="save-journal">${t("common_save")}</button>
  `);
  window.__jrPhotos = [];
  window.__jrMood = "";
  document.getElementById("f-jphoto").addEventListener("change", function () {
    Array.from(this.files).forEach(file => {
      resizeImageFile(file, 900, (dataUrl) => {
        window.__jrPhotos.push(dataUrl);
        const preview = document.getElementById("jr-photo-preview");
        preview.innerHTML += `<div class="item-card"><img src="${dataUrl}"></div>`;
      });
    });
  });
}

function saveJournal() {
  const today = document.getElementById("f-jdate").value || todayISO();
  const entry = {
    id: uid(),
    date: today,
    timestamp: new Date().toISOString(),
    photos: window.__jrPhotos || [],
    text: document.getElementById("f-jtext").value,
    mood: window.__jrMood || "",
    tags: document.getElementById("f-jtags").value.split(",").map(s => s.trim()).filter(Boolean),
    outfitId: document.getElementById("f-joutfit").value || null,
    cyclePhase: Store.data.cycleEntries.length ? computeCyclePhase(today) : "unknown"
  };
  Store.data.journalEntries.push(entry);
  Store.save();
  closeModal();
  render();
}
function deleteJournal(id) {
  if (!confirm(t("common_confirm_delete"))) return;
  Store.data.journalEntries = Store.data.journalEntries.filter(e => e.id !== id);
  Store.save();
  render();
}

// ================= SETTINGS =================
function renderSettings() {
  const s = Store.data.settings;
  return `
  <div class="card">
    <h3>${t("set_language")}</h3>
    <div class="chip-group">
      <span class="chip ${I18N.lang === "en" ? "selected" : ""}" data-action="set-lang" data-lang="en">English</span>
      <span class="chip ${I18N.lang === "fr" ? "selected" : ""}" data-action="set-lang" data-lang="fr">Français</span>
    </div>
  </div>
  <div class="card">
    <h3>${t("set_theme")}</h3>
    <div class="chip-group">
      <span class="chip ${s.theme === "light" ? "selected" : ""}" data-action="set-theme-choice" data-theme="light">${t("set_theme_light")}</span>
      <span class="chip ${s.theme === "dark" ? "selected" : ""}" data-action="set-theme-choice" data-theme="dark">${t("set_theme_dark")}</span>
      <span class="chip ${s.theme === "system" ? "selected" : ""}" data-action="set-theme-choice" data-theme="system">${t("set_theme_system")}</span>
    </div>
  </div>
  <div class="card">
    <h3>${t("set_profile")}</h3>
    <div class="field"><label>${t("set_profile_name")}</label>
      <input id="f-profile-name" value="${escapeHtml(Store.data.profile.name)}" onchange="document.getElementById('save-profile-btn').click()">
    </div>
    <button id="save-profile-btn" class="hidden" data-action="save-profile"></button>
  </div>
  <div class="card">
    <h3>${t("set_security")}</h3>
    <label><input type="checkbox" data-action="toggle-pin-enable" ${s.pinEnabled ? "checked" : ""}> ${t("set_pin_enable")}</label>
    <div class="field" style="margin-top:10px"><label>${t("cy_hide_section")}</label>
      <input type="checkbox" data-action="toggle-hide-cycle" ${s.hideCycleTab ? "checked" : ""}>
    </div>
    ${s.pinEnabled ? `
    <div class="field" style="margin-top:10px"><label>${t("set_pin_new")}</label><input type="password" maxlength="4" id="f-pin-new"></div>
    <div class="field"><label>${t("set_pin_confirm")}</label><input type="password" maxlength="4" id="f-pin-confirm"></div>
    <button class="btn block" data-action="save-pin">${t("common_save")}</button>
    ` : ""}
  </div>
  <div class="card">
    <h3>${t("set_data")}</h3>
    <button class="btn secondary block" data-action="export-data">${t("set_export")}</button>
    <p class="muted">${t("set_export_hint")}</p>
    <button class="btn danger block" style="margin-top:10px" data-action="erase-data">${t("set_erase")}</button>
  </div>
  <div class="card">
    <h3>${t("set_about")}</h3>
    <p class="muted">${t("set_about_body")}</p>
  </div>`;
}

function setLanguage(lang) {
  I18N.setLang(lang);
  Store.data.settings.lang = lang;
  Store.save();
  render();
}
function setThemeChoice(theme) {
  Store.data.settings.theme = theme;
  Store.save();
  applyTheme();
  render();
}
function saveProfile() {
  Store.data.profile.name = document.getElementById("f-profile-name").value;
  Store.save();
}
function togglePinEnable() {
  const s = Store.data.settings;
  s.pinEnabled = !s.pinEnabled;
  if (!s.pinEnabled) { s.pin = null; Store.data.unlocked = true; }
  Store.save();
  render();
}
function savePin() {
  const p1 = document.getElementById("f-pin-new").value;
  const p2 = document.getElementById("f-pin-confirm").value;
  if (p1.length !== 4 || p1 !== p2) { alert(t("set_pin_mismatch")); return; }
  Store.data.settings.pin = p1;
  Store.data.unlocked = false;
  Store.save();
  alert(t("set_pin_saved"));
  render();
}
function exportData() {
  const blob = new Blob([Store.exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wardrobe-app-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}
function eraseData() {
  if (!confirm(t("set_erase_confirm"))) return;
  localStorage.removeItem(DB_KEY);
  Store.load();
  render();
}

document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-action='toggle-hide-cycle']");
  if (el) {
    Store.data.settings.hideCycleTab = el.checked;
    Store.save();
    render();
  }
});

document.addEventListener("DOMContentLoaded", init);
