// Application entry point: DOM references, event wiring, UI rendering, and initialisation.

// ── DOM references ─────────────────────────────────────────────────────────────
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

const ttsBtn        = document.getElementById("ttsBtn");
const autoAdvanceCb = document.getElementById("autoAdvanceCb");
const confirmAllBtn = document.getElementById("confirmAllBtn");
const flagDiffsBtn  = document.getElementById("flagDiffsBtn");
const unflagAllBtn  = document.getElementById("unflagAllBtn");

// ── Events ─────────────────────────────────────────────────────────────────────
fileInput.addEventListener("change", onFilesChosen);
resetBtn.addEventListener("click", resetProject);
if(globalResetBtn) globalResetBtn.addEventListener("click", resetAll);

// ── Smart file dispatch (shared by all upload paths and drag & drop) ───────────

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
if(tagsetInput){
  tagsetInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if(!files.length) return;
    await _dispatchFiles(files);
  });
}

// ── Tagset download ────────────────────────────────────────────────────────────
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

// Persist the note for the current sentence as the user types.
if(sentNote){
  sentNote.addEventListener("input", () => {
    const val = sentNote.value;
    if(val.trim()) state.notes[state.currentSent] = val;
    else           delete state.notes[state.currentSent];
  });
}

sentSelect.addEventListener("change", () => {
  state.currentSent = parseInt(sentSelect.value, 10) || 0;
  _sentEditOpen = false;
  renderSentence();
});
prevBtn.addEventListener("click", () => {
  state.currentSent = Math.max(0, state.currentSent - 1);
  _sentEditOpen = false;
  renderSentence();
});
nextBtn.addEventListener("click", () => {
  state.currentSent = Math.min(state.maxSents - 1, state.currentSent + 1);
  _sentEditOpen = false;
  renderSentence();
});

customClearBtn.addEventListener("click", clearCustomForSentence);
confirmBtn.addEventListener("click", toggleConfirm);
if(copyConlluBtn) copyConlluBtn.addEventListener("click", copySentenceConllu);

// Click on a token span in the sentence text → focus and scroll to its table row.
// In unlocked mode handle insert/delete buttons; skip focus/scroll for inputs.
sentText.addEventListener("click", (e) => {
  // Insert button: add a new blank token before the given ID (0 = append)
  const insBtn = e.target.closest(".sentInsertBtn");
  if(insBtn){ _insertToken(parseInt(insBtn.dataset.before, 10)); return; }

  // Delete button: remove the token with the given ID
  const delBtn = e.target.closest(".sentDeleteBtn");
  if(delBtn){ _deleteToken(parseInt(delBtn.dataset.id, 10)); return; }

  if(e.target.tagName === "INPUT") return;
  const span = e.target.closest(".sentToken");
  if(!span) return;
  const tokId = parseInt(span.dataset.id, 10);
  setKeyFocus(tokId);
  cmpTable.closest(".card")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
});

// Auto-resize token form input as the user types.
sentText.addEventListener("input", (e) => {
  const inp = e.target.closest(".sentFormInput");
  if(!inp) return;
  inp.size = Math.max(1, inp.value.length || 1);
});

// On blur (change): write the new form into ALL docs for the current sentence.
sentText.addEventListener("change", (e) => {
  const inp = e.target.closest(".sentFormInput");
  if(!inp || !state.unlocked) return;
  const tokId  = parseInt(inp.dataset.id, 10);
  const newForm = inp.value;
  pushUndo();
  for(const d of state.docs){
    const s = d.sentences[state.currentSent];
    if(!s) continue;
    const tok = s.tokens.find(t => t.id === tokId);
    if(tok) tok.form = newForm;
  }
});

// Click on a file cell in the comparison table → choose that doc as gold for the token.
cmpTable.addEventListener("click", (e) => {
  const td = e.target.closest?.("td[data-col^='doc']");
  if(!td) return;
  const tr = td.closest("tr[data-id]");
  if(!tr) return;
  const tokId = parseInt(tr.dataset.id, 10);
  const docIdx = parseInt(td.dataset.docIdx, 10);
  // Ignore clicks when a custom override is active — the cell is visually disabled
  if(getCustomEntry(state.currentSent, tokId)) return;
  pushUndo();
  setDocChoice(state.currentSent, tokId, docIdx);
  renderSentence();
});

// ── Text compatibility check ───────────────────────────────────────────────────

// Return the set of document indices whose token forms differ from the first document.
// Used to flag mismatched files in the file list.
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

// ── UI: Files ──────────────────────────────────────────────────────────────────

// Re-render the file list panel for the current project.
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
    const wrapper = document.createElement("div");
    wrapper.className = "fileItemWrapper";

    const div = document.createElement("div");
    div.className = "fileItem";

    // Left column: file name and sentence count
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

    // Right column: action buttons
    const actions = document.createElement("div");
    actions.className = "fileActions";

    // Download source file button
    const dlBtn = document.createElement("button");
    dlBtn.title = t('files.download');
    dlBtn.textContent = "⬇ Download";
    dlBtn.addEventListener("click", () => downloadText(d.content || "", d.name));
    actions.appendChild(dlBtn);

    // Move-to-project select (always shown so a new project can be created inline)
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
      // Sentinel option that triggers new-project creation
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
          // moveDocToProject handles all re-renders
          moveDocToProject(idx, newIdx);
        } else {
          moveDocToProject(idx, parseInt(sel.value, 10));
        }
      });
      actions.appendChild(sel);
    }

    // Move up button
    const upBtn = document.createElement("button");
    upBtn.className = "moveUpBtn";
    upBtn.title = t('files.moveUp');
    upBtn.textContent = "▲";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => moveDoc(idx, -1));
    actions.appendChild(upBtn);

    // Move down button
    const downBtn = document.createElement("button");
    downBtn.className = "moveDownBtn";
    downBtn.title = t('files.moveDown');
    downBtn.textContent = "▼";
    downBtn.disabled = idx === state.docs.length - 1;
    downBtn.addEventListener("click", () => moveDoc(idx, +1));
    actions.appendChild(downBtn);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = t('files.delete');
    delBtn.addEventListener("click", () => removeDoc(idx));
    actions.appendChild(delBtn);

    div.appendChild(actions);
    wrapper.appendChild(div);
    fileList.appendChild(wrapper);
  });

  renderProjectLock();

  textWarn.innerHTML = warnedIndices.size > 0
    ? `<div class="textWarnBanner">${escapeHtml(t('files.warnBanner'))}</div>`
    : "";
}

// ── Drag & Drop (entire page) ──────────────────────────────────────────────────

// Counter tracks nested dragenter/dragleave events so the overlay is only
// hidden when the drag actually leaves the page (not when moving over child elements).
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

// ── UI: Sentence selector ──────────────────────────────────────────────────────

// Rebuild the sentence navigation controls and "init custom from doc" buttons.
function renderSentSelect(){
  const ok = state.docs.length >= 1 && state.maxSents > 0;
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
  if(!ok){ sentStats.textContent = ""; if(progressMeta) progressMeta.textContent = ""; renderSentManage(); return; }
  renderSentSelectOptions();
  updateExportButtons();
}

// Compute diff/token statistics for a sentence index (reusable across renders).
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

// Toggle the confirmed state for the current sentence.
// When confirming (not unconfirming) and auto-advance is on, jump to the next
// unconfirmed sentence automatically.
function toggleConfirm(){
  if(state.docs.length < 1) return;
  pushUndo();
  const i = state.currentSent;
  const wasConfirmed = state.confirmed.has(i);
  if(wasConfirmed){
    state.confirmed.delete(i);
  } else {
    state.confirmed.add(i);
  }
  updateConfirmBtn();
  renderSentSelectOptions();
  // Auto-advance: after confirming, jump to the next unconfirmed sentence.
  if(!wasConfirmed && _autoAdvance){
    for(let j = state.currentSent + 1; j < state.maxSents; j++){
      if(!state.confirmed.has(j)){
        state.currentSent = j;
        renderSentence();
        return;
      }
    }
  }
}

// Update the confirm button's label and active CSS class to reflect current state.
function updateConfirmBtn(){
  if(!confirmBtn) return;
  const isConfirmed = state.confirmed.has(state.currentSent);
  confirmBtn.textContent  = isConfirmed ? t('sent.confirmed') : t('sent.confirm');
  confirmBtn.classList.toggle("confirmBtnActive", isConfirmed);
}

// Rebuild all <option> elements in the sentence <select> dropdown with diff/flag styling.
function renderSentSelectOptions(){
  if(state.docs.length < 1 || state.maxSents === 0) return;
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
    // Color-code options: confirmed (gold), flagged (orange), diff (red), ok (green)
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

  // Update the select border color to reflect the current sentence's status
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

// Update the progress counter showing how many sentences are confirmed.
function _updateProgressMeta(){
  if(!progressMeta) return;
  if(state.docs.length < 1 || state.maxSents === 0){ progressMeta.textContent = ""; return; }
  progressMeta.textContent = t('sent.progress', {
    done:  state.confirmed.size,
    total: state.maxSents,
  });
}

// Show or hide the sentence note textarea and load the note for the current sentence.
function _updateSentNote(){
  if(!sentNote || !sentNoteRow) return;
  const ok = state.docs.length >= 1 && state.maxSents > 0;
  sentNoteRow.style.display = ok ? "" : "none";
  if(ok){
    sentNote.value = state.notes[state.currentSent] ?? "";
    sentNote.placeholder = t('note.placeholder');
  }
}

// Re-render the minimap of sentence dots below the sentence selector.
function renderSentMap(){
  if(!sentMap) return;
  if(state.docs.length < 1 || state.maxSents === 0){ sentMap.innerHTML = ""; return; }
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
    // Accessibility: text symbol inside dot conveys state independently of color
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

// ── Flags ──────────────────────────────────────────────────────────────────────

// Toggle the flag for a single token and update the row, minimap, and selector in place.
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
  // Reflect flag change in the minimap and dropdown without a full re-render
  renderSentMap();
  renderSentSelectOptions();
}

// ── UI: Column toggle ──────────────────────────────────────────────────────────

// Rebuild the column visibility toggle bar (shown when ≥2 documents are loaded, or project is unlocked).
function renderColToggleBar(){
  colToggleBar.innerHTML = "";
  if(state.docs.length < 2 && !state.unlocked){ return; }
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

// ── Project lock ───────────────────────────────────────────────────────────────

// Render the project lock toggle button into #projectLockBar.
function renderProjectLock(){
  const bar = document.getElementById("projectLockBar");
  if(!bar) return;
  bar.innerHTML = "";
  if(state.docs.length === 0) return;
  const btn = document.createElement("button");
  btn.className = "projectLockBtn" + (state.unlocked ? " projectLockBtnOpen" : "");
  btn.textContent = state.unlocked ? t('project.unlock') : t('project.lock');
  btn.addEventListener("click", () => {
    state.unlocked = !state.unlocked;
    _saveActiveProject();
    renderProjectLock();
    renderFiles();
    renderSentence();
  });
  bar.appendChild(btn);
}

// ── Token insert / delete helpers ─────────────────────────────────────────────

// Re-assign IDs 1..n to all tokens in a sentence and update HEAD references.
// Returns the Map<oldId, newId> used for annotation remapping.
function _renumberTokens(sent){
  const map = new Map();
  sent.tokens.forEach((tk, i) => map.set(tk.id, i + 1));
  sent.tokens.forEach((tk, i) => {
    tk.id = i + 1;
    if(tk.head != null && tk.head !== 0)
      tk.head = map.has(tk.head) ? map.get(tk.head) : null;
  });
  return map;
}

// Remap token IDs in state.custom and state.goldPick after renumbering.
function _remapAnnotations(si, oldToNew){
  const remapObj = (obj, remapVals) => {
    if(!obj) return;
    const next = {};
    for(const [k, v] of Object.entries(obj)){
      const nk = oldToNew.get(parseInt(k, 10));
      if(nk == null) continue;
      next[nk] = remapVals ? Object.fromEntries(
        Object.entries(v).map(([fk, fv]) => [
          fk,
          (fk === 'head' && fv != null && fv !== 0)
            ? (oldToNew.get(fv) ?? null)
            : fv
        ])
      ) : v;
    }
    return next;
  };
  const nc = remapObj(state.custom[si], true);
  if(nc && Object.keys(nc).length) state.custom[si] = nc;
  else delete state.custom[si];
  const ng = remapObj(state.goldPick[si], false);
  if(ng && Object.keys(ng).length) state.goldPick[si] = ng;
  else delete state.goldPick[si];
}

// Insert a blank token before the token with `beforeId` in all docs (0 = append).
// Focuses the new input after re-render.
function _insertToken(beforeId){
  pushUndo();
  const si = state.currentSent;
  let newId = 1;
  for(const d of state.docs){
    const s = d.sentences[si];
    if(!s) continue;
    let pos = beforeId === 0
      ? s.tokens.length
      : s.tokens.findIndex(t => t.id === beforeId);
    if(pos < 0) pos = s.tokens.length;
    s.tokens.splice(pos, 0, { id: 0, form: '_', lemma: '_', upos: '_', xpos: '_', feats: '_', head: null, deprel: '_', deps: '_', misc: '_' });
    const map = _renumberTokens(s);
    if(d === state.docs[0]){ _remapAnnotations(si, map); newId = pos + 1; }
  }
  renderSentence();
  // Focus the new token's input after the DOM has been repainted
  setTimeout(() => {
    const inp = sentText.querySelector(`.sentFormInput[data-id="${newId}"]`);
    if(inp){ inp.focus(); inp.select(); }
  }, 0);
}

// Delete the token with the given ID from all docs.
function _deleteToken(tokId){
  const s0tok = state.docs[0]?.sentences?.[state.currentSent]?.tokens;
  if(s0tok && s0tok.length <= 1) return; // keep at least one token
  pushUndo();
  const si = state.currentSent;
  for(const d of state.docs){
    const s = d.sentences[si];
    if(!s) continue;
    const idx = s.tokens.findIndex(t => t.id === tokId);
    if(idx < 0) continue;
    s.tokens.splice(idx, 1);
    const map = _renumberTokens(s);
    if(d === state.docs[0]) _remapAnnotations(si, map);
  }
  renderSentence();
}

// ── Sentence management ────────────────────────────────────────────────────────

let _sentEditOpen = false;

// Render sentence edit/insert/delete controls into #sentManageBar.
function renderSentManage(){
  const bar = document.getElementById("sentManageBar");
  if(!bar) return;
  if(!state.unlocked || state.maxSents === 0){ bar.innerHTML = ""; return; }

  bar.innerHTML = "";

  // ✎ Edit current sentence
  const editBtn = document.createElement("button");
  editBtn.className = "sentManageBtn";
  editBtn.textContent = t('sent.editSentBtn');
  editBtn.addEventListener("click", () => {
    _sentEditOpen = !_sentEditOpen;
    renderSentManage();
  });
  bar.appendChild(editBtn);

  // ➕ Insert new sentence after current
  const addBtn = document.createElement("button");
  addBtn.className = "sentManageBtn";
  addBtn.textContent = t('sent.addSentBtn');
  addBtn.addEventListener("click", () => {
    const text = prompt(t('sent.addSentPrompt')) ?? "";
    pushUndo();
    const newSent = { text: text.trim(), tokens: [], comments: text.trim() ? [`# text = ${text.trim()}`] : [], extras: [] };
    for(const d of state.docs) d.sentences.splice(state.currentSent + 1, 0, JSON.parse(JSON.stringify(newSent)));
    recomputeMaxSents();
    state.currentSent = state.currentSent + 1;
    renderSentSelect();
    renderSentence();
  });
  bar.appendChild(addBtn);

  // 🗑 Delete current sentence
  const delBtn = document.createElement("button");
  delBtn.className = "sentManageBtn danger";
  delBtn.textContent = t('sent.delSentBtn');
  delBtn.addEventListener("click", () => {
    if(!confirm(t('sent.delSentConfirm'))) return;
    pushUndo();
    for(const d of state.docs) d.sentences.splice(state.currentSent, 1);
    recomputeMaxSents();
    state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));
    renderSentSelect();
    renderSentence();
  });
  bar.appendChild(delBtn);

  // Inline sentence editor (shown when _sentEditOpen)
  if(_sentEditOpen){
    const panel = document.createElement("div");
    panel.className = "sentEditPanel";

    for(let i = 0; i < state.docs.length; i++){
      const d = state.docs[i];
      const label = document.createElement("div");
      label.className = "sentEditLabel";
      label.textContent = d.name;
      panel.appendChild(label);

      const ta = document.createElement("textarea");
      ta.className = "sentEditTa";
      ta.spellcheck = false;
      const sent = d.sentences[state.currentSent];
      ta.value = sent ? _sentToConlluLines(sent).join("\n") : "";
      ta.dataset.docIdx = i;
      panel.appendChild(ta);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "sentEditBtns";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = t('sent.editSentSave');
    saveBtn.addEventListener("click", () => {
      pushUndo();
      const textareas = panel.querySelectorAll("textarea[data-doc-idx]");
      textareas.forEach(ta => {
        const i = parseInt(ta.dataset.docIdx, 10);
        const d = state.docs[i];
        if(!d) return;
        const parsed = parseConllu(ta.value);
        if(parsed.sentences.length > 0) d.sentences[state.currentSent] = parsed.sentences[0];
      });
      recomputeMaxSents();
      _sentEditOpen = false;
      renderSentSelect();
      renderSentence();
    });
    btnRow.appendChild(saveBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = t('sent.editSentCancel');
    cancelBtn.addEventListener("click", () => {
      _sentEditOpen = false;
      renderSentManage();
    });
    btnRow.appendChild(cancelBtn);

    panel.appendChild(btnRow);
    bar.appendChild(panel);
  }
}

// ── Custom annotations ─────────────────────────────────────────────────────────

// Copy all annotations from document docIdx into custom for the current sentence.
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

// Remove all custom overrides for the current sentence after user confirmation.
function clearCustomForSentence(){
  if(!confirm(t('sent.clearConfirm'))) return;
  pushUndo();
  delete state.custom[state.currentSent];
  renderSentence();
}

// ── Main render ────────────────────────────────────────────────────────────────

// Re-render the entire sentence view: sentence text, stats, table, trees, note.
function renderSentence(){
  // Stop any running TTS when the displayed sentence changes.
  stopTts();
  const ok = state.docs.length >= 1 && state.maxSents > 0;
  if(ttsBtn)        ttsBtn.disabled        = !ok;
  if(confirmAllBtn) confirmAllBtn.disabled = !ok;
  if(flagDiffsBtn)  flagDiffsBtn.disabled  = !ok;
  if(unflagAllBtn)  unflagAllBtn.disabled  = !ok;
  if(!ok){
    sentText.textContent = "";
    sentMeta.textContent = "";
    sentStats.textContent = "";
    treeGrid.innerHTML = "";
    cmpTable.innerHTML = "";
    colToggleBar.innerHTML = "";
    _updateSentNote();
    renderSentManage();
    renderPlainView();
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));

  // Render clickable token spans (or editable inputs when project is unlocked)
  const s0 = state.docs[0].sentences[state.currentSent];
  if(s0){
    if(state.unlocked){
      // Insert button before each token + one at the end; delete button on each token
      const insertBtn = id => `<button class="sentInsertBtn" data-before="${id}" title="Wort einfügen">+</button>`;
      sentText.innerHTML =
        s0.tokens.map(tk => {
          const form = tk.form || '';
          return insertBtn(tk.id) +
            `<span class="sentTokenEdit" data-id="${tk.id}">` +
              `<input type="text" class="sentFormInput" data-id="${tk.id}" value="${escapeHtml(form)}" size="${Math.max(1, form.length)}" spellcheck="false" autocomplete="off">` +
              `<button class="sentDeleteBtn" data-id="${tk.id}" title="Wort löschen">×</button>` +
            `</span>`;
        }).join('') + insertBtn(0);
    } else {
      sentText.innerHTML = s0.tokens
        .map(tk => `<span class="sentToken" data-id="${tk.id}">${escapeHtml(tk.form)}</span>`)
        .join(' ');
    }
  } else {
    sentText.textContent = t('sent.missing');
  }
  sentMeta.textContent = t('sent.label', { cur: state.currentSent + 1, max: state.maxSents });
  sentText.classList.toggle("sentTextConfirmed", state.confirmed.has(state.currentSent));
  sentText.classList.toggle("sentTextUnlocked", state.unlocked && !!s0);

  renderColToggleBar();
  renderCompareTable();
  renderSentSelectOptions();
  renderPreview();
  _updateSentNote();
  renderSentManage();
  renderPlainView();
}

// ── Plain CoNLL-U view ─────────────────────────────────────────────────────────

let _plainViewOpen = localStorage.getItem('plain-view') === 'true';

// Build and return the raw CoNLL-U lines for a single parsed sentence.
function _sentToConlluLines(sent){
  const lines = [];
  for(const c of (sent.comments || [])) lines.push(c);
  for(const tk of (sent.tokens || [])){
    const before = (sent.extras || []).filter(e => e.insertBefore === tk.id);
    for(const e of before) lines.push(e.raw);
    lines.push([
      tk.id, tk.form || "_", tk.lemma || "_",
      tk.upos || "_", tk.xpos || "_", tk.feats || "_",
      tk.head == null ? "_" : tk.head,
      tk.deprel || "_", tk.deps || "_", tk.misc || "_",
    ].join("\t"));
  }
  return lines;
}

// Re-render the plain CoNLL-U view panel (only when open).
function renderPlainView(){
  const pv = document.getElementById("plainView");
  const btn = document.getElementById("plainViewToggle");
  if(!pv) return;
  if(btn){
    btn.textContent = _plainViewOpen ? t('plain.toggleOff') : t('plain.toggle');
    btn.classList.toggle("plainViewToggleActive", _plainViewOpen);
  }
  if(!_plainViewOpen){ pv.innerHTML = ""; return; }

  const sentIndex = state.currentSent;
  if(state.docs.length === 0 || state.maxSents === 0){ pv.innerHTML = ""; return; }

  let html = `<div class="pvWrap">`;

  for(const doc of state.docs){
    const sent = doc.sentences[sentIndex];
    const raw = sent ? _sentToConlluLines(sent).join("\n") : t('sent.missing');
    html += `<div class="pvBlock">
      <div class="pvTitle">${escapeHtml(doc.name)}</div>
      <pre class="pvPre">${escapeHtml(raw)}</pre>
    </div>`;
  }

  html += `</div>`;
  pv.innerHTML = html;
}

const _pvToggleBtn = document.getElementById("plainViewToggle");
if(_pvToggleBtn){
  _pvToggleBtn.addEventListener("click", () => {
    _plainViewOpen = !_plainViewOpen;
    localStorage.setItem("plain-view", String(_plainViewOpen));
    renderPlainView();
  });
}

// ── Clipboard copy ─────────────────────────────────────────────────────────────

// Copy the current sentence's gold CoNLL-U to the clipboard and briefly update the button label.
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

// ── Demo ───────────────────────────────────────────────────────────────────────

// Load the built-in example files (defined in the EXAMPLES global constant).
async function loadExamples(){
  const files = EXAMPLES.map(e => new File([e.content], e.name, { type: "text/plain" }));
  await processFiles(files);
}

// ── TTS (Browser Text-To-Speech) ───────────────────────────────────────────────

let _ttsActive = false;

// Speak the current sentence text using the Web Speech API.
function speakSentence(){
  if(!window.speechSynthesis){ alert(t('tts.noSupport')); return; }
  if(_ttsActive){ stopTts(); return; }
  const s0 = state.docs[0]?.sentences?.[state.currentSent];
  if(!s0) return;
  // Prefer # text metadata; fall back to space-joined token forms.
  const text = s0.text || s0.tokens.map(tk => tk.form).join(' ');
  const lang = (typeof getLang === 'function' && getLang() === 'en') ? 'en-US' : 'de-DE';
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = lang;
  utt.onend  = utt.onerror = () => { _ttsActive = false; _updateTtsBtn(); };
  _ttsActive = true;
  _updateTtsBtn();
  window.speechSynthesis.speak(utt);
}

// Stop any ongoing TTS playback.
function stopTts(){
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  _ttsActive = false;
  _updateTtsBtn();
}

// Sync the TTS button label and active CSS class with the current TTS state.
function _updateTtsBtn(){
  if(!ttsBtn) return;
  ttsBtn.textContent = _ttsActive ? t('tts.stop') : t('tts.speak');
  ttsBtn.classList.toggle('ttsActive', _ttsActive);
}

if(ttsBtn){
  ttsBtn.addEventListener('click', speakSentence);
}

// ── Auto-advance after confirm ─────────────────────────────────────────────────

let _autoAdvance = localStorage.getItem('auto-advance') === 'true';

// Persist auto-advance preference and keep the checkbox in sync.
function _initAutoAdvance(){
  if(!autoAdvanceCb) return;
  autoAdvanceCb.checked = _autoAdvance;
  autoAdvanceCb.addEventListener('change', () => {
    _autoAdvance = autoAdvanceCb.checked;
    localStorage.setItem('auto-advance', String(_autoAdvance));
  });
}

// ── Bulk actions ───────────────────────────────────────────────────────────────

// Confirm every sentence that currently has zero diffs.
function confirmAllMatching(){
  if(state.docs.length < 1 || state.maxSents === 0) return;
  pushUndo();
  for(let i = 0; i < state.maxSents; i++){
    if(!state.confirmed.has(i) && _sentStats(i).diffCount === 0){
      state.confirmed.add(i);
    }
  }
  renderSentence();
}

// Flag the first token (id=1) of every sentence that has diffs, so they are
// easy to identify and jump to with the f/F shortcut.
function flagAllDiffs(){
  if(state.docs.length < 1 || state.maxSents === 0) return;
  pushUndo();
  for(let i = 0; i < state.maxSents; i++){
    if(_sentStats(i).diffCount > 0){
      if(!state.flags[i]) state.flags[i] = new Set();
      // Flag token 1 as a representative marker for the whole sentence.
      const firstId = state.docs[0]?.sentences?.[i]?.tokens?.[0]?.id ?? 1;
      state.flags[i].add(firstId);
    }
  }
  renderSentence();
}

// Remove all manual flags across all sentences.
function unflagAll(){
  if(state.docs.length < 1) return;
  pushUndo();
  state.flags = {};
  renderSentence();
}

if(confirmAllBtn) confirmAllBtn.addEventListener('click', confirmAllMatching);
if(flagDiffsBtn)  flagDiffsBtn.addEventListener('click',  flagAllDiffs);
if(unflagAllBtn)  unflagAllBtn.addEventListener('click',  unflagAll);

// ── Init ───────────────────────────────────────────────────────────────────────
buildDeprelOptionsCache();
DEFAULT_LABELS = JSON.parse(JSON.stringify(LABELS)); // snapshot before any project overrides
initProjects();
_initAutoAdvance();   // restore auto-advance checkbox from localStorage
renderFiles();
renderSentSelect();
renderSentence();
