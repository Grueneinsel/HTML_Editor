// Set by labels.js before main.js runs
let LABELS = {};
let DEPREL_OPTIONS_HTML = "";
let DEPREL_VALUE_SET = new Set();
let UPOS_OPTIONS_HTML = "";
let XPOS_OPTIONS_HTML = "";

// ---------- App State ----------
const state = {
  docs: [],
  currentSent: 0,
  maxSents: 0,
  custom: {},          // custom[sent][tokId] = {head, deprel, upos, xpos}
  goldPick: {},        // goldPick[sent][tokId] = docIdx
  hiddenCols: new Set(),
  confirmed: new Set(), // confirmed sentence indices
};

// ---------- Label helpers ----------
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
    if(section.startsWith("__")) continue;
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

  const uposList = LABELS["__upos__"] || [];
  UPOS_OPTIONS_HTML = buildOptionsHtmlFromList(uposList);

  const xposList = LABELS["__xpos__"] || [];
  XPOS_OPTIONS_HTML = buildOptionsHtmlFromList(xposList);
}

// ---------- State helpers ----------
function ensureCustomSent(sentIndex){ if(!state.custom[sentIndex]) state.custom[sentIndex] = {}; return state.custom[sentIndex]; }
function ensureGoldSent(sentIndex){ if(!state.goldPick[sentIndex]) state.goldPick[sentIndex] = {}; return state.goldPick[sentIndex]; }

function nullIfEmpty(v){ return (v === null || v === undefined || v === "") ? null : v; }

function getCustomEntry(sentIndex, tokId){
  const e = state.custom[sentIndex]?.[tokId];
  if(!e) return null;
  const head   = nullIfEmpty(e.head);
  const deprel = nullIfEmpty(e.deprel);
  const upos   = nullIfEmpty(e.upos);
  const xpos   = nullIfEmpty(e.xpos);
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
  if(docMaps.length < 2) return { totalTokens, diffCount: 0 };
  let diffCount = 0;
  for(const id of idList){
    const goldTok = goldMap.get(id);
    if(!goldTok) continue;
    const goldHd   = valueStr(goldTok.head, goldTok.deprel);
    const goldUpos = goldTok.upos ?? "_";
    const goldXpos = goldTok.xpos ?? "_";
    for(let i = 0; i < docMaps.length; i++){
      const t = docMaps[i].get(id);
      if(!t) continue;
      if(valueStr(t.head, t.deprel) !== goldHd ||
         (t.upos ?? "_") !== goldUpos ||
         (t.xpos ?? "_") !== goldXpos){ diffCount++; break; }
    }
  }
  return { totalTokens, diffCount };
}

// ---------- Helpers ----------
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
