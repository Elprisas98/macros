// Macros — pesa tu comida, escríbela o tómale foto, y obtén sus macros.
// Todo vive en este teléfono (localStorage). La IA es Claude, con la API key del usuario.

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

/* ================= Íconos ================= */
const PATHS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.6-2.2h5.8L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5l-4.5-4.5-8.5 8.5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  scale: '<rect x="3.5" y="12" width="17" height="7.5" rx="2.5"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12l1.5-2"/>',
  sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  clipboard: '<rect x="5.5" y="5" width="13" height="16" rx="2.5"/><path d="M9 5V3.8h6V5"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 8c0-1.5 1-2 1-3.5M12 8c0-1.5 1-2 1-3.5M16 8c0-1.5 1-2 1-3.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
};
const I = (n, s = 22) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PATHS[n]}</svg>`;

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
if (!settings.onboarded && (settings.apiKey || log.length)) settings.onboarded = true; // usuarios de la versión anterior
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

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ================= Hojas (sheets) ================= */
let sheet = null; // { name, render }
function openSheet(name, render, { tall = false } = {}) {
  const root = $("#sheet-root");
  root.classList.remove("open");
  root.innerHTML = `<div class="backdrop"></div><div class="sheet ${tall ? "tall" : ""}"><div class="grab"></div><div class="sheet-body"></div></div>`;
  const body = $(".sheet-body", root);
  sheet = { name, render: () => { render(body); $$("[data-close]", body).forEach((b) => (b.onclick = closeSheet)); } };
  sheet.render();
  document.body.classList.add("locked");
  $(".backdrop", root).onclick = closeSheet;
  root.offsetHeight; // fuerza layout para que la animación corra
  root.classList.add("open");
  return body;
}
function closeSheet() {
  const root = $("#sheet-root");
  sheet = null; root.classList.remove("open"); document.body.classList.remove("locked");
  setTimeout(() => { if (!sheet) root.innerHTML = ""; }, 320);
}
const rerenderSheet = (name) => { if (sheet?.name === name) sheet.render(); };

/* ================= Navegación ================= */
let view = settings.onboarded ? "home" : "onboarding";
let obStep = 0;
let viewDate = dayStr();
let showMore = false;
function go(v) { view = v; render(); window.scrollTo(0, 0); }
function render() {
  ({ home: renderHome, settings: renderSettings, foods: renderFoods, onboarding: renderOnboarding })[view]();
}

/* ================= INICIO ================= */
function renderHome() {
  const entries = log.filter((e) => e.date === viewDate);
  const t = sum(entries);
  const g = settings.goals;
  const left = g.kcal - t.kcal;
  const R = 74, C = 2 * Math.PI * R;
  const frac = Math.min(1, g.kcal ? t.kcal / g.kcal : 0);
  const today = dayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const d = new Date(viewDate + "T12:00");
  const title = viewDate === today ? "Hoy" : viewDate === dayStr(y) ? "Ayer" : cap(d.toLocaleDateString("es-PE", { weekday: "long" }));
  const sub = cap(d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" }));
  const pct = (v, goal) => Math.min(100, goal ? (v / goal) * 100 : 0);
  const macro = (k, cls, label) => `
    <div class="macro">
      <div class="lbl"><i class="dot ${cls}"></i>${label}</div>
      <div class="val">${fmt(t[k])}<small> / ${fmt(g[k])} g</small></div>
      <div class="track"><i class="${cls}" style="width:${pct(t[k], g[k])}%"></i></div>
    </div>`;

  const meals = MEALS.map((m) => {
    const list = entries.filter((e) => e.meal === m);
    if (!list.length) return "";
    return `<section class="meal">
      <div class="meal-head"><h3>${m}</h3><span>${fmt(sum(list).kcal)} kcal</span></div>
      <div class="list">${list.map((e) => {
        const s = scale(e.per100, e.grams);
        return `<button class="row" data-entry="${e.id}">
          <div class="grow"><div class="t ellipsis">${esc(e.name)}</div><div class="s">${fmt(e.grams)} g</div></div>
          <div class="k">${fmt(s.kcal)} <small>kcal</small></div></button>`;
      }).join("")}</div></section>`;
  }).join("");

  $("#app").innerHTML = `
    <header class="home-head">
      <div>
        <div class="eyebrow">
          <button class="icon-btn plain" id="prev" aria-label="Día anterior">${I("left", 18)}</button>
          <span>${sub}</span>
          <button class="icon-btn plain" id="next" aria-label="Día siguiente" ${viewDate === today ? "disabled" : ""}>${I("right", 18)}</button>
        </div>
        <h1>${title}</h1>
      </div>
      <button class="icon-btn" id="settings" aria-label="Ajustes">${I("sliders", 20)}</button>
    </header>

    <section class="summary">
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 172 172">
          <circle class="ring-bg" cx="86" cy="86" r="${R}"/>
          <circle class="ring-fg ${left < 0 ? "over" : ""}" cx="86" cy="86" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 86 86)"/>
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

    ${meals || `<div class="empty">
      <div class="art">${I("bowl", 30)}</div>
      <h3>${viewDate === today ? "¿Qué vas a comer?" : "Nada registrado"}</h3>
      <p>Pésalo y escríbelo, o tómale foto<br>a la etiqueta o al plato.</p>
    </div>`}

    <div class="dock">
      <button class="btn primary" id="add">${I("plus", 22)} Agregar comida</button>
      <button class="cam" id="cam" aria-label="Tomar foto">${I("camera", 24)}</button>
    </div>
  `;
  const shift = (n) => { const x = new Date(viewDate + "T12:00"); x.setDate(x.getDate() + n); viewDate = dayStr(x); renderHome(); };
  $("#prev").onclick = () => shift(-1);
  $("#next").onclick = () => shift(1);
  $("#settings").onclick = () => go("settings");
  $("#more").onclick = () => { showMore = !showMore; renderHome(); };
  $("#add").onclick = () => openAdd();
  $("#cam").onclick = () => pickPhoto("cam", true);
  $$("[data-entry]").forEach((b) => b.addEventListener("click", () => openEntry(b.dataset.entry)));
}

/* ================= AGREGAR ================= */
let add = null; // { text, photo, busy, error, results, meal }
const freshAdd = () => ({ text: "", photo: null, busy: false, error: null, results: null, meal: mealNow() });

function openAdd() {
  if (!add || (!add.busy && !add.results && !add.error)) add = { ...freshAdd(), photo: add?.photo || null, text: add?.text || "" };
  openSheet("add", renderAdd, { tall: true });
  if (!add.results && !add.busy) setTimeout(() => $("#txt")?.focus(), 350);
}

// Cámara / galería. auto=true analiza apenas llega la foto.
let photoAuto = false;
function pickPhoto(kind, auto = false) {
  photoAuto = auto;
  const input = $(kind === "cam" ? "#cam-input" : "#lib-input");
  input.value = ""; input.click();
}
for (const id of ["#cam-input", "#lib-input"]) {
  $(id).addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const p = await prepImage(file);
      if (!add || add.results) add = freshAdd();
      add.photo = p; add.error = null;
      if (sheet?.name !== "add") openSheet("add", renderAdd, { tall: true }); else sheet.render();
      if (photoAuto) analyze();
    } catch { toast("No pude leer esa imagen"); }
  });
}

function renderAdd(body) {
  const s = add;
  if (s.results) return renderResults(body);
  body.innerHTML = `
    <div class="sheet-head"><h2>Agregar comida</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
    <div class="composer">
      <textarea id="txt" rows="2" placeholder="¿Qué comiste? Ej: 180 g de pollo y 150 g de arroz" ${s.busy ? "disabled" : ""}>${esc(s.text)}</textarea>
      ${s.photo ? `<div class="thumb"><img src="${s.photo.dataUrl}" alt="">${s.busy ? "" : `<button class="thumb-x" id="rmphoto" aria-label="Quitar foto">${I("x", 14)}</button>`}</div>` : ""}
      <div class="composer-bar">
        <button class="tool" id="cam" ${s.busy ? "disabled" : ""}>${I("camera", 19)} Foto</button>
        <button class="tool" id="lib" ${s.busy ? "disabled" : ""}>${I("image", 19)} Galería</button>
        <span class="grow"></span>
        <button class="btn primary sm" id="go" ${s.busy ? "disabled" : ""}>${s.busy ? '<span class="spin"></span>' : "Calcular"}</button>
      </div>
    </div>
    ${s.busy ? `<div class="loading"><span class="spin lg"></span><p>${s.photo ? "Mirando tu foto…" : "Calculando…"}</p></div>` : ""}
    ${s.error ? `<div class="alert">${esc(s.error)}</div>` : ""}
    ${!s.busy && !s.error ? `<p class="hint">${I("sparkle", 16)}<span>Foto de la <b>etiqueta</b> = datos exactos. Foto del <b>plato</b> = estimado que ajustas con tu balanza.</span></p>` : ""}
    <div id="suggest"></div>
  `;
  const ta = $("#txt", body);
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(200, ta.scrollHeight) + "px"; };
  grow();
  ta.addEventListener("input", () => { s.text = ta.value; grow(); drawSuggest(body); });
  $("#cam", body).onclick = () => pickPhoto("cam");
  $("#lib", body).onclick = () => pickPhoto("lib");
  $("#rmphoto", body)?.addEventListener("click", () => { s.photo = null; sheet.render(); });
  $("#go", body).onclick = analyze;
  drawSuggest(body);
}

// Sugerencias de "tus alimentos" mientras escribes (sin IA).
function drawSuggest(body) {
  const box = $("#suggest", body); if (!box) return;
  if (add.busy || !foods.length) { box.innerHTML = ""; return; }
  const q = norm(add.text.replace(/\d+([.,]\d+)?\s*(kg|g|gr|gramos|ml)?\b/gi, " ").replace(/\s+/g, " "));
  let list = [...foods].sort((a, b) => (b.used || 0) - (a.used || 0));
  if (q) {
    const words = q.split(" ").filter((w) => w.length > 1 && !["de", "con", "y", "el", "la", "un", "una"].includes(w));
    list = list.filter((f) => words.some((w) => norm(f.name).includes(w)));
  }
  list = list.slice(0, 8);
  if (!list.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="section-title">${q ? "De tus alimentos" : "Recientes"}</div>
    <div class="list">${list.map((f) => `
      <button class="row" data-food="${f.id}">
        <div class="grow"><div class="t ellipsis">${esc(f.name)}</div><div class="s">${fmt(f.per100.kcal)} kcal por 100 g</div></div>
        <span class="icon-btn" style="width:32px;height:32px">${I("plus", 18)}</span>
      </button>`).join("")}</div>`;
  $$("[data-food]", box).forEach((b) => b.addEventListener("click", () => openQuick(b.dataset.food)));
}

async function analyze() {
  const s = add;
  if (!s || s.busy) return;
  const text = s.text.trim();
  if (!text && !s.photo) { toast("Escribe qué comiste o toma una foto"); $("#txt")?.focus(); return; }
  if (!settings.apiKey) { openKeySheet(() => { openSheet("add", renderAdd, { tall: true }); analyze(); }); return; }
  s.busy = true; s.error = null; rerenderSheet("add");
  try {
    const data = await askClaude(text, s.photo);
    s.results = data.items.map((it) => ({ ...it, grams: Math.round(it.grams * 10) / 10 }));
    s.notes = data.notes;
  } catch (err) {
    s.error = err.message || "Algo falló. Intenta de nuevo.";
  } finally {
    s.busy = false; rerenderSheet("add");
  }
}

function renderResults(body) {
  const s = add;
  const total = () => sum(s.results);
  body.innerHTML = `
    <div class="sheet-head">
      <button class="icon-btn" id="back" aria-label="Volver">${I("left", 20)}</button>
      <h2>Revisa y ajusta</h2>
      <button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button>
    </div>
    <p class="sub">Si algo no cuadra, corrige los gramos con tu balanza.</p>
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
    ${mealChips(s.meal)}
    <button class="btn primary block" id="save">Agregar · <span id="tot">${fmt(total().kcal)}</span> kcal</button>
  `;
  $$(".food-card", body).forEach((card) => {
    const it = s.results[+card.dataset.i];
    $(".g", card).addEventListener("input", (e) => {
      it.grams = num(e.target.value);
      const x = scale(it.per100, it.grams);
      $("[data-k]", card).textContent = fmt(x.kcal);
      $("[data-m]", card).innerHTML = macroLine(x);
      $("#tot", body).textContent = fmt(total().kcal);
    });
    $(".fc-name", card).addEventListener("input", (e) => (it.name = e.target.value));
    $(".rm", card).onclick = () => {
      s.results.splice(+card.dataset.i, 1);
      if (!s.results.length) s.results = null;
      sheet.render();
    };
  });
  bindChips(body, (m) => (s.meal = m));
  $("#back", body).onclick = () => { s.results = null; sheet.render(); };
  $("#save", body).onclick = () => {
    for (const it of s.results) {
      if (!it.grams) continue;
      const name = it.name.trim() || "Alimento";
      log.push({ id: uid(), date: viewDate, time: new Date().toISOString(), meal: s.meal, name, grams: it.grams, per100: it.per100 });
      rememberFood(name, it.per100, it.grams);
    }
    saveLog(); saveFoods();
    add = null; closeSheet(); go("home"); toast(`Agregado a ${s.meal}`);
  };
}

/* ================= Alimento guardado: solo gramos ================= */
function openQuick(id) {
  const f = foods.find((x) => x.id === id); if (!f) return;
  let meal = add?.meal || mealNow();
  openSheet("quick", (body) => {
    body.innerHTML = `
      <div class="sheet-head"><h2 class="ellipsis">${esc(f.name)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <label class="big-grams"><input id="g" type="number" inputmode="decimal" placeholder="${f.lastGrams || 100}"><span>g</span></label>
      <div class="big-caption">Escribe lo que marca tu balanza</div>
      <div class="stat-row" id="stats"></div>
      ${mealChips(meal)}
      <button class="btn primary block" id="ok">Agregar</button>`;
    const g = $("#g", body);
    const grams = () => num(g.value) || num(g.placeholder);
    const draw = () => {
      const x = scale(f.per100, grams());
      $("#stats", body).innerHTML = `<div><b>${fmt(x.kcal)}</b>kcal</div><div><b>${fmt(x.protein, 1)}</b><span><i class="dot p"></i> prot</span></div><div><b>${fmt(x.carbs, 1)}</b><span><i class="dot c"></i> carb</span></div><div><b>${fmt(x.fat, 1)}</b><span><i class="dot f"></i> grasa</span></div>`;
    };
    draw(); g.addEventListener("input", draw);
    setTimeout(() => g.focus(), 350);
    bindChips(body, (m) => (meal = m));
    $("#ok", body).onclick = () => {
      const qty = grams(); if (!qty) { toast("Pon los gramos"); return; }
      log.push({ id: uid(), date: viewDate, time: new Date().toISOString(), meal, name: f.name, grams: qty, per100: f.per100 });
      f.used = Date.now(); f.lastGrams = qty; saveLog(); saveFoods();
      add = null; closeSheet(); go("home"); toast(`Agregado a ${meal}`);
    };
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
  openSheet("entry", (body) => {
    body.innerHTML = `
      <div class="sheet-head"><input class="name-input" id="nm" value="${esc(e.name)}" aria-label="Nombre"><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div>
      <label class="big-grams"><input id="g" type="number" inputmode="decimal" value="${e.grams}"><span>g</span></label>
      <div class="big-caption">Toca para cambiar los gramos</div>
      <div class="nutr" id="tbl"></div>
      ${mealChips(meal)}
      <button class="btn primary block" id="ok">Guardar</button>
      <button class="link danger" id="del" style="width:100%;margin-top:4px">Eliminar</button>`;
    const g = $("#g", body);
    const draw = () => {
      const x = scale(e.per100, num(g.value));
      $("#tbl", body).innerHTML = NUTR.map((n) => `<div><span>${n.label}</span><b>${fmt(x[n.k], n.d)} ${n.unit}</b></div>`).join("");
    };
    draw(); g.addEventListener("input", draw);
    bindChips(body, (m) => (meal = m));
    $("#ok", body).onclick = () => {
      e.grams = num(g.value); e.meal = meal; e.name = $("#nm", body).value.trim() || e.name;
      saveLog(); closeSheet(); renderHome();
    };
    $("#del", body).onclick = () => { log = log.filter((x) => x.id !== id); saveLog(); closeSheet(); renderHome(); toast("Eliminado"); };
  });
}

/* ================= Claude ================= */
const RESULT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["items", "notes"],
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
- "notes": una frase útil en español (el supuesto principal, o qué pesar para más precisión). Puede quedar vacío.`;

function userPrompt(text, hasPhoto) {
  if (!hasPhoto) return `El usuario comió esto:\n\n${text}`;
  return `Analiza esta foto.
- Si es una tabla nutricional o etiqueta de un empaque: lee los valores con exactitud y conviértelos a por 100 g (si la tabla da valores por porción, divide entre el peso de la porción y multiplica por 100; si solo da kJ, convierte a kcal). Devuelve un solo item con el nombre del producto si se ve. Para "grams" usa la cantidad que indique el usuario o, si no indica, el tamaño de porción de la etiqueta. Confidence "alta" si se lee bien.
- Si es comida servida: identifica cada componente por separado y estima su peso en gramos usando el plato, los cubiertos y otros objetos como escala.${text ? `\n\nLo que dice el usuario: ${text}` : ""}`;
}

let sdkPromise;
const loadSdk = () => (sdkPromise ??= import(SDK_URL));

async function askClaude(text, photo) {
  let Anthropic;
  try { ({ default: Anthropic } = await loadSdk()); }
  catch { sdkPromise = null; throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo."); }
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const content = [];
  if (photo) content.push({ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.base64 } });
  content.push({ type: "text", text: userPrompt(text, !!photo) });

  let res;
  try {
    res = await client.beta.messages.create({
      model: settings.model || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: photo ? "medium" : "low", format: { type: "json_schema", schema: RESULT_SCHEMA } },
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
  if (!Array.isArray(data.items) || !data.items.length) throw new Error("No encontré comida aquí. Describe un poco más o prueba otra foto.");
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

// Formulario de metas (se usa en la bienvenida y en Ajustes)
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
      <div class="mac"><span><i class="dot p"></i><b>${g.protein}</b> g</span><span><i class="dot c"></i><b>${g.carbs}</b> g</span><span><i class="dot f"></i><b>${g.fat}</b> g</span></div>`;
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

// Conectar la API key (bienvenida y Ajustes)
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
  const app = $("#app");
  if (obStep === 0) {
    app.innerHTML = `<div class="ob">
      ${dots}
      <div class="ob-hero"><img src="icons/icon-512.png" alt=""><h1 style="margin-top:20px">Tus macros,<br>sin complicarte</h1>
      <p class="lead">Pesa tu comida y dile a la app qué es.<br>Ella hace las cuentas.</p></div>
      <div class="feat"><div class="ic">${I("pencil", 20)}</div><div><b>Escríbelo como hablas</b><span>"180 g de pollo y 150 g de arroz"</span></div></div>
      <div class="feat"><div class="ic">${I("camera", 20)}</div><div><b>O tómale foto</b><span>A la etiqueta del empaque o a tu plato</span></div></div>
      <div class="feat"><div class="ic">${I("bolt", 20)}</div><div><b>Lo de siempre, en un toque</b><span>Recuerda lo que comes y solo pones los gramos</span></div></div>
      <div class="actions"><button class="btn primary block" id="next">Empezar</button></div>
    </div>`;
    $("#next").onclick = () => { obStep = 1; renderOnboarding(); window.scrollTo(0, 0); };
  } else if (obStep === 1) {
    app.innerHTML = `<div class="ob">${dots}<h1>Tu meta diaria</h1>
      <p class="lead">La calculo con tus datos. Puedes cambiarla cuando quieras.</p><div id="gf"></div></div>`;
    goalsForm($("#gf"), () => { obStep = 2; renderOnboarding(); window.scrollTo(0, 0); });
  } else {
    app.innerHTML = `<div class="ob">${dots}<h1>Conecta la IA</h1>
      <p class="lead">Macros usa Claude para entender lo que escribes y leer tus fotos. Solo necesitas tu propia API key, una vez.</p>
      <div id="kf" style="margin-top:18px;display:flex;flex-direction:column;flex:1"></div></div>`;
    keyForm($("#kf"), () => { settings.onboarded = true; saveSettings(); go("home"); }, { skip: true });
  }
}

/* ================= AJUSTES ================= */
function renderSettings() {
  const g = settings.goals;
  $("#app").innerHTML = `
    <header class="page-head"><button class="icon-btn" id="back" aria-label="Volver">${I("left", 20)}</button><h1>Ajustes</h1></header>

    <div class="group-title">Meta diaria</div>
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

    <div class="group-title">Comida</div>
    <div class="group">
      <button class="field tap" id="foods" style="width:100%"><label style="text-align:left">Mis alimentos</label><span class="val">${foods.length}</span><span class="val">${I("right", 18)}</span></button>
    </div>

    <div class="group-title">Respaldo</div>
    <div class="group">
      <button class="field tap" id="exp" style="width:100%"><label style="text-align:left">Exportar mis datos</label></button>
      <button class="field tap" id="imp" style="width:100%"><label style="text-align:left">Importar respaldo</label></button>
    </div>
    <p class="foot">Tus datos viven solo en este teléfono. Exporta un respaldo de vez en cuando.</p>
  `;
  $("#model").value = settings.model || DEFAULT_MODEL;
  const sumk = () => { $("#sumk").textContent = `Tus macros suman ${fmt(g.protein * 4 + g.carbs * 4 + g.fat * 9)} kcal.`; };
  sumk();
  $("#back").onclick = () => go("home");
  $$("[data-goal]").forEach((i) => i.addEventListener("input", () => { g[i.dataset.goal] = num(i.value); saveSettings(); sumk(); }));
  $("#recalc").onclick = () => openSheet("goals", (body) => {
    body.innerHTML = `<div class="sheet-head"><h2>Recalcular meta</h2><button class="icon-btn" data-close aria-label="Cerrar">${I("x", 20)}</button></div><div id="gf"></div>`;
    goalsForm($("#gf", body), () => { closeSheet(); renderSettings(); toast("Meta actualizada"); }, { cta: "Usar esta meta" });
  }, { tall: true });
  $("#key").onclick = () => openKeySheet(() => { closeSheet(); renderSettings(); });
  $("#model").onchange = (e) => { settings.model = e.target.value; saveSettings(); toast("Modelo cambiado"); };
  $("#foods").onclick = () => go("foods");
  $("#exp").onclick = exportData;
  $("#imp").onclick = () => { const i = $("#import-input"); i.value = ""; i.click(); };
}

async function exportData() {
  const blob = new Blob([JSON.stringify({ app: "macros", v: 2, log, foods, goals: settings.goals, profile: settings.profile })], { type: "application/json" });
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

/* ================= MIS ALIMENTOS ================= */
function renderFoods() {
  $("#app").innerHTML = `
    <header class="page-head"><button class="icon-btn" id="back" aria-label="Volver">${I("left", 20)}</button><h1>Mis alimentos</h1>
      <button class="icon-btn" id="new" aria-label="Nuevo alimento">${I("plus", 20)}</button></header>
    <label class="search">${I("search", 18)}<input id="q" placeholder="Buscar" autocomplete="off"></label>
    <div id="list"></div>
    <p class="foot">Todo lo que agregas se guarda aquí solo. La próxima vez lo eliges y pones los gramos, sin usar IA.</p>`;
  const draw = () => {
    const q = norm($("#q").value);
    const list = foods.filter((f) => norm(f.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name, "es"));
    $("#list").innerHTML = list.length ? `<div class="list">${list.map((f) => `
      <button class="row" data-id="${f.id}"><div class="grow"><div class="t ellipsis">${esc(f.name)}</div>
      <div class="s">por 100 g · ${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.protein, 1)} · C ${fmt(f.per100.carbs, 1)} · G ${fmt(f.per100.fat, 1)}</div></div>
      <span class="chev">${I("right", 18)}</span></button>`).join("")}</div>`
      : `<div class="empty"><div class="art">${I("bowl", 28)}</div><h3>${foods.length ? "Sin resultados" : "Aún no hay nada"}</h3><p>${foods.length ? "Prueba con otra palabra." : "Lo que agregues aparecerá aquí."}</p></div>`;
    $$("[data-id]").forEach((b) => b.addEventListener("click", () => editFood(b.dataset.id)));
  };
  $("#q").addEventListener("input", draw); draw();
  $("#back").onclick = () => go("settings");
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
    $("#del", body)?.addEventListener("click", () => { foods = foods.filter((x) => x.id !== f.id); saveFoods(); closeSheet(); renderFoods(); toast("Eliminado"); });
  }, { tall: true });
}

/* ================= Inicio ================= */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
render();
