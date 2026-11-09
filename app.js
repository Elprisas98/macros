// Macros — pesa tu comida, obtén sus macros.
// Todo se guarda en este teléfono (localStorage). La IA es Claude, con tu propia API key.

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm";
const DEFAULT_MODEL = "claude-opus-5-5";

/* ---------- Nutrientes ---------- */
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

/* ---------- Almacenamiento ---------- */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { toast("No se pudo guardar (almacenamiento lleno)"); }
  },
};
let log = store.get("macros.log", []); // [{id, date, time, meal, name, grams, per100, source}]
let foods = store.get("macros.foods", []); // [{id, name, per100, defaultGrams}]
let settings = Object.assign(
  { apiKey: "", model: DEFAULT_MODEL, goals: { kcal: 2200, protein: 150, carbs: 220, fat: 70 } },
  store.get("macros.settings", {})
);
const saveLog = () => store.set("macros.log", log);
const saveFoods = () => store.set("macros.foods", foods);
const saveSettings = () => store.set("macros.settings", settings);

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString("es-PE", { maximumFractionDigits: d, minimumFractionDigits: 0 }) : "–");
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

function scale(per100, grams) {
  const out = {};
  for (const { k } of NUTR) out[k] = ((per100?.[k] || 0) * grams) / 100;
  return out;
}
function sum(entries) {
  const t = Object.fromEntries(NUTR.map(({ k }) => [k, 0]));
  for (const e of entries) { const s = scale(e.per100, e.grams); for (const { k } of NUTR) t[k] += s[k]; }
  return t;
}
function defaultMeal() {
  const h = new Date().getHours();
  return h < 11 ? "Desayuno" : h < 16 ? "Almuerzo" : h < 22 ? "Cena" : "Snack";
}

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}
function openSheet(html, bind) {
  $("#sheet-card").innerHTML = html; $("#sheet").classList.remove("hidden"); bind?.($("#sheet-card"));
}
function closeSheet() { $("#sheet").classList.add("hidden"); $("#sheet-card").innerHTML = ""; }
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });

/* ---------- Navegación ---------- */
let tab = "hoy";
let viewDate = todayStr();
document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));
function go(t) {
  tab = t;
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  render(); window.scrollTo(0, 0);
}
function render() {
  ({ hoy: renderHoy, agregar: renderAgregar, alimentos: renderAlimentos, ajustes: renderAjustes })[tab]();
}

/* ---------- HOY ---------- */
function renderHoy() {
  const entries = log.filter((e) => e.date === viewDate);
  const t = sum(entries);
  const g = settings.goals;
  const pct = (v, goal) => Math.min(100, goal ? (v / goal) * 100 : 0);
  const isToday = viewDate === todayStr();
  const dateLabel = isToday ? "Hoy" : new Date(viewDate + "T12:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" });

  const macro = (k, cls, label) => `
    <div class="m ${cls}">
      <div class="small">${label}</div>
      <b style="color:var(--text)">${fmt(t[k])}</b><span class="muted small"> / ${fmt(g[k])} g</span>
      <div class="bar ${t[k] > g[k] ? "over" : ""}"><i style="width:${pct(t[k], g[k])}%"></i></div>
    </div>`;

  const byMeal = MEALS.map((m) => {
    const list = entries.filter((e) => e.meal === m);
    if (!list.length) return "";
    const mt = sum(list);
    return `
      <h2>${m} <span style="float:right;text-transform:none;letter-spacing:0">${fmt(mt.kcal)} kcal</span></h2>
      <div class="card">${list.map((e) => {
        const s = scale(e.per100, e.grams);
        return `<div class="item tap" data-id="${e.id}">
          <div class="grow"><div class="name">${esc(e.name)}</div>
          <div class="sub">${fmt(e.grams)} g · P ${fmt(s.protein, 1)} · C ${fmt(s.carbs, 1)} · G ${fmt(s.fat, 1)}</div></div>
          <div class="kc">${fmt(s.kcal)}</div></div>`;
      }).join("")}</div>`;
  }).join("");

  $("#view").innerHTML = `
    <div class="daynav">
      <button id="prev">‹</button>
      <h1 style="margin:0;text-transform:capitalize">${dateLabel}</h1>
      <button id="next" ${isToday ? "disabled" : ""}>›</button>
    </div>
    <div class="card">
      <div class="row between">
        <div><div class="kcal-big">${fmt(t.kcal)}</div><div class="muted small">de ${fmt(g.kcal)} kcal · quedan ${fmt(Math.max(0, g.kcal - t.kcal))}</div></div>
      </div>
      <div class="bar ${t.kcal > g.kcal ? "over" : ""}"><i style="width:${pct(t.kcal, g.kcal)}%"></i></div>
      <div class="macros3">${macro("protein", "c-prot", "Proteína")}${macro("carbs", "c-carb", "Carbos")}${macro("fat", "c-fat", "Grasa")}</div>
      <div class="extras">
        <div>Fibra<b>${fmt(t.fiber, 1)} g</b></div><div>Azúcar<b>${fmt(t.sugar, 1)} g</b></div>
        <div>G. sat.<b>${fmt(t.satFat, 1)} g</b></div><div>Sodio<b>${fmt(t.sodium)} mg</b></div>
      </div>
    </div>
    ${byMeal || `<div class="card muted" style="text-align:center;padding:28px">Nada registrado todavía.<br><br><button class="primary" id="go-add">Agregar comida</button></div>`}
  `;
  const shift = (days) => { const d = new Date(viewDate + "T12:00"); d.setDate(d.getDate() + days); viewDate = todayStr(d); renderHoy(); };
  $("#prev").onclick = () => shift(-1);
  $("#next").onclick = () => shift(1);
  $("#go-add")?.addEventListener("click", () => go("agregar"));
  document.querySelectorAll(".item[data-id]").forEach((el) => el.addEventListener("click", () => editEntry(el.dataset.id)));
}

function nutrTable(per100, grams) {
  const s = scale(per100, grams);
  return `<table class="nutr-table">${NUTR.map((n) => `<tr><td>${n.label}</td><td>${fmt(s[n.k], n.d)} ${n.unit}</td></tr>`).join("")}</table>`;
}

function editEntry(id) {
  const e = log.find((x) => x.id === id); if (!e) return;
  const draw = (card) => { $("#tbl", card).innerHTML = nutrTable(e.per100, num($("#g", card).value)); };
  openSheet(`
    <h1 style="font-size:22px">${esc(e.name)}</h1>
    <div class="row"><div class="grow"><label>Gramos</label><input id="g" type="number" inputmode="decimal" value="${e.grams}"></div>
    <div class="grow"><label>Comida</label><select id="meal">${MEALS.map((m) => `<option ${m === e.meal ? "selected" : ""}>${m}</option>`).join("")}</select></div></div>
    <div id="tbl" style="margin-top:12px"></div>
    <div class="btnrow"><button class="danger" id="del">Eliminar</button><button class="primary" id="ok">Guardar</button></div>
    <button class="ghost block" id="savefood" style="margin-top:6px">Guardar en Mis alimentos</button>
  `, (card) => {
    draw(card);
    $("#g", card).addEventListener("input", () => draw(card));
    $("#ok", card).onclick = () => { e.grams = num($("#g", card).value); e.meal = $("#meal", card).value; saveLog(); closeSheet(); renderHoy(); };
    $("#del", card).onclick = () => { log = log.filter((x) => x.id !== id); saveLog(); closeSheet(); renderHoy(); toast("Eliminado"); };
    $("#savefood", card).onclick = () => { upsertFood(e.name, e.per100, e.grams); toast("Guardado en Mis alimentos"); };
  });
}

/* ---------- AGREGAR ---------- */
let addMode = "texto"; // texto | etiqueta | plato
let photo = null; // { dataUrl, base64, mediaType }
let results = null; // { items: [...], notes }
let busy = false;

function renderAgregar() {
  const hints = {
    texto: "Ej: 180 g de pechuga de pollo a la plancha, 150 g de arroz blanco cocido y media palta",
    etiqueta: "Opcional: cuántos gramos vas a comer (ej: 45 g). Si no, uso la porción de la etiqueta.",
    plato: "Opcional: detalles que ayuden (ej: el plato pesa 420 g, el arroz es integral, frito en aceite).",
  };
  $("#view").innerHTML = `
    <h1>Agregar</h1>
    <div class="seg">
      <button data-m="texto" class="${addMode === "texto" ? "on" : ""}">Escribir</button>
      <button data-m="etiqueta" class="${addMode === "etiqueta" ? "on" : ""}">Etiqueta</button>
      <button data-m="plato" class="${addMode === "plato" ? "on" : ""}">Foto del plato</button>
    </div>
    ${addMode === "texto" ? "" : `
      <div class="photo-drop">
        ${photo ? `<img src="${photo.dataUrl}" alt="foto">` : `<p>${addMode === "etiqueta" ? "Toma una foto de la tabla nutricional" : "Toma una foto del plato"}</p>`}
        <div class="btnrow" style="margin-top:0">
          <button id="cam">📷 Cámara</button><button id="lib">🖼 Galería</button>
        </div>
        <input id="f-cam" type="file" accept="image/*" capture="environment" class="hidden">
        <input id="f-lib" type="file" accept="image/*" class="hidden">
      </div>`}
    <label>${addMode === "texto" ? "¿Qué comiste y cuánto?" : "Notas"}</label>
    <textarea id="txt" placeholder="${esc(hints[addMode])}"></textarea>
    <button class="primary block" id="analyze" style="margin-top:12px" ${busy ? "disabled" : ""}>${busy ? `<span class="spinner"></span> Analizando…` : "Calcular macros"}</button>
    ${quickFoods()}
    <div id="results"></div>
  `;
  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
    addMode = b.dataset.m; if (addMode === "texto") photo = null; results = null; renderAgregar();
  }));
  if (addMode !== "texto") {
    $("#cam").onclick = () => $("#f-cam").click();
    $("#lib").onclick = () => $("#f-lib").click();
    for (const id of ["#f-cam", "#f-lib"]) $(id).addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0]; if (!file) return;
      try { photo = await prepImage(file); results = null; const keep = $("#txt").value; renderAgregar(); $("#txt").value = keep; }
      catch { toast("No pude leer esa imagen"); }
    });
  }
  $("#analyze").onclick = analyze;
  document.querySelectorAll("[data-food]").forEach((el) => el.addEventListener("click", () => quickAdd(el.dataset.food)));
  renderResults();
}

function quickFoods() {
  if (!foods.length || addMode !== "texto") return "";
  const recent = [...foods].sort((a, b) => (b.used || 0) - (a.used || 0)).slice(0, 6);
  return `<h2>Rápido (sin IA)</h2><div class="card">${recent.map((f) => `
    <div class="item tap" data-food="${f.id}"><div class="grow"><div class="name">${esc(f.name)}</div>
    <div class="sub">${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.protein, 1)} g por 100 g</div></div><div class="kc">＋</div></div>`).join("")}</div>`;
}

// Reduce la foto a ≤1568 px (lo que Claude aprovecha) para que el envío sea rápido.
function prepImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1568;
      const r = Math.min(1, max / Math.max(img.width, img.height));
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

/* ---------- Claude ---------- */
const PER100_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: NUTR.map((n) => n.k),
  properties: Object.fromEntries(NUTR.map((n) => [n.k, { type: "number" }])),
};
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "grams", "per100", "confidence"],
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          per100: PER100_SCHEMA,
          confidence: { type: "string", enum: ["alta", "media", "baja"] },
        },
      },
    },
    notes: { type: "string" },
  },
};

const SYSTEM = `Eres un nutricionista que convierte comida en datos nutricionales precisos para una app de conteo de macros. El usuario pesa su comida con una balanza de cocina.

Reglas:
- Devuelve cada alimento por separado en "items". Usa nombres cortos y claros en español (ej: "Pechuga de pollo a la plancha", "Arroz blanco cocido").
- "per100" son los valores por cada 100 g del alimento TAL COMO SE COME (si dice cocido, valores de cocido; si dice crudo, de crudo). Calorías en kcal, sodio en mg, el resto en gramos. Si un valor no aplica, pon 0.
- "grams" es la cantidad que comió. Si el usuario da gramos, úsalos exactamente. Si da unidades (1 huevo, media palta, 2 tajadas), conviértelas a gramos con pesos típicos. Si no da cantidad, estima una porción típica y usa confidence "baja".
- Usa valores de referencia confiables (USDA FoodData Central, tablas peruanas/latinoamericanas cuando aplique). Ten en cuenta aceite de cocción si el método lo implica.
- "confidence": "alta" si los datos vienen de una etiqueta o el alimento es estándar y el peso es conocido; "media" si estimaste algo; "baja" si estimaste porción y composición.
- "notes": una o dos frases útiles en español (supuestos que hiciste, qué pesar para mayor precisión). Puede quedar vacío.`;

const MODE_PROMPT = {
  texto: (t) => `El usuario comió esto:\n\n${t}`,
  etiqueta: (t) => `Esta es la foto de la tabla nutricional de un empaque. Lee los valores con exactitud y conviértelos a por 100 g (si la tabla da por porción, divide por el peso de la porción y multiplica por 100; si da kJ, usa las kcal). Devuelve un solo item con el nombre del producto si se ve (si no, un nombre genérico). Para "grams": ${t ? `el usuario dice: "${t}"` : "usa el tamaño de porción indicado en la etiqueta"}. Usa confidence "alta" si la tabla es legible.`,
  plato: (t) => `Esta es una foto de un plato de comida. Identifica cada componente por separado y estima su peso en gramos (comida ya cocida/servida). Usa el tamaño del plato, cubiertos y otros objetos como referencia de escala.${t ? `\n\nDetalles del usuario: ${t}` : ""}`,
};

let sdkPromise;
const loadSdk = () => (sdkPromise ??= import(SDK_URL));

async function askClaude(text) {
  const { default: Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const content = [];
  if (photo && addMode !== "texto") content.push({ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.base64 } });
  content.push({ type: "text", text: MODE_PROMPT[addMode](text) });

  let res;
  try {
    res = await client.beta.messages.create({
      model: settings.model || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: addMode === "texto" ? "low" : "medium", format: { type: "json_schema", schema: RESULT_SCHEMA } },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Tu API key no es válida. Revísala en Ajustes.");
    if (err instanceof Anthropic.PermissionDeniedError) throw new Error("Tu API key no tiene permiso para este modelo.");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Demasiadas consultas o sin saldo. Espera un momento o revisa tu saldo en console.anthropic.com.");
    if (err instanceof Anthropic.BadRequestError) throw new Error("La consulta fue rechazada: " + (err.message || "").slice(0, 160));
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Sin conexión con Claude. Revisa tu internet.");
    if (err instanceof Anthropic.APIError) throw new Error(`Error de Claude (${err.status ?? "?"}). Intenta de nuevo.`);
    throw err;
  }
  if (res.stop_reason === "refusal") throw new Error("Claude no pudo procesar esta consulta. Prueba con otra foto o descripción.");
  if (res.stop_reason === "max_tokens") throw new Error("La respuesta quedó incompleta. Intenta con menos alimentos a la vez.");
  const txt = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const data = JSON.parse(txt);
  if (!Array.isArray(data.items) || !data.items.length) throw new Error("No encontré alimentos. Describe un poco más.");
  return data;
}

async function analyze() {
  const text = $("#txt").value.trim();
  if (!settings.apiKey) { toast("Primero pega tu API key en Ajustes"); go("ajustes"); return; }
  if (addMode === "texto" && !text) { toast("Escribe qué comiste"); return; }
  if (addMode !== "texto" && !photo) { toast("Primero toma o elige una foto"); return; }
  busy = true; results = null; renderAgregar(); $("#txt").value = text;
  try {
    const data = await askClaude(text);
    results = {
      notes: data.notes,
      items: data.items.map((it) => ({ ...it, grams: Math.round(it.grams * 10) / 10, save: addMode === "etiqueta" })),
    };
  } catch (err) {
    results = { error: err.message || "Algo falló. Intenta de nuevo." };
  } finally {
    busy = false; renderAgregar(); $("#txt").value = text;
    $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderResults() {
  const box = $("#results"); if (!box || !results) return;
  if (results.error) { box.innerHTML = `<div class="card" style="margin-top:14px;color:var(--danger)">${esc(results.error)}</div>`; return; }
  const total = () => sum(results.items);
  const totalHtml = () => { const t = total(); return `<b>${fmt(t.kcal)} kcal</b> · P ${fmt(t.protein, 1)} · C ${fmt(t.carbs, 1)} · G ${fmt(t.fat, 1)}`; };
  box.innerHTML = `
    <h2>Resultado</h2>
    ${results.items.map((it, i) => {
      const s = scale(it.per100, it.grams);
      return `<div class="result" data-i="${i}">
        <div class="row">
          <input class="grow nm" value="${esc(it.name)}" style="font-weight:600">
          <input class="grams" type="number" inputmode="decimal" value="${it.grams}"><span class="muted">g</span>
        </div>
        <div class="facts" data-facts>${fmt(s.kcal)} kcal · P ${fmt(s.protein, 1)} g · C ${fmt(s.carbs, 1)} g · G ${fmt(s.fat, 1)} g · Fibra ${fmt(s.fiber, 1)} g</div>
        <div class="row between" style="margin-top:6px">
          <label class="check" style="margin:0"><input type="checkbox" class="sv" ${it.save ? "checked" : ""}> Guardar en Mis alimentos</label>
          <span class="badge ${it.confidence}">${it.confidence === "alta" ? "Precisión alta" : it.confidence === "media" ? "Estimado" : "Muy estimado"}</span>
        </div>
        <button class="ghost small rm" style="padding:6px 0">Quitar</button>
      </div>`;
    }).join("")}
    ${results.notes ? `<p class="muted small">${esc(results.notes)}</p>` : ""}
    <div class="card"><div class="small muted">Total</div><div id="tot">${totalHtml()}</div>
      <label>Comida</label><select id="meal">${MEALS.map((m) => `<option ${m === defaultMeal() ? "selected" : ""}>${m}</option>`).join("")}</select>
      <button class="primary block" id="addall" style="margin-top:12px">Agregar al día</button>
    </div>`;
  box.querySelectorAll(".result").forEach((el) => {
    const it = results.items[+el.dataset.i];
    $(".grams", el).addEventListener("input", (e) => {
      it.grams = num(e.target.value);
      const s = scale(it.per100, it.grams);
      $("[data-facts]", el).textContent = `${fmt(s.kcal)} kcal · P ${fmt(s.protein, 1)} g · C ${fmt(s.carbs, 1)} g · G ${fmt(s.fat, 1)} g · Fibra ${fmt(s.fiber, 1)} g`;
      $("#tot").innerHTML = totalHtml();
    });
    $(".nm", el).addEventListener("input", (e) => (it.name = e.target.value));
    $(".sv", el).addEventListener("change", (e) => (it.save = e.target.checked));
    $(".rm", el).onclick = () => { results.items.splice(+el.dataset.i, 1); if (!results.items.length) results = null; renderResults(); };
  });
  $("#addall").onclick = () => {
    const meal = $("#meal").value;
    const now = new Date();
    for (const it of results.items) {
      log.push({ id: uid(), date: todayStr(), time: now.toISOString(), meal, name: it.name.trim() || "Alimento", grams: it.grams, per100: it.per100, source: addMode });
      if (it.save) upsertFood(it.name, it.per100, it.grams);
    }
    saveLog(); results = null; photo = null; viewDate = todayStr();
    toast("Agregado ✓"); go("hoy");
  };
}

/* ---------- MIS ALIMENTOS ---------- */
function upsertFood(name, per100, grams) {
  const key = name.trim().toLowerCase();
  const ex = foods.find((f) => f.name.trim().toLowerCase() === key);
  if (ex) { ex.per100 = per100; ex.defaultGrams = grams; }
  else foods.push({ id: uid(), name: name.trim(), per100, defaultGrams: grams, used: Date.now() });
  saveFoods();
}

function quickAdd(id) {
  const f = foods.find((x) => x.id === id); if (!f) return;
  const draw = (card) => { $("#tbl", card).innerHTML = nutrTable(f.per100, num($("#g", card).value)); };
  openSheet(`
    <h1 style="font-size:22px">${esc(f.name)}</h1>
    <div class="row"><div class="grow"><label>Gramos (lo que marca tu balanza)</label><input id="g" type="number" inputmode="decimal" value="${f.defaultGrams || 100}"></div>
    <div class="grow"><label>Comida</label><select id="meal">${MEALS.map((m) => `<option ${m === defaultMeal() ? "selected" : ""}>${m}</option>`).join("")}</select></div></div>
    <div id="tbl" style="margin-top:12px"></div>
    <button class="primary block" id="ok" style="margin-top:12px">Agregar al día</button>
  `, (card) => {
    draw(card);
    const g = $("#g", card); g.addEventListener("input", () => draw(card)); g.select();
    $("#ok", card).onclick = () => {
      const grams = num(g.value); if (!grams) { toast("Pon los gramos"); return; }
      log.push({ id: uid(), date: todayStr(), time: new Date().toISOString(), meal: $("#meal", card).value, name: f.name, grams, per100: f.per100, source: "guardado" });
      f.used = Date.now(); f.defaultGrams = grams; saveLog(); saveFoods(); closeSheet(); viewDate = todayStr(); toast("Agregado ✓"); go("hoy");
    };
  });
}

function editFood(id) {
  const isNew = !id;
  const f = isNew ? { id: uid(), name: "", per100: Object.fromEntries(NUTR.map((n) => [n.k, 0])), defaultGrams: 100 } : foods.find((x) => x.id === id);
  openSheet(`
    <h1 style="font-size:22px">${isNew ? "Nuevo alimento" : "Editar alimento"}</h1>
    <label>Nombre</label><input id="nm" value="${esc(f.name)}">
    <p class="muted small" style="margin-top:12px">Valores por 100 g</p>
    ${NUTR.map((n) => `<div class="row"><span class="grow small">${n.label} (${n.unit})</span><input data-k="${n.k}" type="number" inputmode="decimal" style="width:110px;padding:8px;margin:3px 0" value="${f.per100[n.k] ?? 0}"></div>`).join("")}
    <div class="btnrow">${isNew ? "<span></span>" : '<button class="danger" id="del">Eliminar</button>'}<button class="primary" id="ok">Guardar</button></div>
  `, (card) => {
    $("#ok", card).onclick = () => {
      const name = $("#nm", card).value.trim(); if (!name) { toast("Ponle nombre"); return; }
      f.name = name; card.querySelectorAll("[data-k]").forEach((i) => (f.per100[i.dataset.k] = num(i.value)));
      if (isNew) foods.push(f); saveFoods(); closeSheet(); renderAlimentos();
    };
    $("#del", card)?.addEventListener("click", () => { foods = foods.filter((x) => x.id !== f.id); saveFoods(); closeSheet(); renderAlimentos(); });
  });
}

function renderAlimentos() {
  $("#view").innerHTML = `
    <h1>Mis alimentos</h1>
    <p class="muted small">Lo que guardas aquí se agrega sin usar IA: solo pones los gramos de tu balanza. Ideal para lo que comes seguido (escanea la etiqueta una vez).</p>
    <input class="search" id="q" placeholder="Buscar…">
    <div class="card" id="list"></div>
    <button class="block" id="new">＋ Crear alimento manualmente</button>
  `;
  const draw = () => {
    const q = $("#q").value.trim().toLowerCase();
    const list = foods.filter((f) => f.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, "es"));
    $("#list").innerHTML = list.length ? list.map((f) => `
      <div class="item"><div class="grow tap" data-add="${f.id}"><div class="name">${esc(f.name)}</div>
      <div class="sub">por 100 g: ${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.protein, 1)} · C ${fmt(f.per100.carbs, 1)} · G ${fmt(f.per100.fat, 1)}</div></div>
      <button class="ghost" data-edit="${f.id}">Editar</button></div>`).join("")
      : `<p class="muted" style="text-align:center;margin:12px 0">${foods.length ? "Sin resultados" : "Aún no guardas alimentos."}</p>`;
    document.querySelectorAll("[data-add]").forEach((el) => el.addEventListener("click", () => quickAdd(el.dataset.add)));
    document.querySelectorAll("[data-edit]").forEach((el) => el.addEventListener("click", () => editFood(el.dataset.edit)));
  };
  $("#q").addEventListener("input", draw); draw();
  $("#new").onclick = () => editFood(null);
}

/* ---------- AJUSTES ---------- */
function renderAjustes() {
  const g = settings.goals;
  $("#view").innerHTML = `
    <h1>Ajustes</h1>
    <h2>Metas diarias</h2>
    <div class="card">
      <div class="row"><div class="grow"><label>Calorías</label><input data-goal="kcal" type="number" inputmode="numeric" value="${g.kcal}"></div>
      <div class="grow"><label>Proteína (g)</label><input data-goal="protein" type="number" inputmode="numeric" value="${g.protein}"></div></div>
      <div class="row"><div class="grow"><label>Carbos (g)</label><input data-goal="carbs" type="number" inputmode="numeric" value="${g.carbs}"></div>
      <div class="grow"><label>Grasa (g)</label><input data-goal="fat" type="number" inputmode="numeric" value="${g.fat}"></div></div>
      <p class="muted small" style="margin-top:10px" id="calc"></p>
    </div>
    <h2>Claude (IA)</h2>
    <div class="card">
      <label>API key de Anthropic</label>
      <input id="key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(settings.apiKey)}">
      <p class="muted small" style="margin-top:8px">Se guarda solo en este teléfono y se envía únicamente a api.anthropic.com. Créala en console.anthropic.com → API Keys (necesita saldo; cada consulta cuesta centavos).</p>
      <label>Modelo</label>
      <select id="model">
        <option value="claude-opus-5-5">Claude Opus 5.5 (más preciso)</option>
        <option value="claude-sonnet-5-5">Claude Sonnet 5.5 (más barato)</option>
        <option value="claude-haiku-5-5">Claude Haiku 5.5 (el más barato y rápido)</option>
      </select>
    </div>
    <h2>Datos</h2>
    <div class="card">
      <div class="btnrow" style="margin-top:0"><button id="exp">Exportar respaldo</button><button id="imp">Importar respaldo</button></div>
      <input id="impf" type="file" accept="application/json,.json" class="hidden">
      <p class="muted small" style="margin-top:10px">${log.length} registros · ${foods.length} alimentos guardados</p>
    </div>
  `;
  $("#model").value = settings.model || DEFAULT_MODEL;
  const calc = () => { const k = g.protein * 4 + g.carbs * 4 + g.fat * 9; $("#calc").textContent = `Tus macros suman ${fmt(k)} kcal (P×4 + C×4 + G×9).`; };
  calc();
  document.querySelectorAll("[data-goal]").forEach((i) => i.addEventListener("input", () => { g[i.dataset.goal] = num(i.value); saveSettings(); calc(); }));
  $("#key").addEventListener("change", (e) => { settings.apiKey = e.target.value.trim(); saveSettings(); toast("API key guardada"); });
  $("#model").addEventListener("change", (e) => { settings.model = e.target.value; saveSettings(); });
  $("#exp").onclick = async () => {
    const blob = new Blob([JSON.stringify({ app: "macros", v: 1, log, foods, goals: settings.goals }, null, 1)], { type: "application/json" });
    const file = new File([blob], `macros-respaldo-${todayStr()}.json`, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch { /* cancelado */ } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  };
  $("#imp").onclick = () => $("#impf").click();
  $("#impf").addEventListener("change", async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (d.app !== "macros") throw 0;
      const ids = new Set(log.map((x) => x.id));
      log = log.concat((d.log || []).filter((x) => !ids.has(x.id)));
      const fids = new Set(foods.map((x) => x.id));
      foods = foods.concat((d.foods || []).filter((x) => !fids.has(x.id)));
      if (d.goals) settings.goals = d.goals;
      saveLog(); saveFoods(); saveSettings(); toast("Respaldo importado"); renderAjustes();
    } catch { toast("Ese archivo no es un respaldo válido"); }
  });
}

/* ---------- Inicio ---------- */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
if (!settings.apiKey && !log.length) go("ajustes"); else render();
