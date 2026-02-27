// Set by labels.js before main.js runs
let LABELS = {};
let DEPREL_OPTIONS_HTML = "";
let DEPREL_VALUE_SET = new Set();
let UPOS_OPTIONS_HTML = "";
let XPOS_OPTIONS_HTML = "";
// Display names for the two POS columns (can be customised via __upos_name__ / __xpos_name__ in the tagset JSON)
let UPOS_LABEL_NAME = "UPOS";
let XPOS_LABEL_NAME = "XPOS";
// N-column support: built by buildDeprelOptionsCache()
// LABEL_COLS: [{key, name, optionsHtml}]  — arbitrary label columns (like UPOS/XPOS)
// DEP_COLS:   [{key, name, headField, deprelField, optionsHtml, valueSet}]  — dep annotation layers
let LABEL_COLS = [];
let DEP_COLS   = [];

// ---------- App State ----------
const state = {
  docs: [],
  currentSent: 0,
  maxSents: 0,
  custom: {},          // custom[sent][tokId] = {head, deprel, upos, xpos}
  goldPick: {},        // goldPick[sent][tokId] = docIdx
  hiddenCols: new Set(),
  confirmed: new Set(), // confirmed sentence indices
  notes: {},           // notes[sentIndex] = string
  flags: {},           // flags[sentIndex] = Set<tokId> — flagged for attention
  // Project management
  projects: [],        // array of project snapshots
  activeProjectIdx: 0,
};

// ---------- Label helpers ----------
function normalizeLabel(label){
  return String(label).replace(/\*$/,"").trim();
}

function buildOptionsHtmlFromList(items){
  let html = `<option value="">${escapeHtml(t('label.empty'))}</option>`;
  for(const raw of items){
    const val = normalizeLabel(raw);
    if(!val) continue;
    html += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
  }
  return html;
}

function buildDeprelOptionsCache(){
  // ── DEP_COLS ──────────────────────────────────────────────────────────────
  // New format: __dep_cols__ = [{key, name, groups:{section:[label,...]}}]
  // Old format: top-level LABELS groups → single dep col
  if(Array.isArray(LABELS["__dep_cols__"]) && LABELS["__dep_cols__"].length){
    DEP_COLS = LABELS["__dep_cols__"].map((dc, i) => {
      const key  = String(dc.key  || `dep${i}`);
      const name = String(dc.name || key);
      const groups = (typeof dc.groups === "object" && dc.groups) ? dc.groups : {};
      const vs = new Set();
      let html = `<option value="">${escapeHtml(t('label.empty'))}</option>`;
      for(const [section, items] of Object.entries(groups)){
        html += `<optgroup label="${escapeHtml(section)}">`;
        for(const raw of items){
          const val = normalizeLabel(raw);
          if(!val) continue;
          vs.add(val);
          html += `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
        }
        html += `</optgroup>`;
      }
      // First dep col keeps the canonical "head"/"deprel" field names for backward compat
      const headField   = i === 0 ? "head"          : `head_${key}`;
      const deprelField = i === 0 ? "deprel"        : `deprel_${key}`;
      return { key, name, headField, deprelField, optionsHtml: html, valueSet: vs };
    });
  } else {
    // Old format: build single DEP_COL from top-level LABELS groups
    DEPREL_VALUE_SET = new Set();
    let html = `<option value="">${escapeHtml(t('label.empty'))}</option>`;
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
    DEP_COLS = [{ key:"", name:"DepRel", headField:"head", deprelField:"deprel",
                  optionsHtml: html, valueSet: DEPREL_VALUE_SET }];
  }
  // Keep backward-compat aliases
  DEPREL_OPTIONS_HTML = DEP_COLS[0]?.optionsHtml ?? "";
  DEPREL_VALUE_SET    = DEP_COLS[0]?.valueSet    ?? new Set();

  // ── LABEL_COLS ────────────────────────────────────────────────────────────
  // New format: __cols__ = [{key, name, values:[...]}]
  // Old format: __upos__ / __xpos__ lists → two label cols
  if(Array.isArray(LABELS["__cols__"]) && LABELS["__cols__"].length){
    LABEL_COLS = LABELS["__cols__"].map(col => {
      const key    = String(col.key  || "");
      const name   = String(col.name || key);
      const values = Array.isArray(col.values) ? col.values : [];
      return { key, name, optionsHtml: buildOptionsHtmlFromList(values) };
    });
    // Update backward-compat aliases for first two cols if they match upos/xpos keys
    const uposCol = LABEL_COLS.find(c => c.key === "upos");
    const xposCol = LABEL_COLS.find(c => c.key === "xpos");
    UPOS_OPTIONS_HTML = uposCol?.optionsHtml ?? "";
    XPOS_OPTIONS_HTML = xposCol?.optionsHtml ?? "";
    UPOS_LABEL_NAME   = uposCol?.name        ?? LABEL_COLS[0]?.name ?? "UPOS";
    XPOS_LABEL_NAME   = xposCol?.name        ?? LABEL_COLS[1]?.name ?? "XPOS";
  } else {
    // Old format: derive from __upos__ / __xpos__
    const uposList = LABELS["__upos__"] || [];
    const xposList = LABELS["__xpos__"] || [];
    UPOS_OPTIONS_HTML = buildOptionsHtmlFromList(uposList);
    XPOS_OPTIONS_HTML = buildOptionsHtmlFromList(xposList);
    UPOS_LABEL_NAME = (LABELS["__upos_name__"] && String(LABELS["__upos_name__"]).trim()) || "UPOS";
    XPOS_LABEL_NAME = (LABELS["__xpos_name__"] && String(LABELS["__xpos_name__"]).trim()) || "XPOS";
    LABEL_COLS = [
      { key:"upos", name:UPOS_LABEL_NAME, optionsHtml:UPOS_OPTIONS_HTML },
      { key:"xpos", name:XPOS_LABEL_NAME, optionsHtml:XPOS_OPTIONS_HTML },
    ];
  }
}

// ---------- State helpers ----------
function ensureCustomSent(sentIndex){ if(!state.custom[sentIndex]) state.custom[sentIndex] = {}; return state.custom[sentIndex]; }
function ensureGoldSent(sentIndex){ if(!state.goldPick[sentIndex]) state.goldPick[sentIndex] = {}; return state.goldPick[sentIndex]; }

function nullIfEmpty(v){ return (v === null || v === undefined || v === "") ? null : v; }

function getCustomEntry(sentIndex, tokId){
  const e = state.custom[sentIndex]?.[tokId];
  if(!e) return null;
  const result = {};
  let hasAny = false;
  for(const [k, v] of Object.entries(e)){
    const nv = nullIfEmpty(v);
    result[k] = nv;
    if(nv !== null) hasAny = true;
  }
  return hasAny ? result : null;
}

function setCustomField(sentIndex, tokId, field, value){
  const sent = ensureCustomSent(sentIndex);
  if(!sent[tokId]) sent[tokId] = {};
  sent[tokId][field] = value;
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
    const goldHd = valueStr(goldTok.head, goldTok.deprel);
    for(let i = 0; i < docMaps.length; i++){
      const t = docMaps[i].get(id);
      if(!t) continue;
      let diff = valueStr(t.head, t.deprel) !== goldHd;
      if(!diff){
        for(const col of LABEL_COLS){
          if((t[col.key] ?? "_") !== (goldTok[col.key] ?? "_")){ diff = true; break; }
        }
      }
      if(diff){ diffCount++; break; }
    }
  }
  return { totalTokens, diffCount };
}

// ---------- Helpers ----------
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
