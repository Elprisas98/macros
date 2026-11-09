// Macros — pesa tu comida, escríbela o tómale foto, y obtén sus macros.
// Todo vive en este teléfono (localStorage). La IA es Claude, con la API key del usuario.

const APP_VERSION = "3.1";
const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm";
const DEFAULT_MODEL = "claude-opus-5-5";

/* ================= Datos base ================= */
const NUTR = [
  { k: "kcal", label: "Calorías", unit: "kcal", d: 0 },
  { k: "protein", label: "Proteína", unit: "g", d: 1 },
  { k: "carbs", label: "Carbohidratos", unit: "g", d: 1 },
  { k: "fat", label: "Grasa", unit: "g", d: 1 },
  { k: "fiber", label: "Fibra", unit: "g", d: 1 },
  { k: "sugar", label: "Azúcar", unit: "g", d: 1 },
  { k: "satFat", label: "Grasa saturada", unit: "g", d: 1 },
  { k: "sodium", label: "Sodio", unit: "mg", d: 0 },
];
const MEALS = ["Desayuno", "Almuerzo", "Cena", "Snack"];
const MODES = {
  texto: { label: "Escribir", icon: "pencil" },
  etiqueta: { label: "Etiqueta", icon: "label" },
  plato: { label: "Plato", icon: "plate" },
};

/* ================= Íconos ================= */
const PATHS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.6-2.2h5.8L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5l-4.5-4.5-8.5 8.5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  label: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  scale: '<rect x="3.5" y="12" width="17" height="7.5" rx="2.5"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12l1.5-2"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  clipboard: '<rect x="5.5" y="5" width="13" height="16" rx="2.5"/><path d="M9 5V3.8h6V5"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 8c0-1.5 1-2 1-3.5M12 8c0-1.5 1-2 1-3.5M16 8c0-1.5 1-2 1-3.5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
const I = (n, s = 22) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PATHS[n] || ""}</svg>`;

/* ================= Almacenamiento ================= */
const store = {
  get(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { toast("No se pudo guardar"); } },
};
let log = store.get("macros.log", []);
let foods = store.get("macros.foods", []);
let settings = Object.assign(
  {
    apiKey: "", model: DEFAULT_MODEL, onboarded: false,
    goals: { kcal: 2200, protein: 150, carbs: 220, fat: 70 },
    profile: { goal: "mantener", sex: "h", age: 30, weight: 75, height: 172, activity: "media" },
  },
  store.get("macros.settings", {})
);
if (!settings.onboarded && (settings.apiKey || log.length)) settings.onboarded = true;
const saveLog = () => store.set("macros.log", log);
const saveFoods = () => store.set("macros.foods", foods);
const saveSettings = () => store.set("macros.settings", settings);

/* ================= Utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString("es-PE", { maximumFractionDigits: d }) : "–");
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function scale(per100, grams) {
  const o = {};
  for (const { k } of NUTR) o[k] = ((per100?.[k] || 0) * grams) / 100;
  return o;
}
function sum(entries) {
  const t = Object.fromEntries(NUTR.map(({ k }) => [k, 0]));
  for (const e of entries) { const s = scale(e.per100, e.grams); for (const { k } of NUTR) t[k] += s[k]; }
  return t;
}
function mealNow() {
  const h = new Date().getHours();
  return h < 11 ? "Desayuno" : h < 16 ? "Almuerzo" : h < 22 ? "Cena" : "Snack";
}
function dayLabel(ds) {
  const t = dayStr(); const y = new Date(); y.setDate(y.getDate() - 1);
  if (ds === t) return "Hoy";
  if (ds === dayStr(y)) return "Ayer";
  return cap(new Date(ds + "T12:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" }));
}
const macroLine = (s) => `
  <span><i class="dot p"></i>P <b>${fmt(s.protein, 1)}</b></span>
  <span><i class="dot c"></i>C <b>${fmt(s.carbs, 1)}</b></span>
  <span><i class="dot f"></i>G <b>${fmt(s.fat, 1)}</b></span>`;
const mealChips = (sel) => `<div class="chips">${MEALS.map((m) => `<button class="chip ${m === sel ? "on" : ""}" data-meal="${m}">${m}</button>`).join("")}</div>`;
function bindChips(el, onPick) {
  $$("[data-meal]", el).forEach((b) => b.addEventListener("click", () => {
    $$("[data-meal]", el).forEach((x) => x.classList.toggle("on", x === b)); onPick(b.dataset.meal);
  }));
}

// Aviso abajo de la pantalla; con action muestra un botón (ej. "Deshacer").
let toastTimer;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button id="toast-act">${esc(action.label)}</button>` : ""}`;
  t.classList.add("show");
  if (action) $("#toast-act").onclick = () => { t.classList.remove("show"); action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), action ? 5000 : 2200);
}

/* ================= Hojas (sheets) ================= */
let sheet = null;
function openSheet(name, render, { tall = false } = {}) {
  const root = $("#sheet-root");
  root.classList.remove("open");
  root.innerHTML = `<div class="backdrop"></div><div class="sheet ${tall ? "tall" : ""}"><div class="grab"></div><div class="sheet-body"></div></div>`;
  const body = $(".sheet-body", root);
  sheet = { name, render: () => { render(body); $$("[data-close]", body).forEach((b) => (b.onclick = closeSheet)); } };
  sheet.render();
  document.body.classList.add("locked");
  $(".backdrop", root).onclick = closeSheet;
  root.offsetHeight;
  root.classList.add("open");
  enableSheetDrag(root);
  return body;
}
// Arrastrar la hoja hacia abajo (desde la barrita o el título) la cierra, como en iOS.
function enableSheetDrag(root) {
  const sh = $(".sheet", root);
  let y0 = null, dy = 0;
  sh.addEventListener("touchstart", (e) => {
    if (!e.target.closest(".grab, .sheet-head") || e.target.closest("input, button, textarea")) return;
    y0 = e.touches[0].clientY; dy = 0; sh.style.transition = "none";
  }, { passive: true });
  sh.addEventListener("touchmove", (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sh.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sh.addEventListener("touchend", () => {
    if (y0 == null) return;
    y0 = null; sh.style.transition = ""; sh.style.transform = "";
    if (dy > 100) closeSheet();
  });
}
function closeSheet() {
  const root = $("#sheet-root");
  sheet = null; root.classList.remove("open"); document.body.classList.remove("locked");
  setTimeout(() => { if (!sheet) root.innerHTML = ""; }, 320);
}

/* ================= Navegación ================= */
const TABS = ["home", "history", "foods", "settings"];
let view = settings.onboarded ? "home" : "onboarding";
let obStep = 0;
let viewDate = dayStr();
let showMore = false;

const tabbar = $("#tabbar");
tabbar.innerHTML = `
  <button data-tab="home">${I("home", 24)}<span>Inicio</span></button>
  <button data-tab="history">${I("clock", 24)}<span>Historial</span></button>
  <button data-tab="add" class="tab-add" aria-label="Registrar comida"><span class="plus">${I("plus", 26)}</span><span>Registrar</span></button>
  <button data-tab="foods">${I("bowl", 24)}<span>Alimentos</span></button>
  <button data-tab="settings">${I("sliders", 24)}<span>Ajustes</span></button>`;
$$("button", tabbar).forEach((b) => b.addEventListener("click", () => {
  const t = b.dataset.tab;
  if (t === "add") return openAdd("texto");
  if (t === "home" && view === "home") viewDate = dayStr();
  go(t);
}));

function go(v) { view = v; render(); window.scrollTo(0, 0); }
function render() {
  const tabs = TABS.includes(view);
  tabbar.hidden = !tabs;
  document.body.classList.toggle("no-tabs", !tabs);
  $$("button", tabbar).forEach((b) => b.classList.toggle("on", b.dataset.tab === view));
  ({ home: renderHome, history: renderHistory, foods: renderFoods, settings: renderSettings, add: renderAdd, onboarding: renderOnboarding })[view]();
}

/* ================= Calendario ================= */
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WD = ["L", "M", "M", "J", "V", "S", "D"];
function dayTotals() {
  const m = new Map();
  for (const e of log) m.set(e.date, (m.get(e.date) || 0) + scale(e.per100, e.grams).kcal);
  return m;
}
const markOf = (kcal) => (kcal == null ? "" : kcal > settings.goals.kcal ? "over" : "ok");

// Calendario mensual con selector de mes y año. Marca los días con registros
// (verde = dentro de la meta, rojo = se pasó).
function calendar(el, { selected, onPick, onMonth }) {
  const sel = new Date(selected + "T12:00");
  let y = sel.getFullYear(), m = sel.getMonth(), mode = "days";
  const today = dayStr();
  const ty = +today.slice(0, 4), tm = +today.slice(5, 7) - 1;
  const totals = dayTotals();
  const draw = () => {
    if (mode === "days") {
      const offset = (new Date(y, m, 1, 12).getDay() + 6) % 7; // semana empieza en lunes
      const dim = new Date(y, m + 1, 0).getDate();
      const cells = Array.from({ length: offset }, () => "<span></span>");
      for (let d = 1; d <= dim; d++) {
        const ds = dayStr(new Date(y, m, d, 12));
        const mk = markOf(totals.get(ds));
        cells.push(`<button class="cal-day ${ds === today ? "today" : ""} ${ds === selected ? "sel" : ""}" data-d="${ds}" ${ds > today ? "disabled" : ""}><span>${d}</span>${mk ? `<i class="mark ${mk}"></i>` : ""}</button>`);
      }
      const nextOff = y > ty || (y === ty && m >= tm);
      el.innerHTML = `<div class="cal">
        <div class="cal-head"><button class="cal-title" data-act="mode">${cap(MONTHS[m])} ${y} ${I("down", 16)}</button>
          <div class="cal-nav"><button class="icon-btn plain" data-act="prev" aria-label="Mes anterior">${I("left", 20)}</button>
          <button class="icon-btn plain" data-act="next" aria-label="Mes siguiente" ${nextOff ? "disabled" : ""}>${I("right", 20)}</button></div></div>
        <div class="cal-wd">${WD.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells.join("")}</div></div>`;
    } else {
      el.innerHTML = `<div class="cal">
        <div class="cal-head"><button class="cal-title open" data-act="mode">${y} ${I("down", 16)}</button>
          <div class="cal-nav"><button class="icon-btn plain" data-act="prevY" aria-label="Año anterior">${I("left", 20)}</button>
          <button class="icon-btn plain" data-act="nextY" aria-label="Año siguiente" ${y >= ty ? "disabled" : ""}>${I("right", 20)}</button></div></div>
        <div class="cal-months">${MONTHS.map((n, i) => `<button data-mon="${i}" class="${i === m ? "sel" : ""}" ${y > ty || (y === ty && i > tm) ? "disabled" : ""}>${cap(n.slice(0, 3))}</button>`).join("")}</div></div>`;
    }
    $$("[data-act]", el).forEach((b) => (b.onclick = () => {
      const a = b.dataset.act;
      if (a === "mode") mode = mode === "days" ? "months" : "days";
      if (a === "prev") { m--; if (m < 0) { m = 11; y--; } }
      if (a === "next") { m++; if (m > 11) { m = 0; y++; } }
      if (a === "prevY") y--;
      if (a === "nextY") y++;
      if (y === ty && m > tm) m = tm;
      draw();
      if (a !== "mode") onMonth?.(y, m);
    }));
    $$("[data-mon]", el).forEach((b) => (b.onclick = () => { m = +b.dataset.mon; mode = "days"; draw(); onMonth?.(y, m); }));
    $$("[data-d]", el).forEach((b) => (b.onclick = () => onPick(b.dataset.d)));
  };
  draw();
  onMonth?.(y, m);
}

function openCalendar(selected, onPick) {
  openSheet("cal", (body) => {
    body.innerHTML = `<div class="sheet-head"><h2>Elige un día</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <div id="calbox"></div>
      <button class="btn block mt" id="gotoday">Ir a hoy</button>`;
    calendar($("#calbox", body), { selected, onPick: (d) => { closeSheet(); onPick(d); } });
    $("#gotoday", body).onclick = () => { closeSheet(); onPick(dayStr()); };
  });
}

// Fila "Día" con calendario desplegable dentro de una pantalla u hoja.
function dayPicker(root, getDate, setDate) {
  const btn = $("#daybtn", root), box = $("#calinline", root);
  btn.onclick = () => {
    box.hidden = !box.hidden;
    btn.classList.toggle("open", !box.hidden);
    if (!box.hidden) {
      calendar(box, { selected: getDate(), onPick: (d) => { setDate(d); $("#dayv", root).textContent = dayLabel(d); box.hidden = true; btn.classList.remove("open"); } });
      setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };
}
const dayPickerHTML = (date) => `<div class="group">
  <button class="field tap" id="daybtn" style="width:100%"><label style="text-align:left">Día</label><span class="val" id="dayv">${dayLabel(date)}</span><span class="val chev-rot">${I("down", 16)}</span></button>
  <div id="calinline" class="cal-inline" hidden></div></div>`;

/* ================= INICIO ================= */
function renderHome() {
  const entries = log.filter((e) => e.date === viewDate);
  const t = sum(entries);
  const g = settings.goals;
  const left = g.kcal - t.kcal;
  const R = 74, C = 2 * Math.PI * R;
  const frac = Math.min(1, g.kcal ? t.kcal / g.kcal : 0);
  const today = dayStr();
  const isToday = viewDate === today;
  const d = new Date(viewDate + "T12:00");
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const lbl = dayLabel(viewDate);
  const sub = lbl === "Hoy" || lbl === "Ayer"
    ? cap(d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) }))
    : `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
  const title = lbl === "Hoy" || lbl === "Ayer" ? lbl : `${cap(d.toLocaleDateString("es-PE", { weekday: "long" }))} ${d.getDate()}`;
  const pct = (v, goal) => Math.min(100, goal ? (v / goal) * 100 : 0);
  const macro = (k, cls, label) => {
    const over = t[k] > g[k];
    return `
    <div class="macro">
      <div class="lbl"><i class="dot ${cls}"></i>${label}</div>
      <div class="val">${fmt(t[k])}<small> / ${fmt(g[k])} g</small></div>
      <div class="track"><i class="${cls}" style="width:${pct(t[k], g[k])}%"></i></div>
      <div class="rem ${over ? "over" : ""}">${over ? `${fmt(t[k] - g[k])} g de más` : `quedan ${fmt(g[k] - t[k])} g`}</div>
    </div>`;
  };

  // Semana (lunes a domingo) del día que estás viendo
  const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const totals = dayTotals();
  let week = "";
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday); x.setDate(monday.getDate() + i);
    const ds = dayStr(x);
    week += `<button class="wd ${ds === viewDate ? "sel" : ""} ${ds === today ? "today" : ""}" data-wd="${ds}" ${ds > today ? "disabled" : ""}>
      <span class="wl">${WD[i]}</span><span class="wn">${x.getDate()}</span><i class="wdot ${markOf(totals.get(ds))}"></i></button>`;
  }
  const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
  const nextWeekOff = dayStr(nextMonday) > today;

  const meals = MEALS.map((m) => {
    const list = entries.filter((e) => e.meal === m);
    return `<section class="meal">
      <div class="meal-head"><h3>${m}</h3>
        <span>${list.length ? `${fmt(sum(list).kcal)} kcal` : ""}${!isToday && list.length ? `<button class="link sm" data-repeat="${m}">Repetir hoy</button>` : ""}</span></div>
      <div class="list">${list.map((e) => {
        const s = scale(e.per100, e.grams);
        return `<button class="row" data-entry="${e.id}">
          <div class="grow"><div class="t ellipsis">${esc(e.name)}</div><div class="s">${fmt(e.grams)} g · P ${fmt(s.protein)} · C ${fmt(s.carbs)} · G ${fmt(s.fat)}</div></div>
          <div class="k">${fmt(s.kcal)} <small>kcal</small></div></button>`;
      }).join("")}
        <button class="row add-row" data-addmeal="${m}">${I("plus", 18)}<span>Agregar a ${m.toLowerCase()}</span></button>
      </div></section>`;
  }).join("");

  $("#app").innerHTML = `
    <header class="home-head2">
      <div class="grow">
        <button class="date-btn" id="datebtn" aria-label="Cambiar día"><span class="h1">${title}</span>${I("down", 22)}</button>
        <div class="date-sub">${sub}</div>
      </div>
      ${isToday ? "" : `<button class="today-chip" id="today">Hoy</button>`}
      <button class="icon-btn" id="calbtn" aria-label="Abrir calendario">${I("calendar", 20)}</button>
    </header>

    <div class="week" id="week">
      <button class="icon-btn plain" id="pw" aria-label="Semana anterior">${I("left", 18)}</button>
      <div class="week-days">${week}</div>
      <button class="icon-btn plain" id="nw" aria-label="Semana siguiente" ${nextWeekOff ? "disabled" : ""}>${I("right", 18)}</button>
    </div>

    <section class="summary">
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 172 172">
          <circle class="ring-bg" cx="86" cy="86" r="${R}"/>
          <circle class="ring-fg ${left < 0 ? "over" : ""}" style="stroke-linecap:${frac > 0.95 ? "butt" : "round"}" cx="86" cy="86" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 86 86)"/>
        </svg>
        <div class="ring-center"><b>${fmt(Math.abs(left))}</b><span>${left >= 0 ? "kcal restantes" : "kcal de más"}</span></div>
      </div>
      <div class="ring-meta">Comiste <b>${fmt(t.kcal)}</b> de <b>${fmt(g.kcal)}</b> kcal</div>
      <div class="macros">${macro("protein", "p", "Proteína")}${macro("carbs", "c", "Carbos")}${macro("fat", "f", "Grasa")}</div>
      <button class="more-toggle ${showMore ? "open" : ""}" id="more">${showMore ? "Menos" : "Más nutrientes"} ${I("down", 16)}</button>
      ${showMore ? `<div class="extras">
        <div>Fibra<b>${fmt(t.fiber, 1)} g</b></div><div>Azúcar<b>${fmt(t.sugar, 1)} g</b></div>
        <div>G. sat.<b>${fmt(t.satFat, 1)} g</b></div><div>Sodio<b>${fmt(t.sodium)} mg</b></div></div>` : ""}
    </section>

    <div class="block-title"><h3>Registrar comida</h3></div>
    <div class="tiles">
      <button class="tile" data-mode="texto"><span class="ti t1">${I("pencil", 22)}</span><b>Escribir</b><span>lo que comiste</span></button>
      <button class="tile" data-mode="etiqueta"><span class="ti t2">${I("label", 22)}</span><b>Etiqueta</b><span>foto de la tabla nutricional</span></button>
      <button class="tile" data-mode="plato"><span class="ti t3">${I("plate", 22)}</span><b>Plato</b><span>foto de tu comida</span></button>
    </div>

    ${meals}
  `;
  const pick = (ds) => { viewDate = ds > today ? today : ds; renderHome(); };
  const shiftWeek = (n) => { const x = new Date(viewDate + "T12:00"); x.setDate(x.getDate() + 7 * n); pick(dayStr(x)); };
  $("#datebtn").onclick = () => openCalendar(viewDate, pick);
  $("#calbtn").onclick = () => openCalendar(viewDate, pick);
  $("#today")?.addEventListener("click", () => pick(today));
  $("#pw").onclick = () => shiftWeek(-1);
  $("#nw").onclick = () => shiftWeek(1);
  $$("[data-wd]").forEach((b) => (b.onclick = () => pick(b.dataset.wd)));
  // Deslizar la semana con el dedo
  const wk = $("#week"); let wx = null;
  wk.addEventListener("touchstart", (e) => { wx = e.touches[0].clientX; }, { passive: true });
  wk.addEventListener("touchend", (e) => {
    if (wx == null) return;
    const dx = e.changedTouches[0].clientX - wx; wx = null;
    if (dx > 50) shiftWeek(-1); else if (dx < -50 && !nextWeekOff) shiftWeek(1);
  }, { passive: true });
  $("#more").onclick = () => { showMore = !showMore; renderHome(); };
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => openAdd(b.dataset.mode)));
  $$("[data-addmeal]").forEach((b) => b.addEventListener("click", () => openAdd("texto", b.dataset.addmeal)));
  $$("[data-entry]").forEach((b) => b.addEventListener("click", () => openEntry(b.dataset.entry)));
  $$("[data-repeat]").forEach((b) => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const m = b.dataset.repeat;
    const copies = entries.filter((e) => e.meal === m).map((e) => ({ ...e, id: uid(), date: today, time: new Date().toISOString() }));
    log.push(...copies); saveLog(); renderHome();
    toast(`${m} copiado a hoy`, {
      label: "Deshacer",
      run: () => { const ids = new Set(copies.map((c) => c.id)); log = log.filter((e) => !ids.has(e.id)); saveLog(); render(); },
    });
  }));
}

/* ================= HISTORIAL ================= */
function renderHistory() {
  $("#app").innerHTML = `
    <h1 class="page-title" style="margin-top:14px">Historial</h1>
    <div class="card-cal" id="hcal"></div>
    <div id="hsum"></div>`;
  calendar($("#hcal"), {
    selected: viewDate,
    onPick: (d) => { viewDate = d; go("home"); },
    onMonth: drawHistoryMonth,
  });
}

function drawHistoryMonth(y, m) {
  const box = $("#hsum"); if (!box) return;
  const g = settings.goals;
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const days = [...new Set(log.filter((e) => e.date.startsWith(prefix)).map((e) => e.date))].sort().reverse();
  if (!days.length) {
    box.innerHTML = `<p class="foot" style="text-align:center;margin-top:18px">No registraste nada en ${MONTHS[m]}.</p>`;
    return;
  }
  const totals = days.map((ds) => sum(log.filter((e) => e.date === ds)));
  const avg = (k) => totals.reduce((a, t) => a + t[k], 0) / totals.length;
  const inGoal = totals.filter((t) => t.kcal <= g.kcal).length;
  box.innerHTML = `
    <div class="group-title">Resumen de ${MONTHS[m]}</div>
    <div class="stat-row">
      <div><b>${days.length}</b>días</div>
      <div><b>${fmt(avg("kcal"))}</b>kcal prom.</div>
      <div><b>${fmt(avg("protein"))}</b><span><i class="dot p"></i> prot prom.</span></div>
      <div><b>${inGoal}/${days.length}</b>en meta</div>
    </div>
    <div class="list">${days.map((ds, i) => {
      const t = totals[i];
      return `<button class="row day-row" data-day="${ds}">
        <div class="grow"><div class="t">${dayLabel(ds)}</div>
          <div class="s">P ${fmt(t.protein)} · C ${fmt(t.carbs)} · G ${fmt(t.fat)} g</div></div>
        <div class="right"><div class="k">${fmt(t.kcal)} <small>/ ${fmt(g.kcal)}</small></div>
          <div class="bar-mini"><i class="${t.kcal > g.kcal ? "over" : ""}" style="width:${Math.min(100, g.kcal ? (t.kcal / g.kcal) * 100 : 0)}%"></i></div></div>
        <span class="chev">${I("right", 18)}</span></button>`;
    }).join("")}</div>`;
  $$("[data-day]", box).forEach((b) => b.addEventListener("click", () => { viewDate = b.dataset.day; go("home"); }));
}

/* ================= REGISTRAR (página) ================= */
let add = null; // { mode, text, qty, note, photo, busy, error, results, notes, questions, answers, clar, meal }
const freshAdd = (mode) => ({ mode, text: "", qty: "", note: "", photo: null, busy: false, error: null, results: null, notes: "", questions: [], answers: {}, clar: [], meal: mealNow(), date: viewDate });

function openAdd(mode, meal) {
  if (!add || (!add.busy && !add.results)) add = freshAdd(mode || "texto");
  else if (mode && add.mode !== mode && !add.busy) add = freshAdd(mode);
  if (meal) add.meal = meal;
  go("add");
  if (add.mode === "texto" && !add.results && !add.busy) setTimeout(() => $("#txt")?.focus(), 250);
}
function leaveAdd() { if (!add?.busy) add = null; go("home"); }

// Cámara / galería
function pickPhoto(kind) { const input = $(kind === "cam" ? "#cam-input" : "#lib-input"); input.value = ""; input.click(); }
for (const id of ["#cam-input", "#lib-input"]) {
  $(id).addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file || !add) return;
    try { add.photo = await prepImage(file); add.error = null; if (view === "add") renderAdd(); }
    catch { toast("No pude leer esa imagen"); }
  });
}

function renderAdd() {
  const s = add;
  if (!s) return go("home");
  if (s.results) return renderResults();
  const busyText = { texto: "Calculando…", etiqueta: "Leyendo la etiqueta…", plato: "Mirando tu plato…" }[s.mode];
  const goText = { texto: "Calcular macros", etiqueta: "Leer etiqueta", plato: "Analizar plato" }[s.mode];
  const capture = (icon, cls, title, text) => `
    <div class="capture">
      <div class="capture-art ti ${cls}">${I(icon, 36)}</div>
      <h3>${title}</h3><p>${text}</p>
      <button class="btn primary block" id="cam">${I("camera", 20)} Tomar foto</button>
      <button class="btn block" id="lib">${I("image", 20)} Elegir de la galería</button>
    </div>`;
  const photoCard = () => `<div class="photo-card"><img src="${s.photo.dataUrl}" alt="">${s.busy ? "" : `<button class="retake" id="retake">${I("refresh", 16)} Cambiar</button>`}</div>`;

  let body = "";
  if (s.mode === "texto") {
    body = `
      <div class="composer big"><textarea id="txt" placeholder="Ej: 180 g de pechuga de pollo a la plancha y 150 g de arroz cocido" ${s.busy ? "disabled" : ""}>${esc(s.text)}</textarea></div>
      <p class="hint">${I("scale", 16)}<span>Pon los gramos de tu balanza y cómo lo cocinaste. Si falta algo importante, te pregunto.</span></p>`;
  } else if (s.mode === "etiqueta") {
    body = !s.photo
      ? capture("label", "t2", "Foto de la tabla nutricional", "Busca la tabla «Información nutricional» en el empaque. Que se lean bien los números.")
      : `${photoCard()}
        <div class="group"><div class="field"><label>¿Cuánto vas a comer?</label><input id="qty" type="number" inputmode="decimal" placeholder="Opcional" value="${esc(s.qty)}" ${s.busy ? "disabled" : ""}><span class="unit">g</span></div></div>
        <p class="foot">Pésalo en tu balanza. Si lo dejas vacío, uso la porción de la etiqueta.</p>`;
  } else {
    body = !s.photo
      ? capture("plate", "t3", "Foto de tu plato", "Tómala desde arriba, con todo el plato a la vista. Después ajustas los gramos con tu balanza.")
      : `${photoCard()}
        <div class="group"><textarea class="field-note" id="note" placeholder="Detalles (opcional): frito en aceite, arroz integral, el plato pesa 420 g…" ${s.busy ? "disabled" : ""}>${esc(s.note)}</textarea></div>`;
  }
  const ready = s.mode === "texto" || s.photo;

  $("#app").innerHTML = `
    <div class="topbar"><button class="back" id="back">${I("left", 22)} Inicio</button></div>
    <h1 class="page-title">Registrar comida</h1>
    <div class="seg modes">${Object.entries(MODES).map(([k, m]) => `<button data-m="${k}" class="${s.mode === k ? "on" : ""}" ${s.busy ? "disabled" : ""}>${I(m.icon, 17)} ${m.label}</button>`).join("")}</div>
    ${body}
    ${s.error ? `<div class="alert">${esc(s.error)}</div>` : ""}
    ${ready ? `<button class="btn primary block mt" id="go" ${s.busy ? "disabled" : ""}>${s.busy ? `<span class="spin"></span> ${busyText}` : goText}</button>` : ""}
    <div id="suggest"></div>
  `;
  $("#back").onclick = leaveAdd;
  $$("[data-m]").forEach((b) => b.addEventListener("click", () => {
    if (s.mode === b.dataset.m) return;
    add = { ...freshAdd(b.dataset.m), meal: s.meal, date: s.date }; renderAdd();
    if (add.mode === "texto") $("#txt")?.focus();
  }));
  $("#cam")?.addEventListener("click", () => pickPhoto("cam"));
  $("#lib")?.addEventListener("click", () => pickPhoto("lib"));
  $("#retake")?.addEventListener("click", () => { s.photo = null; s.error = null; renderAdd(); });
  $("#qty")?.addEventListener("input", (e) => (s.qty = e.target.value));
  $("#note")?.addEventListener("input", (e) => (s.note = e.target.value));
  const ta = $("#txt");
  if (ta) {
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(260, Math.max(120, ta.scrollHeight)) + "px"; };
    grow();
    ta.addEventListener("input", () => { s.text = ta.value; grow(); drawSuggest(); });
  }
  $("#go")?.addEventListener("click", analyze);
  drawSuggest();
}

// Sugerencias de "tus alimentos" mientras escribes (sin IA).
function drawSuggest() {
  const box = $("#suggest"); if (!box) return;
  if (!add || add.mode !== "texto" || add.busy || !foods.length) { box.innerHTML = ""; return; }
  const q = norm(add.text.replace(/\d+([.,]\d+)?\s*(kg|g|gr|gramos|ml)?\b/gi, " ").replace(/\s+/g, " "));
  let list = [...foods].sort((a, b) => (b.used || 0) - (a.used || 0));
  if (q) {
    const words = q.split(" ").filter((w) => w.length > 1 && !["de", "con", "y", "el", "la", "un", "una", "a"].includes(w));
    list = list.filter((f) => words.some((w) => norm(f.name).includes(w)));
  }
  list = list.slice(0, 8);
  if (!list.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="section-title">${q ? "De tus alimentos · sin IA" : "Recientes · sin IA"}</div>
    <div class="list">${list.map((f) => `
      <button class="row" data-food="${f.id}">
        <div class="grow"><div class="t ellipsis">${esc(f.name)}</div><div class="s">${fmt(f.per100.kcal)} kcal por 100 g</div></div>
        <span class="icon-btn" style="width:32px;height:32px">${I("plus", 18)}</span>
      </button>`).join("")}</div>`;
  $$("[data-food]", box).forEach((b) => b.addEventListener("click", () => openQuick(b.dataset.food)));
}

function applyResult(s, data) {
  s.results = data.items.map((it) => ({ ...it, grams: Math.round(it.grams * 10) / 10 }));
  s.notes = data.notes;
  s.questions = (data.questions || []).filter((q) => q.question && q.options?.length).slice(0, 2);
  s.answers = {};
}

async function analyze() {
  const s = add;
  if (!s || s.busy) return;
  if (s.mode === "texto" && !s.text.trim()) { toast("Escribe qué comiste"); $("#txt")?.focus(); return; }
  if (s.mode !== "texto" && !s.photo) { toast("Primero toma la foto"); return; }
  if (!settings.apiKey) { openKeySheet(() => { closeSheet(); analyze(); }); return; }
  s.busy = true; s.error = null;
  if (view === "add") renderAdd();
  try { applyResult(s, await askClaude(s)); }
  catch (err) { s.error = err.message || "Algo falló. Intenta de nuevo."; }
  finally {
    s.busy = false;
    if (view === "add" && add === s) { renderAdd(); window.scrollTo(0, 0); }
  }
}

async function refine() {
  const s = add;
  s.busy = true; renderResults();
  try { applyResult(s, await askClaude(s)); }
  catch (err) { toast(err.message || "No pude recalcular"); s.questions = []; s.answers = {}; }
  finally {
    s.busy = false;
    if (view === "add" && add === s) renderAdd();
  }
}

function renderResults() {
  const s = add;
  const total = () => sum(s.results);
  const qs = s.questions;
  $("#app").innerHTML = `
    <div class="topbar"><button class="back" id="back">${I("left", 22)} Atrás</button>
      <button class="link" id="cancel" style="padding-right:0">Cancelar</button></div>
    <h1 class="page-title">Resultado</h1>
    ${s.busy ? `<div class="ask" style="text-align:center"><span class="spin lg"></span><p class="muted" style="margin:10px 0 0">Ajustando con tus respuestas…</p></div>` : ""}
    ${!s.busy && qs.length ? `<div class="ask">
      <div class="ask-head">${I("sparkle", 18)} Para ser más exacto</div>
      ${qs.map((q, qi) => `<div class="ask-q"><p>${esc(q.question)}</p>
        <div class="ask-opts">${q.options.map((o, oi) => `<button class="chip ${s.answers[qi] === o ? "on" : ""}" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
      <p class="foot">Responde y recalculo. O ignóralo y agrega con el estimado.</p>
    </div>` : ""}
    ${!s.busy && s.clar.length ? `<p class="answered">Ajustado con: ${s.clar.map((c) => esc(c.a)).join(" · ")}</p>` : ""}
    <div class="${s.busy ? "refining" : ""}">
    ${s.results.map((it, i) => {
      const x = scale(it.per100, it.grams);
      return `<div class="food-card" data-i="${i}">
        <div class="fc-top">
          <input class="fc-name" value="${esc(it.name)}" aria-label="Nombre">
          ${it.confidence !== "alta" ? `<span class="pill">Estimado</span>` : ""}
          <button class="icon-btn plain rm" aria-label="Quitar">${I("x", 18)}</button>
        </div>
        <div class="fc-row">
          <label class="grams-field"><input class="g" type="number" inputmode="decimal" value="${it.grams}"><span>g</span></label>
          <div class="fc-kcal"><b data-k>${fmt(x.kcal)}</b> <span>kcal</span></div>
        </div>
        <div class="macro-line" data-m>${macroLine(x)}</div>
      </div>`;
    }).join("")}
    ${s.notes ? `<p class="note">${esc(s.notes)}</p>` : ""}
    <div class="section-title" style="margin-top:18px">¿Cuándo?</div>
    ${dayPickerHTML(s.date)}
    <div style="height:10px"></div>
    ${mealChips(s.meal)}
    </div>
    <div class="sticky-cta"><button class="btn primary block" id="save" ${s.busy ? "disabled" : ""}>Agregar · <span id="tot">${fmt(total().kcal)}</span> kcal</button></div>
  `;
  $("#back").onclick = () => { if (s.busy) return; s.results = null; s.questions = []; s.clar = []; renderAdd(); };
  $("#cancel").onclick = leaveAdd;
  $$("[data-q]").forEach((b) => b.addEventListener("click", () => {
    const qi = +b.dataset.q; const q = qs[qi];
    s.answers[qi] = q.options[+b.dataset.o];
    $$(`[data-q="${qi}"]`).forEach((x) => x.classList.toggle("on", x === b));
    if (qs.every((_, i) => s.answers[i])) {
      qs.forEach((qq, i) => s.clar.push({ q: qq.question, a: s.answers[i] }));
      refine();
    }
  }));
  $$(".food-card").forEach((card) => {
    const it = s.results[+card.dataset.i];
    $(".g", card).addEventListener("input", (e) => {
      it.grams = num(e.target.value);
      const x = scale(it.per100, it.grams);
      $("[data-k]", card).textContent = fmt(x.kcal);
      $("[data-m]", card).innerHTML = macroLine(x);
      $("#tot").textContent = fmt(total().kcal);
    });
    $(".fc-name", card).addEventListener("input", (e) => (it.name = e.target.value));
    $(".rm", card).onclick = () => {
      s.results.splice(+card.dataset.i, 1);
      if (!s.results.length) { s.results = null; s.questions = []; }
      renderAdd();
    };
  });
  bindChips($("#app"), (m) => (s.meal = m));
  dayPicker($("#app"), () => s.date, (d) => (s.date = d));
  $("#save").onclick = () => {
    const ids = [];
    for (const it of s.results) {
      if (!it.grams) continue;
      const name = it.name.trim() || "Alimento";
      const id = uid(); ids.push(id);
      log.push({ id, date: s.date, time: new Date().toISOString(), meal: s.meal, name, grams: it.grams, per100: it.per100 });
      rememberFood(name, it.per100, it.grams);
    }
    saveLog(); saveFoods();
    add = null; viewDate = s.date; go("home");
    toast(`Agregado a ${s.meal}`, { label: "Deshacer", run: () => { log = log.filter((e) => !ids.includes(e.id)); saveLog(); render(); } });
  };
}

/* ================= Alimento guardado: solo gramos ================= */
function openQuick(id) {
  const f = foods.find((x) => x.id === id); if (!f) return;
  let meal = add?.meal || mealNow();
  let date = add?.date || viewDate;
  openSheet("quick", (body) => {
    body.innerHTML = `
      <div class="sheet-head"><h2 class="ellipsis">${esc(f.name)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <label class="big-grams"><input id="g" type="number" inputmode="decimal" placeholder="${f.lastGrams || 100}"><span>g</span></label>
      <div class="big-caption">Escribe lo que marca tu balanza</div>
      <div class="stat-row" id="stats"></div>
      ${dayPickerHTML(date)}
      ${mealChips(meal)}
      <button class="btn primary block" id="ok">Agregar</button>
      ${view === "foods" ? `<button class="link" id="edit" style="width:100%;margin-top:4px">Editar alimento</button>` : ""}`;
    const g = $("#g", body);
    const grams = () => num(g.value) || num(g.placeholder);
    const draw = () => {
      const x = scale(f.per100, grams());
      $("#stats", body).innerHTML = `<div><b>${fmt(x.kcal)}</b>kcal</div><div><b>${fmt(x.protein, 1)}</b><span><i class="dot p"></i> prot</span></div><div><b>${fmt(x.carbs, 1)}</b><span><i class="dot c"></i> carb</span></div><div><b>${fmt(x.fat, 1)}</b><span><i class="dot f"></i> grasa</span></div>`;
    };
    draw(); g.addEventListener("input", draw);
    setTimeout(() => g.focus(), 350);
    dayPicker(body, () => date, (d) => (date = d));
    bindChips(body, (m) => (meal = m));
    $("#ok", body).onclick = () => {
      const qty = grams(); if (!qty) { toast("Pon los gramos"); return; }
      const entry = { id: uid(), date, time: new Date().toISOString(), meal, name: f.name, grams: qty, per100: f.per100 };
      log.push(entry);
      f.used = Date.now(); f.lastGrams = qty; saveLog(); saveFoods();
      add = null; closeSheet(); viewDate = date; go("home");
      toast(`Agregado a ${meal}`, { label: "Deshacer", run: () => { log = log.filter((x) => x.id !== entry.id); saveLog(); render(); } });
    };
    $("#edit", body)?.addEventListener("click", () => editFood(f.id));
  });
}

function rememberFood(name, per100, grams) {
  const ex = foods.find((f) => norm(f.name) === norm(name));
  if (ex) { ex.per100 = per100; ex.lastGrams = grams; ex.used = Date.now(); }
  else foods.push({ id: uid(), name, per100, lastGrams: grams, used: Date.now() });
}

/* ================= Editar un registro ================= */
function openEntry(id) {
  const e = log.find((x) => x.id === id); if (!e) return;
  let meal = e.meal;
  let date = e.date;
  const today = dayStr();
  openSheet("entry", (body) => {
    body.innerHTML = `
      <div class="sheet-head"><input class="name-input" id="nm" value="${esc(e.name)}" aria-label="Nombre"><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <label class="big-grams"><input id="g" type="number" inputmode="decimal" value="${e.grams}"><span>g</span></label>
      <div class="big-caption">Toca el número para cambiar los gramos</div>
      <div class="stat-row" id="stats"></div>
      <button class="more-toggle" id="allnutr" style="border:0;margin:-6px 0 8px;padding-top:0">Todos los nutrientes ${I("down", 16)}</button>
      <div class="nutr" id="tbl" hidden></div>
      ${dayPickerHTML(date)}
      ${mealChips(meal)}
      <button class="btn primary block" id="ok">Guardar cambios</button>
      <div class="split-actions">
        <button class="link" id="dup">${e.date === today ? "Duplicar" : "Repetir hoy"}</button>
        <button class="link danger" id="del">Eliminar</button>
      </div>`;
    const g = $("#g", body);
    const draw = () => {
      const x = scale(e.per100, num(g.value));
      $("#stats", body).innerHTML = `<div><b>${fmt(x.kcal)}</b>kcal</div><div><b>${fmt(x.protein, 1)}</b><span><i class="dot p"></i> prot</span></div><div><b>${fmt(x.carbs, 1)}</b><span><i class="dot c"></i> carb</span></div><div><b>${fmt(x.fat, 1)}</b><span><i class="dot f"></i> grasa</span></div>`;
      $("#tbl", body).innerHTML = NUTR.map((n) => `<div><span>${n.label}</span><b>${fmt(x[n.k], n.d)} ${n.unit}</b></div>`).join("");
    };
    draw(); g.addEventListener("input", draw);
    $("#allnutr", body).onclick = (ev) => { const t = $("#tbl", body); t.hidden = !t.hidden; ev.currentTarget.classList.toggle("open", !t.hidden); };
    dayPicker(body, () => date, (d) => (date = d));
    bindChips(body, (m) => (meal = m));
    $("#ok", body).onclick = () => {
      const qty = num(g.value); if (!qty) { toast("Pon los gramos"); return; }
      e.grams = qty; e.meal = meal; e.date = date; e.name = $("#nm", body).value.trim() || e.name;
      saveLog(); closeSheet(); render(); toast("Guardado");
    };
    $("#dup", body).onclick = () => {
      const copy = { ...e, id: uid(), date: today, time: new Date().toISOString(), grams: num(g.value) || e.grams };
      log.push(copy); saveLog(); closeSheet(); render();
      toast(e.date === today ? "Duplicado" : "Agregado a hoy", { label: "Deshacer", run: () => { log = log.filter((x) => x.id !== copy.id); saveLog(); render(); } });
    };
    $("#del", body).onclick = () => {
      const idx = log.indexOf(e);
      log.splice(idx, 1); saveLog(); closeSheet(); render();
      toast("Eliminado", { label: "Deshacer", run: () => { log.splice(idx, 0, e); saveLog(); render(); } });
    };
  });
}

/* ================= Claude ================= */
const RESULT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["items", "questions", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["name", "grams", "per100", "confidence"],
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          per100: {
            type: "object", additionalProperties: false, required: NUTR.map((n) => n.k),
            properties: Object.fromEntries(NUTR.map((n) => [n.k, { type: "number" }])),
          },
          confidence: { type: "string", enum: ["alta", "media", "baja"] },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["question", "options"],
        properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } },
      },
    },
    notes: { type: "string" },
  },
};

const SYSTEM = `Eres un nutricionista que convierte comida en datos nutricionales precisos para una app de conteo de macros. El usuario pesa su comida con una balanza de cocina.

Reglas:
- Devuelve cada alimento por separado en "items", con nombres cortos y claros en español (ej: "Pechuga de pollo a la plancha", "Arroz blanco cocido").
- "per100" son los valores por cada 100 g del alimento TAL COMO SE COME (cocido si está cocido). Calorías en kcal, sodio en mg, el resto en gramos. Si un valor no aplica, pon 0.
- "grams" es la cantidad que comió. Si el usuario da gramos, úsalos exactamente. Si da unidades (1 huevo, media palta, 2 tajadas), conviértelas con pesos típicos. Si no da cantidad, estima una porción típica y usa confidence "baja".
- Usa valores de referencia confiables (USDA FoodData Central; tablas peruanas o latinoamericanas cuando aplique). Considera el aceite de cocción si el método lo implica.
- "confidence": "alta" si los datos vienen de una etiqueta o el alimento es estándar y el peso es conocido; "media" si estimaste algo; "baja" si estimaste porción y composición.
- "questions": como máximo 2 preguntas, y SOLO si la respuesta cambiaría el total de calorías en más de ~10% y no se puede deducir. Ejemplos: si se frió y con cuánto aceite, si los gramos son en crudo o cocido, con o sin piel, tipo de leche, cuánto comió si no lo dijo. Pregunta corta y concreta, con 2 a 4 opciones de máximo 4 palabras cada una. Aun así, en "items" devuelve siempre tu mejor estimado. Si todo está claro, devuelve una lista vacía. En etiquetas legibles casi nunca hace falta preguntar. Nunca repitas algo que el usuario ya aclaró.
- "notes": una frase útil en español (el supuesto principal). Puede quedar vacío. Si no puedes identificar comida o leer la etiqueta, devuelve "items" vacío y explica en "notes" qué pasó y cómo tomar mejor la foto.`;

function userPrompt(s) {
  let p;
  if (s.mode === "texto") p = `El usuario comió esto:\n\n${s.text.trim()}`;
  else if (s.mode === "etiqueta") p = `Esta es la foto de la tabla nutricional de un empaque. Lee los valores con exactitud y conviértelos a por 100 g (si la tabla da valores por porción, divide entre el peso de la porción y multiplica por 100; si solo da kJ, convierte a kcal). Devuelve un solo item con el nombre del producto si se ve (si no, un nombre genérico). Para "grams": ${num(s.qty) ? `el usuario va a comer ${num(s.qty)} g` : "usa el tamaño de porción indicado en la etiqueta"}. Confidence "alta" si se lee bien.`;
  else p = `Esta es una foto de un plato de comida. Identifica cada componente por separado y estima su peso en gramos (comida ya servida), usando el plato, los cubiertos y otros objetos como escala.${s.note.trim() ? `\n\nDetalles del usuario: ${s.note.trim()}` : ""}`;
  if (s.clar.length) p += `\n\nAclaraciones del usuario (ya respondidas, no las vuelvas a preguntar):\n${s.clar.map((c) => `- ${c.q} → ${c.a}`).join("\n")}`;
  return p;
}

let sdkPromise;
const loadSdk = () => (sdkPromise ??= import(SDK_URL));

async function askClaude(s) {
  let Anthropic;
  try { ({ default: Anthropic } = await loadSdk()); }
  catch { sdkPromise = null; throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo."); }
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const content = [];
  if (s.photo && s.mode !== "texto") content.push({ type: "image", source: { type: "base64", media_type: s.photo.mediaType, data: s.photo.base64 } });
  content.push({ type: "text", text: userPrompt(s) });

  let res;
  try {
    res = await client.beta.messages.create({
      model: settings.model || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: s.mode === "texto" ? "low" : "medium", format: { type: "json_schema", schema: RESULT_SCHEMA } },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Tu API key no funciona. Revísala en Ajustes.");
    if (err instanceof Anthropic.PermissionDeniedError) throw new Error("Tu API key no tiene acceso a este modelo. Prueba otro en Ajustes.");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Muchas consultas seguidas o sin saldo. Espera un momento o revisa tu saldo en platform.claude.com.");
    if (err instanceof Anthropic.BadRequestError) throw new Error(/credit|balance/i.test(err.message) ? "Tu cuenta de Anthropic no tiene saldo. Recarga en platform.claude.com → Billing." : "No se pudo procesar. Intenta con otra foto o descripción.");
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.");
    if (err instanceof Anthropic.APIError) throw new Error("El servicio no respondió bien. Intenta de nuevo en un momento.");
    throw err;
  }
  if (res.stop_reason === "refusal") throw new Error("No pude analizar esto. Prueba con otra foto o descripción.");
  if (res.stop_reason === "max_tokens") throw new Error("Son demasiados alimentos a la vez. Divídelo en dos.");
  const data = JSON.parse(res.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
  if (!Array.isArray(data.items) || !data.items.length) throw new Error(data.notes || "No encontré comida aquí. Describe un poco más o prueba otra foto.");
  return data;
}

// Reduce la foto a ≤1568 px (lo que Claude aprovecha) para que el envío sea rápido.
function prepImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, 1568 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

/* ================= Metas: calculadora ================= */
function calcGoals(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "h" ? 5 : -161);
  const tdee = bmr * ({ baja: 1.375, media: 1.55, alta: 1.725 }[p.activity] || 1.55);
  const kcal = Math.round((tdee * ({ bajar: 0.8, mantener: 1, subir: 1.1 }[p.goal] || 1)) / 10) * 10;
  const protein = Math.round(p.weight * (p.goal === "mantener" ? 1.8 : 2));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

function goalsForm(el, onDone, { cta = "Continuar" } = {}) {
  const p = { ...settings.profile };
  const seg = (key, opts) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${p[key] === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  el.innerHTML = `
    <div class="q">Tu objetivo</div>
    ${seg("goal", [["bajar", "Bajar grasa"], ["mantener", "Mantener"], ["subir", "Ganar músculo"]])}
    <div class="q">Sexo</div>
    ${seg("sex", [["h", "Hombre"], ["m", "Mujer"]])}
    <div class="q">Tus datos</div>
    <div class="group">
      <div class="field"><label>Edad</label><input data-p="age" type="number" inputmode="numeric" value="${p.age}"><span class="unit">años</span></div>
      <div class="field"><label>Peso</label><input data-p="weight" type="number" inputmode="decimal" value="${p.weight}"><span class="unit">kg</span></div>
      <div class="field"><label>Altura</label><input data-p="height" type="number" inputmode="numeric" value="${p.height}"><span class="unit">cm</span></div>
    </div>
    <div class="q">¿Cuánto te mueves?</div>
    ${seg("activity", [["baja", "Poco"], ["media", "3–4 entrenos"], ["alta", "5+ entrenos"]])}
    <div class="result-card" id="res"></div>
    <div class="actions" style="margin-top:20px"><button class="btn primary block" id="done">${cta}</button></div>`;
  const draw = () => {
    const g = calcGoals(p);
    $("#res", el).innerHTML = `<div class="muted" style="font-size:14px">Tu meta diaria</div>
      <div class="big">${fmt(g.kcal)} <small>kcal</small></div>
      <div class="mac"><span><i class="dot p"></i><b>${g.protein}</b> g prot</span><span><i class="dot c"></i><b>${g.carbs}</b> g carb</span><span><i class="dot f"></i><b>${g.fat}</b> g grasa</span></div>`;
  };
  $$("[data-seg]", el).forEach((sg) => $$("button", sg).forEach((b) => b.addEventListener("click", () => {
    p[sg.dataset.seg] = b.dataset.v; $$("button", sg).forEach((x) => x.classList.toggle("on", x === b)); draw();
  })));
  $$("[data-p]", el).forEach((i) => i.addEventListener("input", () => { p[i.dataset.p] = num(i.value); draw(); }));
  draw();
  $("#done", el).onclick = () => {
    if (!p.weight || !p.height || !p.age) { toast("Completa edad, peso y altura"); return; }
    settings.profile = p; settings.goals = calcGoals(p); saveSettings(); onDone();
  };
}

function keyForm(el, onDone, { skip = false } = {}) {
  el.innerHTML = `
    <ol class="steps">
      <li><span>Entra a <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a> e inicia sesión.</span></li>
      <li><span>En <b>Billing</b>, carga saldo. Con 5 USD tienes para cientos de consultas.</span></li>
      <li><span>En <b>API Keys</b>, toca <b>Create Key</b> y cópiala.</span></li>
    </ol>
    <div class="key-input">
      <input id="key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(settings.apiKey)}">
      <button class="btn sm" id="paste">${I("clipboard", 18)} Pegar</button>
    </div>
    <p class="privacy">${I("lock", 15)}<span>Se guarda solo en este teléfono y solo se envía a Anthropic.</span></p>
    <div class="actions">
      <button class="btn primary block" id="save">Guardar</button>
      ${skip ? `<button class="link" id="skip">Ahora no</button>` : ""}
    </div>`;
  const input = $("#key", el);
  $("#paste", el).onclick = async () => {
    try { input.value = (await navigator.clipboard.readText()).trim(); }
    catch { input.focus(); toast("Mantén presionado el campo y elige Pegar"); }
  };
  $("#save", el).onclick = () => {
    const k = input.value.trim();
    if (!/^sk-ant-/.test(k)) { toast("La key empieza con sk-ant-"); return; }
    settings.apiKey = k; saveSettings(); onDone(true);
  };
  $("#skip", el)?.addEventListener("click", () => onDone(false));
}

function openKeySheet(after) {
  openSheet("key", (body) => {
    body.innerHTML = `<div class="sheet-head"><h2>Conecta la IA</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <p class="sub" style="margin-top:-6px">Macros usa Claude para entender lo que escribes y leer tus fotos. Necesitas tu propia API key (una sola vez).</p>
      <div id="kf"></div>`;
    keyForm($("#kf", body), (saved) => { if (saved) { toast("IA conectada"); after ? after() : closeSheet(); } else closeSheet(); });
  });
}

/* ================= BIENVENIDA ================= */
function renderOnboarding() {
  const dots = `<div class="dots">${[0, 1, 2].map((i) => `<i class="${i === obStep ? "on" : ""}"></i>`).join("")}</div>`;
  const back = obStep ? `<div class="topbar"><button class="back" id="obback">${I("left", 22)} Atrás</button></div>` : "";
  const step = (n) => { obStep = n; renderOnboarding(); window.scrollTo(0, 0); };
  const finish = () => { settings.onboarded = true; saveSettings(); go("home"); };
  const app = $("#app");
  if (obStep === 0) {
    app.innerHTML = `<div class="ob">
      ${dots}
      <div class="ob-hero"><img src="icons/icon-512.png" alt=""><h1 style="margin-top:20px">Tus macros,<br>sin complicarte</h1>
      <p class="lead">Pesa tu comida y dile a la app qué es.<br>Ella hace las cuentas.</p></div>
      <div class="feat"><div class="ic">${I("pencil", 20)}</div><div><b>Escríbelo como hablas</b><span>"180 g de pollo y 150 g de arroz"</span></div></div>
      <div class="feat"><div class="ic">${I("label", 20)}</div><div><b>Foto de la etiqueta</b><span>Lee la tabla nutricional del empaque</span></div></div>
      <div class="feat"><div class="ic">${I("plate", 20)}</div><div><b>Foto del plato</b><span>Reconoce cada cosa y estima los gramos</span></div></div>
      <div class="feat"><div class="ic">${I("bolt", 20)}</div><div><b>Lo de siempre, en un toque</b><span>Recuerda lo que comes; solo pones los gramos</span></div></div>
      <div class="actions"><button class="btn primary block" id="next">Empezar</button></div>
    </div>`;
    $("#next").onclick = () => step(1);
  } else if (obStep === 1) {
    app.innerHTML = `<div class="ob">${back}${dots}<h1>Tu meta diaria</h1>
      <p class="lead">La calculo con tus datos. Puedes cambiarla cuando quieras.</p><div id="gf"></div></div>`;
    goalsForm($("#gf"), () => (settings.apiKey ? finish() : step(2)));
  } else {
    app.innerHTML = `<div class="ob">${back}${dots}<h1>Conecta la IA</h1>
      <p class="lead">Macros usa Claude para entender lo que escribes y leer tus fotos. Solo necesitas tu propia API key, una vez.</p>
      <div id="kf" style="margin-top:18px;display:flex;flex-direction:column;flex:1"></div></div>`;
    keyForm($("#kf"), finish, { skip: true });
  }
  $("#obback")?.addEventListener("click", () => step(obStep - 1));
}

/* ================= AJUSTES ================= */
function renderSettings() {
  const g = settings.goals;
  $("#app").innerHTML = `
    <h1 class="page-title" style="margin-top:14px">Ajustes</h1>

    <div class="group-title" style="margin-top:0">Meta diaria</div>
    <div class="group">
      <div class="field"><label>Calorías</label><input data-goal="kcal" type="number" inputmode="numeric" value="${g.kcal}"><span class="unit">kcal</span></div>
      <div class="field"><label><i class="dot p"></i> Proteína</label><input data-goal="protein" type="number" inputmode="numeric" value="${g.protein}"><span class="unit">g</span></div>
      <div class="field"><label><i class="dot c"></i> Carbohidratos</label><input data-goal="carbs" type="number" inputmode="numeric" value="${g.carbs}"><span class="unit">g</span></div>
      <div class="field"><label><i class="dot f"></i> Grasa</label><input data-goal="fat" type="number" inputmode="numeric" value="${g.fat}"><span class="unit">g</span></div>
      <button class="field tap" id="recalc" style="width:100%"><label style="text-align:left">Recalcular con mis datos</label><span class="val">${I("right", 18)}</span></button>
    </div>
    <p class="foot" id="sumk"></p>

    <div class="group-title">Inteligencia artificial</div>
    <div class="group">
      <button class="field tap" id="key" style="width:100%"><label style="text-align:left">API key</label>
        <span class="${settings.apiKey ? "ok" : "val"}">${settings.apiKey ? "Conectada" : "Conectar"}</span><span class="val">${I("right", 18)}</span></button>
      <div class="field"><label>Modelo</label>
        <select id="model">
          <option value="claude-opus-5-5">Opus · más preciso</option>
          <option value="claude-sonnet-5-5">Sonnet · equilibrado</option>
          <option value="claude-haiku-5-5">Haiku · más barato</option>
        </select><span class="val">${I("down", 16)}</span></div>
    </div>

    <div class="group-title">Respaldo</div>
    <div class="group">
      <button class="field tap" id="exp" style="width:100%"><label style="text-align:left">Exportar mis datos</label><span class="val">${I("right", 18)}</span></button>
      <button class="field tap" id="imp" style="width:100%"><label style="text-align:left">Importar respaldo</label><span class="val">${I("right", 18)}</span></button>
    </div>
    <p class="foot">Tus datos viven solo en este teléfono. Exporta un respaldo de vez en cuando.</p>

    <div class="group-title">Ayuda</div>
    <div class="group">
      <button class="field tap" id="intro" style="width:100%"><label style="text-align:left">Ver la bienvenida otra vez</label><span class="val">${I("right", 18)}</span></button>
    </div>
    <p class="version">Macros · versión ${APP_VERSION}</p>
  `;
  $("#model").value = settings.model || DEFAULT_MODEL;
  const sumk = () => { $("#sumk").textContent = `Tus macros suman ${fmt(g.protein * 4 + g.carbs * 4 + g.fat * 9)} kcal.`; };
  sumk();
  $$("[data-goal]").forEach((i) => i.addEventListener("input", () => { g[i.dataset.goal] = num(i.value); saveSettings(); sumk(); }));
  $("#recalc").onclick = () => openSheet("goals", (body) => {
    body.innerHTML = `<div class="sheet-head"><h2>Recalcular meta</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div><div id="gf"></div>`;
    goalsForm($("#gf", body), () => { closeSheet(); renderSettings(); toast("Meta actualizada"); }, { cta: "Usar esta meta" });
  }, { tall: true });
  $("#key").onclick = () => openKeySheet(() => { closeSheet(); renderSettings(); });
  $("#model").onchange = (e) => { settings.model = e.target.value; saveSettings(); toast("Modelo cambiado"); };
  $("#exp").onclick = exportData;
  $("#imp").onclick = () => { const i = $("#import-input"); i.value = ""; i.click(); };
  $("#intro").onclick = () => { obStep = 0; go("onboarding"); };
}

async function exportData() {
  const blob = new Blob([JSON.stringify({ app: "macros", v: 3, log, foods, goals: settings.goals, profile: settings.profile })], { type: "application/json" });
  const file = new File([blob], `macros-respaldo-${dayStr()}.json`, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch { return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}
$("#import-input").addEventListener("change", async (e) => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (d.app !== "macros") throw 0;
    const ids = new Set(log.map((x) => x.id));
    log = log.concat((d.log || []).filter((x) => !ids.has(x.id)));
    const names = new Set(foods.map((x) => norm(x.name)));
    foods = foods.concat((d.foods || []).filter((x) => !names.has(norm(x.name))));
    if (d.goals) settings.goals = d.goals;
    if (d.profile) settings.profile = d.profile;
    saveLog(); saveFoods(); saveSettings(); toast("Respaldo importado"); render();
  } catch { toast("Ese archivo no es un respaldo de Macros"); }
});

/* ================= ALIMENTOS ================= */
function renderFoods() {
  $("#app").innerHTML = `
    <div class="topbar" style="margin-top:8px"><span></span><button class="icon-btn" id="new" aria-label="Crear alimento">${I("plus", 20)}</button></div>
    <h1 class="page-title" style="margin-top:0">Mis alimentos</h1>
    <p class="page-sub">Todo lo que registras se guarda aquí. Tócalo, pon los gramos y listo, sin IA.</p>
    <label class="search">${I("search", 18)}<input id="q" placeholder="Buscar" autocomplete="off"></label>
    <div id="list"></div>`;
  const draw = () => {
    const q = norm($("#q").value);
    const list = foods.filter((f) => norm(f.name).includes(q)).sort((a, b) => (b.used || 0) - (a.used || 0));
    $("#list").innerHTML = list.length ? `<div class="list">${list.map((f) => `
      <button class="row" data-id="${f.id}"><div class="grow"><div class="t ellipsis">${esc(f.name)}</div>
      <div class="s">por 100 g · ${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.protein, 1)} · C ${fmt(f.per100.carbs, 1)} · G ${fmt(f.per100.fat, 1)}</div></div>
      <span class="icon-btn" style="width:32px;height:32px">${I("plus", 18)}</span></button>`).join("")}</div>`
      : `<div class="empty"><div class="art">${I("bowl", 28)}</div><h3>${foods.length ? "Sin resultados" : "Aún no hay nada"}</h3><p>${foods.length ? "Prueba con otra palabra." : "Lo que registres aparecerá aquí."}</p></div>`;
    $$("[data-id]").forEach((b) => b.addEventListener("click", () => openQuick(b.dataset.id)));
  };
  $("#q").addEventListener("input", draw); draw();
  $("#new").onclick = () => editFood(null);
}

function editFood(id) {
  const isNew = !id;
  const f = isNew ? { id: uid(), name: "", per100: Object.fromEntries(NUTR.map((n) => [n.k, 0])), used: Date.now() } : foods.find((x) => x.id === id);
  openSheet("food", (body) => {
    body.innerHTML = `
      <div class="sheet-head"><input class="name-input" id="nm" placeholder="Nombre del alimento" value="${esc(f.name)}"><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <div class="group-title" style="margin-top:4px">Por cada 100 g</div>
      <div class="group">${NUTR.map((n) => `<div class="field"><label>${n.label}</label><input data-k="${n.k}" type="number" inputmode="decimal" value="${f.per100[n.k] ?? 0}"><span class="unit">${n.unit}</span></div>`).join("")}</div>
      <div class="actions" style="margin-top:18px"><button class="btn primary block" id="ok">Guardar</button>
      ${isNew ? "" : `<button class="link danger" id="del" style="width:100%">Eliminar</button>`}</div>`;
    $("#ok", body).onclick = () => {
      const name = $("#nm", body).value.trim(); if (!name) { toast("Ponle un nombre"); return; }
      f.name = name; $$("[data-k]", body).forEach((i) => (f.per100[i.dataset.k] = num(i.value)));
      if (isNew) foods.push(f);
      saveFoods(); closeSheet(); renderFoods();
    };
    $("#del", body)?.addEventListener("click", () => {
      const idx = foods.indexOf(f);
      foods.splice(idx, 1); saveFoods(); closeSheet(); renderFoods();
      toast("Alimento eliminado", { label: "Deshacer", run: () => { foods.splice(idx, 0, f); saveFoods(); render(); } });
    });
  }, { tall: true });
}

/* ================= Arranque y actualizaciones ================= */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  // Cuando llega una versión nueva, recarga sola (salvo que estés en medio de algo).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !add && !sheet) location.reload();
  });
}

// Si la app queda abierta y pasa la medianoche, "Hoy" pasa al día nuevo.
let lastToday = dayStr();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const t = dayStr();
  if (t === lastToday) return;
  if (viewDate === lastToday) viewDate = t;
  lastToday = t;
  if (TABS.includes(view)) render();
});

// Deslizar desde el borde izquierdo = Atrás (como en iOS).
let edgeX = null, edgeY = 0;
document.addEventListener("touchstart", (e) => {
  const p = e.touches[0];
  edgeX = p.clientX < 28 && !sheet && !TABS.includes(view) ? p.clientX : null;
  edgeY = p.clientY;
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (edgeX == null) return;
  const p = e.changedTouches[0];
  if (p.clientX - edgeX > 80 && Math.abs(p.clientY - edgeY) < 60) ($("#back") || $("#obback"))?.click();
  edgeX = null;
}, { passive: true });

// El teclado no tapa las hojas: se suben lo que ocupa el teclado.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const kb = () => document.documentElement.style.setProperty("--kb", `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
  vv.addEventListener("resize", kb); vv.addEventListener("scroll", kb);
}

render();
