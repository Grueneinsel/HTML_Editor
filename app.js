// CoNLL-U Vergleich
// - Gold pro Token-Zeile: Klick auf Datei-Zelle (wie Buttons)
// - Wenn Custom (HEAD oder DEPREL) befüllt ist -> Custom ist automatisch Gold
// - Satz wählen zeigt Vorschau: Token-Tabelle (UPOS/XPOS) + Trees wie trees.py
//   * GOLD Tree (plain)
//   * Diff-Tree pro Datei vs GOLD (✅ / ⚠️ / 🅶 / 🅵)
//
// FIX: Dateiauswahl wird über <label for="fileInput"> geöffnet (kein fileInput.click()).

const DEFAULT_LABELS = {
  "Core arguments": ["nsubj","obj","iobj","csubj","ccomp","xcomp"],
  "Non-core dependents": ["obl","vocative","expl","dislocated"],
  "Modifier words": ["advcl","advmod*","discourse"],
  "Function Words": ["aux","cop","mark"],
  "Nominal dependents": ["nmod","appos","nummod","acl","amod","det","clf","case"],
  "Coordination": ["conj","cc"],
  "Other": ["fixed","flat","list","parataxis","compound","orphan","goeswith","reparandum","punct","root","dep"]
};

let LABELS = DEFAULT_LABELS;
let DEPREL_OPTIONS_HTML = "";
let DEPREL_VALUE_SET = new Set();

const state = {
  docs: [],
  currentSent: 0,
  maxSents: 0,
  custom: {},     // custom[sent][tokId] = {head, deprel}
  goldPick: {},   // goldPick[sent][tokId] = docIdx
};

// DOM
const fileInput = document.getElementById("fileInput");
const resetBtn  = document.getElementById("resetBtn");
const fileList  = document.getElementById("fileList");
const fileMeta  = document.getElementById("fileMeta");

const sentSelect = document.getElementById("sentSelect");
const prevBtn    = document.getElementById("prevBtn");
const nextBtn    = document.getElementById("nextBtn");
const sentMeta   = document.getElementById("sentMeta");
const sentText   = document.getElementById("sentText");

const tokTable   = document.getElementById("tokTable");
const treeGrid   = document.getElementById("treeGrid");

const cmpTable   = document.getElementById("cmpTable");
const customInitBtn  = document.getElementById("customInitBtn");
const customClearBtn = document.getElementById("customClearBtn");

// Events
fileInput.addEventListener("change", onFilesChosen);
resetBtn.addEventListener("click", resetAll);

sentSelect.addEventListener("change", () => {
  state.currentSent = parseInt(sentSelect.value, 10) || 0;
  renderSentence();
});
prevBtn.addEventListener("click", () => {
  state.currentSent = Math.max(0, state.currentSent - 1);
  renderSentence();
});
nextBtn.addEventListener("click", () => {
  state.currentSent = Math.min(state.maxSents - 1, state.currentSent + 1);
  renderSentence();
});

customInitBtn.addEventListener("click", initCustomFromDoc0);
customClearBtn.addEventListener("click", clearCustomForSentence);

// Delegation: Custom inputs
cmpTable.addEventListener("input", (e) => {
  const el = e.target;
  if(el instanceof HTMLInputElement && el.dataset.field && el.dataset.id){
    onCustomFieldChange(el);
  }
});
cmpTable.addEventListener("change", (e) => {
  const el = e.target;
  if(el instanceof HTMLSelectElement && el.classList.contains("customRelSelect")){
    onCustomFieldChange(el);
  }
});

// Delegation: Klick auf Datei-Zelle -> Gold wählen
cmpTable.addEventListener("click", (e) => {
  const td = e.target.closest?.("td[data-col^='doc']");
  if(!td) return;

  const tr = td.closest("tr[data-id]");
  if(!tr) return;

  const tokId = parseInt(tr.dataset.id, 10);
  const docIdx = parseInt(td.dataset.docIdx, 10);

  // Wenn Custom befüllt ist -> Custom ist Gold, Klick ignorieren
  if(getCustomEntry(state.currentSent, tokId)) return;

  setDocChoice(state.currentSent, tokId, docIdx);
  updateRow(tokId);
});

// ---------- Labels laden ----------
(async function initLabels(){
  try{
    const res = await fetch("labels.json", {cache:"no-store"});
    if(res.ok){
      const data = await res.json();
      if(data && typeof data === "object") LABELS = data;
    }
  }catch(_){
    // fallback DEFAULT_LABELS
  }finally{
    buildDeprelOptionsCache();
    renderSentence();
  }
})();

function normalizeLabel(label){
  return String(label).replace(/\*$/,"").trim();
}
function buildDeprelOptionsCache(){
  DEPREL_VALUE_SET = new Set();
  let html = `<option value="">(leer)</option>`;
  for(const [section, items] of Object.entries(LABELS)){
    html += `<optgroup label="${escapeHtml(section)}">`;
    for(const raw of items){
      const val = normalizeLabel(raw);
      if(!val) continue;
      DEPREL_VALUE_SET.add(val);
      html += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
    }
    html += `</optgroup>`;
  }
  DEPREL_OPTIONS_HTML = html;
}

// ---------- File loading ----------
function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, "utf-8");
  });
}

function parseConllu(text){
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sentences = [];
  let tokens = [];
  let textLine = null;

  const push = () => {
    if(tokens.length === 0 && !textLine) return;
    const fallbackText = tokens.map(t => t.form).join(" ");
    sentences.push({ text: textLine || fallbackText, tokens });
    tokens = [];
    textLine = null;
  };

  for(const line0 of lines){
    const line = line0.trimEnd();
    if(line.trim() === ""){ push(); continue; }

    if(line.startsWith("#")){
      const m = line.match(/^#\s*text\s*=\s*(.*)$/i);
      if(m) textLine = m[1];
      continue;
    }

    const cols = line.split("\t");
    if(cols.length < 8) continue;

    const idRaw = cols[0];
    if(idRaw.includes("-") || idRaw.includes(".")) continue;
    if(!/^\d+$/.test(idRaw)) continue;

    const id = parseInt(idRaw, 10);
    const form  = cols[1] || "_";
    const upos  = cols[3] || "_";
    const xpos  = cols[4] || "_";
    const head  = /^\d+$/.test(cols[6]) ? parseInt(cols[6], 10) : null;
    const deprel = cols[7] || "_";

    tokens.push({ id, form, upos, xpos, head, deprel });
  }

  push();
  return { sentences };
}

function fileKey(f){
  return `${f.name}::${f.size}::${f.lastModified}`;
}

async function onFilesChosen(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0) return;

  for(const f of files){
    const key = fileKey(f);
    if(state.docs.some(d => d.key === key)) continue;

    const text = await readFileAsText(f);
    const doc = parseConllu(text);
    state.docs.push({ key, name: f.name, sentences: doc.sentences });
  }

  fileInput.value = "";
  recomputeMaxSents();
  state.currentSent = 0;

  renderFiles();
  renderSentSelect();
  renderSentence();
}

function removeDoc(index){
  state.docs.splice(index, 1);

  // goldPick indices shiften
  for(const sKey of Object.keys(state.goldPick)){
    const m = state.goldPick[sKey];
    for(const tKey of Object.keys(m)){
      const v = m[tKey];
      if(typeof v !== "number") continue;
      if(v === index) m[tKey] = 0;
      else if(v > index) m[tKey] = v - 1;
    }
  }

  recomputeMaxSents();
  state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));
  renderFiles();
  renderSentSelect();
  renderSentence();
}

function resetAll(){
  if(!confirm("Wirklich alles zurücksetzen?")) return;
  state.docs = [];
  state.custom = {};
  state.goldPick = {};
  state.currentSent = 0;
  state.maxSents = 0;
  fileInput.value = "";
  renderFiles();
  renderSentSelect();
  renderSentence();
}

function recomputeMaxSents(){
  state.maxSents = Math.max(0, ...state.docs.map(d => d.sentences.length), 0);
}

// ---------- State helpers ----------
function ensureCustomSent(sentIndex){
  if(!state.custom[sentIndex]) state.custom[sentIndex] = {};
  return state.custom[sentIndex];
}
function ensureGoldSent(sentIndex){
  if(!state.goldPick[sentIndex]) state.goldPick[sentIndex] = {};
  return state.goldPick[sentIndex];
}

function getCustomEntry(sentIndex, tokId){
  const e = state.custom[sentIndex]?.[tokId];
  if(!e) return null;
  const head = (e.head === null || e.head === undefined || e.head === "") ? null : e.head;
  const deprel = (e.deprel === null || e.deprel === undefined || e.deprel === "") ? null : e.deprel;
  if(head === null && deprel === null) return null;
  return { head, deprel };
}

function setCustomField(sentIndex, tokId, field, value){
  const sent = ensureCustomSent(sentIndex);
  if(!sent[tokId]) sent[tokId] = { head:null, deprel:null };
  if(field === "head") sent[tokId].head = value;
  if(field === "deprel") sent[tokId].deprel = value;

  const e = getCustomEntry(sentIndex, tokId);
  if(!e){
    delete sent[tokId];
    if(Object.keys(sent).length === 0) delete state.custom[sentIndex];
  }
}

function getDocChoice(sentIndex, tokId){
  const m = ensureGoldSent(sentIndex);
  const v = m[tokId];
  if(typeof v === "number" && v >= 0 && v < state.docs.length) return v;
  return 0;
}
function setDocChoice(sentIndex, tokId, docIdx){
  ensureGoldSent(sentIndex)[tokId] = docIdx;
}

function valueFromToken(t){
  if(!t) return null;
  return `${t.head ?? "_"} / ${t.deprel ?? "_"}`;
}
function valueFromCustom(c){
  if(!c) return null;
  return `${c.head ?? "_"} / ${c.deprel ?? "_"}`;
}

// ---------- UI: file list + sentence selector ----------
function renderFiles(){
  fileList.innerHTML = "";
  fileMeta.textContent = state.docs.length ? `${state.docs.length} Datei(en) geladen` : "Keine Dateien geladen";

  if(state.docs.length === 0){
    fileList.innerHTML = `<div class="muted small">Lade mindestens 2 Dateien zum Vergleichen.</div>`;
    return;
  }

  state.docs.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "fileItem";
    div.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(d.name)}</div>
        <div class="meta">${d.sentences.length} Sätze</div>
      </div>
      <button class="danger">Löschen</button>
    `;
    div.querySelector("button").addEventListener("click", () => removeDoc(idx));
    fileList.appendChild(div);
  });
}

function renderSentSelect(){
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  sentSelect.disabled = !ok;
  prevBtn.disabled = !ok;
  nextBtn.disabled = !ok;
  customInitBtn.disabled = !ok;
  customClearBtn.disabled = !ok;

  sentSelect.innerHTML = "";
  if(!ok) return;

  for(let i=0;i<state.maxSents;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Satz ${i+1}`;
    sentSelect.appendChild(opt);
  }
  sentSelect.value = String(state.currentSent);
}

function initCustomFromDoc0(){
  const s0 = state.docs[0]?.sentences?.[state.currentSent];
  if(!s0) return;
  const sent = ensureCustomSent(state.currentSent);
  for(const t of s0.tokens){
    sent[t.id] = { head: t.head ?? null, deprel: t.deprel ?? null };
  }
  renderSentence();
}

function clearCustomForSentence(){
  if(!confirm("Custom für diesen Satz wirklich löschen?")) return;
  delete state.custom[state.currentSent];
  renderSentence();
}

// ---------- Main render ----------
function renderSentence(){
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  if(!ok){
    sentText.textContent = "";
    sentMeta.textContent = "";
    tokTable.innerHTML = "";
    treeGrid.innerHTML = "";
    cmpTable.innerHTML = "";
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));
  sentSelect.value = String(state.currentSent);

  const s0 = state.docs[0].sentences[state.currentSent];
  sentText.textContent = s0 ? s0.text : "(Satz fehlt in Datei 1)";
  sentMeta.textContent = `S${state.currentSent+1} / ${state.maxSents}`;

  renderCompareTable();
  renderPreview();
}

function renderCompareTable(){
  const maps = state.docs.map(d => {
    const s = d.sentences[state.currentSent];
    const m = new Map();
    if(s) for(const t of s.tokens) m.set(t.id, t);
    return m;
  });

  // Union IDs
  const ids = new Set();
  for(const m of maps) for(const id of m.keys()) ids.add(id);
  const customSent = state.custom[state.currentSent] || {};
  for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));

  const idList = Array.from(ids).sort((a,b)=>a-b);

  // Header
  let html = "<thead><tr>";
  html += "<th>ID</th><th>FORM</th><th>UPOS</th><th>XPOS</th>";
  html += "<th>GOLD</th>";
  for(const d of state.docs) html += `<th>${escapeHtml(d.name)}</th>`;
  html += "<th>CUSTOM</th>";
  html += "</tr></thead><tbody>";

  for(const id of idList){
    // token info from first available
    let form="—", upos="_", xpos="_";
    for(const m of maps){
      const t = m.get(id);
      if(t){ form=t.form; upos=t.upos??"_"; xpos=t.xpos??"_"; break; }
    }

    const docVals = maps.map(m => valueFromToken(m.get(id)));
    const ce = getCustomEntry(state.currentSent, id);
    const customExists = !!ce;
    const customVal = valueFromCustom(ce);

    const chosenDoc = getDocChoice(state.currentSent, id);
    const goldVal = customExists ? customVal : docVals[chosenDoc];

    html += `<tr data-id="${id}">`;
    html += `<td>${id}</td>`;
    html += `<td>${escapeHtml(form)}</td>`;
    html += `<td class="posCell">${escapeHtml(upos)}</td>`;
    html += `<td class="posCell">${escapeHtml(xpos)}</td>`;
    html += `<td data-col="gold" class="goldCell">${escapeHtml(goldVal ?? "—")}</td>`;

    // doc cells (klickbar)
    for(let i=0;i<docVals.length;i++){
      const v = docVals[i];
      const clsCompare = (goldVal && v) ? (v === goldVal ? "same" : "diff") : "";
      const clsDisabled = customExists ? "disabledPick" : "";
      const clsPicked = (!customExists && i === chosenDoc) ? "picked" : "";
      html += `
        <td data-col="doc${i}" data-doc-idx="${i}"
            class="pickable ${clsCompare} ${clsDisabled} ${clsPicked}">
          ${escapeHtml(v ?? "—")}
        </td>`;
    }

    // custom cell
    const customClsCompare = (goldVal && customVal) ? (customVal === goldVal ? "same" : "diff") : "";
    const customPicked = customExists ? "picked" : "";
    const headVal = ce?.head ?? "";
    const relVal  = ce?.deprel ?? "";

    let extraOpt = "";
    if(relVal && !DEPREL_VALUE_SET.has(relVal)){
      extraOpt = `<option value="${escapeHtml(relVal)}">${escapeHtml(relVal)} (unknown)</option>`;
    }

    html += `
      <td data-col="custom" class="${customClsCompare} ${customPicked}">
        <div class="customCell">
          <input class="customHead" type="number" min="0" step="1"
                 data-id="${id}" data-field="head"
                 value="${escapeHtml(headVal)}" placeholder="head">
          <select class="customRelSelect" data-id="${id}" data-field="deprel">
            ${extraOpt}
            ${DEPREL_OPTIONS_HTML}
          </select>
        </div>
      </td>
    `;

    html += `</tr>`;
  }

  html += "</tbody>";
  cmpTable.innerHTML = html;

  // Set select values after DOM
  cmpTable.querySelectorAll("select.customRelSelect").forEach(sel => {
    const tokId = parseInt(sel.dataset.id, 10);
    sel.value = getCustomEntry(state.currentSent, tokId)?.deprel ?? "";
  });
}

function onCustomFieldChange(el){
  const tokId = parseInt(el.dataset.id, 10);
  const field = el.dataset.field;

  if(field === "head"){
    const raw = el.value.trim();
    const val = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    setCustomField(state.currentSent, tokId, "head", val);
  } else if(field === "deprel"){
    const raw = el.value;
    const val = raw === "" ? null : raw;
    setCustomField(state.currentSent, tokId, "deprel", val);
  }

  updateRow(tokId);
}

function updateRow(tokId){
  renderSentence();
}

// ---------- Preview: Tokens + Trees ----------
function renderPreview(){
  const sentIndex = state.currentSent;

  const docMaps = state.docs.map(d => {
    const s = d.sentences[sentIndex];
    const m = new Map();
    if(s) for(const t of s.tokens) m.set(t.id, t);
    return m;
  });

  const ids = new Set();
  for(const m of docMaps) for(const id of m.keys()) ids.add(id);
  const customSent = state.custom[sentIndex] || {};
  for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
  const idList = Array.from(ids).sort((a,b)=>a-b);

  const goldMap = buildGoldTokenMap(sentIndex, idList, docMaps);

  let tHtml = "<thead><tr>";
  tHtml += "<th>ID</th><th>FORM</th><th>UPOS</th><th>XPOS</th><th>GOLD</th><th>Quelle</th>";
  tHtml += "</tr></thead><tbody>";

  for(const id of idList){
    const baseTok = firstToken(docMaps, id);
    const form = baseTok?.form ?? "—";
    const upos = baseTok?.upos ?? "_";
    const xpos = baseTok?.xpos ?? "_";

    const goldTok = goldMap.get(id);
    const goldVal = goldTok ? `${goldTok.head ?? "_"} / ${goldTok.deprel ?? "_"}` : "—";

    const ce = getCustomEntry(sentIndex, id);
    let src = "—";
    if(ce) src = "CUSTOM";
    else {
      const pick = getDocChoice(sentIndex, id);
      src = state.docs[pick]?.name ? state.docs[pick].name : `Datei ${pick+1}`;
    }

    tHtml += `<tr>`;
    tHtml += `<td>${id}</td>`;
    tHtml += `<td>${escapeHtml(form)}</td>`;
    tHtml += `<td class="posCell">${escapeHtml(upos)}</td>`;
    tHtml += `<td class="posCell">${escapeHtml(xpos)}</td>`;
    tHtml += `<td class="goldCell">${escapeHtml(goldVal)}</td>`;
    tHtml += `<td class="posCell">${escapeHtml(src)}</td>`;
    tHtml += `</tr>`;
  }

  tHtml += "</tbody>";
  tokTable.innerHTML = tHtml;

  treeGrid.innerHTML = "";
  const sentenceText = getSentenceTextFallback(sentIndex);

  addTreeBlock("GOLD", "plain", renderTreePlain(sentIndex, goldMap, sentenceText));

  for(let i=0;i<state.docs.length;i++){
    const name = state.docs[i]?.name ?? `Datei ${i+1}`;
    const otherMap = docMaps[i];
    const diff = renderTreeDiff(sentIndex, goldMap, otherMap, sentenceText);
    addTreeBlock(name, "vs GOLD", diff);
  }
}

function addTreeBlock(title, sub, text){
  const wrap = document.createElement("div");
  wrap.className = "treeBlock";
  wrap.innerHTML = `
    <div class="treeHead">
      <div class="title">${escapeHtml(title)}</div>
      <div class="sub">${escapeHtml(sub)}</div>
    </div>
    <pre class="treePre">${escapeHtml(text)}</pre>
  `;
  treeGrid.appendChild(wrap);
}

function getSentenceTextFallback(sentIndex){
  for(const d of state.docs){
    const s = d.sentences[sentIndex];
    if(s && s.text) return s.text;
  }
  return "";
}

function firstToken(docMaps, tokId){
  for(const m of docMaps){
    const t = m.get(tokId);
    if(t) return t;
  }
  return null;
}

function buildGoldTokenMap(sentIndex, idList, docMaps){
  const gold = new Map();

  for(const id of idList){
    const base = firstToken(docMaps, id);
    if(!base) continue;

    const ce = getCustomEntry(sentIndex, id);

    let head = null;
    let deprel = null;

    if(ce){
      head = ce.head;
      deprel = ce.deprel;
    } else {
      const pick = getDocChoice(sentIndex, id);
      const t = docMaps[pick]?.get(id) || base;
      head = t.head ?? null;
      deprel = t.deprel ?? null;
    }

    gold.set(id, {
      id,
      form: base.form,
      upos: base.upos,
      xpos: base.xpos,
      head,
      deprel
    });
  }

  return gold;
}

// ---------- Tree rendering ----------
function edgesFromMap(tokMap){
  const edges = new Map();
  for(const [id, t] of tokMap.entries()){
    const head = (typeof t.head === "number") ? t.head : null;
    if(head === null) continue;
    edges.set(`${id}|${head}`, t.deprel ?? "_");
  }
  return edges;
}

function tokDisplayPair(goldMap, otherMap, tokId){
  const g = goldMap.get(tokId);
  const o = otherMap.get(tokId);

  if(g && o){
    const fg = g.form ?? "—";
    const fo = o.form ?? "—";
    if(fg === fo) return `${tokId}:${fg}`;
    return `${tokId}:🅶${fg}|🅵${fo}`;
  }
  if(g) return `${tokId}:${g.form ?? "—"}🅶`;
  if(o) return `${tokId}:${o.form ?? "—"}🅵`;
  return `${tokId}:❓`;
}

function renderTreePlain(sentIndex, tokMap, sentenceText){
  const edges = edgesFromMap(tokMap);

  const children = new Map();
  const nodes = new Set();
  const incoming = new Set();

  for(const [k] of edges.entries()){
    const [depS, headS] = k.split("|");
    const dep = parseInt(depS, 10);
    const head = parseInt(headS, 10);

    if(!children.has(head)) children.set(head, []);
    children.get(head).push(dep);

    nodes.add(dep);
    if(head !== 0){
      nodes.add(head);
      incoming.add(dep);
    }
  }

  for(const [h, arr] of children.entries()){
    arr.sort((a,b)=>a-b);
  }

  const rootsArr = Array.from(nodes).filter(n => !incoming.has(n)).sort((a,b)=>a-b);
  const roots = rootsArr.length ? rootsArr : (nodes.size ? [Math.min(...nodes)] : []);

  const lines = [];
  lines.push(`📝 S${sentIndex+1}: ${sentenceText}`);

  function rec(head, prefix, path){
    const deps = children.get(head) || [];
    for(let i=0;i<deps.length;i++){
      const dep = deps[i];
      const last = (i === deps.length - 1);
      const conn = last ? "└─" : "├─";
      const nextPrefix = prefix + (last ? "  " : "│ ");

      const lab = edges.get(`${dep}|${head}`) ?? "_";
      const tDisp = tokDisplayPair(tokMap, tokMap, dep);
      lines.push(`${prefix}${conn} ${lab} → ${tDisp}`);

      if(path.has(dep)){
        lines.push(`${nextPrefix}🔁 (cycle)`);
        continue;
      }
      const nextPath = new Set(path);
      nextPath.add(dep);
      rec(dep, nextPrefix, nextPath);
    }
  }

  for(let r=0;r<roots.length;r++){
    const root = roots[r];
    lines.push(`🌱 ${tokDisplayPair(tokMap, tokMap, root)}`);
    const path = new Set([root]);
    rec(root, "", path);
    if(r !== roots.length - 1) lines.push("");
  }

  return lines.join("\n");
}

function edgeEmojiAndLabel(edgesG, edgesO, key){
  const inG = edgesG.has(key);
  const inO = edgesO.has(key);

  if(inG && inO){
    const lg = edgesG.get(key);
    const lo = edgesO.get(key);
    if(lg === lo) return ["✅", lg];
    return ["⚠️", `🅶${lg} | 🅵${lo}`];
  }
  if(inG) return ["🅶", edgesG.get(key)];
  return ["🅵", edgesO.get(key)];
}

function renderTreeDiff(sentIndex, goldMap, otherMap, sentenceText){
  const edgesG = edgesFromMap(goldMap);
  const edgesO = edgesFromMap(otherMap);

  const union = new Set([...edgesG.keys(), ...edgesO.keys()]);

  const children = new Map();
  const nodes = new Set();
  const incoming = new Set();

  for(const k of union){
    const [depS, headS] = k.split("|");
    const dep = parseInt(depS, 10);
    const head = parseInt(headS, 10);

    if(!children.has(head)) children.set(head, []);
    children.get(head).push(dep);

    nodes.add(dep);
    if(head !== 0){
      nodes.add(head);
      incoming.add(dep);
    }
  }

  for(const [h, arr] of children.entries()){
    arr.sort((a,b)=>a-b);
  }

  const rootsArr = Array.from(nodes).filter(n => !incoming.has(n)).sort((a,b)=>a-b);
  const roots = rootsArr.length ? rootsArr : (nodes.size ? [Math.min(...nodes)] : []);

  const lines = [];
  lines.push(`📝 S${sentIndex+1}: ${sentenceText}`);

  function rec(head, prefix, path){
    const deps = children.get(head) || [];
    for(let i=0;i<deps.length;i++){
      const dep = deps[i];
      const last = (i === deps.length - 1);
      const conn = last ? "└─" : "├─";
      const nextPrefix = prefix + (last ? "  " : "│ ");

      const key = `${dep}|${head}`;
      const [emo, lab] = edgeEmojiAndLabel(edgesG, edgesO, key);
      const tDisp = tokDisplayPair(goldMap, otherMap, dep);

      lines.push(`${prefix}${conn} ${emo} ${lab} → ${tDisp}`);

      if(path.has(dep)){
        lines.push(`${nextPrefix}🔁 (cycle)`);
        continue;
      }
      const nextPath = new Set(path);
      nextPath.add(dep);
      rec(dep, nextPrefix, nextPath);
    }
  }

  for(let r=0;r<roots.length;r++){
    const root = roots[r];
    lines.push(`🌱 ${tokDisplayPair(goldMap, otherMap, root)}`);
    const path = new Set([root]);
    rec(root, "", path);
    if(r !== roots.length - 1) lines.push("");
  }

  return lines.join("\n");
}

// ---------- init ----------
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// Initial render
renderFiles();
renderSentSelect();
renderSentence();
