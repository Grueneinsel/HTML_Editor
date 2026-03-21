// Smart file dispatch (shared by all upload paths and drag & drop) + tagset management.

/** Returns true if parsed JSON looks like a saved session. */
function _isSessionJson(data){
  if(!data || typeof data !== "object" || Array.isArray(data)) return false;
  return data.version === 2 && Array.isArray(data.projects);
}

/** Apply a parsed tagset object (LABELS) to the active project only. */
function applyTagsetJson(data){
  if(typeof data !== "object" || Array.isArray(data) || !data){
    _showToast(t("tagset.errFormat"), 'error'); return;
  }
  LABELS = data;
  buildDeprelOptionsCache();
  if(typeof _resetPopup === "function") _resetPopup();
  // Persist tagset in the active project snapshot (not globally)
  const p = state.projects[state.activeProjectIdx];
  if(p) p.labels = JSON.parse(JSON.stringify(LABELS));
  renderSentence();
  _updateTagsetMeta();
  renderTagsetList();
  // Count total tags to confirm what was loaded
  const cols = LABELS["__cols__"] || [];
  const depCols = LABELS["__dep_cols__"] || [];
  const tagCount = cols.reduce((s, c) => s + (c.values?.length || 0), 0);
  const depCount = depCols.reduce((s, dc) => s + Object.values(dc.groups || {}).flat().length, 0);
  if(tagCount > 0 || depCount > 0){
    _showToast(t('tagset.loadedToast', { n: tagCount, d: depCount }), 'info');
  }
}

// Update the tagset-meta display line with counts from the currently active LABELS.
// Works for both old (__upos__/__xpos__) and new (__cols__/__dep_cols__) formats.
function _updateTagsetMeta(){
  const tagsetMeta = document.getElementById("tagsetMeta");
  if(!tagsetMeta) return;
  // Deprel count: sum of value-set sizes across all dep columns.
  const totalDeprels = DEP_COLS.reduce((sum, dc) => sum + (dc.valueSet?.size ?? 0), 0);
  // Label column counts: prefer __cols__ array, fall back to __upos__/__xpos__.
  const cols = LABELS["__cols__"];
  const col0 = Array.isArray(cols) ? (cols[0]?.values?.length ?? 0) : (LABELS["__upos__"]?.length ?? 0);
  const col1 = Array.isArray(cols) ? (cols[1]?.values?.length ?? 0) : (LABELS["__xpos__"]?.length ?? 0);
  if(totalDeprels === 0 && col0 === 0 && col1 === 0){ tagsetMeta.textContent = ""; return; }
  tagsetMeta.textContent = t("tagset.loaded", { deprel: totalDeprels, upos: col0, xpos: col1 });
}

/** Returns true if parsed JSON looks like a UD-style tagset (tag_name/tag_description array). */
function _isUdTagsetJson(data){
  return data && typeof data === 'object' && !Array.isArray(data) &&
    Array.isArray(data.tags) && typeof data.tags[0]?.tag_name === 'string';
}

/**
 * Apply a UD tag list to a specific column in LABELS.
 * target: 'col:N' for the N-th label column, 'dep:N' for the N-th dep column.
 */
function _applyUdToColumn(target, tagNames, dataName){
  const base = (LABELS && typeof LABELS === 'object') ? JSON.parse(JSON.stringify(LABELS)) : {};
  if(target.startsWith('col:')){
    const idx  = parseInt(target.slice(4), 10);
    const cols = Array.isArray(base['__cols__']) ? base['__cols__'].slice() : [];
    while(cols.length <= idx) cols.push({ key:`col${cols.length}`, name:`Col ${cols.length+1}`, values:[] });
    cols[idx] = { ...cols[idx], values: tagNames };
    if(cols.length < 2) cols.push({ key:'xpos', name:'XPOS', values:[] });
    base['__cols__'] = cols;
  } else {
    const idx     = parseInt(target.slice(4), 10);
    const depCols = Array.isArray(base['__dep_cols__']) ? base['__dep_cols__'].slice() : [];
    while(depCols.length <= idx) depCols.push({ key:`dep${depCols.length}`, name:'DepRel', groups:{} });
    depCols[idx] = { ...depCols[idx], groups: { [dataName || 'relations']: tagNames } };
    base['__dep_cols__'] = depCols;
  }
  return base;
}

/**
 * Show a modal dialog letting the user choose which column to assign UD tagset tags to.
 * Calls onApply(target, tagNames) where target is 'col:N' or 'dep:N'.
 */
function _showUdMappingDialog(data, onApply){
  const tagNames = data.tags.map(tg => tg.tag_name).filter(Boolean);
  document.getElementById('udMappingDialog')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'udMappingDialog';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';

  const dlg = document.createElement('div');
  dlg.style.cssText = 'background:var(--card);border:1px solid var(--accent);border-radius:8px;padding:20px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.5);';

  const preview = tagNames.slice(0, 10).map(v => escapeHtml(v)).join(', ')
    + (tagNames.length > 10 ? ` … (+${tagNames.length - 10})` : '');

  const title    = document.createElement('div');
  title.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:6px;';
  title.textContent = t('tagset.mapTitle');

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:6px;';
  sub.textContent = data.name || '';

  const tagPreview = document.createElement('div');
  tagPreview.style.cssText = 'font-size:11px;background:var(--bg);padding:6px 8px;border-radius:4px;word-break:break-all;margin-bottom:12px;';
  tagPreview.innerHTML = preview;

  const question = document.createElement('div');
  question.style.cssText = 'font-size:13px;margin-bottom:10px;';
  question.textContent = t('tagset.mapQuestion');

  const btnsRow = document.createElement('div');
  btnsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';

  const close = () => overlay.remove();

  // Build choices from current LABEL_COLS and DEP_COLS (populated by buildDeprelOptionsCache)
  const labelCols = (typeof LABEL_COLS !== 'undefined' && LABEL_COLS.length)
    ? LABEL_COLS
    : [{ key:'upos', name:'UPOS' }, { key:'xpos', name:'XPOS' }];
  const depCols = (typeof DEP_COLS !== 'undefined' && DEP_COLS.length)
    ? DEP_COLS
    : [{ key:'deprel', name:'DepRel' }];

  const choices = [
    ...labelCols.map((c, i) => ({ value:`col:${i}`, label: c.name || `Col ${i+1}` })),
    ...depCols.map((c, i)   => ({ value:`dep:${i}`, label: c.name || 'DepRel' })),
  ];

  for(const ch of choices){
    const btn = document.createElement('button');
    btn.textContent = ch.label;
    btn.style.cssText = 'padding:6px 16px;cursor:pointer;border-radius:4px;font-size:13px;border:1px solid var(--accent);background:var(--bg);color:var(--text);';
    btn.addEventListener('click', () => { close(); onApply(ch.value, tagNames); });
    btnsRow.appendChild(btn);
  }

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = t('tagset.mapCancel');
  cancelBtn.style.cssText = 'font-size:12px;padding:4px 12px;cursor:pointer;border-radius:4px;border:1px solid var(--line);background:transparent;color:var(--muted);';
  cancelBtn.addEventListener('click', close);

  dlg.appendChild(title);
  dlg.appendChild(sub);
  dlg.appendChild(tagPreview);
  dlg.appendChild(question);
  dlg.appendChild(btnsRow);
  dlg.appendChild(cancelBtn);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);

  overlay.addEventListener('pointerdown', ev => { if(ev.target === overlay) close(); });
}

/**
 * Smart dispatch for a JSON text string:
 *  - Session JSON       → importSession()
 *  - UD tagset format   → show mapping dialog, then applyTagsetJson()
 *  - Everything else    → applyTagsetJson()
 */
function _smartDispatchJson(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch { _showToast(t("tagset.errJson"), 'error'); return; }
  if(_isSessionJson(data))   importSession(jsonText);
  else if(_isUdTagsetJson(data)){
    _showUdMappingDialog(data, (target, tagNames) => {
      applyTagsetJson(_applyUdToColumn(target, tagNames, data.name));
    });
  }
  else                       applyTagsetJson(data);
}

/**
 * Universal file dispatcher: handles .json (smart), .conllu/.conll/.txt.
 * Returns a Promise so callers can await if needed.
 */
async function _dispatchFiles(files){
  const jsonFiles   = files.filter(f => /\.json$/i.test(f.name));
  const conlluFiles = files.filter(f => /\.(conllu|conll|txt)$/i.test(f.name));
  for(const f of jsonFiles){
    const text = await f.text();
    _smartDispatchJson(text);
  }
  if(conlluFiles.length > 0) await processFiles(conlluFiles);
}

// ── Tagset upload ──────────────────────────────────────────────────────────────
{
  const _tagsetInputEl = document.getElementById("tagsetInput");
  if(_tagsetInputEl){
    _tagsetInputEl.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = "";
      if(!files.length) return;
      await _dispatchFiles(files);
    });
  }
}

// ── Tagset edit button ─────────────────────────────────────────────────────────
{
  const _tagsetEditBtnEl = document.getElementById("tagsetEditBtn");
  if(_tagsetEditBtnEl){
    _tagsetEditBtnEl.addEventListener("click", () => _showTagsetEditor());
  }
}

// ── Tagset download ────────────────────────────────────────────────────────────
{
  const _tagsetDownloadBtnEl = document.getElementById("tagsetDownloadBtn");
  if(_tagsetDownloadBtnEl){
    _tagsetDownloadBtnEl.addEventListener("click", () => {
      const json = JSON.stringify(LABELS, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tagset.json";
      a.click();
      URL.revokeObjectURL(a.href);
      if(typeof _showToast === "function") _showToast("✓ tagset.json");
    });
  }
}

// ── Template download ──────────────────────────────────────────────────────────
// Source: testdata/template.json → window.TAGSET_TEMPLATE (via make_readme_js.py)
{
  const _tagsetTemplateBtnEl = document.getElementById("tagsetTemplateBtn");
  if(_tagsetTemplateBtnEl){
    _tagsetTemplateBtnEl.addEventListener("click", () => {
      const content = (typeof TAGSET_TEMPLATE !== 'undefined') ? TAGSET_TEMPLATE : '{}';
      const blob = new Blob([content], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tagset_template.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}

// ── Example tagset download ────────────────────────────────────────────────────
// A realistic, annotated example showing the extended __cols__ / __dep_cols__ format.
const _TAGSET_EXAMPLE = JSON.stringify({
  "_comment": "Beispiel-Tagset im erweiterten Format (__cols__ + __dep_cols__).",

  "__cols__": [
    {
      "key":    "upos",
      "name":   "UPOS",
      "values": ["ADJ","ADP","ADV","AUX","CCONJ","DET","INTJ","NOUN","NUM",
                 "PART","PRON","PROPN","PUNCT","SCONJ","SYM","VERB","X"]
    },
    {
      "key":    "xpos",
      "name":   "XPOS (STTS)",
      "values": ["ADJA","ADJD","ADV","ART","CARD","FM","ITJ","KON","KOUS",
                 "NE","NN","PDAT","PDS","PPER","PPOSS","PRELS","PRF",
                 "PTKNEG","PWAV","VAFIN","VAINF","VAPP","VMFIN","VVFIN",
                 "VVINF","VVPP","XY","$,","$.","$("]
    }
  ],

  "__dep_cols__": [
    {
      "key":  "dep",
      "name": "UD DepRel",
      "groups": {
        "Kernargumente":   ["nsubj","nsubj:pass","obj","iobj","csubj","ccomp","xcomp"],
        "Nicht-Kernarg.":  ["obl","obl:arg","vocative","expl","dislocated"],
        "Modifikatoren":   ["advcl","advmod","discourse"],
        "Funktionswörter": ["aux","aux:pass","cop","mark"],
        "Nominalabh.":     ["nmod","appos","nummod","acl","acl:relcl","amod","det","clf","case"],
        "Koordination":    ["conj","cc"],
        "MWE & Sonstiges": ["fixed","flat","flat:name","list","parataxis","compound",
                            "orphan","goeswith","reparandum","punct","root","dep"]
      }
    }
  ]
}, null, 2);

{
  const _tagsetExampleBtnEl = document.getElementById("tagsetExampleBtn");
  if(_tagsetExampleBtnEl){
    _tagsetExampleBtnEl.addEventListener("click", () => {
      const blob = new Blob([_TAGSET_EXAMPLE], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tagset_example.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}

// ── Per-project tagset list ────────────────────────────────────────────────────

/** Collect all tag values actually used in the active project's docs, keyed by column key. */
function _collectUsedTagValues(){
  const used = {}; // { colKey: Set<string> }
  for(const d of (state?.docs || [])){
    for(const s of d.sentences){
      for(const tk of s.tokens){
        for(const col of (LABEL_COLS || [])){
          const v = tk[col.key];
          if(v && v !== "_"){
            if(!used[col.key]) used[col.key] = new Set();
            used[col.key].add(v);
          }
        }
        if(tk.deprel && tk.deprel !== "_"){
          if(!used["__deprel__"]) used["__deprel__"] = new Set();
          used["__deprel__"].add(tk.deprel);
        }
      }
    }
  }
  return used;
}

/** Render the active project's tagset content into the detail panel. */
function renderTagsetList(){
  const panel = document.getElementById("tagsetListPanel");
  if(!panel) return;

  const lbl = LABELS || {};
  const cols    = lbl["__cols__"]     || [];
  const depCols = lbl["__dep_cols__"] || [];

  // Old format fallback
  const uposArr = lbl["__upos__"] || [];
  const xposArr = lbl["__xpos__"] || [];
  const oldGroups = Object.entries(lbl).filter(([k]) => !k.startsWith("__"));

  // Collect which values are actually used in the current data
  const usedVals = _collectUsedTagValues();
  const hasData  = (state?.docs?.length || 0) > 0;

  const sections = [];

  // Label columns (__cols__ or __upos__/__xpos__)
  const labelArr = cols.length ? cols : [
    ...(uposArr.length ? [{ key:"upos", name:"UPOS",        values: uposArr }] : []),
    ...(xposArr.length ? [{ key:"xpos", name:"XPOS",        values: xposArr }] : []),
  ];
  for(const col of labelArr){
    const vals    = col.values || [];
    const colUsed = usedVals[col.key] || new Set();
    const tagHtml = vals.map(v => {
      const isUsed = hasData && colUsed.has(v);
      return `<span class="tagsetTag${isUsed ? ' tagsetTagUsed' : ''}" title="${isUsed ? t('tagset.usedTooltip') : ''}">${escapeHtml(v)}</span>`;
    }).join("");
    sections.push(`<div class="tagsetSection">
      <div class="tagsetSectionHead">${escapeHtml(col.name || col.key)} <span class="muted">(${vals.length})</span></div>
      <div class="tagsetSectionBody">${tagHtml}</div>
    </div>`);
  }

  // Dep columns (__dep_cols__ or old group format)
  const depArr = depCols.length ? depCols
    : (oldGroups.length ? [{ key:"dep", name:"DepRel", groups: Object.fromEntries(oldGroups) }] : []);
  const depUsed = usedVals["__deprel__"] || new Set();
  for(const dc of depArr){
    const groups  = dc.groups || {};
    const total   = Object.values(groups).reduce((s, a) => s + a.length, 0);
    const groupHtml = Object.entries(groups).map(([gname, tags]) =>
      `<div class="tagsetGroup">
        <span class="tagsetGroupName">${escapeHtml(gname)}</span>
        ${tags.map(v => {
          const isUsed = hasData && depUsed.has(v);
          return `<span class="tagsetTag${isUsed ? ' tagsetTagUsed' : ''}" title="${isUsed ? t('tagset.usedTooltip') : ''}">${escapeHtml(v)}</span>`;
        }).join("")}
      </div>`
    ).join("");
    sections.push(`<div class="tagsetSection tagsetSection--dep">
      <div class="tagsetSectionHead">${escapeHtml(dc.name || dc.key)} <span class="muted">(${total})</span></div>
      <div class="tagsetSectionBody">${groupHtml}</div>
    </div>`);
  }

  panel.innerHTML = sections.length
    ? sections.join("")
    : `<div class="tagsetListRow"><em class="muted">${t("tagset.noLabels")}</em></div>`;
}

// Re-render tagset list when the details panel opens (may have changed while closed).
document.getElementById("tagsetDetails")?.addEventListener("toggle", function(){
  if(this.open) renderTagsetList();
});

// ── Tagset editor ──────────────────────────────────────────────────────────────

/** Open a modal dialog for creating / editing the active tagset inline. */
function _showTagsetEditor(){
  document.getElementById('tagsetEditorDialog')?.remove();

  // Normalise legacy format (__upos__/__xpos__ + top-level groups) to extended format
  // so that existing tagsets are editable regardless of how they were loaded.
  const lbl = JSON.parse(JSON.stringify(LABELS || {}));
  if(!Array.isArray(lbl['__cols__']) && !Array.isArray(lbl['__dep_cols__'])){
    const upos = lbl['__upos__'] || [];
    const xpos = lbl['__xpos__'] || [];
    const groups = Object.fromEntries(Object.entries(lbl).filter(([k]) => !k.startsWith('__')));
    lbl['__cols__']     = [
      ...(upos.length ? [{ key:'upos', name:'UPOS', values: upos }] : []),
      ...(xpos.length ? [{ key:'xpos', name:'XPOS', values: xpos }] : []),
    ];
    lbl['__dep_cols__'] = Object.keys(groups).length
      ? [{ key:'dep', name:'DepRel', groups }] : [];
  }
  const initCols    = lbl['__cols__']     || [];
  const initDepCols = lbl['__dep_cols__'] || [];

  const overlay = document.createElement('div');
  overlay.id = 'tagsetEditorDialog';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 10px;box-sizing:border-box;';

  const dlg = document.createElement('div');
  dlg.style.cssText = 'background:var(--card);border:1px solid var(--accent);border-radius:8px;padding:24px;width:620px;max-width:100%;box-shadow:0 8px 32px rgba(0,0,0,.6);margin:auto;';

  const close = () => overlay.remove();
  overlay.addEventListener('pointerdown', e => { if(e.target === overlay) close(); });

  // ── helpers ──────────────────────────────────────────────────────────────

  const S = {
    section: 'margin-bottom:20px;',
    sectionHead: 'font-size:13px;font-weight:bold;margin-bottom:8px;color:var(--accent);',
    colBox: 'background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:10px;margin-bottom:8px;',
    row: 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;',
    label: 'font-size:12px;color:var(--muted);white-space:nowrap;',
    input: 'font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid var(--line);background:var(--card);color:var(--text);',
    ta: 'width:100%;box-sizing:border-box;font-size:12px;font-family:var(--mono);padding:6px;border-radius:4px;border:1px solid var(--line);background:var(--card);color:var(--text);overflow:hidden;resize:none;',
    taSmall: 'width:100%;box-sizing:border-box;font-size:12px;font-family:var(--mono);padding:5px;border-radius:4px;border:1px solid var(--line);background:var(--bg);color:var(--text);overflow:hidden;resize:none;',
    addBtn: 'font-size:12px;padding:4px 10px;cursor:pointer;border-radius:4px;border:1px dashed var(--line2);background:transparent;color:var(--muted);margin-top:4px;',
    removeBtn: 'font-size:14px;padding:2px 8px;cursor:pointer;border-radius:4px;border:1px solid var(--bad);background:transparent;color:var(--bad);margin-left:auto;flex-shrink:0;',
    valLabel: 'font-size:11px;color:var(--muted);margin-bottom:3px;',
  };

  function el(tag, style, text){ const e=document.createElement(tag); if(style) e.style.cssText=style; if(text!==undefined) e.textContent=text; return e; }

  function autoResize(ta){ ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; }
  function makeAutoTa(style){ const ta=el('textarea',style); ta.addEventListener('input',()=>autoResize(ta)); return ta; }

  // ── label column builder ──────────────────────────────────────────────────

  function makeLabelColEl(col){
    const wrap = el('div', S.colBox);
    const row  = el('div', S.row);

    const keyLbl  = el('span', S.label, t('tagset.colKey') + ':');
    const keyIn   = el('input', S.input + 'width:80px;'); keyIn.type='text'; keyIn.value = col.key || '';
    const nameLbl = el('span', S.label, t('tagset.colName') + ':');
    const nameIn  = el('input', S.input + 'flex:1;min-width:80px;'); nameIn.type='text'; nameIn.value = col.name || '';
    const removeBtn = el('button', S.removeBtn, '×'); removeBtn.title = t('tagset.removeCol');
    removeBtn.addEventListener('click', () => wrap.remove());

    row.append(keyLbl, keyIn, nameLbl, nameIn, removeBtn);

    const valLbl  = el('div', S.valLabel, t('tagset.values'));
    const valArea = makeAutoTa(S.ta);
    valArea.placeholder = t('tagset.valuesPlaceholder');
    valArea.value = (col.values || []).join('\n');
    requestAnimationFrame(() => autoResize(valArea));

    wrap.append(row, valLbl, valArea);
    wrap._getData = () => ({
      key:    keyIn.value.trim() || ('col' + Date.now()),
      name:   nameIn.value.trim() || keyIn.value.trim() || 'Col',
      values: valArea.value.split('\n').map(v => v.trim()).filter(Boolean),
    });
    return wrap;
  }

  // ── dep column builder ────────────────────────────────────────────────────

  function makeGroupEl(gname, tags){
    const wrap = el('div', 'background:var(--card2);border:1px solid var(--line2);border-radius:4px;padding:8px;margin-bottom:6px;');
    const row  = el('div', S.row);
    const nameIn = el('input', S.input + 'flex:1;min-width:80px;'); nameIn.type='text'; nameIn.value = gname || ''; nameIn.placeholder = t('tagset.groupName');
    const removeBtn = el('button', S.removeBtn.replace('margin-left:auto;',''), '×'); removeBtn.title = t('tagset.removeGroup');
    removeBtn.addEventListener('click', () => wrap.remove());
    row.append(nameIn, removeBtn);

    const valLbl  = el('div', S.valLabel, t('tagset.values'));
    const valArea = makeAutoTa(S.taSmall);
    valArea.placeholder = t('tagset.valuesPlaceholder');
    valArea.value = (tags || []).join('\n');
    requestAnimationFrame(() => autoResize(valArea));

    wrap.append(row, valLbl, valArea);
    wrap._getData = () => ({
      name: nameIn.value.trim(),
      tags: valArea.value.split('\n').map(v => v.trim()).filter(Boolean),
    });
    return wrap;
  }

  function makeDepColEl(dc){
    const wrap    = el('div', S.colBox);
    const headRow = el('div', S.row);

    const keyLbl    = el('span', S.label, t('tagset.colKey') + ':');
    const keyIn     = el('input', S.input + 'width:80px;'); keyIn.type='text'; keyIn.value = dc.key || '';
    const nameLbl   = el('span', S.label, t('tagset.colName') + ':');
    const nameIn    = el('input', S.input + 'flex:1;min-width:80px;'); nameIn.type='text'; nameIn.value = dc.name || '';
    const removeBtn = el('button', S.removeBtn, '×'); removeBtn.title = t('tagset.removeCol');
    removeBtn.addEventListener('click', () => wrap.remove());
    headRow.append(keyLbl, keyIn, nameLbl, nameIn, removeBtn);

    const groupsCont = el('div');
    for(const [gname, tags] of Object.entries(dc.groups || {})){
      groupsCont.appendChild(makeGroupEl(gname, tags));
    }

    const addGroupBtn = el('button', S.addBtn, t('tagset.addGroup'));
    addGroupBtn.addEventListener('click', () => groupsCont.appendChild(makeGroupEl('', [])));

    wrap.append(headRow, groupsCont, addGroupBtn);
    wrap._getData = () => {
      const groups = {};
      for(const g of groupsCont.children){
        if(!g._getData) continue;
        const d = g._getData();
        if(d.name) groups[d.name] = d.tags;
      }
      return { key: keyIn.value.trim() || ('dep' + Date.now()), name: nameIn.value.trim() || keyIn.value.trim() || 'DepRel', groups };
    };
    return wrap;
  }

  // ── assemble dialog ───────────────────────────────────────────────────────

  const title = el('div', 'font-weight:bold;font-size:15px;margin-bottom:18px;', t('tagset.editTitle'));

  // Label columns section
  const colsSec  = el('div', S.section);
  const colsHead = el('div', S.sectionHead, t('tagset.labelCols'));
  const colsCont = el('div');
  for(const col of initCols) colsCont.appendChild(makeLabelColEl(col));
  const addColBtn = el('button', S.addBtn + 'border-color:var(--accent);color:var(--accent);', t('tagset.addLabelCol'));
  addColBtn.style.marginTop = '4px';
  addColBtn.addEventListener('click', () => colsCont.appendChild(makeLabelColEl({ key:'', name:'', values:[] })));
  colsSec.append(colsHead, colsCont, addColBtn);

  // Dep columns section
  const depSec  = el('div', S.section);
  const depHead = el('div', S.sectionHead, t('tagset.depCols'));
  const depCont = el('div');
  for(const dc of initDepCols) depCont.appendChild(makeDepColEl(dc));
  const addDepBtn = el('button', S.addBtn + 'border-color:var(--accent);color:var(--accent);', t('tagset.addDepCol'));
  addDepBtn.addEventListener('click', () => depCont.appendChild(makeDepColEl({ key:'', name:'', groups:{} })));
  depSec.append(depHead, depCont, addDepBtn);

  // Footer
  const footer    = el('div', 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;border-top:1px solid var(--line);padding-top:14px;');
  const cancelBtn = el('button', 'font-size:13px;padding:5px 16px;cursor:pointer;border-radius:4px;border:1px solid var(--line);background:transparent;color:var(--muted);', t('tagset.mapCancel'));
  cancelBtn.addEventListener('click', close);
  const saveBtn = el('button', 'font-size:13px;padding:5px 16px;cursor:pointer;border-radius:4px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:bold;', t('tagset.editSave'));
  saveBtn.addEventListener('click', () => {
    const newCols    = Array.from(colsCont.children).filter(e => e._getData).map(e => e._getData());
    const newDepCols = Array.from(depCont.children).filter(e => e._getData).map(e => e._getData());

    // Validate: no empty keys
    const allKeys = [...newCols.map(c => c.key), ...newDepCols.map(c => c.key)];
    const emptyKey = newCols.some(c => !c.key) || newDepCols.some(c => !c.key);
    if(emptyKey){ _showToast(t('tagset.errEmptyKey'), 'error'); return; }

    // Validate: no duplicate keys
    const seen = new Set();
    for(const k of allKeys){
      if(seen.has(k)){ _showToast(t('tagset.errDupKey', { key: k }), 'error'); return; }
      seen.add(k);
    }

    close();
    if(newCols.length === 0 && newDepCols.length === 0){
      _showToast(t('tagset.warnEmpty'), 'info');
    }
    applyTagsetJson({ '__cols__': newCols, '__dep_cols__': newDepCols });
  });
  footer.append(cancelBtn, saveBtn);

  dlg.append(title, colsSec, depSec, footer);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);
}
