// CoNLL-U Vergleich – v2
// Verbesserungen:
// - Tokens-Fenster entfernt (redundant), Vergleich-Tabelle übernimmt
// - Nur ein Diff-Tree (Gold vs. gemergter Annotator-Vergleich), kein Einzel-Tree pro Datei
// - Diff-Icons visuell stärker hervorgehoben
// - Klick auf Diff im Tree → springt zur entsprechenden Zeile in der Tabelle
// - Statistik pro Satz (Tokens, Diffs) beim Satz-Selector
// - Spalten ein-/ausblenden im Vergleich
// - GOLD + CUSTOM zusammengeführt in einer Spalte
// - Custom head: kein automatischer Focus / Wertauswahl

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
let UPOS_OPTIONS_HTML = "";
let XPOS_OPTIONS_HTML = "";

const state = {
  docs: [],
  currentSent: 0,
  maxSents: 0,
  custom: {},     // custom[sent][tokId] = {head, deprel}
  goldPick: {},   // goldPick[sent][tokId] = docIdx
  hiddenCols: new Set(), // set of docIdx (numbers) to hide
};

// DOM
const fileInput = document.getElementById("fileInput");
const resetBtn  = document.getElementById("resetBtn");
const fileList  = document.getElementById("fileList");
const fileMeta  = document.getElementById("fileMeta");

const sentSelect  = document.getElementById("sentSelect");
const prevBtn     = document.getElementById("prevBtn");
const nextBtn     = document.getElementById("nextBtn");
const sentMeta    = document.getElementById("sentMeta");
const sentText    = document.getElementById("sentText");
const sentStats   = document.getElementById("sentStats");

const treeGrid    = document.getElementById("treeGrid");
const cmpTable    = document.getElementById("cmpTable");
const colToggleBar = document.getElementById("colToggleBar");

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
  if(el instanceof HTMLSelectElement && el.dataset.field && el.dataset.id){
    onCustomFieldChange(el);
  }
});

// Klick auf Datei-Zelle → Gold wählen
cmpTable.addEventListener("click", (e) => {
  const td = e.target.closest?.("td[data-col^='doc']");
  if(!td) return;
  const tr = td.closest("tr[data-id]");
  if(!tr) return;
  const tokId = parseInt(tr.dataset.id, 10);
  const docIdx = parseInt(td.dataset.docIdx, 10);
  if(getCustomEntry(state.currentSent, tokId)) return;
  setDocChoice(state.currentSent, tokId, docIdx);
  renderSentence();
});

// ---------- Labels ----------
(async function initLabels(){
  try{
    const res = await fetch("labels.json", {cache:"no-store"});
    if(res.ok){
      const data = await res.json();
      if(data && typeof data === "object") LABELS = data;
    }
  }catch(_){}
  finally{
    buildDeprelOptionsCache();
    renderSentence();
  }
})();

function normalizeLabel(label){
  return String(label).replace(/\*$/,"").trim();
}
function buildOptionsHtmlFromList(items){
  let html = `<option value="">(leer)</option>`;
  for(const raw of items){
    const val = normalizeLabel(raw);
    if(!val) continue;
    html += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
  }
  return html;
}

function buildDeprelOptionsCache(){
  DEPREL_VALUE_SET = new Set();
  let html = `<option value="">(leer)</option>`;
  for(const [section, items] of Object.entries(LABELS)){
    if(section.startsWith("__")) continue; // skip upos/xpos sections
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

  // UPOS
  const uposList = LABELS["__upos__"] || [];
  UPOS_OPTIONS_HTML = buildOptionsHtmlFromList(uposList);

  // XPOS
  const xposList = LABELS["__xpos__"] || [];
  XPOS_OPTIONS_HTML = buildOptionsHtmlFromList(xposList);
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
    const form   = cols[1] || "_";
    const upos   = cols[3] || "_";
    const xpos   = cols[4] || "_";
    const head   = /^\d+$/.test(cols[6]) ? parseInt(cols[6], 10) : null;
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
  state.hiddenCols.delete(index);
  // Re-map hidden cols
  const newHidden = new Set();
  for(const v of state.hiddenCols){
    if(v > index) newHidden.add(v - 1);
    else if(v < index) newHidden.add(v);
  }
  state.hiddenCols = newHidden;

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
  state.hiddenCols = new Set();
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
function ensureCustomSent(sentIndex){ if(!state.custom[sentIndex]) state.custom[sentIndex] = {}; return state.custom[sentIndex]; }
function ensureGoldSent(sentIndex){ if(!state.goldPick[sentIndex]) state.goldPick[sentIndex] = {}; return state.goldPick[sentIndex]; }

function getCustomEntry(sentIndex, tokId){
  const e = state.custom[sentIndex]?.[tokId];
  if(!e) return null;
  const head   = (e.head   === null || e.head   === undefined || e.head   === "") ? null : e.head;
  const deprel = (e.deprel === null || e.deprel === undefined || e.deprel === "") ? null : e.deprel;
  const upos   = (e.upos   === null || e.upos   === undefined || e.upos   === "") ? null : e.upos;
  const xpos   = (e.xpos   === null || e.xpos   === undefined || e.xpos   === "") ? null : e.xpos;
  if(head === null && deprel === null && upos === null && xpos === null) return null;
  return { head, deprel, upos, xpos };
}

function setCustomField(sentIndex, tokId, field, value){
  const sent = ensureCustomSent(sentIndex);
  if(!sent[tokId]) sent[tokId] = { head:null, deprel:null, upos:null, xpos:null };
  if(field === "head")   sent[tokId].head   = value;
  if(field === "deprel") sent[tokId].deprel = value;
  if(field === "upos")   sent[tokId].upos   = value;
  if(field === "xpos")   sent[tokId].xpos   = value;
  const e = getCustomEntry(sentIndex, tokId);
  if(!e){
    delete sent[tokId];
    if(Object.keys(sent).length === 0) delete state.custom[sentIndex];
  }
}

function getCustomUpos(sentIndex, tokId){ return getCustomEntry(sentIndex, tokId)?.upos ?? null; }
function getCustomXpos(sentIndex, tokId){ return getCustomEntry(sentIndex, tokId)?.xpos ?? null; }

function getDocChoice(sentIndex, tokId){
  const m = ensureGoldSent(sentIndex);
  const v = m[tokId];
  if(typeof v === "number" && v >= 0 && v < state.docs.length) return v;
  return 0;
}
function setDocChoice(sentIndex, tokId, docIdx){ ensureGoldSent(sentIndex)[tokId] = docIdx; }

function valueStr(head, deprel){
  return `${head ?? "_"} / ${deprel ?? "_"}`;
}

// ---------- Statistics ----------
function computeStats(sentIndex, idList, docMaps, goldMap){
  const totalTokens = idList.length;
  if(docMaps.length < 2) return { totalTokens, diffCount: 0, avgAnnotations: totalTokens };

  let diffCount = 0;
  for(const id of idList){
    const goldTok = goldMap.get(id);
    if(!goldTok) continue;
    const goldVal = valueStr(goldTok.head, goldTok.deprel);
    for(let i = 0; i < docMaps.length; i++){
      const t = docMaps[i].get(id);
      if(!t) continue;
      const v = valueStr(t.head, t.deprel);
      if(v !== goldVal){ diffCount++; break; }
    }
  }
  return { totalTokens, diffCount };
}

// ---------- UI ----------
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
  if(!ok){ sentStats.textContent = ""; return; }
  for(let i=0;i<state.maxSents;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Satz ${i+1}`;
    sentSelect.appendChild(opt);
  }
  sentSelect.value = String(state.currentSent);
}

function renderColToggleBar(){
  colToggleBar.innerHTML = "";
  if(state.docs.length < 2){ return; }
  const label = document.createElement("span");
  label.className = "muted small";
  label.textContent = "Spalten: ";
  colToggleBar.appendChild(label);

  state.docs.forEach((d, idx) => {
    const btn = document.createElement("button");
    btn.className = "colToggle" + (state.hiddenCols.has(idx) ? " colHidden" : " colVisible");
    btn.textContent = d.name;
    btn.title = state.hiddenCols.has(idx) ? "Spalte einblenden" : "Spalte ausblenden";
    btn.addEventListener("click", () => {
      if(state.hiddenCols.has(idx)) state.hiddenCols.delete(idx);
      else state.hiddenCols.add(idx);
      renderColToggleBar();
      renderCompareTable();
    });
    colToggleBar.appendChild(btn);
  });
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
    sentStats.textContent = "";
    treeGrid.innerHTML = "";
    cmpTable.innerHTML = "";
    colToggleBar.innerHTML = "";
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));
  sentSelect.value = String(state.currentSent);

  const s0 = state.docs[0].sentences[state.currentSent];
  sentText.textContent = s0 ? s0.text : "(Satz fehlt in Datei 1)";
  sentMeta.textContent = `S${state.currentSent+1} / ${state.maxSents}`;

  renderColToggleBar();
  renderCompareTable();
  renderPreview();
}

function buildDocMapsAndIds(){
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
  return { docMaps, idList };
}

function renderCompareTable(){
  const sentIndex = state.currentSent;
  const { docMaps, idList } = buildDocMapsAndIds();
  const goldMap = buildGoldTokenMap(sentIndex, idList, docMaps);

  // Stats
  const stats = computeStats(sentIndex, idList, docMaps, goldMap);
  sentStats.innerHTML = `
    <span class="statBadge">${stats.totalTokens} Tokens</span>
    <span class="statBadge ${stats.diffCount > 0 ? 'statDiff' : 'statOk'}">
      ${stats.diffCount} Diff${stats.diffCount !== 1 ? 's' : ''}
    </span>
  `;

  // Header
  let html = "<thead><tr>";
  html += "<th>ID</th><th>FORM</th><th>UPOS</th><th>XPOS</th>";
  html += "<th>GOLD</th>";
  for(let i=0; i<state.docs.length; i++){
    if(state.hiddenCols.has(i)) continue;
    html += `<th>${escapeHtml(state.docs[i].name)}</th>`;
  }
  html += "<th>Custom HEAD / DEP</th>";
  html += "</tr></thead><tbody>";

  for(const id of idList){
    let form="—", upos="_", xpos="_";
    for(const m of docMaps){
      const t = m.get(id);
      if(t){ form=t.form; upos=t.upos??"_"; xpos=t.xpos??"_"; break; }
    }

    const goldTok = goldMap.get(id);
    const goldVal = goldTok ? valueStr(goldTok.head, goldTok.deprel) : "—";

    const ce = getCustomEntry(sentIndex, id);
    const customExists = !!ce;
    const customVal = ce ? valueStr(ce.head, ce.deprel) : null;

    // Is there a diff across doc files?
    const allVals = state.docs.map((_, i) => {
      const t = docMaps[i].get(id);
      return t ? valueStr(t.head, t.deprel) : null;
    });
    const hasDiff = allVals.filter(Boolean).length > 1 &&
      new Set(allVals.filter(Boolean)).size > 1;

    // Custom UPOS/XPOS overrides
    const customUpos = getCustomUpos(sentIndex, id);
    const customXpos = getCustomXpos(sentIndex, id);
    const displayUpos = customUpos ?? upos;
    const displayXpos = customXpos ?? xpos;

    // Build UPOS extra option if not in list
    let uposExtra = "";
    if(displayUpos && displayUpos !== "_" && UPOS_OPTIONS_HTML && !UPOS_OPTIONS_HTML.includes(`value="${escapeHtml(displayUpos)}"`)){
      uposExtra = `<option value="${escapeHtml(displayUpos)}">${escapeHtml(displayUpos)}</option>`;
    }
    let xposExtra = "";
    if(displayXpos && displayXpos !== "_" && XPOS_OPTIONS_HTML && !XPOS_OPTIONS_HTML.includes(`value="${escapeHtml(displayXpos)}"`)){
      xposExtra = `<option value="${escapeHtml(displayXpos)}">${escapeHtml(displayXpos)}</option>`;
    }

    html += `<tr data-id="${id}" class="${hasDiff ? 'rowDiff' : ''}">`;
    html += `<td>${id}</td>`;
    html += `<td>${escapeHtml(form)}</td>`;
    if(UPOS_OPTIONS_HTML){
      html += `<td class="posCell posEditCell"><select class="posSelect" data-id="${id}" data-field="upos">${uposExtra}${UPOS_OPTIONS_HTML}</select></td>`;
    } else {
      html += `<td class="posCell${customUpos ? ' posCustom' : ''}">${escapeHtml(displayUpos)}</td>`;
    }
    if(XPOS_OPTIONS_HTML){
      html += `<td class="posCell posEditCell"><select class="posSelect" data-id="${id}" data-field="xpos">${xposExtra}${XPOS_OPTIONS_HTML}</select></td>`;
    } else {
      html += `<td class="posCell${customXpos ? ' posCustom' : ''}">${escapeHtml(displayXpos)}</td>`;
    }

    // GOLD column: shows custom if set, else chosen doc
    const goldSrc = customExists ? '<span class="srcTag srcCustom">C</span>' :
      `<span class="srcTag srcDoc">D${getDocChoice(sentIndex,id)+1}</span>`;
    html += `<td data-col="gold" class="goldCell">${goldSrc} ${escapeHtml(goldVal)}</td>`;

    // Doc cells (klickbar, ausblendbar)
    for(let i=0; i<state.docs.length; i++){
      if(state.hiddenCols.has(i)) continue;
      const v = allVals[i];
      const clsCompare = (goldVal && v) ? (v === goldVal ? "same" : "diff") : "";
      const clsDisabled = customExists ? "disabledPick" : "";
      const clsPicked = (!customExists && i === getDocChoice(sentIndex, id)) ? "picked" : "";
      html += `
        <td data-col="doc${i}" data-doc-idx="${i}"
            class="pickable ${clsCompare} ${clsDisabled} ${clsPicked}">
          ${escapeHtml(v ?? "—")}
        </td>`;
    }

    // Custom cell (single, combined)
    const headVal = ce?.head ?? "";
    const relVal  = ce?.deprel ?? "";
    let extraOpt = "";
    if(relVal && !DEPREL_VALUE_SET.has(relVal)){
      extraOpt = `<option value="${escapeHtml(relVal)}">${escapeHtml(relVal)} (unknown)</option>`;
    }

    html += `
      <td data-col="custom" class="${customExists ? 'picked' : ''}">
        <div class="customCell">
          <input class="customHead" type="number" min="0" step="1"
                 data-id="${id}" data-field="head"
                 value="${escapeHtml(String(headVal))}" placeholder="head"
                 tabindex="-1">
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
    sel.value = getCustomEntry(sentIndex, tokId)?.deprel ?? "";
  });
  cmpTable.querySelectorAll("select.posSelect").forEach(sel => {
    const tokId = parseInt(sel.dataset.id, 10);
    const field  = sel.dataset.field;
    let fallback = "_";
    for(const m of docMaps){ const t = m.get(tokId); if(t){ fallback = field === "upos" ? (t.upos ?? "_") : (t.xpos ?? "_"); break; } }
    const customVal = field === "upos" ? getCustomUpos(sentIndex, tokId) : getCustomXpos(sentIndex, tokId);
    sel.value = customVal ?? fallback;
  });
}

function onCustomFieldChange(el){
  const tokId = parseInt(el.dataset.id, 10);
  const field  = el.dataset.field;
  if(field === "head"){
    const raw = el.value.trim();
    const val = raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0);
    setCustomField(state.currentSent, tokId, "head", val);
  } else if(field === "deprel" || field === "upos" || field === "xpos"){
    const raw = el.value;
    const val = raw === "" ? null : raw;
    setCustomField(state.currentSent, tokId, field, val);
  }
  renderSentence();
}

// ---------- Preview: Single stacked tree ----------
function renderPreview(){
  const sentIndex = state.currentSent;
  const { docMaps, idList } = buildDocMapsAndIds();
  const goldMap = buildGoldTokenMap(sentIndex, idList, docMaps);

  treeGrid.innerHTML = "";
  if(state.docs.length === 0) return;

  const sentenceText = getSentenceTextFallback(sentIndex);

  // One single block: GOLD on top, then each file below, all stacked vertically
  const wrap = document.createElement("div");
  wrap.className = "treeBlock treeBlockStacked";

  // --- GOLD section ---
  const goldSection = buildTreeSection("⭐ GOLD", null, renderTreePlain(sentIndex, goldMap, sentenceText));
  wrap.appendChild(goldSection);

  // --- Per-file sections ---
  for(let i=0; i<state.docs.length; i++){
    const name = state.docs[i]?.name ?? `Datei ${i+1}`;
    const otherMap = docMaps[i];
    const diff = renderTreeDiff(sentIndex, goldMap, otherMap, sentenceText);
    const section = buildTreeSection(name, "vs Gold", diff);
    wrap.appendChild(section);
  }

  treeGrid.appendChild(wrap);
}

function scrollToToken(tokId){
  const tr = cmpTable.querySelector(`tr[data-id="${tokId}"]`);
  if(tr){
    tr.scrollIntoView({ behavior:"smooth", block:"center" });
    tr.classList.add("highlightRow");
    setTimeout(() => tr.classList.remove("highlightRow"), 1600);
  }
}

function buildTreeSection(title, sub, text){
  const section = document.createElement("div");
  section.className = "treeSection";

  const head = document.createElement("div");
  head.className = "treeHead";
  head.innerHTML = `
    <div class="title">${escapeHtml(title)}</div>
    ${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ""}
  `;
  section.appendChild(head);

  const pre = document.createElement("pre");
  pre.className = "treePre";

  const lines = text.split("\n");
  for(const line of lines){
    const tokMatch = line.match(/→\s*(\d+):/);
    if(tokMatch){
      const tokId = parseInt(tokMatch[1], 10);
      const span = document.createElement("span");
      span.className = "treeLine treeLineClickable";
      span.textContent = line + "\n";
      span.title = `Zur Zeile springen: Token ${tokId}`;
      span.addEventListener("click", () => scrollToToken(tokId));
      pre.appendChild(span);
    } else {
      const span = document.createElement("span");
      span.className = "treeLine";
      span.textContent = line + "\n";
      pre.appendChild(span);
    }
  }

  section.appendChild(pre);
  return section;
}

function getSentenceTextFallback(sentIndex){
  for(const d of state.docs){
    const s = d.sentences[sentIndex];
    if(s && s.text) return s.text;
  }
  return "";
}

function firstToken(docMaps, tokId){
  for(const m of docMaps){ const t = m.get(tokId); if(t) return t; }
  return null;
}

function buildGoldTokenMap(sentIndex, idList, docMaps){
  const gold = new Map();
  for(const id of idList){
    const base = firstToken(docMaps, id);
    if(!base) continue;
    const ce = getCustomEntry(sentIndex, id);
    let head, deprel;
    if(ce){
      head   = ce.head;
      deprel = ce.deprel;
    } else {
      const pick = getDocChoice(sentIndex, id);
      const t = docMaps[pick]?.get(id) || base;
      head   = t.head   ?? null;
      deprel = t.deprel ?? null;
    }
    gold.set(id, { id, form: base.form, upos: base.upos, xpos: base.xpos, head, deprel });
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

function renderTreePlain(sentIndex, tokMap, sentenceText){
  const edges = edgesFromMap(tokMap);
  return _buildTree(sentIndex, tokMap, tokMap, edges, edges, sentenceText, false);
}

function renderTreeDiff(sentIndex, goldMap, otherMap, sentenceText){
  const edgesG = edgesFromMap(goldMap);
  const edgesO = edgesFromMap(otherMap);
  return _buildTree(sentIndex, goldMap, otherMap, edgesG, edgesO, sentenceText, true);
}

function _buildTree(sentIndex, goldMap, otherMap, edgesG, edgesO, sentenceText, isDiff){
  const union = isDiff ? new Set([...edgesG.keys(), ...edgesO.keys()]) : new Set(edgesG.keys());

  const children = new Map();
  const nodes = new Set();
  const incoming = new Set();

  for(const k of union){
    const [depS, headS] = k.split("|");
    const dep  = parseInt(depS, 10);
    const head = parseInt(headS, 10);
    if(!children.has(head)) children.set(head, []);
    children.get(head).push(dep);
    nodes.add(dep);
    if(head !== 0){ nodes.add(head); incoming.add(dep); }
  }
  for(const [, arr] of children.entries()) arr.sort((a,b)=>a-b);

  const rootsArr = Array.from(nodes).filter(n => !incoming.has(n)).sort((a,b)=>a-b);
  const roots = rootsArr.length ? rootsArr : (nodes.size ? [Math.min(...nodes)] : []);

  const lines = [];
  lines.push(`📝 S${sentIndex+1}: ${sentenceText}`);

  function rec(head, prefix, path){
    const deps = children.get(head) || [];
    for(let i=0; i<deps.length; i++){
      const dep  = deps[i];
      const last = (i === deps.length - 1);
      const conn = last ? "└─" : "├─";
      const nextPrefix = prefix + (last ? "  " : "│ ");

      let emo = "", lab = "";
      if(isDiff){
        const key = `${dep}|${head}`;
        [emo, lab] = edgeEmojiAndLabel(edgesG, edgesO, key);
      } else {
        lab = edgesG.get(`${dep}|${head}`) ?? "_";
      }

      const form = goldMap.get(dep)?.form ?? otherMap.get(dep)?.form ?? "?";
      const tDisp = isDiff ? tokDisplayPair(goldMap, otherMap, dep) : `${dep}:${form}`;

      if(isDiff){
        lines.push(`${prefix}${conn} ${emo} ${lab} → ${tDisp}`);
      } else {
        lines.push(`${prefix}${conn} ${lab} → ${tDisp}`);
      }

      if(path.has(dep)){
        lines.push(`${nextPrefix}🔁 (cycle)`);
        continue;
      }
      const nextPath = new Set(path); nextPath.add(dep);
      rec(dep, nextPrefix, nextPath);
    }
  }

  for(let r=0; r<roots.length; r++){
    const root = roots[r];
    const form = goldMap.get(root)?.form ?? otherMap.get(root)?.form ?? "?";
    lines.push(`🌱 ${root}:${form}`);
    const path = new Set([root]);
    rec(root, "", path);
    if(r !== roots.length - 1) lines.push("");
  }

  return lines.join("\n");
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

function edgeEmojiAndLabel(edgesG, edgesO, key){
  const inG = edgesG.has(key);
  const inO = edgesO.has(key);
  if(inG && inO){
    const lg = edgesG.get(key);
    const lo = edgesO.get(key);
    if(lg === lo) return ["✅", lg];
    return ["⚠️", `🅶${lg}|🅵${lo}`];
  }
  if(inG) return ["🅶", edgesG.get(key)];
  return ["🅵", edgesO.get(key)];
}

// ---------- Helpers ----------
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

renderFiles();
renderSentSelect();
renderSentence();
