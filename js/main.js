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

const autoAdvanceCb = document.getElementById("autoAdvanceCb");
const confirmAllBtn = document.getElementById("confirmAllBtn");
const flagDiffsBtn  = document.getElementById("flagDiffsBtn");
const unflagAllBtn  = document.getElementById("unflagAllBtn");

// ── Events ─────────────────────────────────────────────────────────────────────
fileInput.addEventListener("change", onFilesChosen);
resetBtn.addEventListener("click", resetProject);
if(globalResetBtn) globalResetBtn.addEventListener("click", resetAll);

// Persist the note for the current sentence as the user types.
if(sentNote){
  sentNote.addEventListener("input", () => {
    const val = sentNote.value;
    if(val.trim()) state.notes[state.currentSent] = val;
    else           delete state.notes[state.currentSent];
    // Live-update note indicator
    const indicator = document.getElementById("sentNoteIndicator");
    if(indicator) indicator.style.display = val.trim() ? "" : "none";
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

function _navigateSent(dir) {
  state.currentSent = Math.max(0, Math.min(state.maxSents - 1, state.currentSent + dir));
  renderSentence();
}

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

// Push undo once when the user focuses a token form input (before first keystroke).
sentText.addEventListener("focusin", (e) => {
  if(!e.target.classList.contains("sentFormInput") || !state.unlocked) return;
  pushUndo();
});

// Live update: resize input + write form into all docs + debounced partial re-render.
let _formInputTimer = null;
sentText.addEventListener("input", (e) => {
  const inp = e.target.closest(".sentFormInput");
  if(!inp) return;
  inp.size = Math.max(1, inp.value.length || 1);
  if(!state.unlocked) return;
  const tokId   = parseInt(inp.dataset.id, 10);
  // Strip tab/newline characters — they would break CoNLL-U column parsing
  const newForm = inp.value.replace(/[\t\n\r]/g, '');
  for(const d of state.docs){
    const s = d.sentences[state.currentSent];
    if(!s) continue;
    const tok = s.tokens.find(t => t.id === tokId);
    if(tok) tok.form = newForm;
  }
  // Re-render dependent views without destroying the focused input
  clearTimeout(_formInputTimer);
  _formInputTimer = setTimeout(() => { renderCompareTable(); renderPreview(); }, 180);
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
  if(state.docs.length === 0){
    fileMeta.dataset.i18n = 'files.none';
    fileMeta.textContent = t('files.none');
    fileList.innerHTML = `<div class="muted small">${escapeHtml(t('files.drop'))}</div>`;
    fileList.appendChild(_buildDemoMenu());
    _updateSectionVisibility();
    return;
  }
  delete fileMeta.dataset.i18n;
  fileMeta.textContent = t('files.loaded', { n: state.docs.length });
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
    dlBtn.addEventListener("click", () => {
      const txt = (typeof _docToConlluText === 'function') ? _docToConlluText(d) : (d.content || "");
      downloadText(txt || "", d.name);
    });
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

  const hadWarn = !!textWarn.innerHTML;
  textWarn.innerHTML = warnedIndices.size > 0
    ? `<div class="textWarnBanner">${escapeHtml(t('files.warnBanner'))}</div>`
    : "";
  if(!hadWarn && textWarn.innerHTML){
    textWarn.classList.add("textWarnPulse");
    textWarn.addEventListener("animationend", () => textWarn.classList.remove("textWarnPulse"), { once: true });
  }

  _updateSectionVisibility();
  renderConlluEditor(true);
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
document.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("active");
  // Use DataTransferItem API to support dropped folders (recursive)
  const items = e.dataTransfer?.items ? Array.from(e.dataTransfer.items) : null;
  if (items && items.some(i => i.kind === 'file' && typeof i.webkitGetAsEntry === 'function')) {
    const files = await _collectFilesFromItems(items);
    if (files.length) _dispatchFiles(files);
  } else {
    _dispatchFiles(Array.from(e.dataTransfer.files));
  }
});

// Recursively collect File objects from DataTransferItems (supports dropped folders).
// Files are sorted by their full path so the order is deterministic.
async function _collectFilesFromItems(items) {
  const VALID = /\.(conllu|conll|txt|json)$/i;
  const entries = items
    .filter(i => i.kind === 'file')
    .map(i => i.webkitGetAsEntry?.())
    .filter(Boolean);

  const files = [];
  async function readEntry(entry) {
    if (entry.isFile) {
      if (VALID.test(entry.name)) {
        await new Promise(res => entry.file(f => { files.push({ file: f, path: entry.fullPath }); res(); }, res));
      }
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries only returns up to 100 results per call — loop until empty
      let batch;
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const child of batch) await readEntry(child);
      } while (batch.length > 0);
    }
  }

  for (const entry of entries) await readEntry(entry);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files.map(f => f.file);
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

// Render project mode indicator + toggle button into #projectLockBar.
function renderProjectLock(){
  const bar = document.getElementById("projectLockBar");
  if(!bar) return;
  bar.innerHTML = "";
  if(state.docs.length === 0) return;

  const status = document.createElement("span");
  status.className = "projectModeStatus" + (state.unlocked ? " projectModeEdit" : " projectModeView");
  status.textContent = state.unlocked ? t('project.statusEdit') : t('project.statusView');

  const btn = document.createElement("button");
  btn.className = "projectLockBtn";
  btn.textContent = state.unlocked ? t('project.btnView') : t('project.btnEdit');
  const _lockToggle = () => {
    state.unlocked = !state.unlocked;
    _saveActiveProject();
    renderProjectLock();
    renderFiles();
    renderSentence();
  };
  btn.addEventListener("click", _lockToggle);

  bar.appendChild(status);
  bar.appendChild(btn);
}

// ── Main render ────────────────────────────────────────────────────────────────

// Re-render the entire sentence view: sentence text, stats, table, trees, note.
function renderSentence(){
  // Invalidate stats for the current sentence to catch any direct token mutations
  // (e.g. arc editing writes to state.docs[].sentences[].tokens directly).
  _invalidateStatsCache(state.currentSent);
  const ok = state.docs.length >= 1 && state.maxSents > 0;
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
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));

  // Render clickable token spans (or editable inputs when project is unlocked)
  const s0 = state.docs[0].sentences[state.currentSent];
  if(s0){
    const sentIdx = state.currentSent;
    if(state.unlocked){
      // Insert button before each token + one at the end; delete button on each token
      const insertBtn = id => `<button class="sentInsertBtn" data-before="${id}" title="${escapeHtml(t('token.insertWordTitle'))}">+</button>`;
      sentText.innerHTML =
        s0.tokens.map(tk => {
          const form = tk.form || '';
          const flagCls = state.flags[sentIdx]?.has(tk.id) ? ' sentTokenFlagged' : '';
          return insertBtn(tk.id) +
            `<span class="sentTokenEdit${flagCls}" data-id="${tk.id}">` +
              `<input type="text" class="sentFormInput" data-id="${tk.id}" value="${escapeHtml(form)}" size="${Math.max(1, form.length)}" spellcheck="false" autocomplete="off">` +
              `<button class="sentDeleteBtn" data-id="${tk.id}" title="${escapeHtml(t('token.deleteWordTitle'))}">×</button>` +
            `</span>`;
        }).join('') + insertBtn(0);
    } else {
      sentText.innerHTML = s0.tokens
        .map(tk => {
          const flagCls = state.flags[sentIdx]?.has(tk.id) ? ' sentTokenFlagged' : '';
          return `<span class="sentToken${flagCls}" data-id="${tk.id}">${escapeHtml(tk.form)}</span>`;
        })
        .join(' ');
    }
  } else {
    sentText.textContent = t('sent.missing');
  }
  sentMeta.textContent = t('sent.label', { cur: state.currentSent + 1, max: state.maxSents });
  sentText.classList.toggle("sentTextConfirmed", state.confirmed.has(state.currentSent));
  sentText.classList.toggle("sentTextUnlocked", state.unlocked && !!s0);
  // Fade-in animation on sentence change
  sentText.classList.remove("sentFadeIn");
  void sentText.offsetWidth;
  sentText.classList.add("sentFadeIn");
  sentText.addEventListener("animationend", () => sentText.classList.remove("sentFadeIn"), { once: true });

  renderColToggleBar();
  renderCompareTable();
  renderSentSelectOptions();
  renderPreview();
  _updateSentNote();
  renderSentManage();
}

// Like renderSentence() but preserves the window scroll position.
// Use this when an in-place edit (table cell, arc drag) triggers a re-render
// so the page does not jump back to the top.
function renderSentenceKeepScroll(){
  const y = window.scrollY;
  renderSentence();
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
}

// ── Plain CoNLL-U helper ───────────────────────────────────────────────────────


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

// ── CoNLL-U editor section ─────────────────────────────────────────────────────

let _conlluEditorMode = localStorage.getItem('conllu-editor-mode') || 'struct'; // 'struct' | 'raw'

// Build a read-only structured table for one doc's current sentence (no inputs).
function _buildConlluStructBlockReadOnly(docIdx) {
  const d       = state.docs[docIdx];
  const sentIdx = state.currentSent;
  const sent    = d?.sentences?.[sentIdx];
  if (!sent?.tokens?.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'conlluStructBlock';

  const lbl = document.createElement('div');
  lbl.className = 'conlluDocLabel';
  lbl.textContent = d.name;
  wrap.appendChild(lbl);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'conlluStructTableWrap';

  const table = document.createElement('table');
  table.className = 'conlluStructTable';

  const cols = ['ID', 'FORM', 'LEMMA', UPOS_LABEL_NAME, XPOS_LABEL_NAME,
                 'FEATS', 'HEAD', 'DEPREL', 'DEPS', 'MISC'];
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th'); th.textContent = col; hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const tok of sent.tokens) {
    const tr = document.createElement('tr');
    const fields = [
      tok.id, tok.form, tok.lemma,
      tok.upos, tok.xpos, tok.feats,
      tok.head ?? '_', tok.deprel, tok.deps, tok.misc,
    ];
    fields.forEach((v, fi) => {
      const td = document.createElement('td');
      td.textContent = v ?? '_';
      if(fi === 0) td.className = 'conlluStructId';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

// Read-only version of the gold block — used when the project is locked.
function _buildConlluGoldBlockReadOnly() {
  const si  = state.currentSent;
  const ref = state.docs[0]?.sentences?.[si];
  if (!ref?.tokens?.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'conlluStructBlock conlluGoldBlock';

  const lbl = document.createElement('div');
  lbl.className = 'conlluDocLabel conlluGoldLabel';
  lbl.textContent = t('conllu.goldLabel');
  wrap.appendChild(lbl);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'conlluStructTableWrap';
  const table = document.createElement('table');
  table.className = 'conlluStructTable';

  const cols = ['ID', 'FORM', 'LEMMA', UPOS_LABEL_NAME, XPOS_LABEL_NAME,
                'FEATS', 'HEAD', 'DEPREL', 'DEPS', 'MISC'];
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th'); th.textContent = col; hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const refTok of ref.tokens) {
    const id     = refTok.id;
    const ci     = getDocChoice(si, id);
    const srcTok = state.docs[ci]?.sentences?.[si]?.tokens?.find(t => t.id === id) ?? refTok;
    const cust   = state.custom[si]?.[id] ?? {};

    const tr = document.createElement('tr');
    if (Object.keys(cust).length) tr.classList.add('conlluGoldRow');

    const fields = [
      id,
      refTok.form,
      srcTok.lemma  ?? '_',
      cust.upos   ?? srcTok.upos   ?? '_',
      cust.xpos   ?? srcTok.xpos   ?? '_',
      srcTok.feats  ?? '_',
      cust.head   ?? srcTok.head   ?? '_',
      cust.deprel ?? srcTok.deprel ?? '_',
      srcTok.deps   ?? '_',
      srcTok.misc   ?? '_',
    ];
    fields.forEach((v, fi) => {
      const td = document.createElement('td');
      td.textContent = v ?? '_';
      if (fi === 0) td.className = 'conlluStructId';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

// Build a gold-annotation editor table for the current sentence.
// HEAD, DEPREL, UPOS, XPOS write to state.custom (gold overrides).
// FORM, LEMMA, FEATS, DEPS, MISC are read-only (edit via per-doc tables below).
function _buildConlluGoldBlock() {
  const si   = state.currentSent;
  const ref  = state.docs[0]?.sentences?.[si];
  if (!ref?.tokens?.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'conlluStructBlock conlluGoldBlock';

  const lbl = document.createElement('div');
  lbl.className = 'conlluDocLabel conlluGoldLabel';
  lbl.textContent = t('conllu.goldLabel');
  wrap.appendChild(lbl);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'conlluStructTableWrap';
  const table = document.createElement('table');
  table.className = 'conlluStructTable';

  const cols = ['ID', 'FORM', 'LEMMA', UPOS_LABEL_NAME, XPOS_LABEL_NAME,
                'FEATS', 'HEAD', 'DEPREL', 'DEPS', 'MISC'];
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th'); th.textContent = col; hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const refTok of ref.tokens) {
    const id     = refTok.id;
    const ci     = getDocChoice(si, id);
    const srcTok = state.docs[ci]?.sentences?.[si]?.tokens?.find(t => t.id === id) ?? refTok;
    const cust   = state.custom[si]?.[id] ?? {};

    // Resolved gold values
    const goldHead   = cust.head   ?? srcTok.head   ?? null;
    const goldDeprel = cust.deprel ?? srcTok.deprel ?? '_';
    const goldUpos   = cust.upos   ?? srcTok.upos   ?? '_';
    const goldXpos   = cust.xpos   ?? srcTok.xpos   ?? '_';

    const tr = document.createElement('tr');
    if (cust.head !== undefined || cust.deprel !== undefined ||
        cust.upos !== undefined || cust.xpos   !== undefined) {
      tr.classList.add('conlluGoldRow');
    }

    // ID (read-only)
    const idTd = document.createElement('td');
    idTd.textContent = id; idTd.className = 'conlluStructId'; tr.appendChild(idTd);

    // Read-only fields from source
    for (const v of [refTok.form, srcTok.lemma ?? '_']) {
      const td = document.createElement('td');
      td.textContent = v ?? '_'; td.className = 'conlluGoldRo'; tr.appendChild(td);
    }

    // Editable: UPOS, XPOS
    const mkGoldSelect = (field, curVal, optHtml) => {
      const td = document.createElement('td');
      if (optHtml) {
        const sel = document.createElement('select');
        sel.className = 'conlluStructSelect';
        sel.innerHTML = optHtml;
        sel.value = curVal ?? '';
        sel.addEventListener('focus', () => pushUndo(), { once: true });
        sel.addEventListener('change', () => {
          setCustomField(si, id, field, sel.value || null);
          renderSentenceKeepScroll();
          tr.classList.toggle('conlluGoldRow', !!(state.custom[si]?.[id]));
        });
        td.appendChild(sel);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.value = curVal ?? '';
        inp.className = 'conlluStructInput'; inp.spellcheck = false; inp.autocomplete = 'off';
        inp.addEventListener('focus', () => pushUndo(), { once: true });
        inp.addEventListener('input', () => {
          setCustomField(si, id, field, inp.value || null);
          renderSentenceKeepScroll();
          tr.classList.toggle('conlluGoldRow', !!(state.custom[si]?.[id]));
        });
        td.appendChild(inp);
      }
      return td;
    };
    tr.appendChild(mkGoldSelect('upos', goldUpos, UPOS_OPTIONS_HTML));
    tr.appendChild(mkGoldSelect('xpos', goldXpos, XPOS_OPTIONS_HTML));

    // Read-only: FEATS
    const featsTd = document.createElement('td');
    featsTd.textContent = srcTok.feats ?? '_'; featsTd.className = 'conlluGoldRo'; tr.appendChild(featsTd);

    // Editable: HEAD
    const headTd  = document.createElement('td');
    const headInp = document.createElement('input');
    headInp.type = 'number'; headInp.min = '0';
    headInp.value = goldHead ?? '';
    headInp.className = 'conlluStructInput conlluStructHead';
    headInp.addEventListener('focus', () => pushUndo(), { once: true });
    headInp.addEventListener('input', () => {
      const v = headInp.value === '' ? null : parseInt(headInp.value, 10);
      setCustomField(si, id, 'head', isNaN(v) ? null : v);
      renderSentenceKeepScroll();
      tr.classList.toggle('conlluGoldRow', !!(state.custom[si]?.[id]));
    });
    headTd.appendChild(headInp); tr.appendChild(headTd);

    // Editable: DEPREL
    tr.appendChild(mkGoldSelect('deprel', goldDeprel, DEPREL_OPTIONS_HTML));

    // Read-only: DEPS, MISC
    for (const v of [srcTok.deps ?? '_', srcTok.misc ?? '_']) {
      const td = document.createElement('td');
      td.textContent = v; td.className = 'conlluGoldRo'; tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

// Build a structured per-token editor table for one doc's current sentence.
// Each cell is an editable input; changes write directly to the doc token data.
function _buildConlluStructBlock(docIdx) {
  const d       = state.docs[docIdx];
  const sentIdx = state.currentSent;
  const sent    = d?.sentences?.[sentIdx];
  if (!sent?.tokens?.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'conlluStructBlock';

  const lbl = document.createElement('div');
  lbl.className = 'conlluDocLabel';
  lbl.textContent = d.name;
  wrap.appendChild(lbl);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'conlluStructTableWrap';

  const table = document.createElement('table');
  table.className = 'conlluStructTable';

  // Column headers
  const cols = ['ID', 'FORM', 'LEMMA', UPOS_LABEL_NAME, XPOS_LABEL_NAME,
                 'FEATS', 'HEAD', 'DEPREL', 'DEPS', 'MISC'];
  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col;
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  // Debounced update: re-render sections 2-4 and sync the raw textarea
  let _debounceId = null;
  const _schedule = () => {
    clearTimeout(_debounceId);
    _debounceId = setTimeout(() => {
      renderSentenceKeepScroll();
      const ta = document.querySelector(`.conlluDocTa[data-doc-idx="${docIdx}"]`);
      if (ta) ta.value = _docToConlluText(d);
    }, 180);
  };

  const mkInput = (tok, fieldName, value) => {
    const td  = document.createElement('td');
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.value       = value ?? '';
    inp.className   = 'conlluStructInput';
    inp.spellcheck  = false;
    inp.autocomplete = 'off';
    inp.addEventListener('focus', () => pushUndo(), { once: true });
    inp.addEventListener('input', () => { tok[fieldName] = inp.value || '_'; _schedule(); });
    td.appendChild(inp);
    return td;
  };

  const mkSelect = (tok, fieldName, value, optionsHtml) => {
    if (!optionsHtml) return mkInput(tok, fieldName, value);
    const td  = document.createElement('td');
    const sel = document.createElement('select');
    sel.className    = 'conlluStructSelect';
    sel.innerHTML    = optionsHtml;
    sel.value        = value ?? '';
    sel.addEventListener('focus',  () => pushUndo(), { once: true });
    sel.addEventListener('change', () => { tok[fieldName] = sel.value || '_'; _schedule(); });
    td.appendChild(sel);
    return td;
  };

  const tbody = document.createElement('tbody');
  for (const tok of sent.tokens) {
    const tr = document.createElement('tr');

    // ID (read-only)
    const idTd = document.createElement('td');
    idTd.textContent = tok.id;
    idTd.className   = 'conlluStructId';
    tr.appendChild(idTd);

    tr.appendChild(mkInput (tok, 'form',   tok.form));
    tr.appendChild(mkInput (tok, 'lemma',  tok.lemma));
    tr.appendChild(mkSelect(tok, 'upos',   tok.upos,   UPOS_OPTIONS_HTML));
    tr.appendChild(mkSelect(tok, 'xpos',   tok.xpos,   XPOS_OPTIONS_HTML));
    tr.appendChild(mkInput (tok, 'feats',  tok.feats));

    // HEAD: numeric input
    const headTd  = document.createElement('td');
    const headInp = document.createElement('input');
    headInp.type      = 'number';
    headInp.min       = '0';
    headInp.value     = tok.head ?? '';
    headInp.className = 'conlluStructInput conlluStructHead';
    headInp.addEventListener('focus', () => pushUndo(), { once: true });
    headInp.addEventListener('input', () => {
      const v = headInp.value === '' ? null : parseInt(headInp.value, 10);
      tok.head = isNaN(v) ? null : v;
      _schedule();
    });
    headTd.appendChild(headInp);
    tr.appendChild(headTd);

    tr.appendChild(mkSelect(tok, 'deprel', tok.deprel, DEPREL_OPTIONS_HTML));
    tr.appendChild(mkInput (tok, 'deps',   tok.deps));
    tr.appendChild(mkInput (tok, 'misc',   tok.misc));

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

// Build full CoNLL-U text for all sentences of a doc (blank line separator).
function _docToConlluText(d){
  if(!d || !d.sentences.length) return '';
  const parts = d.sentences.map(s => _sentToConlluLines(s).join('\n'));
  return parts.join('\n\n');
}

// Render (or update) the CoNLL-U editor section.
// If force=true, always rebuild textareas (used after external data change).
function renderConlluEditor(force){
  const wrap = document.getElementById('conlluEditorWrap');
  if(!wrap) return;
  // Always wipe stale content when there are no docs.
  if(state.docs.length === 0){ wrap.innerHTML = ''; wrap.hidden = true; return; }
  const wasHidden = wrap.hidden;
  wrap.hidden = false;
  if(wasHidden){
    wrap.classList.add("conlluFadeIn");
    wrap.addEventListener("animationend", () => wrap.classList.remove("conlluFadeIn"), { once: true });
  }

  // Update section heading to reflect current mode
  const titleEl = document.getElementById('conlluSectionTitle');
  if(titleEl) titleEl.textContent = state.unlocked ? t('sec.conllu.edit') : t('sec.conllu.view');

  if(!state.unlocked){
    // Project locked: show read-only gold block + per-doc tables, no editing controls.
    if(!force && wrap.querySelector('.conlluStructBlock') && !wrap.querySelector('.conlluTab')) return;
    wrap.innerHTML = '';
    const goldRo = _buildConlluGoldBlockReadOnly();
    if(goldRo) wrap.appendChild(goldRo);
    for(let i = 0; i < state.docs.length; i++){
      const block = _buildConlluStructBlockReadOnly(i);
      if(block) wrap.appendChild(block);
    }
    return;
  }

  // Only rebuild on force or when the wrap is still empty / in wrong mode
  if(!force && wrap.querySelector('.conlluTab')) return;

  wrap.innerHTML = '';

  // ── Mode tab bar ──────────────────────────────────────────────────────────
  const tabBar = document.createElement('div');
  tabBar.className = 'conlluTabBar';
  const mkTab = (mode, label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'conlluTab' + (_conlluEditorMode === mode ? ' conlluTabActive' : '');
    btn.addEventListener('click', () => {
      _conlluEditorMode = mode;
      localStorage.setItem('conllu-editor-mode', mode);
      renderConlluEditor(true);
    });
    return btn;
  };
  tabBar.appendChild(mkTab('struct', t('conllu.structured')));
  tabBar.appendChild(mkTab('raw',    t('conllu.raw')));
  wrap.appendChild(tabBar);

  if(_conlluEditorMode === 'struct'){
    // ── Structured per-token editor for the current sentence ─────────────
    const sentLabel = document.createElement('div');
    sentLabel.className = 'conlluSectionHead';
    sentLabel.textContent = t('sent.label', { cur: state.currentSent + 1, max: state.maxSents });
    wrap.appendChild(sentLabel);
    // Gold block first — edits HEAD/DEPREL/UPOS/XPOS via state.custom
    const goldBlock = _buildConlluGoldBlock();
    if(goldBlock) wrap.appendChild(goldBlock);
    // Per-doc source blocks below for reference / raw editing
    for(let i = 0; i < state.docs.length; i++){
      const block = _buildConlluStructBlock(i);
      if(block) wrap.appendChild(block);
    }
  } else {
    // ── Raw full-file textarea editor ─────────────────────────────────────
    for(let i = 0; i < state.docs.length; i++){
      const d = state.docs[i];
      const block = document.createElement('div');
      block.className = 'conlluDocBlock';
      const lbl = document.createElement('div');
      lbl.className = 'conlluDocLabel';
      lbl.textContent = d.name;
      block.appendChild(lbl);
      const ta = document.createElement('textarea');
      ta.className = 'conlluDocTa';
      ta.spellcheck = false;
      ta.dataset.docIdx = i;
      ta.value = _docToConlluText(d);
      const _autoH = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
      requestAnimationFrame(() => _autoH(ta));
      ta.addEventListener('input', () => _autoH(ta));
      block.appendChild(ta);
      wrap.appendChild(block);
    }
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'conlluEditorBtns';

  // "Save" button only applies to the raw textarea editor
  if(_conlluEditorMode === 'raw'){
    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('sent.editSentSave');
    saveBtn.addEventListener('click', () => {
      pushUndo();
      wrap.querySelectorAll('textarea[data-doc-idx]').forEach(ta => {
        const d = state.docs[parseInt(ta.dataset.docIdx, 10)];
        if(!d) return;
        d.sentences = parseConllu(ta.value).sentences;
      });
      recomputeMaxSents();
      state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));
      renderConlluEditor(true);
      renderSentSelect();
      renderSentence();
    });
    btnRow.appendChild(saveBtn);
  }

  wrap.appendChild(btnRow);
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
    _showToast(t('copy.done'), 'success');
    if(copyConlluBtn){
      copyConlluBtn.textContent = t('copy.done');
      setTimeout(() => { if(copyConlluBtn) copyConlluBtn.textContent = t('copy.btn'); }, 1500);
    }
  }).catch(() => { _showToast(t('copy.err'), 'error'); });
}

// ── Demo ───────────────────────────────────────────────────────────────────────

// Load the built-in demo session (all projects at once).
// Falls back to single-project EXAMPLES if DEMO_SESSION is unavailable.
function loadExamples(){
  if(typeof DEMO_SESSION !== 'undefined' && typeof importSession === 'function'){
    importSession(DEMO_SESSION);
    return;
  }
  // Fallback: load three German example files into the current project
  const files = EXAMPLES.map(e => new File([e.content], e.name, { type: "text/plain" }));
  processFiles(files);
}

// Load a single demo project by index from DEMO_SESSION into the app.
// Appends it as a new project tab — does NOT replace existing projects.
function _loadDemoProject(idx){
  if(typeof DEMO_SESSION === 'undefined') return;
  let parsed;
  try { parsed = JSON.parse(DEMO_SESSION); } catch { return; }
  const p = parsed.projects?.[idx];
  if(!p) return;

  _saveActiveProject();

  const docs = (p.docs || []).filter(d => typeof d.content === 'string').map(d => {
    const r = parseConllu(d.content);
    return { key: `session::${d.name}`, name: d.name, content: d.content, sentences: r.sentences };
  });
  const projectData = {
    name:        p.name || t('project.default'),
    docs,
    custom:      JSON.parse(JSON.stringify(p.custom   || {})),
    goldPick:    JSON.parse(JSON.stringify(p.goldPick || {})),
    confirmed:   p.confirmed  || [],
    notes:       JSON.parse(JSON.stringify(p.notes    || {})),
    flags:       p.flags      || {},
    currentSent: p.currentSent || 0,
    maxSents:    Math.max(0, ...docs.map(d => d.sentences.length), 0),
    hiddenCols:  p.hiddenCols  || [],
    undoStack:   p.undo        || [],
    redoStack:   p.redo        || [],
    labels:      p.labels      || null,
    unlocked:    p.unlocked    || false,
  };

  // If the active project is empty, load into it instead of creating a new tab.
  const activeDocs = state.projects[state.activeProjectIdx]?.docs || [];
  if(activeDocs.length === 0){
    state.projects[state.activeProjectIdx] = projectData;
  } else {
    state.projects.push(projectData);
    state.activeProjectIdx = state.projects.length - 1;
  }
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
  _showToast(t('files.demoLoaded', { name: projectData.name }), 'info');
}

// Build the demo-picker button with an expandable per-project menu.
function _buildDemoMenu(){
  const wrap = document.createElement('div');
  wrap.className = 'demoMenuWrap';
  wrap.style.marginTop = '8px';

  const toggle = document.createElement('button');
  toggle.className = 'demoMenuToggle';
  toggle.textContent = t('files.demo') + ' ▾';

  const menu = document.createElement('div');
  menu.className = 'demoMenu';
  menu.hidden = true;

  // "All projects" entry at the top
  const allBtn = document.createElement('button');
  allBtn.className = 'demoMenuItem';
  allBtn.textContent = t('files.demoAll');
  allBtn.addEventListener('click', () => { menu.hidden = true; loadExamples(); });
  menu.appendChild(allBtn);

  // One entry per project in DEMO_SESSION
  if(typeof DEMO_SESSION !== 'undefined'){
    try {
      JSON.parse(DEMO_SESSION).projects.forEach((p, i) => {
        const btn = document.createElement('button');
        btn.className = 'demoMenuItem';
        btn.textContent = p.name;
        btn.addEventListener('click', () => { menu.hidden = true; _loadDemoProject(i); });
        menu.appendChild(btn);
      });
    } catch(_){}
  }

  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    if(!menu.hidden){
      // Defer so this same click event doesn't immediately trigger the outside-click handler
      setTimeout(() => {
        function closer(e){
          if(!wrap.contains(e.target)){ menu.hidden = true; document.removeEventListener('click', closer); }
        }
        document.addEventListener('click', closer);
      }, 0);
    }
  });

  wrap.appendChild(toggle);
  wrap.appendChild(menu);
  return wrap;
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
  let added = 0;
  for(let i = 0; i < state.maxSents; i++){
    if(!state.confirmed.has(i) && _sentStats(i).diffCount === 0){
      state.confirmed.add(i);
      added++;
    }
  }
  renderSentence();
  if(added > 0) _showToast(t('bulk.confirmedN', { n: added }), 'success');
  else          _showToast(t('bulk.confirmedNone'), 'info');
}

// Flag the first token (id=1) of every sentence that has diffs, so they are
// easy to identify and jump to with the f/F shortcut.
function flagAllDiffs(){
  if(state.docs.length < 1 || state.maxSents === 0) return;
  pushUndo();
  let count = 0;
  for(let i = 0; i < state.maxSents; i++){
    if(_sentStats(i).diffCount > 0){
      if(!state.flags[i]) state.flags[i] = new Set();
      // Flag token 1 as a representative marker for the whole sentence.
      const firstId = state.docs[0]?.sentences?.[i]?.tokens?.[0]?.id ?? 1;
      state.flags[i].add(firstId);
      count++;
    }
  }
  renderSentence();
  if(count > 0) _showToast(t('bulk.flaggedN', { n: count }), 'info');
  else          _showToast(t('bulk.flaggedNone'), 'info');
}

// Remove all manual flags across all sentences.
function unflagAll(){
  if(state.docs.length < 1) return;
  pushUndo();
  state.flags = {};
  renderSentence();
  _showToast(t('bulk.unflagged'), 'info');
}

if(confirmAllBtn) confirmAllBtn.addEventListener('click', confirmAllMatching);
if(flagDiffsBtn)  flagDiffsBtn.addEventListener('click',  flagAllDiffs);
if(unflagAllBtn)  unflagAllBtn.addEventListener('click',  unflagAll);

// ── Section visibility ─────────────────────────────────────────────────────────

// Show only section 1 (Files) when no files are loaded; show all sections otherwise.
function _updateSectionVisibility(){
  const wrap = document.querySelector('main.wrap');
  if(!wrap) return;
  const noFiles = state.docs.length === 0;
  wrap.classList.toggle('noFiles', noFiles);
  const sections = wrap.querySelectorAll('section.card');
  sections.forEach((sec, i) => { sec.hidden = noFiles && i > 0; });
}

// Called on page load: auto-load the last saved session if no files are loaded.
// Defined here; actual auto-save logic stays in export.js.
function _autoLoadLastSession(){
  // export.js exposes _tryAutoSaveRestoreAuto() for silent auto-restore
  if(typeof _tryAutoSaveRestoreAuto === 'function') _tryAutoSaveRestoreAuto();
}

// ── Init ───────────────────────────────────────────────────────────────────────
buildDeprelOptionsCache();
DEFAULT_LABELS = JSON.parse(JSON.stringify(LABELS)); // snapshot before any project overrides
initProjects();
_initAutoAdvance();   // restore auto-advance checkbox from localStorage
renderFiles();
renderSentSelect();
renderSentence();
if(typeof renderTagsetList === 'function') renderTagsetList();
renderConlluEditor(true);
// Auto-load session synchronously before first paint to avoid layout shift (CLS)
_autoLoadLastSession();
_updateSectionVisibility();
// ?dev in URL → force-enable dev mode (persisted to localStorage)
if(new URLSearchParams(location.search).has('dev')){
  localStorage.setItem(_DEV_MODE_KEY, '1');
}
renderDevModeBar();
window.addEventListener('load', () => {
  _devModeRestoreSession();
}, { once: true });
