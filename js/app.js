let state = {
  tab: "dashboard",
  wrFilter: { group: "", sub: "", season: "", activity: "", color: "", q: "" },
  wrFiltersOpen: false,
  wrStatsOpen: false,
  wrView: "list",
  otView: "mine",
  otSuggestOcc: "",
  otSuggestedId: null,
  cyHistoryOpen: false,
  cyEducationOpen: false,
  cyLogStep: 0,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  calView: "events",
  jrQuery: "",
  jrView: "diary",
  stFiltersOpen: false,
  stFilter: { q: "", when: "", project: "" },
  tkVarietyOpen: false,
  hbVarietyOpen: false,
  pinBuffer: "",
  pinMode: null // 'unlock' | 'setup'
};

function t(key, params) { return I18N.t(key, params); }

function init() {
  Store.load();
  I18N.setLang(Store.data.settings.lang || "en");
  applyTheme();
  render();
  checkReminders();
  setInterval(checkReminders, 60000);
}

const REMINDER_OFFSETS = [
  { key: "2d", ms: 2 * 24 * 60 * 60 * 1000 },
  { key: "1d", ms: 24 * 60 * 60 * 1000 },
  { key: "2h", ms: 2 * 60 * 60 * 1000 }
];

function checkReminders() {
  if (!Store.data.settings.notificationsEnabled) return;
  const now = Date.now();
  const today = todayISO();
  let changed = false;

  Store.data.events.forEach((e) => {
    const eventTime = e.time || "09:00";
    const eventMs = new Date(`${e.date}T${eventTime}:00`).getTime();
    if (isNaN(eventMs)) return;
    REMINDER_OFFSETS.forEach((off) => {
      const key = `${e.id}_${off.key}`;
      if (Store.data.firedReminders.includes(key)) return;
      const triggerMs = eventMs - off.ms;
      if (now >= triggerMs && now < eventMs) {
        fireReminder(t("cal_reminder_" + off.key, { title: e.title }));
        Store.data.firedReminders.push(key);
        changed = true;
      }
    });
  });

  Store.data.habits.forEach((h) => {
    const done = (h.completedDates || []).includes(today);
    const key = `habit_${h.id}_${today}`;
    if (!done && !Store.data.firedReminders.includes(key)) {
      fireReminder(t("habit_reminder", { name: h.name }));
      Store.data.firedReminders.push(key);
      changed = true;
    }
  });

  Store.data.tasks.forEach((tk) => {
    if (tk.done) return;
    const key = `task_${tk.id}_${today}`;
    if (!Store.data.firedReminders.includes(key)) {
      fireReminder(t("task_reminder", { title: tk.title }));
      Store.data.firedReminders.push(key);
      changed = true;
    }
  });

  if (changed) Store.save();
}

function fireReminder(msg) {
  showToast(msg);
  if (window.Notification && Notification.permission === "granted") {
    try { new Notification(t("app_name"), { body: msg }); } catch (e) { /* ignore */ }
  }
}

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  const stackOffset = document.querySelectorAll(".toast").length * 54;
  el.style.bottom = (90 + stackOffset) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
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
    case "toggle-theme": toggleThemeQuick(); break;
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
    case "open-shopping-list": openShoppingListModal(); break;
    case "add-shopping-item": addShoppingItem(); break;
    case "toggle-shopping-item": toggleShoppingItem(id); break;
    case "delete-shopping-item": deleteShoppingItem(id); break;
    case "toggle-item-favorite": toggleItemFavorite(id); break;
    case "mark-item-worn": markItemWorn(id); break;
    case "set-item-status": setItemStatus(id, el.value !== undefined ? el.value : el.getAttribute("data-status")); break;
    case "wr-filter-chip": setWrFilter(el.getAttribute("data-key"), el.getAttribute("data-value")); break;
    case "wr-filter-subchip": setWrSubFilter(el.getAttribute("data-group"), el.getAttribute("data-sub")); break;
    case "wr-toggle-filters": wrToggleFilters(); break;
    case "wr-toggle-stats": wrToggleStats(); break;
    case "wr-toggle-view": wrToggleView(); break;

    case "open-add-outfit": openOutfitModal(el.getAttribute("data-source")); break;
    case "open-outfit-detail": openOutfitDetail(id); break;
    case "save-outfit": saveOutfit(el.getAttribute("data-source")); break;
    case "delete-outfit": deleteOutfit(id); break;
    case "toggle-outfit-favorite": toggleOutfitFavorite(id); break;
    case "outfit-mark-worn": outfitMarkWorn(id); break;
    case "outfit-link-event": linkOutfitToEvent(id, el.value); break;
    case "ot-set-view": otSetView(el.getAttribute("data-view")); break;
    case "ot-suggest-filter": otSuggestFilter(el.getAttribute("data-occ")); break;
    case "ot-suggest-shuffle": otRecomputeSuggestion(); render(); break;

    case "cy-log-day": openCycleLogModal(); break;
    case "cy-log-next": cyLogNext(); break;
    case "cy-log-prev": cyLogPrev(); break;
    case "cy-save-day": saveCycleDay(); break;
    case "cy-delete-entry": deleteCycleEntry(id); break;
    case "cy-toggle-history": cyToggleHistory(); break;
    case "cy-toggle-education": state.cyEducationOpen = !state.cyEducationOpen; render(); break;
    case "cy-open-profile": openCycleProfileModal(); break;
    case "cy-save-profile": saveCycleProfile(); break;
    case "cy-pin-key": pinKeyPress(el.getAttribute("data-key")); break;
    case "cy-unlock-attempt": break;

    case "cal-prev-month": changeMonth(-1); break;
    case "cal-next-month": changeMonth(1); break;
    case "cal-day-click": openDayModal(el.getAttribute("data-date")); break;
    case "open-add-event": openEventModal(el.getAttribute("data-date")); break;
    case "save-event": saveEvent(); break;
    case "delete-event": deleteEvent(id); break;
    case "cal-set-view": state.calView = el.getAttribute("data-view"); render(); break;

    case "open-add-journal": openJournalModal(); break;
    case "save-journal": saveJournal(); break;
    case "delete-journal": deleteJournal(id); break;
    case "jr-mood": selectJournalMood(el.getAttribute("data-mood")); break;
    case "jr-set-view": jrSetView(el.getAttribute("data-view")); break;
    case "st-toggle-filters": stToggleFilters(); break;
    case "st-filter-when": stFilterWhen(el.getAttribute("data-when")); break;
    case "st-filter-project": stFilterProject(el.getAttribute("data-project")); break;
    case "tk-toggle-variety": state.tkVarietyOpen = !state.tkVarietyOpen; render(); break;
    case "hb-toggle-variety": state.hbVarietyOpen = !state.hbVarietyOpen; render(); break;
    case "open-add-task": openTaskModal(); break;
    case "save-task": saveTask(); break;
    case "task-bump-progress": taskBumpProgress(id); break;
    case "task-toggle-done": taskToggleDone(id); break;
    case "delete-task": deleteTask(id); break;
    case "open-add-habit": openHabitModal(); break;
    case "save-habit": saveHabit(); break;
    case "habit-toggle-day": toggleHabitDay(id, el.getAttribute("data-date")); break;
    case "delete-habit": deleteHabit(id); break;

    case "set-lang": setLanguage(el.getAttribute("data-lang")); break;
    case "set-theme-choice": setThemeChoice(el.getAttribute("data-theme")); break;
    case "save-profile": saveProfile(); break;
    case "toggle-pin-enable": togglePinEnable(); break;
    case "toggle-notifications": toggleNotifications(); break;
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
      <button class="icon-btn" data-action="toggle-theme" title="Theme">${Store.data.settings.theme === "dark" ? "🌙" : Store.data.settings.theme === "light" ? "☀️" : "🌓"}</button>
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
  if (state.tab === "outfits") {
    if (state.otView === "suggested") return "";
    const source = state.otView === "web" ? "web" : "wardrobe";
    return `<button class="fab" data-action="open-add-outfit" data-source="${source}">+</button>`;
  }
  if (state.tab === "journal") {
    if (isLocked("journal")) return "";
    const action = state.jrView === "tasks" ? "open-add-task" : state.jrView === "habits" ? "open-add-habit" : "open-add-journal";
    return `<button class="fab" data-action="${action}">+</button>`;
  }
  const map = {
    wardrobe: "open-add-item"
  };
  const action = map[state.tab];
  if (!action) return "";
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
  const suggested = getSuggestedOutfit("");
  const cyclePhase = (d.cycleEntries.length || d.cycleProfile) ? computeCyclePhase(today) : null;

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
const PARTS = ["top", "bottom", "dress", "outerwear"];
const SHOE_TYPES = ["sandals", "sneakers", "heels"];
const ACCESSORY_TYPES = ["necklace", "earrings", "bracelet", "ring", "pin", "hat", "hairtie", "headband", "watch", "handbag", "belt"];
const CATEGORY_GROUPS = ["parts", "shoes", "accessories"];
const COLORS = [
  ["black", "#000000"], ["white", "#ffffff"], ["grey", "#9e9e9e"], ["red", "#e53935"],
  ["orange", "#fb8c00"], ["yellow", "#fdd835"], ["green", "#43a047"], ["olive", "#808000"],
  ["teal", "#00897b"], ["blue", "#1e88e5"], ["navy", "#1a237e"], ["turquoise", "#1de9b6"],
  ["purple", "#8e24aa"], ["lavender", "#b39ddb"], ["pink", "#f06292"], ["magenta", "#d81b60"],
  ["brown", "#6d4c41"], ["beige", "#e8d9c5"], ["cream", "#fff8e1"], ["gold", "#d4af37"],
  ["silver", "#c0c0c0"], ["khaki", "#c3b091"]
];
const SEASONS = ["all", "spring", "summer", "autumn", "winter"];
const OCCASIONS = ["daily", "work", "sport", "party"];
const STATUSES = ["available", "laundry", "lent", "lost", "given"];

function subTypesForGroup(group) {
  if (group === "shoes") return SHOE_TYPES;
  if (group === "accessories") return ACCESSORY_TYPES;
  return PARTS;
}
function subTypeLabel(group, sub) {
  if (group === "shoes") return t("wr_shoe_" + sub);
  if (group === "accessories") return t("wr_acc_" + sub);
  return t("wr_cat_" + sub);
}
const STYLES_BY_PART = {
  top: ["tshirt", "blouse", "tanktop", "croptop", "sweater", "hoodie", "cardigan", "blazer", "vest", "turtleneck", "polo", "camisole", "tunic", "sweatshirt", "henley", "bodysuit", "haltertop", "peplumtop", "wraptop", "kimonotop", "flannelshirt", "buttondownshirt", "offshouldertop", "coldshouldertop", "bellsleevetop", "graphictee", "longsleevetee", "tubetop", "corsettop", "babydolltop"],
  bottom: ["jeans", "trousers", "shorts", "miniskirt", "midiskirt", "maxiskirt", "leggings", "culottes", "palazzopants", "cargopants", "joggers", "capripants", "chinos", "widelegpants", "skinnypants", "bootcutpants", "flarepants", "highwaistpants", "bermudashorts", "denimshorts", "pencilskirt", "alineskirt", "pleatedskirt", "wrapskirt", "overalls", "bikeshorts", "sweatpants", "cargoshorts", "paperbagpants", "harempants"],
  dress: ["maxidress", "mididress", "minidress", "shiftdress", "wrapdress", "sheathdress", "alinedress", "bodycondress", "shirtdress", "sundress", "slipdress", "cocktaildress", "eveninggown", "sweaterdress", "tunicdress", "peplumdress", "offshoulderdress", "halterdress", "tiereddress", "ruffledress", "smockdress", "babydolldress", "pinaforedress", "denimdress", "tshirtdress", "asymmetricdress", "floraldress", "littleblackdress", "capedress", "columndress"],
  outerwear: ["jacket", "coat", "trenchcoat", "peacoat", "parka", "bomberjacket", "denimjacket", "leatherjacket", "pufferjacket", "windbreaker", "raincoat", "cape", "poncho", "shrug", "dustercoat", "overcoat", "wrapcoat", "varsityjacket", "motojacket", "quiltedjacket", "fleecejacket", "shearlingjacket", "anorak", "carcoat", "croppedjacket", "utilityjacket", "teddycoat", "wintercoat", "fauxfurcoat", "kimonojacket"]
};
function itemCategoryLabel(item) {
  const group = item.categoryGroup || "parts";
  const sub = item.subCategory || "top";
  if (group === "parts" && item.style) return t("style_" + item.style);
  return subTypeLabel(group, sub);
}
function wrFilteredItems() {
  let items = Store.data.items.slice();
  const f = state.wrFilter;
  if (f.group) items = items.filter(i => (i.categoryGroup || "parts") === f.group && (!f.sub || i.subCategory === f.sub));
  if (f.season) items = items.filter(i => i.season === f.season);
  if (f.activity) items = items.filter(i => (i.tags || []).includes(f.activity));
  if (f.color) items = items.filter(i => i.color === f.color);
  if (f.q) items = items.filter(i => JSON.stringify(i).toLowerCase().includes(f.q.toLowerCase()));
  return items;
}

function renderWardrobe() {
  const d = Store.data;
  const items = wrFilteredItems();
  const f = state.wrFilter;
  const favCount = d.items.filter(i => i.favorite).length;
  const neverCount = d.items.filter(i => !i.wornDates || !i.wornDates.length).length;
  const recentCount = d.items.filter(i => i.wornDates && i.wornDates.length && daysBetween(i.wornDates[i.wornDates.length - 1], todayISO()) <= 7).length;

  return `
  <div class="row-between" style="gap:8px;margin-bottom:10px">
    <input type="text" placeholder="${t("common_search")}" value="${escapeHtml(f.q)}" oninput="state.wrFilter.q=this.value; renderWardrobeList();" style="flex:1" />
    <button class="icon-btn" data-action="wr-toggle-filters" title="${t("wr_filter_toggle")}">${state.wrFiltersOpen ? "▲" : "▽"}</button>
    <button class="icon-btn" data-action="wr-toggle-view" title="${state.wrView === "gallery" ? t("wr_view_list") : t("wr_view_gallery")}">${state.wrView === "gallery" ? "▦" : "🖼️"}</button>
  </div>
  ${state.wrFiltersOpen ? renderWrFilterPanel() : ""}
  <button class="btn secondary block" style="margin-bottom:10px" data-action="open-shopping-list">🛍️ ${t("wr_shopping_list")}</button>
  <div class="card" data-action="wr-toggle-stats" style="cursor:pointer">
    <div class="row-between mb-0"><h3 class="mb-0">${t("wr_stats_title")}</h3><span>${state.wrStatsOpen ? "▾" : "▸"}</span></div>
    ${state.wrStatsOpen ? `
    <div class="stat-grid mb-0" style="margin-top:10px">
      <div class="stat-card"><div class="num">${favCount}</div><div class="label">${t("wr_stats_favorites")}</div></div>
      <div class="stat-card"><div class="num">${recentCount}</div><div class="label">${t("wr_stats_recent")}</div></div>
      <div class="stat-card"><div class="num">${neverCount}</div><div class="label">${t("wr_stats_never")}</div></div>
    </div>` : ""}
  </div>
  <div id="wr-list">${state.wrView === "gallery" ? renderWardrobeGallery(items) : renderWardrobeGrid(items)}</div>`;
}

function renderWrFilterPanel() {
  const f = state.wrFilter;
  return `<div class="card" style="margin-bottom:10px">
    <div class="field"><label>${t("wr_group_parts")}</label>
      <div class="chip-group">${PARTS.map(s => `<span class="chip ${f.group === "parts" && f.sub === s ? "selected" : ""}" data-action="wr-filter-subchip" data-group="parts" data-sub="${s}">${t("wr_cat_" + s)}</span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("wr_season")}</label>
      <div class="chip-group">${SEASONS.filter(s => s !== "all").map(s => `<span class="chip ${f.season === s ? "selected" : ""}" data-action="wr-filter-chip" data-key="season" data-value="${s}">${t("wr_season_" + s)}</span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("wr_filter_activity")}</label>
      <div class="chip-group">${OCCASIONS.map(o => `<span class="chip ${f.activity === o ? "selected" : ""}" data-action="wr-filter-chip" data-key="activity" data-value="${o}">${t("wr_occasion_" + o)}</span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("wr_filter_colors")}</label>
      <div class="chip-group">${COLORS.map(([c, hex]) => `<span class="swatch-chip ${f.color === c ? "selected" : ""}" data-action="wr-filter-chip" data-key="color" data-value="${c}" style="background:${hex}" title="${t("wr_color_" + c)}"></span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("wr_group_shoes")}</label>
      <div class="chip-group">${SHOE_TYPES.map(s => `<span class="chip ${f.group === "shoes" && f.sub === s ? "selected" : ""}" data-action="wr-filter-subchip" data-group="shoes" data-sub="${s}">${t("wr_shoe_" + s)}</span>`).join("")}</div>
    </div>
    <div class="field mb-0"><label>${t("wr_group_accessories")}</label>
      <div class="chip-group">${ACCESSORY_TYPES.map(s => `<span class="chip ${f.group === "accessories" && f.sub === s ? "selected" : ""}" data-action="wr-filter-subchip" data-group="accessories" data-sub="${s}">${t("wr_acc_" + s)}</span>`).join("")}</div>
    </div>
  </div>`;
}

function renderWardrobeGrid(items) {
  if (!items.length) return `<div class="empty-state"><span class="ico">👗</span>${t("wr_empty")}</div>`;
  return `<div class="item-grid">${items.map(i => `
    <div class="item-card" data-action="open-edit-item" data-id="${i.id}">
      ${photoOrPh(i.photo, "👕")}
      <div class="item-info">
        <div class="name">${escapeHtml(i.brand || itemCategoryLabel(i))}</div>
        <div class="meta">${itemCategoryLabel(i)}${i.color ? " · " + t("wr_color_" + i.color) : ""}</div>
        <span class="badge">${i.wornDates && i.wornDates.length ? t("wr_times_worn", { n: i.wornDates.length }) : t("wr_never_worn")}</span>
      </div>
    </div>`).join("")}</div>`;
}

function renderWardrobeGallery(items) {
  if (!items.length) return `<div class="empty-state"><span class="ico">🖼️</span>${t("wr_empty")}</div>`;
  return `<div class="gallery-grid">${items.map(i => `
    <div class="gallery-cell" data-action="open-edit-item" data-id="${i.id}">${photoOrPh(i.photo, "👕")}</div>`).join("")}</div>`;
}

function wrToggleFilters() { state.wrFiltersOpen = !state.wrFiltersOpen; render(); }
function wrToggleStats() { state.wrStatsOpen = !state.wrStatsOpen; render(); }
function wrToggleView() { state.wrView = state.wrView === "gallery" ? "list" : "gallery"; render(); }
function setWrSubFilter(group, sub) {
  const f = state.wrFilter;
  if (f.group === group && f.sub === sub) { f.group = ""; f.sub = ""; }
  else { f.group = group; f.sub = sub; }
  render();
}
function setWrFilter(key, value) {
  state.wrFilter[key] = state.wrFilter[key] === value ? "" : value;
  render();
}
function renderWardrobeList() {
  const items = wrFilteredItems();
  document.getElementById("wr-list").innerHTML = state.wrView === "gallery" ? renderWardrobeGallery(items) : renderWardrobeGrid(items);
}

function renderStylePickerHTML(group, sub, selectedStyle) {
  if (group !== "parts") return "";
  const styles = STYLES_BY_PART[sub] || [];
  if (!styles.length) return "";
  return `<div class="field"><label>${t("wr_style")}</label>
    <div class="chip-row-scroll" id="f-style-row">
      ${styles.map(s => `<span class="chip ${selectedStyle === s ? "selected" : ""}" data-style="${s}">${t("style_" + s)}</span>`).join("")}
    </div>
  </div>`;
}

function openItemModal(id) {
  const item = id ? Store.data.items.find(i => i.id === id) : null;
  const initGroup = item ? (item.categoryGroup || "parts") : "parts";
  const initSub = item ? (item.subCategory || "top") : "top";
  openModal(`
    <div class="modal-header"><h2>${item ? t("common_edit") : t("wr_add_item")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="photo-upload" id="photo-upload-box">
      ${item && item.photo ? `<img src="${item.photo}" id="photo-preview">` : `<div id="photo-preview-ph">📷 ${t("common_choose_photo")}</div>`}
      <input type="file" accept="image/*" id="f-photo-input">
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_type")}</label>
        <select id="f-group">${CATEGORY_GROUPS.map(g => `<option value="${g}" ${initGroup === g ? "selected" : ""}>${t("wr_group_" + g)}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${t("wr_subtype")}</label>
        <select id="f-sub">${subTypesForGroup(initGroup).map(s => `<option value="${s}" ${initSub === s ? "selected" : ""}>${subTypeLabel(initGroup, s)}</option>`).join("")}</select>
      </div>
    </div>
    <div id="f-style-wrap">${renderStylePickerHTML(initGroup, initSub, item ? item.style : "")}</div>
    <div class="field"><label>${t("wr_color")}</label>
      <div class="chip-group" id="f-color-picker">${COLORS.map(([c, hex]) => `<span class="swatch-chip ${item && item.color === c ? "selected" : ""}" data-color="${c}" style="background:${hex}" title="${t("wr_color_" + c)}"></span>`).join("")}</div>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_material")}</label><input id="f-material" value="${escapeHtml(item ? item.material : "")}"></div>
      <div class="field"><label>${t("wr_brand")}</label><input id="f-brand" value="${escapeHtml(item ? item.brand : "")}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>${t("wr_size")}</label><input id="f-size" value="${escapeHtml(item ? item.size : "")}"></div>
      <div class="field"><label>${t("wr_season")}</label>
        <select id="f-season">${SEASONS.map(s => `<option value="${s}" ${item && item.season === s ? "selected" : ""}>${t("wr_season_" + s)}</option>`).join("")}</select>
      </div>
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

  let selectedColor = item ? item.color || "" : "";
  document.querySelectorAll("#f-color-picker .swatch-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#f-color-picker .swatch-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedColor = chip.getAttribute("data-color");
    });
  });
  window.__getSelectedColor = () => selectedColor;

  let selectedStyle = item ? item.style || "" : "";
  function attachStyleListeners() {
    document.querySelectorAll("#f-style-row .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#f-style-row .chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        selectedStyle = chip.getAttribute("data-style");
      });
    });
  }
  attachStyleListeners();
  window.__getSelectedStyle = () => selectedStyle;

  document.getElementById("f-group").addEventListener("change", function () {
    const group = this.value;
    document.getElementById("f-sub").innerHTML = subTypesForGroup(group).map((s) => `<option value="${s}">${subTypeLabel(group, s)}</option>`).join("");
    const newSub = document.getElementById("f-sub").value;
    selectedStyle = "";
    document.getElementById("f-style-wrap").innerHTML = renderStylePickerHTML(group, newSub, "");
    attachStyleListeners();
  });
  document.getElementById("f-sub").addEventListener("change", function () {
    const group = document.getElementById("f-group").value;
    selectedStyle = "";
    document.getElementById("f-style-wrap").innerHTML = renderStylePickerHTML(group, this.value, "");
    attachStyleListeners();
  });
}

function saveItem(id) {
  const photo = window.__pendingPhoto ? window.__pendingPhoto() : null;
  const data = {
    photo,
    categoryGroup: document.getElementById("f-group").value,
    subCategory: document.getElementById("f-sub").value,
    style: window.__getSelectedStyle ? window.__getSelectedStyle() : "",
    color: window.__getSelectedColor ? window.__getSelectedColor() : "",
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

function openShoppingListModal() {
  const list = Store.data.shoppingList;
  openModal(`
    <div class="modal-header"><h2>${t("wr_shopping_list")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="grid-2" style="align-items:flex-start">
      <input id="f-shopping-name" placeholder="${t("wr_shopping_placeholder")}" style="flex:1">
      <button class="btn sm" data-action="add-shopping-item">${t("wr_shopping_add")}</button>
    </div>
    <div id="shopping-list-items" style="margin-top:12px">${renderShoppingListItems(list)}</div>
  `);
}

function renderShoppingListItems(list) {
  if (!list.length) return `<p class="muted">${t("wr_shopping_empty")}</p>`;
  return list.map(x => `
    <div class="list-row">
      <span style="${x.done ? "text-decoration:line-through;opacity:0.5" : ""}" data-action="toggle-shopping-item" data-id="${x.id}">${x.done ? "✅" : "⬜"} ${escapeHtml(x.name)}</span>
      <button class="icon-btn" data-action="delete-shopping-item" data-id="${x.id}">✕</button>
    </div>`).join("");
}

function addShoppingItem() {
  const input = document.getElementById("f-shopping-name");
  const name = input.value.trim();
  if (!name) return;
  Store.data.shoppingList.push({ id: uid(), name, done: false });
  Store.save();
  input.value = "";
  document.getElementById("shopping-list-items").innerHTML = renderShoppingListItems(Store.data.shoppingList);
}

function toggleShoppingItem(id) {
  const x = Store.data.shoppingList.find(s => s.id === id);
  x.done = !x.done;
  Store.save();
  document.getElementById("shopping-list-items").innerHTML = renderShoppingListItems(Store.data.shoppingList);
}

function deleteShoppingItem(id) {
  Store.data.shoppingList = Store.data.shoppingList.filter(s => s.id !== id);
  Store.save();
  document.getElementById("shopping-list-items").innerHTML = renderShoppingListItems(Store.data.shoppingList);
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
  const views = ["mine", "web", "suggested"];
  return `
  <div class="chip-group" style="margin-bottom:12px">
    ${views.map(v => `<span class="chip ${state.otView === v ? "selected" : ""}" data-action="ot-set-view" data-view="${v}">${t("ot_tab_" + v)}</span>`).join("")}
  </div>
  ${state.otView === "suggested" ? renderOutfitSuggestedView() : renderOutfitListView(state.otView)}
  `;
}

function renderOutfitListView(view) {
  const wanted = view === "web" ? "web" : "wardrobe";
  const outfits = Store.data.outfits.filter(o => (o.source || "wardrobe") === wanted);
  return outfits.length ? outfits.map(o => renderOutfitCard(o)).join("") : `<div class="empty-state"><span class="ico">🧥</span>${t("ot_empty")}</div>`;
}

function renderOutfitCard(o) {
  const cover = o.source === "web" ? o.webPhoto : (o.wornLog && o.wornLog.length && o.wornLog[o.wornLog.length - 1].photo);
  return `<div class="card" data-action="open-outfit-detail" data-id="${o.id}" style="cursor:pointer">
    <div class="row-between">
      <h3>${escapeHtml(o.name)} ${o.favorite ? "⭐" : ""}</h3>
      <span class="muted">${o.occasion ? t("wr_occasion_" + o.occasion) : ""}</span>
    </div>
    ${cover ? `<img src="${cover}" style="width:100%;border-radius:10px;max-height:160px;object-fit:cover">` : ""}
    <p class="muted">${o.wornLog ? o.wornLog.length : 0} × worn</p>
  </div>`;
}

function otSetView(view) {
  state.otView = view;
  if (view === "suggested") otRecomputeSuggestion();
  render();
}
function otSuggestFilter(occ) {
  state.otSuggestOcc = occ;
  otRecomputeSuggestion();
  render();
}
function otRecomputeSuggestion() {
  const o = getSuggestedOutfit(state.otSuggestOcc);
  state.otSuggestedId = o ? o.id : null;
}
function getSuggestedOutfit(occasionFilter) {
  let pool = Store.data.outfits.filter(o => (o.source || "wardrobe") === "wardrobe");
  if (occasionFilter) pool = pool.filter(o => o.occasion === occasionFilter);
  if (!pool.length) return null;
  const scored = pool.map(o => {
    const lastWorn = o.wornLog && o.wornLog.length ? o.wornLog[o.wornLog.length - 1].date : null;
    const daysSince = lastWorn ? daysBetween(lastWorn, todayISO()) : 9999;
    return { o, score: (o.favorite ? 100 : 0) + Math.min(daysSince, 60) };
  }).sort((a, b) => b.score - a.score);
  const topN = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
  return topN[Math.floor(Math.random() * topN.length)].o;
}

function renderOutfitSuggestedView() {
  const occ = state.otSuggestOcc || "";
  const pool = Store.data.outfits.filter(o => (o.source || "wardrobe") === "wardrobe");
  return `
  <div class="chip-group" style="margin-bottom:12px">
    <span class="chip ${occ === "" ? "selected" : ""}" data-action="ot-suggest-filter" data-occ="">${t("common_all")}</span>
    ${OCCASIONS.map(o => `<span class="chip ${occ === o ? "selected" : ""}" data-action="ot-suggest-filter" data-occ="${o}">${t("wr_occasion_" + o)}</span>`).join("")}
  </div>
  ${!pool.length ? `<div class="empty-state"><span class="ico">🧥</span>${t("ot_empty")}</div>` : renderSuggestionCard()}
  <button class="btn secondary block" style="margin-top:12px" data-action="ot-suggest-shuffle">🎲 ${t("ot_suggest_random")}</button>
  `;
}

function renderSuggestionCard() {
  const o = Store.data.outfits.find(x => x.id === state.otSuggestedId);
  if (!o) return `<div class="empty-state"><span class="ico">🧥</span>${t("ot_empty")}</div>`;
  const items = Store.data.items.filter(i => o.itemIds.includes(i.id));
  return `<div class="card">
    <h3>${t("ot_suggest_result")}</h3>
    <h4 style="margin:6px 0">${escapeHtml(o.name)} ${o.favorite ? "⭐" : ""}</h4>
    <div class="item-grid">${items.map(i => `<div class="item-card">${photoOrPh(i.photo, "👕")}</div>`).join("")}</div>
    <div class="grid-2" style="margin-top:10px">
      <button class="btn secondary" data-action="outfit-mark-worn" data-id="${o.id}">${t("ot_mark_worn_today")}</button>
      <button class="btn secondary" data-action="open-outfit-detail" data-id="${o.id}">${t("common_edit")}</button>
    </div>
  </div>`;
}

function openOutfitModal(source) {
  source = source === "web" ? "web" : "wardrobe";
  if (source === "web") {
    openModal(`
      <div class="modal-header"><h2>${t("ot_add_web")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
      <div class="photo-upload" id="photo-upload-box">
        <div id="photo-preview-ph">📷 ${t("common_choose_photo")}</div>
        <input type="file" accept="image/*" id="f-photo-input">
      </div>
      <div class="field"><label>${t("ot_name")}</label><input id="f-oname"></div>
      <div class="field"><label>${t("ot_web_link")}</label><input id="f-olink" placeholder="https://..."></div>
      <div class="field"><label>${t("ot_occasion")}</label>
        <select id="f-oocc">${OCCASIONS.map(o => `<option value="${o}">${t("wr_occasion_" + o)}</option>`).join("")}</select>
      </div>
      <button class="btn block" data-action="save-outfit" data-source="web">${t("common_save")}</button>
    `);
    let pendingPhoto = null;
    document.getElementById("f-photo-input").addEventListener("change", function () {
      if (this.files && this.files[0]) {
        resizeImageFile(this.files[0], 900, (dataUrl) => {
          pendingPhoto = dataUrl;
          document.getElementById("photo-upload-box").querySelector("img, #photo-preview-ph").outerHTML = `<img src="${dataUrl}">`;
        });
      }
    });
    window.__pendingPhoto = () => pendingPhoto;
    return;
  }

  const items = Store.data.items;
  openModal(`
    <div class="modal-header"><h2>${t("ot_add_outfit")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("ot_name")}</label><input id="f-oname"></div>
    <div class="field"><label>${t("ot_select_items")}</label>
      <div class="item-grid" style="max-height:240px;overflow-y:auto">
        ${items.map(i => `<label class="item-card" style="display:block">
          <input type="checkbox" class="f-oitem" value="${i.id}" style="position:absolute;margin:6px">
          ${photoOrPh(i.photo, "👕")}
          <div class="item-info"><div class="name">${itemCategoryLabel(i)}</div></div>
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
    <button class="btn block" data-action="save-outfit" data-source="wardrobe">${t("common_save")}</button>
  `);
}

function saveOutfit(source) {
  if (source === "web") {
    const outfit = {
      id: uid(),
      name: document.getElementById("f-oname").value || "Outfit idea",
      source: "web",
      webPhoto: window.__pendingPhoto ? window.__pendingPhoto() : null,
      webLink: document.getElementById("f-olink").value,
      occasion: document.getElementById("f-oocc").value,
      itemIds: [], favorite: false, wornLog: [], linkedEventId: null
    };
    Store.data.outfits.push(outfit);
    Store.save();
    closeModal();
    render();
    return;
  }
  const name = document.getElementById("f-oname").value || "Outfit";
  const itemIds = Array.from(document.querySelectorAll(".f-oitem:checked")).map(el => el.value);
  const outfit = {
    id: uid(), name, source: "wardrobe", itemIds,
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
  const isWeb = o.source === "web";
  const items = isWeb ? [] : Store.data.items.filter(i => o.itemIds.includes(i.id));
  const upcoming = Store.data.events.filter(e => e.date >= todayISO());
  openModal(`
    <div class="modal-header"><h2>${escapeHtml(o.name)}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    ${isWeb && o.webPhoto ? `<img src="${o.webPhoto}" style="width:100%;border-radius:10px;max-height:260px;object-fit:cover;margin-bottom:10px">` : ""}
    ${isWeb && o.webLink ? `<p><a href="${escapeHtml(o.webLink)}" target="_blank" rel="noopener noreferrer">${t("ot_open_link")}</a></p>` : ""}
    ${!isWeb ? `<div class="item-grid">${items.map(i => `<div class="item-card">${photoOrPh(i.photo, "👕")}</div>`).join("")}</div>` : ""}
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

// ================= CYCLE =================
const CYCLE_ACTIVITIES = ["rest", "walk", "workout", "yoga", "housework"];
const CYCLE_EFFORTS = ["minimal", "moderate", "high"];
const SYMPTOM_KEYS = ["cramps", "fatigue", "headache", "bloating", "backpain", "sorebreasts", "cravings", "acne", "sleepissues"];

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
  const profile = Store.data.cycleProfile;
  let avgCycle = cycleLengths.length ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null;
  let fromProfile = false;
  if (!avgCycle && profile && profile.avgCycleLength) { avgCycle = profile.avgCycleLength; fromProfile = true; }
  let lastStart = starts[starts.length - 1] || null;
  if (!lastStart && profile && profile.lastPeriodStart) { lastStart = profile.lastPeriodStart; fromProfile = true; }
  const nextPeriod = lastStart && avgCycle ? addDays(lastStart, avgCycle) : null;
  const ovulation = nextPeriod ? addDays(nextPeriod, -14) : null;
  const fertileStart = ovulation ? addDays(ovulation, -5) : null;
  const fertileEnd = ovulation ? addDays(ovulation, 1) : null;
  const cycleDay = lastStart ? daysBetween(lastStart, todayISO()) + 1 : null;
  return { periods, avgCycle, lastStart, nextPeriod, ovulation, fertileStart, fertileEnd, cycleDay, fromProfile };
}

function computeCyclePhase(dateISO) {
  const stats = computeCycleStats();
  for (const p of stats.periods) {
    if (dateISO >= p.start && dateISO <= p.end) return "menstrual";
  }
  if (!stats.lastStart) return "unknown";
  if (dateISO < stats.lastStart) return "unknown";
  const avg = stats.avgCycle || 28;
  const daysSinceStart = daysBetween(stats.lastStart, dateISO);
  const cycleDay = (daysSinceStart % avg) + 1;
  const ovulationDay = avg - 14;
  const periodLengths = stats.periods.map(p => daysBetween(p.start, p.end) + 1);
  const profile = Store.data.cycleProfile;
  const avgPeriodLength = periodLengths.length
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
    : (profile && profile.avgPeriodLength) || 5;
  if (cycleDay <= avgPeriodLength) return "menstrual";
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
  const phase = stats.lastStart ? computeCyclePhase(todayISO()) : "unknown";
  const pct = stats.cycleDay && stats.avgCycle ? Math.min(100, Math.round((stats.cycleDay / stats.avgCycle) * 100)) : 0;
  const ringColor = phase !== "unknown" ? `var(--cycle-${phase})` : "var(--accent)";

  return `
  ${renderCycleProfileCard()}
  <div class="card" style="text-align:center">
    ${stats.cycleDay ? `
      <div class="cycle-ring" style="background: conic-gradient(${ringColor} ${pct}%, var(--surface-alt) 0)">
        <div class="cycle-ring-inner">
          <div style="font-size:22px;font-weight:700">${stats.cycleDay}</div>
          <div class="muted" style="font-size:11px">${phase !== "unknown" ? t("cy_phase_" + phase) : ""}</div>
        </div>
      </div>
      <p class="muted" style="margin-top:10px">${t("cy_day_of_cycle", { day: stats.cycleDay })}</p>
      ${phase !== "unknown" ? `<p class="muted" style="font-size:12px">${t("cy_phase_desc_" + phase)}</p>` : ""}
    ` : `<p class="muted">${t("cy_not_enough_data")}</p>`}
    <button class="btn block" style="margin-top:8px" data-action="cy-log-day">${t("cy_log_day")}</button>
  </div>
  <div class="card">
    <h3>${t("cy_prediction")}</h3>
    ${stats.avgCycle ? `
      <p>${t("cy_next_period", { date: fmtDate(stats.nextPeriod) })}</p>
      <p>${t("cy_fertile_window", { start: fmtDate(stats.fertileStart), end: fmtDate(stats.fertileEnd) })}</p>
      <p class="muted">${t("cy_avg_cycle", { n: stats.avgCycle })}</p>
    ` : `<p class="muted">${t("cy_not_enough_data")}</p>`}
  </div>
  ${renderLastEntryExplanation()}
  ${renderQuarterlyAnalysis()}
  ${renderCycleEducation()}
  <div class="card" data-action="cy-toggle-history" style="cursor:pointer">
    <div class="row-between mb-0"><h3 class="mb-0">${t("cy_toggle_history")}</h3><span>${state.cyHistoryOpen ? "▾" : "▸"}</span></div>
    ${state.cyHistoryOpen ? (entries.length ? entries.map(e => {
      const entryPhase = computeCyclePhase(e.date);
      const dotColor = entryPhase !== "unknown" ? `var(--cycle-${entryPhase})` : "var(--border)";
      return `
      <div class="list-row" style="border-left:3px solid ${dotColor};padding-left:8px">
        <span>${fmtDate(e.date)} · ${t("cy_flow_" + e.flow)}</span>
        <button class="icon-btn" data-action="cy-delete-entry" data-id="${e.id}">✕</button>
      </div>`;
    }).join("") : `<p class="muted">${t("cy_empty")}</p>`) : ""}
  </div>`;
}

function renderCycleProfileCard() {
  const p = Store.data.cycleProfile;
  if (p) return "";
  return `<div class="card">
    <h3>${t("cy_profile_title")}</h3>
    <p class="muted">${t("cy_profile_body")}</p>
    <button class="btn block" data-action="cy-open-profile">${t("cy_profile_start")}</button>
  </div>`;
}

function renderLastEntryExplanation() {
  const entries = Store.data.cycleEntries.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) return "";
  const e = entries[0];
  const phase = computeCyclePhase(e.date);
  const stats = computeCycleStats();
  const cycleDayForEntry = stats.lastStart ? daysBetween(stats.lastStart, e.date) + 1 : null;
  return `<div class="card">
    <h3>${t("cy_last_entry_title")}</h3>
    <p class="muted">${fmtDate(e.date)}${phase !== "unknown" ? ` · ${t("cy_phase_" + phase)}${cycleDayForEntry ? ` (${t("cy_day_of_cycle", { day: cycleDayForEntry })})` : ""}` : ""}</p>
    <div class="list-row"><span>${t("cy_flow")}</span><span>${t("cy_flow_" + e.flow)}</span></div>
    <div class="list-row"><span>${t("cy_symptoms")}</span><span>${(e.symptoms && e.symptoms.length) ? e.symptoms.map(s => t("cy_symptom_" + s)).join(", ") : t("common_none")}</span></div>
    <div class="list-row"><span>${t("common_mood")}</span><span>${e.mood ? t("cy_mood_" + e.mood) : t("common_none")}</span></div>
    <div class="list-row"><span>${t("cy_label_activity")}</span><span>${(e.activities && e.activities.length) ? e.activities.map(a => t("cy_activity_" + a)).join(", ") : t("common_none")}</span></div>
    <div class="list-row"><span>${t("cy_label_effort")}</span><span>${e.effort ? t("cy_effort_" + e.effort) : t("common_none")}</span></div>
    ${e.notes ? `<p class="muted" style="margin-top:8px">"${escapeHtml(e.notes)}"</p>` : ""}
  </div>`;
}

function renderCycleEducation() {
  const phases = ["menstrual", "follicular", "ovulation", "luteal"];
  return `<div class="card" data-action="cy-toggle-education" style="cursor:pointer">
    <div class="row-between mb-0"><h3 class="mb-0">${t("cy_edu_title")}</h3><span>${state.cyEducationOpen ? "▾" : "▸"}</span></div>
    ${state.cyEducationOpen ? `
      <p class="muted" style="margin-top:8px">${t("cy_edu_intro")}</p>
      ${phases.map(p => `<p style="margin-top:8px"><strong>${t("cy_phase_" + p)}</strong> — ${t("cy_phase_desc_" + p)}</p>`).join("")}
      <p class="muted" style="margin-top:8px">${t("cy_info_source")}</p>
    ` : ""}
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
  </div>
  ${sorted.length ? renderSymptomInfo(sorted.map(([s]) => s)) : ""}`;
}

function renderSymptomInfo(symptomKeys) {
  return `<div class="card">
    <h3>${t("cy_info_title")}</h3>
    ${symptomKeys.map(s => `<p><strong>${t("cy_symptom_" + s)}</strong> — ${t("cy_info_" + s)}</p>`).join("")}
    <p style="margin-top:8px">🩺 ${t("cy_info_seek_care")}</p>
    <p class="muted" style="margin-top:8px">⚠️ ${t("cy_info_disclaimer")}</p>
    <p class="muted" style="font-size:11px">${t("cy_info_source")}</p>
  </div>`;
}

const MOOD_GROUPS = {
  positive: ["joyful", "cheerful", "optimistic", "energetic", "grateful", "peaceful", "relaxed", "hopeful", "content", "calm", "excited", "playful"],
  negative: ["anxious", "sad", "angry", "resentful", "gloomy", "depressed", "irritable", "stressed", "apathetic", "guilty", "fearful", "hostile"],
  neutral: ["indifferent", "curious", "reflective", "nostalgic", "pensive", "bored", "confused", "tense", "restless", "melancholy"]
};
const CYCLE_LOG_STEPS = ["flow", "symptoms", "mood", "activity", "effort"];

function openCycleLogModal(reset) {
  if (reset !== false) {
    state.cyLogStep = 0;
    window.__cyDraft = { date: todayISO(), flow: "none", symptoms: [], mood: "", activities: [], effort: "", notes: "" };
  }
  renderCycleLogStep();
}

function renderCycleLogStepBody(step, draft) {
  if (step === 0) {
    return `
      <div class="field"><label>${t("common_date")}</label><input type="date" id="f-cydate" value="${draft.date}"></div>
      <div class="field"><label>${t("cy_q1")}</label>
        <select id="f-cyflow">
          ${["none", "light", "medium", "heavy"].map(f => `<option value="${f}" ${draft.flow === f ? "selected" : ""}>${t("cy_flow_" + f)}</option>`).join("")}
        </select>
      </div>`;
  }
  if (step === 1) {
    return `<div class="field"><label>${t("cy_q2")}</label>
      <div class="chip-group">
        ${SYMPTOM_KEYS.map(s => `<span class="chip ${draft.symptoms.includes(s) ? "selected" : ""}" data-toggle-symptom="${s}">${t("cy_symptom_" + s)}</span>`).join("")}
      </div>
    </div>`;
  }
  if (step === 2) {
    return `<div class="field"><label>${t("cy_q3")}</label></div>
      ${Object.keys(MOOD_GROUPS).map(group => `
        <p class="muted" style="margin:10px 0 4px;font-size:12px;font-weight:600">${t("cy_mood_group_" + group)}</p>
        <div class="chip-group">
          ${MOOD_GROUPS[group].map(m => `<span class="chip ${draft.mood === m ? "selected" : ""}" data-mood="${m}">${t("cy_mood_" + m)}</span>`).join("")}
        </div>
      `).join("")}`;
  }
  if (step === 3) {
    return `<div class="field"><label>${t("cy_q4")}</label>
      <div class="chip-group">
        ${CYCLE_ACTIVITIES.map(a => `<span class="chip ${draft.activities.includes(a) ? "selected" : ""}" data-toggle-activity="${a}">${t("cy_activity_" + a)}</span>`).join("")}
      </div>
    </div>`;
  }
  return `<div class="field"><label>${t("cy_q5")}</label>
      <div class="chip-group" id="cy-effort-row">
        ${CYCLE_EFFORTS.map(e => `<span class="chip ${draft.effort === e ? "selected" : ""}" data-effort="${e}">${t("cy_effort_" + e)}</span>`).join("")}
      </div>
    </div>
    <div class="field"><label>${t("cy_q_notes")}</label><textarea id="f-cynotes">${escapeHtml(draft.notes)}</textarea></div>`;
}

function renderCycleLogStep() {
  const step = state.cyLogStep;
  const draft = window.__cyDraft;
  const isLast = step === CYCLE_LOG_STEPS.length - 1;
  openModal(`
    <div class="modal-header"><h2>${t("cy_log_day")} (${step + 1}/${CYCLE_LOG_STEPS.length})</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    ${renderCycleLogStepBody(step, draft)}
    <div class="grid-2" style="margin-top:14px">
      ${step > 0 ? `<button class="btn secondary" data-action="cy-log-prev">${t("common_back")}</button>` : "<span></span>"}
      <button class="btn" data-action="${isLast ? "cy-save-day" : "cy-log-next"}">${isLast ? t("common_save") : t("common_next")}</button>
    </div>
  `);
  attachCycleLogStepListeners(step, draft);
}

function attachCycleLogStepListeners(step, draft) {
  if (step === 1) {
    document.querySelectorAll("[data-toggle-symptom]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const s = chip.getAttribute("data-toggle-symptom");
        chip.classList.toggle("selected");
        const idx = draft.symptoms.indexOf(s);
        if (idx >= 0) draft.symptoms.splice(idx, 1); else draft.symptoms.push(s);
      });
    });
  } else if (step === 2) {
    document.querySelectorAll("[data-mood]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("[data-mood]").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        draft.mood = chip.getAttribute("data-mood");
      });
    });
  } else if (step === 3) {
    document.querySelectorAll("[data-toggle-activity]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const a = chip.getAttribute("data-toggle-activity");
        chip.classList.toggle("selected");
        const idx = draft.activities.indexOf(a);
        if (idx >= 0) draft.activities.splice(idx, 1); else draft.activities.push(a);
      });
    });
  } else if (step === 4) {
    document.querySelectorAll("#cy-effort-row .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#cy-effort-row .chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        draft.effort = chip.getAttribute("data-effort");
      });
    });
  }
}

function captureCycleLogStepInputs() {
  const draft = window.__cyDraft;
  if (state.cyLogStep === 0) {
    draft.date = document.getElementById("f-cydate").value || todayISO();
    draft.flow = document.getElementById("f-cyflow").value;
  } else if (state.cyLogStep === 4) {
    draft.notes = document.getElementById("f-cynotes").value;
  }
}

function cyLogNext() {
  captureCycleLogStepInputs();
  state.cyLogStep++;
  openCycleLogModal(false);
}
function cyLogPrev() {
  captureCycleLogStepInputs();
  state.cyLogStep--;
  openCycleLogModal(false);
}

function saveCycleDay() {
  captureCycleLogStepInputs();
  const draft = window.__cyDraft;
  const entry = {
    id: uid(),
    date: draft.date,
    flow: draft.flow,
    symptoms: draft.symptoms,
    mood: draft.mood,
    activities: draft.activities,
    effort: draft.effort,
    notes: draft.notes
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

function cyToggleHistory() {
  state.cyHistoryOpen = !state.cyHistoryOpen;
  render();
}

function openCycleProfileModal() {
  const p = Store.data.cycleProfile || {};
  openModal(`
    <div class="modal-header"><h2>${t("cy_profile_title")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("cy_profile_q1")}</label><input type="number" id="f-cpcycle" value="${p.avgCycleLength || 28}" min="15" max="60">
      <p class="muted" style="font-size:11px;margin-top:4px">${t("cy_profile_q1_hint")}</p>
    </div>
    <div class="field"><label>${t("cy_profile_q2")}</label><input type="number" id="f-cpperiod" value="${p.avgPeriodLength || 5}" min="1" max="14">
      <p class="muted" style="font-size:11px;margin-top:4px">${t("cy_profile_q2_hint")}</p>
    </div>
    <div class="field"><label>${t("cy_profile_q3")}</label><input type="date" id="f-cplast" value="${p.lastPeriodStart || ""}"></div>
    <div class="field"><label>${t("cy_profile_q4")}</label>
      <div class="chip-group" id="cp-symptom-row">
        ${SYMPTOM_KEYS.map(s => `<span class="chip ${p.commonSymptoms && p.commonSymptoms.includes(s) ? "selected" : ""}" data-toggle-symptom="${s}">${t("cy_symptom_" + s)}</span>`).join("")}
      </div>
    </div>
    <button class="btn block" data-action="cy-save-profile">${t("common_save")}</button>
  `);
  const selected = new Set(p.commonSymptoms || []);
  document.querySelectorAll("#cp-symptom-row .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const s = chip.getAttribute("data-toggle-symptom");
      chip.classList.toggle("selected");
      if (selected.has(s)) selected.delete(s); else selected.add(s);
    });
  });
  window.__cpGetSymptoms = () => Array.from(selected);
}

function saveCycleProfile() {
  Store.data.cycleProfile = {
    avgCycleLength: parseInt(document.getElementById("f-cpcycle").value, 10) || 28,
    avgPeriodLength: parseInt(document.getElementById("f-cpperiod").value, 10) || 5,
    lastPeriodStart: document.getElementById("f-cplast").value || null,
    commonSymptoms: window.__cpGetSymptoms ? window.__cpGetSymptoms() : []
  };
  Store.save();
  closeModal();
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
  const views = ["events", "period", "journal"];
  return `
  <div class="chip-group" style="margin-bottom:12px">
    ${views.map(v => `<span class="chip ${state.calView === v ? "selected" : ""}" data-action="cal-set-view" data-view="${v}">${t("cal_tab_" + v)}</span>`).join("")}
  </div>
  ${renderCalendarGridSection()}
  `;
}

function renderCalendarGridSection() {
  const y = state.calYear, m = state.calMonth;
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString(I18N.lang === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" });
  const dowLabels = I18N.lang === "fr" ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const events = Store.data.events;
  const today = todayISO();
  const view = state.calView;

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="calendar-day muted"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let cellStyle = "";
    let dots = "";
    if (view === "period") {
      const phase = computeCyclePhase(dateISO);
      const phaseColor = phase !== "unknown" ? `var(--cycle-${phase})` : "";
      if (phaseColor) cellStyle = `background:${phaseColor}3d;border:1px solid ${phaseColor}`;
    } else if (view === "journal") {
      const hasJournal = Store.data.journalEntries.some(j => j.date === dateISO);
      const hasOutfit = Store.data.outfits.some(o => (o.wornLog || []).some(w => w.date === dateISO));
      if (hasJournal) dots += `<span style="background:var(--accent)"></span>`;
      if (hasOutfit) dots += `<span style="background:var(--cycle-follicular)"></span>`;
    } else {
      const hasEvent = events.some(e => e.date === dateISO);
      const hasTask = Store.data.tasks.some(t => t.dueDate === dateISO);
      const hasHabit = Store.data.habits.some(h => (h.completedDates || []).includes(dateISO));
      if (hasEvent) dots += `<span style="background:var(--accent)"></span>`;
      if (hasTask) dots += `<span style="background:var(--cycle-ovulation)"></span>`;
      if (hasHabit) dots += `<span style="background:var(--cycle-follicular)"></span>`;
    }
    cells += `<div class="calendar-day ${dateISO === today ? "today" : ""}" data-action="cal-day-click" data-date="${dateISO}" style="${cellStyle}">
      ${day}${dots ? `<span class="day-dots">${dots}</span>` : ""}
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
  ${view === "period" ? renderCyclePhaseLegend() + renderPeriodProgressCard() : ""}
  ${view === "events" ? `<div class="card">
    <h3>${t("cal_upcoming")}</h3>
    ${upcoming.length ? upcoming.map(e => `<div class="list-row"><span>${fmtDate(e.date)} — ${escapeHtml(e.title)}</span></div>`).join("") : `<p class="muted">${t("cal_empty")}</p>`}
  </div>` : ""}`;
}

function renderPeriodProgressCard() {
  const stats = computeCycleStats();
  if (!stats.avgCycle) return `<div class="card"><p class="muted">${t("cy_not_enough_data")}</p></div>`;
  return `<div class="card">
    <p>${t("cy_next_period", { date: fmtDate(stats.nextPeriod) })}</p>
    <p>${t("cy_fertile_window", { start: fmtDate(stats.fertileStart), end: fmtDate(stats.fertileEnd) })}</p>
  </div>`;
}

function renderCyclePhaseLegend() {
  const phases = ["menstrual", "follicular", "ovulation", "luteal"];
  return `<div class="chip-group" style="margin-bottom:14px">
    ${phases.map(p => `<span class="chip" style="background:var(--cycle-${p})3d;border-color:var(--cycle-${p})">${t("cy_phase_" + p)}</span>`).join("")}
  </div>`;
}

function openDayModal(dateISO) {
  const events = Store.data.events.filter(e => e.date === dateISO);
  const tasksDue = Store.data.tasks.filter(tk => tk.dueDate === dateISO);
  const habitsDone = Store.data.habits.filter(h => (h.completedDates || []).includes(dateISO));
  const journalEntry = Store.data.journalEntries.find(j => j.date === dateISO);
  const wornOutfits = Store.data.outfits.filter(o => (o.wornLog || []).some(w => w.date === dateISO));
  const phase = computeCyclePhase(dateISO);

  openModal(`
    <div class="modal-header"><h2>${fmtDate(dateISO)}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    ${phase !== "unknown" ? `<p class="muted">${t("cy_phase_" + phase)}</p>` : ""}

    <h3 style="margin-top:10px">${t("tab_calendar")}</h3>
    ${events.length ? events.map(e => `
      <div class="list-row">
        <span>${e.time || ""} ${escapeHtml(e.title)}</span>
        <button class="icon-btn" data-action="delete-event" data-id="${e.id}">✕</button>
      </div>`).join("") : `<p class="muted">${t("cal_empty")}</p>`}
    <button class="btn secondary block" style="margin-top:8px" data-action="open-add-event" data-date="${dateISO}">${t("cal_add_event")}</button>

    ${tasksDue.length ? `<h3 style="margin-top:14px">${t("jr_tab_tasks")}</h3>${tasksDue.map(tk => `<div class="list-row"><span>${tk.icon || "📌"} ${escapeHtml(tk.title)}${tk.done ? " ✓" : ""}</span></div>`).join("")}` : ""}
    ${habitsDone.length ? `<h3 style="margin-top:14px">${t("jr_tab_habits")}</h3>${habitsDone.map(h => `<div class="list-row"><span>${h.icon || "🔁"} ${escapeHtml(h.name)}</span></div>`).join("")}` : ""}
    ${journalEntry ? `<h3 style="margin-top:14px">${t("jr_tab_diary")}</h3>
      ${(journalEntry.photos || []).map(p => `<img src="${p}" style="width:100%;border-radius:10px;margin-bottom:6px">`).join("")}
      <p>${escapeHtml(journalEntry.text)}</p>` : ""}
    ${wornOutfits.length ? `<h3 style="margin-top:14px">${t("tab_outfits")}</h3>${wornOutfits.map(o => `<div class="list-row"><span>${escapeHtml(o.name)}</span></div>`).join("")}` : ""}
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

// ================= JOURNAL / STRUCTURED =================
const TASK_ICONS = ["📌", "💼", "🏃", "📚", "🛒", "🧹", "💡", "🎯", "❤️", "🎨"];
const TASK_PRIORITIES = ["low", "medium", "high"];

function renderJournal() {
  if (isLocked("journal")) return renderLockScreen("jr_locked_msg");
  const views = ["diary", "tasks", "habits"];
  return `
  <div class="row-between" style="gap:8px;margin-bottom:12px">
    <div class="chip-group" style="flex:1">
      ${views.map(v => `<span class="chip ${state.jrView === v ? "selected" : ""}" data-action="jr-set-view" data-view="${v}">${t("jr_tab_" + v)}</span>`).join("")}
    </div>
    ${state.jrView !== "diary" ? `<button class="icon-btn" data-action="st-toggle-filters" title="${t("st_filter_toggle")}">${state.stFiltersOpen ? "▲" : "▽"}</button>` : ""}
  </div>
  ${state.stFiltersOpen && state.jrView !== "diary" ? renderStructuredFilterPanel() : ""}
  ${renderUpcomingAgenda()}
  ${state.jrView === "tasks" ? renderTasksView() : state.jrView === "habits" ? renderHabitsView() : renderDiaryView()}
  `;
}

function jrSetView(view) {
  state.jrView = view;
  render();
}

function renderStructuredFilterPanel() {
  const f = state.stFilter;
  const projects = Array.from(new Set(Store.data.tasks.map(t => t.project).filter(Boolean)));
  return `<div class="card" style="margin-bottom:10px">
    <input type="text" placeholder="${t("st_filter_search_placeholder")}" value="${escapeHtml(f.q)}" oninput="state.stFilter.q=this.value; render();" style="margin-bottom:10px">
    <div class="chip-group" style="margin-bottom:${projects.length ? "10px" : "0"}">
      <span class="chip ${f.when === "today" ? "selected" : ""}" data-action="st-filter-when" data-when="today">${t("st_filter_today")}</span>
      <span class="chip ${f.when === "upcoming" ? "selected" : ""}" data-action="st-filter-when" data-when="upcoming">${t("st_filter_upcoming")}</span>
      <span class="chip ${f.when === "archive" ? "selected" : ""}" data-action="st-filter-when" data-when="archive">${t("st_filter_archive")}</span>
    </div>
    ${projects.length ? `
    <p class="muted" style="font-size:11px;margin-bottom:4px">${t("st_projects_label")}</p>
    <div class="chip-group">
      ${projects.map(p => `<span class="chip ${f.project === p ? "selected" : ""}" data-action="st-filter-project" data-project="${escapeHtml(p)}">${escapeHtml(p)}</span>`).join("")}
    </div>` : ""}
  </div>`;
}

function stFilterWhen(when) {
  state.stFilter.when = state.stFilter.when === when ? "" : when;
  render();
}
function stFilterProject(project) {
  state.stFilter.project = state.stFilter.project === project ? "" : project;
  render();
}
function stToggleFilters() {
  state.stFiltersOpen = !state.stFiltersOpen;
  render();
}

function renderUpcomingAgenda() {
  const upcoming = Store.data.events.filter(e => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  if (!upcoming.length) return "";
  return `<div class="card">
    <h3>${t("cal_upcoming")}</h3>
    ${upcoming.map(e => `<div class="list-row"><span>${fmtDate(e.date)} — ${escapeHtml(e.title)}</span></div>`).join("")}
  </div>`;
}

function renderDiaryView() {
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

function tasksFiltered() {
  const f = state.stFilter;
  const today = todayISO();
  let tasks = Store.data.tasks.slice();
  if (f.q) { const q = f.q.toLowerCase(); tasks = tasks.filter(tk => tk.title.toLowerCase().includes(q) || (tk.project || "").toLowerCase().includes(q)); }
  if (f.project) tasks = tasks.filter(tk => tk.project === f.project);
  if (f.when === "today") tasks = tasks.filter(tk => tk.dueDate === today);
  else if (f.when === "upcoming") tasks = tasks.filter(tk => tk.dueDate && tk.dueDate > today);
  return tasks;
}

function renderTasksView() {
  const order = { high: 0, medium: 1, low: 2 };
  const tasks = tasksFiltered().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (order[a.priority] || 1) - (order[b.priority] || 1);
  });
  return `
  <button class="btn secondary block" style="margin-bottom:10px" data-action="tk-toggle-variety">📊 ${t("task_variety")}</button>
  ${state.tkVarietyOpen ? renderTaskVarietyCard() : ""}
  ${tasks.length ? tasks.map(tk => renderTaskCard(tk, state.stFilter.when === "archive")).join("") : `<div class="empty-state"><span class="ico">✅</span>${t("task_empty")}</div>`}
  `;
}

function renderTaskVarietyCard() {
  const all = Store.data.tasks;
  const byPriority = { high: 0, medium: 0, low: 0 };
  all.forEach(tk => { byPriority[tk.priority || "medium"] = (byPriority[tk.priority || "medium"] || 0) + 1; });
  const done = all.filter(tk => tk.done).length;
  return `<div class="card">
    <div class="stat-grid mb-0">
      <div class="stat-card"><div class="num">${byPriority.high}</div><div class="label">${t("task_priority_high")}</div></div>
      <div class="stat-card"><div class="num">${byPriority.medium}</div><div class="label">${t("task_priority_medium")}</div></div>
      <div class="stat-card"><div class="num">${byPriority.low}</div><div class="label">${t("task_priority_low")}</div></div>
      <div class="stat-card"><div class="num">${done}/${all.length}</div><div class="label">${t("task_archive_done")}</div></div>
    </div>
  </div>`;
}

function renderTaskCard(tk, showArchiveSymbol) {
  const color = tk.color || "var(--accent)";
  return `<div class="card" style="border-left:4px solid ${color}; opacity:${tk.done ? 0.6 : 1}">
    <div class="row-between">
      <h3>${tk.icon || "📌"} ${escapeHtml(tk.title)}${showArchiveSymbol ? (tk.done ? " ✓" : " ✗") : (tk.done ? " ✓" : "")}</h3>
      <span class="badge">${t("task_priority_" + (tk.priority || "medium"))}</span>
    </div>
    ${tk.project ? `<p class="muted">${t("task_project")}: ${escapeHtml(tk.project)}</p>` : ""}
    ${tk.dueDate ? `<p class="muted">${t("task_due_date")}: ${fmtDate(tk.dueDate)}</p>` : ""}
    ${tk.durationMinutes ? `<p class="muted">${tk.durationMinutes} min</p>` : ""}
    <div style="background:var(--surface-alt);border-radius:8px;height:8px;overflow:hidden;margin:8px 0">
      <div style="background:${color};height:100%;width:${tk.progress || 0}%"></div>
    </div>
    <div class="grid-2">
      <button class="btn secondary sm" data-action="task-bump-progress" data-id="${tk.id}">+25%</button>
      <button class="btn secondary sm" data-action="task-toggle-done" data-id="${tk.id}">${tk.done ? t("task_mark_undone") : t("task_mark_done")}</button>
    </div>
    <button class="icon-btn" style="margin-top:8px" data-action="delete-task" data-id="${tk.id}">✕</button>
  </div>`;
}

function openTaskModal() {
  openModal(`
    <div class="modal-header"><h2>${t("task_add")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("task_title")}</label><input id="f-tktitle"></div>
    <div class="grid-2">
      <div class="field"><label>${t("task_priority")}</label>
        <select id="f-tkpriority">${TASK_PRIORITIES.map(p => `<option value="${p}">${t("task_priority_" + p)}</option>`).join("")}</select>
      </div>
      <div class="field"><label>${t("task_due_date")}</label><input type="date" id="f-tkdue"></div>
    </div>
    <div class="field"><label>${t("task_duration")}</label><input type="number" id="f-tkduration" min="0"></div>
    <div class="field"><label>${t("task_project")} (${t("common_optional")})</label><input id="f-tkproject" placeholder="${t("task_project_placeholder")}"></div>
    <div class="field"><label>${t("task_icon")}</label>
      <div class="chip-group" id="tk-icon-row">${TASK_ICONS.map(ic => `<span class="chip" data-icon="${ic}">${ic}</span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("task_color")}</label>
      <div class="chip-group" id="tk-color-row">${COLORS.map(([c, hex]) => `<span class="swatch-chip" data-color-hex="${hex}" style="background:${hex}" title="${t("wr_color_" + c)}"></span>`).join("")}</div>
    </div>
    <button class="btn block" data-action="save-task">${t("common_save")}</button>
  `);
  let selIcon = TASK_ICONS[0];
  let selColorHex = "";
  document.querySelectorAll("#tk-icon-row .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#tk-icon-row .chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selIcon = chip.getAttribute("data-icon");
    });
  });
  document.querySelectorAll("#tk-color-row .swatch-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#tk-color-row .swatch-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selColorHex = chip.getAttribute("data-color-hex");
    });
  });
  window.__tkGetIcon = () => selIcon;
  window.__tkGetColor = () => selColorHex;
}

function saveTask() {
  const task = {
    id: uid(),
    title: document.getElementById("f-tktitle").value || "Task",
    priority: document.getElementById("f-tkpriority").value,
    dueDate: document.getElementById("f-tkdue").value || null,
    durationMinutes: parseInt(document.getElementById("f-tkduration").value, 10) || 0,
    project: document.getElementById("f-tkproject").value.trim(),
    icon: window.__tkGetIcon ? window.__tkGetIcon() : "📌",
    color: window.__tkGetColor ? window.__tkGetColor() : "",
    progress: 0, done: false, createdAt: todayISO()
  };
  Store.data.tasks.push(task);
  Store.save();
  closeModal();
  render();
}
function taskBumpProgress(id) {
  const tk = Store.data.tasks.find(x => x.id === id);
  tk.progress = Math.min(100, (tk.progress || 0) + 25);
  if (tk.progress >= 100) tk.done = true;
  Store.save();
  render();
}
function taskToggleDone(id) {
  const tk = Store.data.tasks.find(x => x.id === id);
  tk.done = !tk.done;
  if (tk.done) tk.progress = 100;
  Store.save();
  render();
}
function deleteTask(id) {
  if (!confirm(t("common_confirm_delete"))) return;
  Store.data.tasks = Store.data.tasks.filter(x => x.id !== id);
  Store.save();
  render();
}

function habitsFiltered() {
  const f = state.stFilter;
  const today = todayISO();
  let habits = Store.data.habits.slice();
  if (f.q) { const q = f.q.toLowerCase(); habits = habits.filter(h => h.name.toLowerCase().includes(q)); }
  if (f.when === "today") habits = habits.filter(h => !(h.completedDates || []).includes(today));
  return habits;
}

function renderHabitsView() {
  const habits = habitsFiltered();
  return `
  <button class="btn secondary block" style="margin-bottom:10px" data-action="hb-toggle-variety">📊 ${t("habit_variety")}</button>
  ${state.hbVarietyOpen ? renderHabitVarietyCard() : ""}
  ${habits.length ? habits.map(h => renderHabitCard(h, state.stFilter.when === "archive")).join("") : `<div class="empty-state"><span class="ico">🔁</span>${t("habit_empty")}</div>`}
  `;
}

function renderHabitVarietyCard() {
  const all = Store.data.habits;
  const byCourse = {};
  all.forEach(h => { const c = h.course || "daily"; byCourse[c] = (byCourse[c] || 0) + 1; });
  return `<div class="card">
    <div class="stat-grid mb-0">
      ${Object.entries(byCourse).map(([c, n]) => `<div class="stat-card"><div class="num">${n}</div><div class="label">${t("habit_course_" + c)}</div></div>`).join("")}
    </div>
  </div>`;
}

function renderHabitCard(h, showArchiveSymbol) {
  const today = todayISO();
  const last7 = [];
  for (let i = 6; i >= 0; i--) last7.push(addDays(today, -i));
  const streak = computeHabitStreak(h);
  const done = h.completedDates || [];
  const doneThisWeek = last7.filter(d => done.includes(d)).length;
  const weekPct = Math.round((doneThisWeek / 7) * 100);
  const color = h.color || "var(--accent)";
  const doneToday = done.includes(today);
  return `<div class="card">
    <div class="row-between">
      <h3>${h.icon || "🔁"} ${escapeHtml(h.name)}${showArchiveSymbol ? (doneToday ? " ✓" : " ✗") : ""}</h3>
      <button class="icon-btn" data-action="delete-habit" data-id="${h.id}">✕</button>
    </div>
    ${h.course ? `<p class="muted">${t("habit_course")}: ${h.course === "custom" ? escapeHtml(h.courseCustom || "") : t("habit_course_" + h.course)}</p>` : ""}
    <p class="muted">${t("habit_streak", { n: streak })}</p>
    <div style="background:var(--surface-alt);border-radius:8px;height:8px;overflow:hidden;margin:8px 0">
      <div style="background:${color};height:100%;width:${weekPct}%"></div>
    </div>
    <p class="muted" style="font-size:11px">${t("habit_week_progress", { n: doneThisWeek })}</p>
    <div class="chip-group">
      ${last7.map(d => `<span class="chip ${done.includes(d) ? "selected" : ""}" style="${done.includes(d) ? `background:${color};border-color:${color}` : ""}" data-action="habit-toggle-day" data-id="${h.id}" data-date="${d}">${d.slice(8, 10)}</span>`).join("")}
    </div>
  </div>`;
}

function computeHabitStreak(h) {
  let streak = 0;
  let d = todayISO();
  const set = new Set(h.completedDates || []);
  while (set.has(d)) { streak++; d = addDays(d, -1); }
  return streak;
}

function openHabitModal() {
  openModal(`
    <div class="modal-header"><h2>${t("habit_add")}</h2><button class="icon-btn" data-action="close-modal">✕</button></div>
    <div class="field"><label>${t("habit_name")}</label><input id="f-hbname"></div>
    <div class="field"><label>${t("habit_course")}</label>
      <select id="f-hbcourse">
        ${["daily", "weekly", "monthly", "summer", "custom"].map(c => `<option value="${c}">${t("habit_course_" + c)}</option>`).join("")}
      </select>
    </div>
    <div class="field hidden" id="hb-course-custom-wrap"><label>${t("habit_course")}</label><input id="f-hbcoursecustom" placeholder="${t("habit_course_custom_placeholder")}"></div>
    <div class="field"><label>${t("task_icon")}</label>
      <div class="chip-group" id="hb-icon-row">${TASK_ICONS.map(ic => `<span class="chip" data-icon="${ic}">${ic}</span>`).join("")}</div>
    </div>
    <div class="field"><label>${t("task_color")}</label>
      <div class="chip-group" id="hb-color-row">${COLORS.map(([c, hex]) => `<span class="swatch-chip" data-color-hex="${hex}" style="background:${hex}" title="${t("wr_color_" + c)}"></span>`).join("")}</div>
    </div>
    <button class="btn block" data-action="save-habit">${t("common_save")}</button>
  `);
  let selIcon = TASK_ICONS[0];
  let selColorHex = "";
  document.querySelectorAll("#hb-icon-row .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#hb-icon-row .chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selIcon = chip.getAttribute("data-icon");
    });
  });
  document.querySelectorAll("#hb-color-row .swatch-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#hb-color-row .swatch-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      selColorHex = chip.getAttribute("data-color-hex");
    });
  });
  document.getElementById("f-hbcourse").addEventListener("change", function () {
    document.getElementById("hb-course-custom-wrap").classList.toggle("hidden", this.value !== "custom");
  });
  window.__hbGetIcon = () => selIcon;
  window.__hbGetColor = () => selColorHex;
}

function saveHabit() {
  const habit = {
    id: uid(),
    name: document.getElementById("f-hbname").value || "Habit",
    course: document.getElementById("f-hbcourse").value,
    courseCustom: document.getElementById("f-hbcoursecustom").value,
    icon: window.__hbGetIcon ? window.__hbGetIcon() : "🔁",
    color: window.__hbGetColor ? window.__hbGetColor() : "",
    completedDates: []
  };
  Store.data.habits.push(habit);
  Store.save();
  closeModal();
  render();
}
function toggleHabitDay(id, date) {
  const h = Store.data.habits.find(x => x.id === id);
  h.completedDates = h.completedDates || [];
  const idx = h.completedDates.indexOf(date);
  if (idx >= 0) h.completedDates.splice(idx, 1); else h.completedDates.push(date);
  Store.save();
  render();
}
function deleteHabit(id) {
  if (!confirm(t("common_confirm_delete"))) return;
  Store.data.habits = Store.data.habits.filter(x => x.id !== id);
  Store.save();
  render();
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
      ${e.cyclePhase && e.cyclePhase !== "unknown" ? `<span class="badge" style="background:var(--cycle-${e.cyclePhase})3d;color:var(--text)">${t("cy_phase_" + e.cyclePhase)}</span>` : ""}
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
  const phase = (Store.data.cycleEntries.length || Store.data.cycleProfile) ? computeCyclePhase(today) : "unknown";
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
    cyclePhase: (Store.data.cycleEntries.length || Store.data.cycleProfile) ? computeCyclePhase(today) : "unknown"
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
    <h3>${t("set_notifications")}</h3>
    <label><input type="checkbox" data-action="toggle-notifications" ${s.notificationsEnabled ? "checked" : ""}> ${t("set_notifications_enable")}</label>
    ${s.notificationsEnabled && window.Notification && Notification.permission === "denied" ? `<p class="muted" style="margin-top:8px">${t("set_notifications_denied")}</p>` : ""}
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
function toggleThemeQuick() {
  const order = ["light", "dark", "system"];
  const s = Store.data.settings;
  const idx = order.indexOf(s.theme);
  s.theme = order[(idx + 1) % order.length];
  Store.save();
  applyTheme();
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
function toggleNotifications() {
  const s = Store.data.settings;
  s.notificationsEnabled = !s.notificationsEnabled;
  if (s.notificationsEnabled && window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
  Store.save();
  render();
  if (s.notificationsEnabled) checkReminders();
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
