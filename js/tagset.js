// Smart file dispatch (shared by all upload paths and drag & drop) + tagset management.

/** Returns true if parsed JSON looks like a saved session. */
function _isSessionJson(data){
  if(!data || typeof data !== "object" || Array.isArray(data)) return false;
  return (data.version === 1 || data.version === 2) &&
         (Array.isArray(data.docs) || Array.isArray(data.projects));
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
