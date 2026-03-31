// Export (CoNLL-U, tree text, session JSON), session import, and localStorage autosave.

// ── Export button references ───────────────────────────────────────────────────
const exportConlluBtn    = document.getElementById("exportConlluBtn");
const exportAllConlluBtn = document.getElementById("exportAllConlluBtn");
const exportTreeBtn      = document.getElementById("exportTreeBtn");
const exportAllTreeBtn   = document.getElementById("exportAllTreeBtn");
const exportSessionBtn   = document.getElementById("exportSessionBtn");
const importSessionInput = document.getElementById("importSessionInput");
const sessionMeta        = document.getElementById("sessionMeta");

exportConlluBtn.addEventListener("click",    exportGoldConllu);
exportAllConlluBtn.addEventListener("click", exportAllProjectsConllu);
exportTreeBtn.addEventListener("click",      exportTreesTxt);
exportAllTreeBtn.addEventListener("click",   exportAllProjectsTrees);
exportSessionBtn.addEventListener("click",   exportSession);
importSessionInput.addEventListener("change", async () => {
  const files = Array.from(importSessionInput.files || []);
  if(!files.length) return;
  importSessionInput.value = "";
  await _dispatchFiles(files);
});

// Enable/disable export buttons depending on whether documents are loaded.
function updateExportButtons(){
  const ok   = state.docs.length >= 1;
  const tree = ok && state.maxSents > 0;
  exportConlluBtn.disabled    = !ok;
  exportAllConlluBtn.disabled = !ok;
  exportTreeBtn.disabled      = !tree;
  exportAllTreeBtn.disabled   = !tree;
}

// ── Download helper ────────────────────────────────────────────────────────────

// Show a brief toast notification anchored to the bottom-right corner.
// type: 'success' (green, default) | 'error' (red) | 'info' (blue)
let _toastTimer = null;
function _showToast(msg, type = 'success'){
  let toast = document.getElementById("downloadToast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "downloadToast";
    document.body.appendChild(toast);
  }
  toast.className = `downloadToast downloadToast--${type}`;
  toast.textContent = msg;
  toast.classList.remove("downloadToastVisible");
  void toast.offsetWidth;
  toast.classList.add("downloadToastVisible");
  clearTimeout(_toastTimer);
  const dur = type === 'error' ? 4000 : 2500;
  _toastTimer = setTimeout(() => toast.classList.remove("downloadToastVisible"), dur);
}

// Trigger a browser file download for arbitrary text content.
function downloadText(content, filename){
  const blob = new Blob([content], { type:"text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  _showToast(`✓ ${filename}`);
}

// ── Gold CoNLL-U core logic ────────────────────────────────────────────────────

// Build the full CoNLL-U output string for the active project using state.* directly.
// Metadata lines (comments, MWT, empty nodes) are copied verbatim from the first source doc.
function _buildConlluText(){
  const out = [];
  for(let sentIdx = 0; sentIdx < state.maxSents; sentIdx++){
    const docMaps = state.docs.map(d => {
      const s = d.sentences[sentIdx];
      const m = new Map();
      if(s) for(const t of s.tokens) m.set(t.id, t);
      return m;
    });

    const ids = new Set();
    for(const m of docMaps) for(const id of m.keys()) ids.add(id);
    const customSent = state.custom[sentIdx] || {};
    for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
    const idList = Array.from(ids).sort((a,b) => a - b);

    const goldMap = buildGoldTokenMap(sentIdx, idList, docMaps);

    // Use the first source sentence for metadata (comments, MWT, empty nodes)
    let baseSent = null;
    for(const d of state.docs){ const s = d.sentences[sentIdx]; if(s){ baseSent = s; break; } }

    // Output all comment lines verbatim (preserves # sent_id, # text, # newdoc, etc.)
    if(baseSent?.comments?.length > 0){
      for(const c of baseSent.comments) out.push(c);
    } else {
      let sentText = "";
      for(const d of state.docs){ const s = d.sentences[sentIdx]; if(s?.text){ sentText = s.text; break; } }
      if(sentText) out.push(`# text = ${sentText}`);
    }

    // Build a lookup for MWT and empty-node lines keyed by insertBefore
    const extrasByInsertBefore = new Map();
    for(const ex of baseSent?.extras || []){
      if(!extrasByInsertBefore.has(ex.insertBefore)) extrasByInsertBefore.set(ex.insertBefore, []);
      extrasByInsertBefore.get(ex.insertBefore).push(ex);
    }

    for(const id of idList){
      // MWT lines go before the first token of their range
      for(const ex of extrasByInsertBefore.get(id) || []){
        if(ex.type === "mwt") out.push(ex.raw);
      }

      let base = null;
      for(const m of docMaps){ const t = m.get(id); if(t){ base = t; break; } }
      if(!base) continue;

      const goldTok = goldMap.get(id);
      const head    = goldTok?.head   ?? null;
      const deprel  = goldTok?.deprel ?? "_";
      // Map LABEL_COLS[0] → UPOS column, LABEL_COLS[1] → XPOS column; fall back to direct fields
      const upos = (LABEL_COLS[0] ? goldTok?.[LABEL_COLS[0].key] : goldTok?.upos) ?? "_";
      const xpos = (LABEL_COLS[1] ? goldTok?.[LABEL_COLS[1].key] : goldTok?.xpos) ?? "_";
      // Extra label cols (index 2+) are serialised into MISC as key=value pairs
      let misc = base.misc || "_";
      for(let ci = 2; ci < LABEL_COLS.length; ci++){
        const col = LABEL_COLS[ci];
        const val = goldTok?.[col.key];
        if(val && val !== "_") misc = (misc === "_" ? "" : misc + "|") + `${col.key}=${val}`;
      }
      if(!misc) misc = "_";

      out.push([
        id,
        base.form   || "_",
        base.lemma  || "_",
        upos        || "_",
        xpos        || "_",
        base.feats  || "_",
        head === null ? "_" : String(head),
        deprel,
        base.deps   || "_",
        misc,
      ].join("\t"));

      // Empty nodes go after their anchor token (insertBefore = anchor + 1)
      for(const ex of extrasByInsertBefore.get(id + 1) || []){
        if(ex.type === "empty") out.push(ex.raw);
      }
    }
    out.push("");
  }
  return out.join("\n");
}

// ── Gold CoNLL-U — active project ─────────────────────────────────────────────

function exportGoldConllu(){
  if(state.docs.length < 1) return;
  const name = state.projects.length > 1
    ? `gold_${state.projects[state.activeProjectIdx].name}.conllu`
    : "gold_annotation.conllu";
  downloadText(_buildConlluText(), name);
}

// ── Gold CoNLL-U — all projects (one file each) ───────────────────────────────

function exportAllProjectsConllu(){
  if(!state.projects.length) return;
  // Freeze active project state before iterating
  _saveActiveProject();

  // Save original live state fields so they can be restored after the loop
  const origDocs     = state.docs;
  const origMaxSents = state.maxSents;
  const origCustom   = state.custom;
  const origGoldPick = state.goldPick;
  const origLABELS   = LABELS;

  try {
    for(const p of state.projects){
      if(!p.docs.length) continue;
      // Temporarily swap in this project's state (including its tagset)
      state.docs     = p.docs;
      state.maxSents = p.maxSents;
      state.custom   = p.custom;
      state.goldPick = p.goldPick;
      LABELS = p.labels || DEFAULT_LABELS || origLABELS;
      buildDeprelOptionsCache();

      downloadText(_buildConlluText(), `gold_${p.name}.conllu`);
    }
  } finally {
    // Restore original live state (no re-render needed)
    state.docs     = origDocs;
    state.maxSents = origMaxSents;
    state.custom   = origCustom;
    state.goldPick = origGoldPick;
    LABELS = origLABELS;
    buildDeprelOptionsCache();
  }
}

// ── Session Export ─────────────────────────────────────────────────────────────

function exportSession(){
  const session = _buildSessionObject();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadText(JSON.stringify(session, null, 2), `session_${ts}.json`);
  const totalDocs = session.projects.reduce((s, p) => s + p.docs.length, 0);
  _showSessionMeta(t('session.exported', { n: totalDocs, u: session.projects[session.activeProjectIdx].undo?.length || 0 }));
}

// ── Session Import ─────────────────────────────────────────────────────────────

function importSession(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch { _showToast(t('session.errJson'), 'error'); return; }

  if(data.version !== 2 || !Array.isArray(data.projects) || !data.projects.length){
    _showToast(t('session.errFormat'), 'error'); return;
  }

  state.projects = data.projects.map(p => {
    const docs = (p.docs || []).filter(d => typeof d.content === "string").map(d => {
      const parsed = parseConllu(d.content);
      return { key: `session::${d.name}`, name: d.name, content: d.content, sentences: parsed.sentences };
    });
    return {
      name:        p.name || t('project.default'),
      docs,
      custom:      JSON.parse(JSON.stringify(p.custom    || {})),
      goldPick:    JSON.parse(JSON.stringify(p.goldPick  || {})),
      confirmed:   p.confirmed || [],
      notes:       JSON.parse(JSON.stringify(p.notes     || {})),
      flags:       p.flags || {},
      currentSent: p.currentSent || 0,
      maxSents:    Math.max(0, ...docs.map(d => d.sentences.length), 0),
      hiddenCols:  p.hiddenCols  || [],
      undoStack:   p.undo  || [],
      redoStack:   p.redo  || [],
      labels:      p.labels || null,
      unlocked:    p.unlocked || false,
    };
  });
  state.activeProjectIdx = Math.min(data.activeProjectIdx || 0, state.projects.length - 1);
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
  const totalDocs = state.projects.reduce((s, p) => s + p.docs.length, 0);
  _showSessionMeta(t('session.loaded', { n: totalDocs, s: state.maxSents, u: data.projects[state.activeProjectIdx]?.undo?.length || 0 }));
  _showToast(t('session.loadedToast', { n: totalDocs }), 'success');
}

// Show a transient message in the session meta area, auto-clearing after 4 seconds.
function _showSessionMeta(msg){
  if(!sessionMeta) return;
  sessionMeta.textContent = msg;
  setTimeout(() => { sessionMeta.textContent = ""; }, 4000);
}

// ── Tree text export — core logic ──────────────────────────────────────────────

// Build a plain-text block of all trees for the active project using state.* directly.
function _buildTreeText(){
  const parts = [];
  // Helper to strip the first (sentence-text header) line from a tree string.
  const stripHeader = txt => txt.split("\n").slice(1).join("\n");

  for(let sentIdx = 0; sentIdx < state.maxSents; sentIdx++){
    const docMaps = state.docs.map(d => {
      const s = d.sentences[sentIdx];
      const m = new Map();
      if(s) for(const t of s.tokens) m.set(t.id, t);
      return m;
    });
    const ids = new Set();
    for(const m of docMaps) for(const id of m.keys()) ids.add(id);
    const customSent = state.custom[sentIdx] || {};
    for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
    const idList   = Array.from(ids).sort((a,b) => a - b);
    const goldMap  = buildGoldTokenMap(sentIdx, idList, docMaps);
    const sentText = getSentenceTextFallback(sentIdx);

    let block = `${"=".repeat(60)}\n`;
    block += `📝 S${sentIdx + 1}: ${sentText}\n\n`;
    block += t('export.treeGold') + "\n";
    const goldBody = stripHeader(renderTreePlain(sentIdx, goldMap, sentText));
    block += goldBody.trim() ? goldBody + "\n" : t('export.treeNoTree') + "\n";

    for(let i = 0; i < state.docs.length; i++){
      const diffBody = stripHeader(renderTreeDiff(sentIdx, goldMap, docMaps[i], sentText));
      if(!diffBody.trim()) continue;
      const name = state.docs[i]?.name ?? t('tree.fileDefault', { n: i+1 });
      block += "\n" + t('export.treeVsGold', { name }) + "\n";
      block += diffBody + "\n";
    }
    parts.push(block);
  }
  return parts.join("\n");
}

// ── Tree text export — active project ─────────────────────────────────────────

function exportTreesTxt(){
  if(state.docs.length < 1) return;
  const name = state.projects.length > 1
    ? `trees_${state.projects[state.activeProjectIdx].name}.txt`
    : "all_trees.txt";
  downloadText(_buildTreeText(), name);
}

// ── Tree text export — all projects (one file each) ───────────────────────────

function exportAllProjectsTrees(){
  if(!state.projects.length) return;
  _saveActiveProject();

  // Save original live state so it can be restored after the loop
  const origDocs     = state.docs;
  const origMaxSents = state.maxSents;
  const origCustom   = state.custom;
  const origGoldPick = state.goldPick;
  const origLABELS   = LABELS;

  try {
    for(const p of state.projects){
      if(!p.docs.length) continue;
      state.docs     = p.docs;
      state.maxSents = p.maxSents;
      state.custom   = p.custom;
      state.goldPick = p.goldPick;
      LABELS = p.labels || DEFAULT_LABELS || origLABELS;
      buildDeprelOptionsCache();

      downloadText(_buildTreeText(), `trees_${p.name}.txt`);
    }
  } finally {
    // Restore live state
    state.docs     = origDocs;
    state.maxSents = origMaxSents;
    state.custom   = origCustom;
    state.goldPick = origGoldPick;
    LABELS = origLABELS;
    buildDeprelOptionsCache();
  }
}

// ── LocalStorage Autosave ──────────────────────────────────────────────────────
const AUTOSAVE_KEY = "conllu_autosave";

// Build the full session object (v2 format) for export or autosave.
function _buildSessionObject(){
  // Snapshot active project before serialising
  _saveActiveProject();
  return {
    version:          2,
    savedAt:          new Date().toISOString(),
    activeProjectIdx: state.activeProjectIdx,
    projects: state.projects.map(p => ({
      name:        p.name,
      docs:        p.docs.map(d => ({ name: d.name, content: (typeof _docToConlluText === 'function' ? _docToConlluText(d) : null) || d.content || "" })),
      custom:      JSON.parse(JSON.stringify(p.custom    || {})),
      goldPick:    JSON.parse(JSON.stringify(p.goldPick  || {})),
      confirmed:   p.confirmed instanceof Set ? Array.from(p.confirmed) : (p.confirmed || []),
      notes:       JSON.parse(JSON.stringify(p.notes     || {})),
      flags:       _serializeFlags(p.flags || {}),
      currentSent: p.currentSent || 0,
      hiddenCols:  p.hiddenCols instanceof Set ? Array.from(p.hiddenCols) : (p.hiddenCols || []),
      undo:        p.undoStack || [],
      redo:        p.redoStack || [],
      labels:      p.labels ? JSON.parse(JSON.stringify(p.labels)) : null,
      unlocked:    p.unlocked || false,
    })),
  };
}

// Persist the current session to localStorage if any documents are loaded.
// Silently swallows storage-full or unavailable errors.
function _autoSave(){
  if(!state.projects.some(p => p.docs.length > 0) && state.docs.length === 0) return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(_buildSessionObject()));
  } catch { /* storage full or unavailable */ }
}

// Run autosave every 30 seconds.
setInterval(_autoSave, 30_000);
// Also save immediately before the page unloads (covers reload, tab-close, navigation).
// 'pagehide' fires on iOS/Safari where 'beforeunload' is unreliable.
window.addEventListener('pagehide',    _autoSave);
window.addEventListener('beforeunload', _autoSave);

// Auto-restore the last session silently on page load (called by main.js after init).
// Only restores if no docs are currently loaded (e.g., not after a dev-mode reload).
function _tryAutoSaveRestoreAuto(){
  if(state.docs.length > 0) return;
  let raw;
  try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch { return; }
  if(!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { return; }
  const isV2 = data?.version === 2 && Array.isArray(data.projects)
               && data.projects.some(p => Array.isArray(p.docs) && p.docs.length > 0);
  if(!isV2) return;
  try {
    importSession(raw);
    if(typeof renderConlluEditor === 'function') renderConlluEditor(true);
    if(typeof _updateSectionVisibility === 'function') _updateSectionVisibility();
  } catch(_){}
}
