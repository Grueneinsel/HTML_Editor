// ---------- DOM ----------
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

const customInitBtns  = document.getElementById("customInitBtns");
const customClearBtn  = document.getElementById("customClearBtn");
const confirmBtn      = document.getElementById("confirmBtn");
const copyConlluBtn   = document.getElementById("copyConlluBtn");
const progressMeta    = document.getElementById("progressMeta");
const dropOverlay     = document.getElementById("dropOverlay");
const textWarn        = document.getElementById("textWarn");
const sentMap         = document.getElementById("sentMap");
const sentNoteRow     = document.getElementById("sentNoteRow");
const sentNote        = document.getElementById("sentNote");

const globalResetBtn    = document.getElementById("globalResetBtn");
const tagsetInput       = document.getElementById("tagsetInput");
const tagsetDownloadBtn = document.getElementById("tagsetDownloadBtn");
const tagsetMeta        = document.getElementById("tagsetMeta");

// ---------- Events ----------
fileInput.addEventListener("change", onFilesChosen);
resetBtn.addEventListener("click", resetProject);
if(globalResetBtn) globalResetBtn.addEventListener("click", resetAll);

// ── Smart file dispatch (shared by all upload paths + drag & drop) ────────────

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
  // Persist tagset in the active project (not globally)
  const p = state.projects[state.activeProjectIdx];
  if(p) p.labels = JSON.parse(JSON.stringify(LABELS));
  renderSentence();
  const deprelCount = Object.keys(LABELS)
    .filter(k => !k.startsWith("__"))
    .reduce((s, k) => s + (LABELS[k]?.length || 0), 0);
  if(tagsetMeta) tagsetMeta.textContent = t("tagset.loaded", {
    deprel: deprelCount,
    upos: (LABELS["__upos__"] || []).length,
    xpos: (LABELS["__xpos__"] || []).length,
  });
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

// ── Tagset upload ─────────────────────────────────────────────────────────────
if(tagsetInput){
  tagsetInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if(!files.length) return;
    await _dispatchFiles(files);
  });
}

// ── Tagset download ───────────────────────────────────────────────────────────
if(tagsetDownloadBtn){
  tagsetDownloadBtn.addEventListener("click", () => {
    const json = JSON.stringify(LABELS, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tagset.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

if(sentNote){
  sentNote.addEventListener("input", () => {
    const val = sentNote.value;
    if(val.trim()) state.notes[state.currentSent] = val;
    else           delete state.notes[state.currentSent];
  });
}

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

customClearBtn.addEventListener("click", clearCustomForSentence);
confirmBtn.addEventListener("click", toggleConfirm);
if(copyConlluBtn) copyConlluBtn.addEventListener("click", copySentenceConllu);

// Klick auf Token im Satztext → Tabellenzeile fokussieren + scrollen
sentText.addEventListener("click", (e) => {
  const span = e.target.closest(".sentToken");
  if(!span) return;
  const tokId = parseInt(span.dataset.id, 10);
  setKeyFocus(tokId);
  cmpTable.closest(".card")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
  pushUndo();
  setDocChoice(state.currentSent, tokId, docIdx);
  renderSentence();
});

// ---------- Text compatibility check ----------
function getWarnedDocIndices(){
  const warned = new Set();
  if(state.docs.length < 2) return warned;
  const ref = state.docs[0];
  for(let d = 1; d < state.docs.length; d++){
    const other = state.docs[d];
    if(ref.sentences.length !== other.sentences.length){ warned.add(d); continue; }
    for(let s = 0; s < ref.sentences.length; s++){
      const formsA = ref.sentences[s].tokens.map(tk => tk.form).join(" ");
      const formsB = other.sentences[s].tokens.map(tk => tk.form).join(" ");
      if(formsA !== formsB){ warned.add(d); break; }
    }
  }
  return warned;
}

// ---------- UI: Files ----------
function renderFiles(){
  fileList.innerHTML = "";
  fileMeta.textContent = state.docs.length
    ? t('files.loaded', { n: state.docs.length })
    : t('files.none');
  if(state.docs.length === 0){
    fileList.innerHTML = `<div class="muted small">${escapeHtml(t('files.drop'))}</div>`;
    const demoBtn = document.createElement("button");
    demoBtn.textContent = t('files.demo');
    demoBtn.style.marginTop = "8px";
    demoBtn.addEventListener("click", loadExamples);
    fileList.appendChild(demoBtn);
    return;
  }
  const warnedIndices = getWarnedDocIndices();
  state.docs.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "fileItem";

    // Info column
    const left = document.createElement("div");
    left.className = "left";
    const nameDiv = document.createElement("div");
    nameDiv.className = "name";
    nameDiv.textContent = d.name;
    if(warnedIndices.has(idx)){
      const badge = document.createElement("span");
      badge.className = "fileWarnIcon";
      badge.title = t('files.warnBadge');
      badge.textContent = "⚠️";
      nameDiv.appendChild(badge);
    }
    const metaDiv = document.createElement("div");
    metaDiv.className = "meta";
    metaDiv.textContent = t('files.sentences', { n: d.sentences.length });
    left.appendChild(nameDiv);
    left.appendChild(metaDiv);
    div.appendChild(left);

    // Actions column
    const actions = document.createElement("div");
    actions.className = "fileActions";

    // Download button
    const dlBtn = document.createElement("button");
    dlBtn.title = t('files.download');
    dlBtn.textContent = "⬇";
    dlBtn.addEventListener("click", () => downloadText(d.content || "", d.name));
    actions.appendChild(dlBtn);

    // Move-to-project select (always shown so new project can be created)
    {
      const sel = document.createElement("select");
      sel.className = "moveToProjectSel";
      sel.title = t('files.moveToProject');
      state.projects.forEach((p, pi) => {
        const opt = document.createElement("option");
        opt.value = pi;
        opt.textContent = p.name;
        if(pi === state.activeProjectIdx) opt.selected = true;
        sel.appendChild(opt);
      });
      // "New project…" sentinel option
      const newOpt = document.createElement("option");
      newOpt.value = "__new__";
      newOpt.textContent = t('files.moveToNewProject');
      sel.appendChild(newOpt);

      sel.addEventListener("change", () => {
        if(sel.value === "__new__"){
          const name = prompt(t('project.namePrompt'),
            `${t('project.default')} ${state.projects.length + 1}`);
          if(!name){ sel.value = String(state.activeProjectIdx); return; }
          // Push new project WITHOUT switching — active project stays the source
          const newIdx = state.projects.length;
          _saveActiveProject();
          state.projects.push(_emptyProject(name));
          // Now move the doc; moveDocToProject handles all re-renders
          moveDocToProject(idx, newIdx);
        } else {
          moveDocToProject(idx, parseInt(sel.value, 10));
        }
      });
      actions.appendChild(sel);
    }

    // Move up / down
    const upBtn = document.createElement("button");
    upBtn.className = "moveUpBtn";
    upBtn.title = t('files.moveUp');
    upBtn.textContent = "▲";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => moveDoc(idx, -1));
    actions.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "moveDownBtn";
    downBtn.title = t('files.moveDown');
    downBtn.textContent = "▼";
    downBtn.disabled = idx === state.docs.length - 1;
    downBtn.addEventListener("click", () => moveDoc(idx, +1));
    actions.appendChild(downBtn);

    // Delete
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = t('files.delete');
    delBtn.addEventListener("click", () => removeDoc(idx));
    actions.appendChild(delBtn);

    div.appendChild(actions);
    fileList.appendChild(div);
  });

  textWarn.innerHTML = warnedIndices.size > 0
    ? `<div class="textWarnBanner">${escapeHtml(t('files.warnBanner'))}</div>`
    : "";
}

// ---------- Drag & Drop (ganze Seite) ----------
let dragCounter = 0;

document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.add("active");
});
document.addEventListener("dragover", (e) => {
  e.preventDefault();
});
document.addEventListener("dragleave", () => {
  dragCounter--;
  if(dragCounter <= 0){ dragCounter = 0; dropOverlay.classList.remove("active"); }
});
document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("active");
  const allFiles = Array.from(e.dataTransfer.files);
  _dispatchFiles(allFiles);
});

// ---------- UI: Sentence selector ----------
function renderSentSelect(){
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  sentSelect.disabled = !ok;
  prevBtn.disabled = !ok;
  nextBtn.disabled = !ok;
  customInitBtns.innerHTML = "";
  if(ok){
    state.docs.forEach((d, idx) => {
      const btn = document.createElement("button");
      btn.textContent = t('custom.initBtn', { name: d.name });
      btn.addEventListener("click", () => initCustomFromDoc(idx));
      customInitBtns.appendChild(btn);
    });
  }
  customClearBtn.disabled = !ok;
  confirmBtn.disabled = !ok;
  if(copyConlluBtn) copyConlluBtn.disabled = !ok;
  sentSelect.innerHTML = "";
  if(!ok){ sentStats.textContent = ""; if(progressMeta) progressMeta.textContent = ""; return; }
  renderSentSelectOptions();
  updateExportButtons();
}

// Berechnet Stats für einen Satz (wiederverwendbar)
function _sentStats(i){
  const docMaps = state.docs.map(d => {
    const s = d.sentences[i];
    const m = new Map();
    if(s) for(const tk of s.tokens) m.set(tk.id, tk);
    return m;
  });
  const ids = new Set();
  for(const m of docMaps) for(const id of m.keys()) ids.add(id);
  const customSent = state.custom[i] || {};
  for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
  const idList = Array.from(ids).sort((a,b) => a - b);
  const goldMap = buildGoldTokenMap(i, idList, docMaps);
  return computeStats(i, idList, docMaps, goldMap);
}

function toggleConfirm(){
  if(state.docs.length < 2) return;
  pushUndo();
  const i = state.currentSent;
  if(state.confirmed.has(i)) state.confirmed.delete(i);
  else state.confirmed.add(i);
  updateConfirmBtn();
  renderSentSelectOptions();
}

function updateConfirmBtn(){
  if(!confirmBtn) return;
  const isConfirmed = state.confirmed.has(state.currentSent);
  confirmBtn.textContent  = isConfirmed ? t('sent.confirmed') : t('sent.confirm');
  confirmBtn.classList.toggle("confirmBtnActive", isConfirmed);
}

function renderSentSelectOptions(){
  if(state.docs.length < 2 || state.maxSents === 0) return;
  sentSelect.innerHTML = "";
  for(let i=0;i<state.maxSents;i++){
    const stats = _sentStats(i);
    const hasDiff   = stats.diffCount > 0;
    const confirmed = state.confirmed.has(i);
    const hasFlags  = state.flags[i]?.size > 0;
    const opt = document.createElement("option");
    opt.value = String(i);
    const diffPart = hasDiff
      ? ` ${t(stats.diffCount !== 1 ? 'sent.optDiffs' : 'sent.optDiff', { n: stats.diffCount })}`
      : ` ${t('sent.optOk')}`;
    const flagPart = hasFlags ? t('flag.sentOpt') : '';
    opt.textContent = `${t('sent.optLabel', { n: i+1 })}${confirmed ? ' ★' : ''}${flagPart}  (${stats.totalTokens} Tok${diffPart})`;
    if(confirmed && hasFlags){
      opt.style.background = '#1a0c00';
      opt.style.color = '#ffcc44';   // gold + slight warm tint to show both
    } else if(confirmed){
      opt.style.background = '#1a1000';
      opt.style.color = '#ffb347';   // gold
    } else if(hasFlags){
      opt.style.background = '#1c0e00';
      opt.style.color = '#ff9100';   // orange — clearly distinct from gold and red/green
    } else {
      opt.style.background = hasDiff ? '#1f0b0b' : '#091a10';
      opt.style.color = hasDiff ? '#ff9090' : '#6fe8a8';
    }
    sentSelect.appendChild(opt);
  }
  sentSelect.value = String(state.currentSent);

  // Rahmenfarbe des Selects nach aktuellem Satz
  const curConfirmed = state.confirmed.has(state.currentSent);
  const curFlagged   = state.flags[state.currentSent]?.size > 0;
  const curStats = _sentStats(state.currentSent);
  sentSelect.style.borderColor = curConfirmed ? '#ff9f43'
    : curFlagged              ? '#ff9100'
    : curStats.diffCount > 0  ? '#ff5f5f'
    : '#3de89a';

  updateConfirmBtn();
  renderSentMap();
  _updateProgressMeta();
}

function _updateProgressMeta(){
  if(!progressMeta) return;
  if(state.docs.length < 2 || state.maxSents === 0){ progressMeta.textContent = ""; return; }
  progressMeta.textContent = t('sent.progress', {
    done:  state.confirmed.size,
    total: state.maxSents,
  });
}

function _updateSentNote(){
  if(!sentNote || !sentNoteRow) return;
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  sentNoteRow.style.display = ok ? "" : "none";
  if(ok){
    sentNote.value = state.notes[state.currentSent] ?? "";
    sentNote.placeholder = t('note.placeholder');
  }
}

function renderSentMap(){
  if(!sentMap) return;
  if(state.docs.length < 2 || state.maxSents === 0){ sentMap.innerHTML = ""; return; }
  sentMap.innerHTML = "";
  for(let i=0;i<state.maxSents;i++){
    const stats = _sentStats(i);
    const hasDiff   = stats.diffCount > 0;
    const confirmed = state.confirmed.has(i);
    const hasFlags  = state.flags[i]?.size > 0;
    const isCurrent = i === state.currentSent;
    const dot = document.createElement("button");
    let cls = "sentDot ";
    if(confirmed)    cls += "sentDotConfirmed";
    else if(hasDiff) cls += "sentDotDiff";
    else             cls += "sentDotOk";
    if(isCurrent)    cls += " sentDotCurrent";
    if(hasFlags)     cls += " sentDotFlagged";
    dot.className = cls;
    dot.title = t(confirmed ? 'sent.dotTitleConf' : (hasFlags ? 'flag.sentDot' : 'sent.dotTitle'), {
      n: i + 1, toks: stats.totalTokens, diffs: stats.diffCount
    });
    // Accessibility: symbol inside dot conveys state independently of color
    if     (confirmed && hasFlags)        dot.textContent = "★!";
    else if(confirmed)                    dot.textContent = "★";
    else if(hasFlags   && hasDiff)        dot.textContent = "×!";
    else if(hasFlags)                     dot.textContent = "!";
    else if(!hasDiff)                     dot.textContent = "✓";
    else                                  dot.textContent = "×";
    dot.addEventListener("click", () => {
      state.currentSent = i;
      renderSentence();
    });
    sentMap.appendChild(dot);
  }
}

// ---------- Flags ----------
function toggleFlag(sentIdx, tokId){
  if(!state.flags[sentIdx]) state.flags[sentIdx] = new Set();
  const s = state.flags[sentIdx];
  if(s.has(tokId)){
    s.delete(tokId);
    if(s.size === 0) delete state.flags[sentIdx];
  } else {
    s.add(tokId);
  }
  // Update row and button in-place (no full re-render needed)
  const tr  = cmpTable.querySelector(`tr[data-id="${tokId}"]`);
  const btn = tr?.querySelector(".flagBtn");
  const isFlagged = !!state.flags[sentIdx]?.has(tokId);
  if(btn)  btn.classList.toggle("flagBtnActive", isFlagged);
  if(tr)   tr.classList.toggle("rowFlagged", isFlagged);
  // Reflect in sentMap and sentSelect
  renderSentMap();
  renderSentSelectOptions();
}

// ---------- UI: Column toggle ----------
function renderColToggleBar(){
  colToggleBar.innerHTML = "";
  if(state.docs.length < 2){ return; }
  const label = document.createElement("span");
  label.className = "muted small";
  label.textContent = t('cols.label');
  colToggleBar.appendChild(label);

  state.docs.forEach((d, idx) => {
    const btn = document.createElement("button");
    btn.className = "colToggle" + (state.hiddenCols.has(idx) ? " colHidden" : " colVisible");
    btn.textContent = d.name;
    btn.addEventListener("click", () => {
      if(state.hiddenCols.has(idx)) state.hiddenCols.delete(idx);
      else state.hiddenCols.add(idx);
      renderColToggleBar();
      renderCompareTable();
    });
    colToggleBar.appendChild(btn);
  });
}

// ---------- Custom ----------
function initCustomFromDoc(docIdx){
  const s = state.docs[docIdx]?.sentences?.[state.currentSent];
  if(!s) return;
  pushUndo();
  const sent = ensureCustomSent(state.currentSent);
  for(const tk of s.tokens){
    sent[tk.id] = { head: tk.head ?? null, deprel: tk.deprel ?? null, upos: tk.upos ?? null, xpos: tk.xpos ?? null };
  }
  renderSentence();
}

function clearCustomForSentence(){
  if(!confirm(t('sent.clearConfirm'))) return;
  pushUndo();
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
    _updateSentNote();
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));

  const s0 = state.docs[0].sentences[state.currentSent];
  if(s0){
    sentText.innerHTML = s0.tokens
      .map(tk => `<span class="sentToken" data-id="${tk.id}">${escapeHtml(tk.form)}</span>`)
      .join(' ');
  } else {
    sentText.textContent = t('sent.missing');
  }
  sentMeta.textContent = t('sent.label', { cur: state.currentSent + 1, max: state.maxSents });
  sentText.classList.toggle("sentTextConfirmed", state.confirmed.has(state.currentSent));

  renderColToggleBar();
  renderCompareTable();
  renderSentSelectOptions();
  renderPreview();
  _updateSentNote();
}

// ---------- Clipboard copy ----------
function copySentenceConllu(){
  if(state.docs.length < 1 || state.maxSents === 0) return;
  const sentIdx = state.currentSent;
  const docMaps = state.docs.map(d => {
    const s = d.sentences[sentIdx];
    const m = new Map();
    if(s) for(const tk of s.tokens) m.set(tk.id, tk);
    return m;
  });
  const ids = new Set();
  for(const m of docMaps) for(const id of m.keys()) ids.add(id);
  const customSent = state.custom[sentIdx] || {};
  for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
  const idList = Array.from(ids).sort((a,b) => a - b);
  const goldMap = buildGoldTokenMap(sentIdx, idList, docMaps);

  const lines = [];
  let sentTextStr = "";
  for(const d of state.docs){
    const s = d.sentences[sentIdx];
    if(s && s.text){ sentTextStr = s.text; break; }
  }
  if(sentTextStr) lines.push(`# text = ${sentTextStr}`);

  for(const id of idList){
    let base = null;
    for(const m of docMaps){ const tk = m.get(id); if(tk){ base = tk; break; } }
    if(!base) continue;
    const goldTok = goldMap.get(id);
    const head   = goldTok?.head   ?? null;
    const deprel = goldTok?.deprel ?? "_";
    const upos   = goldTok?.upos   ?? "_";
    const xpos   = goldTok?.xpos   ?? "_";
    lines.push([
      id, base.form || "_", base.lemma || "_",
      upos || "_", xpos || "_", base.feats || "_",
      head === null ? "_" : String(head), deprel,
      base.deps || "_", base.misc || "_",
    ].join("\t"));
  }

  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    if(!copyConlluBtn) return;
    const orig = copyConlluBtn.textContent;
    copyConlluBtn.textContent = t('copy.done');
    setTimeout(() => { if(copyConlluBtn) copyConlluBtn.textContent = t('copy.btn'); }, 1500);
  }).catch(() => {});
}

// ---------- Demo ----------
async function loadExamples(){
  const files = EXAMPLES.map(e => new File([e.content], e.name, { type: "text/plain" }));
  await processFiles(files);
}

// ---------- Init ----------
buildDeprelOptionsCache();
DEFAULT_LABELS = JSON.parse(JSON.stringify(LABELS)); // snapshot before any project overrides
initProjects();
renderFiles();
renderSentSelect();
renderSentence();
