// Smart file dispatch (shared by all upload paths and drag & drop) + tagset management.

/** Returns true if parsed JSON looks like a saved session. */
function _isSessionJson(data){
  if(!data || typeof data !== "object" || Array.isArray(data)) return false;
  return data.version === 2 && Array.isArray(data.projects);
}

/** Apply a parsed tagset object (LABELS) to the active project only. */
function applyTagsetJson(data){
  if(typeof data !== "object" || Array.isArray(data) || !data){
    alert(t("tagset.errFormat")); return;
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

/**
 * Smart dispatch for a JSON text string:
 *  - Session JSON  → importSession()
 *  - Everything else → applyTagsetJson()
 */
function _smartDispatchJson(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch { alert(t("tagset.errJson")); return; }
  if(_isSessionJson(data)) importSession(jsonText);
  else                     applyTagsetJson(data);
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

  const sections = [];

  // Label columns (__cols__ or __upos__/__xpos__)
  const labelArr = cols.length ? cols : [
    ...(uposArr.length ? [{ key:"upos", name:"UPOS",        values: uposArr }] : []),
    ...(xposArr.length ? [{ key:"xpos", name:"XPOS",        values: xposArr }] : []),
  ];
  for(const col of labelArr){
    const vals = col.values || [];
    sections.push(`<div class="tagsetSection">
      <div class="tagsetSectionHead">${escapeHtml(col.name || col.key)} <span class="muted">(${vals.length})</span></div>
      <div class="tagsetSectionBody">${vals.map(v => `<span class="tagsetTag">${escapeHtml(v)}</span>`).join("")}</div>
    </div>`);
  }

  // Dep columns (__dep_cols__ or old group format)
  const depArr = depCols.length ? depCols
    : (oldGroups.length ? [{ key:"dep", name:"DepRel", groups: Object.fromEntries(oldGroups) }] : []);
  for(const dc of depArr){
    const groups  = dc.groups || {};
    const total   = Object.values(groups).reduce((s, a) => s + a.length, 0);
    const groupHtml = Object.entries(groups).map(([gname, tags]) =>
      `<div class="tagsetGroup">
        <span class="tagsetGroupName">${escapeHtml(gname)}</span>
        ${tags.map(v => `<span class="tagsetTag">${escapeHtml(v)}</span>`).join("")}
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
