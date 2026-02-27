// ---------- Export buttons ----------
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
importSessionInput.addEventListener("change", () => {
  const files = Array.from(importSessionInput.files || []);
  if(!files.length) return;
  importSessionInput.value = "";

  // If a CoNLL-U / txt file was chosen via the session input, load it as data
  const conlluFiles = files.filter(f => /\.(conllu|conll|txt)$/i.test(f.name));
  if(conlluFiles.length > 0){
    processFiles(conlluFiles);
    return;
  }
  const f = files[0];
  if(!f) return;
  const fr = new FileReader();
  fr.onload = () => importSession(fr.result);
  fr.readAsText(f, "utf-8");
});

function updateExportButtons(){
  const ok   = state.docs.length >= 1;
  const tree = ok && state.maxSents > 0;
  exportConlluBtn.disabled    = !ok;
  exportAllConlluBtn.disabled = !ok;
  exportTreeBtn.disabled      = !tree;
  exportAllTreeBtn.disabled   = !tree;
}

// ---------- Download helper ----------
function downloadText(content, filename){
  const blob = new Blob([content], { type:"text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Gold CoNLL-U Kernlogik (nutzt state.* direkt) ----------
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

    let sentText = "";
    for(const d of state.docs){
      const s = d.sentences[sentIdx];
      if(s && s.text){ sentText = s.text; break; }
    }
    if(sentText) out.push(`# text = ${sentText}`);

    for(const id of idList){
      let base = null;
      for(const m of docMaps){ const t = m.get(id); if(t){ base = t; break; } }
      if(!base) continue;

      const goldTok = goldMap.get(id);
      const head    = goldTok?.head   ?? null;
      const deprel  = goldTok?.deprel ?? "_";
      // Map LABEL_COLS[0]→UPOS, LABEL_COLS[1]→XPOS; fall back to direct .upos/.xpos
      const upos = (LABEL_COLS[0] ? goldTok?.[LABEL_COLS[0].key] : goldTok?.upos) ?? "_";
      const xpos = (LABEL_COLS[1] ? goldTok?.[LABEL_COLS[1].key] : goldTok?.xpos) ?? "_";
      // Extra label cols (index 2+) → append to MISC as key=value
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
    }
    out.push("");
  }
  return out.join("\n");
}

// ---------- Gold CoNLL-U — aktives Projekt ----------
function exportGoldConllu(){
  if(state.docs.length < 1) return;
  const name = state.projects.length > 1
    ? `gold_${state.projects[state.activeProjectIdx].name}.conllu`
    : "gold_annotation.conllu";
  downloadText(_buildConlluText(), name);
}

// ---------- Gold CoNLL-U — alle Projekte (je eine Datei) ----------
function exportAllProjectsConllu(){
  if(!state.projects.length) return;
  _saveActiveProject(); // aktiven Stand einfrieren

  // Originale state-Felder sichern
  const origDocs     = state.docs;
  const origMaxSents = state.maxSents;
  const origCustom   = state.custom;
  const origGoldPick = state.goldPick;

  for(const p of state.projects){
    if(!p.docs.length) continue;
    // Temporären State einspielen
    state.docs     = p.docs;
    state.maxSents = p.maxSents;
    state.custom   = p.custom;
    state.goldPick = p.goldPick;

    downloadText(_buildConlluText(), `gold_${p.name}.conllu`);
  }

  // State wiederherstellen (kein Re-Render nötig)
  state.docs     = origDocs;
  state.maxSents = origMaxSents;
  state.custom   = origCustom;
  state.goldPick = origGoldPick;
}

// ---------- Session Export ----------
function exportSession(){
  const session = _buildSessionObject();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadText(JSON.stringify(session, null, 2), `session_${ts}.json`);
  const totalDocs = session.projects.reduce((s, p) => s + p.docs.length, 0);
  _showSessionMeta(t('session.exported', { n: totalDocs, u: session.projects[session.activeProjectIdx].undo?.length || 0 }));
}

// ---------- Session Import ----------
function importSession(jsonText){
  let data;
  try { data = JSON.parse(jsonText); }
  catch { alert(t('session.errJson')); return; }

  // Labels wiederherstellen (vor buildDeprelOptionsCache)
  if(data.labels && typeof data.labels === "object"){
    LABELS = data.labels;
    buildDeprelOptionsCache();
  }

  // ── v2: multi-project format ──────────────────────────────────────────────
  if(data.version === 2 && Array.isArray(data.projects) && data.projects.length){
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
    return;
  }

  // ── v1: backward-compat single-project ───────────────────────────────────
  if(data.version !== 1 || !Array.isArray(data.docs)){
    alert(t('session.errFormat')); return;
  }
  if(!data.docs.length){
    alert(t('session.errNoDocs')); return;
  }

  const docs = [];
  for(const d of data.docs){
    if(typeof d.content !== "string") continue;
    const parsed = parseConllu(d.content);
    docs.push({ key: `session::${d.name}`, name: d.name, content: d.content, sentences: parsed.sentences });
  }
  const maxSents = Math.max(0, ...docs.map(d => d.sentences.length), 0);
  const currentSent = Math.min(data.currentSent || 0, Math.max(0, maxSents - 1));

  state.projects = [{
    name:        `${t('project.default')} 1`,
    docs,
    custom:      JSON.parse(JSON.stringify(data.custom    || {})),
    goldPick:    JSON.parse(JSON.stringify(data.goldPick  || {})),
    confirmed:   data.confirmed || [],
    notes:       JSON.parse(JSON.stringify(data.notes     || {})),
    flags:       {},
    currentSent,
    maxSents,
    hiddenCols:  [],
    undoStack:   data.undo || [],
    redoStack:   data.redo || [],
  }];
  state.activeProjectIdx = 0;
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
  _showSessionMeta(t('session.loaded', { n: docs.length, s: maxSents, u: data.undo?.length || 0 }));
}

function _showSessionMeta(msg){
  if(!sessionMeta) return;
  sessionMeta.textContent = msg;
  setTimeout(() => { sessionMeta.textContent = ""; }, 4000);
}

// ---------- Baumansicht Kernlogik (nutzt state.* direkt) ----------
function _buildTreeText(){
  const parts = [];
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

// ---------- Baumansicht — aktives Projekt ----------
function exportTreesTxt(){
  if(state.docs.length < 1) return;
  const name = state.projects.length > 1
    ? `baeume_${state.projects[state.activeProjectIdx].name}.txt`
    : "alle_baeume.txt";
  downloadText(_buildTreeText(), name);
}

// ---------- Baumansicht — alle Projekte (je eine Datei) ----------
function exportAllProjectsTrees(){
  if(!state.projects.length) return;
  _saveActiveProject();

  const origDocs     = state.docs;
  const origMaxSents = state.maxSents;
  const origCustom   = state.custom;
  const origGoldPick = state.goldPick;

  for(const p of state.projects){
    if(!p.docs.length) continue;
    state.docs     = p.docs;
    state.maxSents = p.maxSents;
    state.custom   = p.custom;
    state.goldPick = p.goldPick;

    downloadText(_buildTreeText(), `baeume_${p.name}.txt`);
  }

  state.docs     = origDocs;
  state.maxSents = origMaxSents;
  state.custom   = origCustom;
  state.goldPick = origGoldPick;
}

// ---------- LocalStorage Autosave ----------
const AUTOSAVE_KEY = "conllu_autosave";

function _buildSessionObject(){
  // Snapshot active project before serialising
  _saveActiveProject();
  return {
    version:          2,
    savedAt:          new Date().toISOString(),
    activeProjectIdx: state.activeProjectIdx,
    projects: state.projects.map(p => ({
      name:        p.name,
      docs:        p.docs.map(d => ({ name: d.name, content: d.content || "" })),
      custom:      JSON.parse(JSON.stringify(p.custom    || {})),
      goldPick:    JSON.parse(JSON.stringify(p.goldPick  || {})),
      confirmed:   p.confirmed instanceof Set ? Array.from(p.confirmed) : (p.confirmed || []),
      notes:       JSON.parse(JSON.stringify(p.notes     || {})),
      flags:       _serializeFlags(p.flags || {}),
      currentSent: p.currentSent || 0,
      hiddenCols:  p.hiddenCols instanceof Set ? Array.from(p.hiddenCols) : (p.hiddenCols || []),
      undo:        p.undoStack || [],
      redo:        p.redoStack || [],
    })),
    labels: JSON.parse(JSON.stringify(LABELS)),
  };
}

function _autoSave(){
  if(!state.projects.some(p => p.docs.length > 0) && state.docs.length === 0) return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(_buildSessionObject()));
  } catch { /* storage full or unavailable */ }
}

setInterval(_autoSave, 30_000);

function _tryAutoSaveRestore(){
  let raw;
  try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch { return; }
  if(!raw) return;

  let data;
  try { data = JSON.parse(raw); } catch { return; }
  if(!data || data.version !== 1 || !Array.isArray(data.docs) || !data.docs.length) return;

  // Format the saved date for display
  let dateStr = data.savedAt || "";
  try {
    dateStr = new Date(dateStr).toLocaleString();
  } catch { /* keep raw */ }

  const banner = document.getElementById("autosaveBanner");
  if(!banner) return;

  banner.innerHTML = "";
  const msg = document.createElement("span");
  msg.textContent = t("autosave.found", { date: dateStr }) + " ";

  const restoreBtn = document.createElement("button");
  restoreBtn.textContent = t("autosave.restore");
  restoreBtn.addEventListener("click", () => {
    importSession(raw);
    banner.style.display = "none";
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.textContent = t("autosave.dismiss");
  dismissBtn.addEventListener("click", () => {
    banner.style.display = "none";
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
  });

  banner.appendChild(msg);
  banner.appendChild(restoreBtn);
  banner.appendChild(dismissBtn);
  banner.style.display = "";
}

// Scripts are loaded at end of body, so DOM is ready — call directly
_tryAutoSaveRestore();
