// Sentence selector, sentence minimap, flags, and confirmation state.

// ── Stats cache ────────────────────────────────────────────────────────────────
// Sentence stats are expensive to compute (O(tokens × docs × cols)) and change
// only when annotations change — not when confirmed/flags/notes are toggled.
// The cache is invalidated precisely on data changes and fully on structural changes
// (file load, undo/redo, project switch, reset).

let _statsCache = null;

// Invalidate one sentence (sentIdx) or the entire cache (no argument).
function _invalidateStatsCache(sentIdx){
  if(sentIdx == null) _statsCache = null;
  else if(_statsCache) _statsCache.delete(sentIdx);
}

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

// Compute diff/token statistics for a sentence index. Results are cached and
// reused across renderSentSelectOptions / renderSentMap calls within the same
// render cycle, and across renders when no annotation data has changed.
function _sentStats(i){
  if(!_statsCache) _statsCache = new Map();
  if(_statsCache.has(i)) return _statsCache.get(i);
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
  const result  = computeStats(i, idList, docMaps, goldMap);
  _statsCache.set(i, result);
  return result;
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
  if(typeof renderProjectTabs === "function") renderProjectTabs();
  // Green flash on sentText when confirming (not unconfirming)
  if(!wasConfirmed){
    const st = document.getElementById('sentText');
    if(st){
      st.classList.remove('sentConfirmFlash');
      void st.offsetWidth; // restart animation
      st.classList.add('sentConfirmFlash');
      st.addEventListener('animationend', () => st.classList.remove('sentConfirmFlash'), { once: true });
    }
  }
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
  const frag = document.createDocumentFragment();
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
    // First few words of the sentence as a preview label
    const sent = state.docs[0]?.sentences[i];
    const preview = sent ? sent.tokens.slice(0, 6).map(tk => tk.form).join(' ') + (sent.tokens.length > 6 ? '…' : '') : '';
    const note = state.notes[i]?.trim();
    const noteHint = note ? `  📝${note.length > 20 ? note.slice(0,20) + '…' : note}` : '';
    opt.textContent = `${t('sent.optLabel', { n: i+1 })}${confirmed ? ' ★' : ''}${flagPart}  (${stats.totalTokens} Tok${diffPart})${preview ? '  ' + preview : ''}${noteHint}`;
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
    frag.appendChild(opt);
  }
  sentSelect.innerHTML = "";
  sentSelect.appendChild(frag);
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
  // Note indicator: show when current sentence has a non-empty note
  const indicator = document.getElementById("sentNoteIndicator");
  if(indicator){
    const hasNote = ok && !!state.notes[state.currentSent]?.trim();
    indicator.style.display = hasNote ? "" : "none";
  }
}

// Re-render the minimap of sentence dots below the sentence selector.
function renderSentMap(){
  if(!sentMap) return;
  if(state.docs.length < 1 || state.maxSents === 0){ sentMap.innerHTML = ""; return; }
  const frag = document.createDocumentFragment();
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
    const dotSent = state.docs[0]?.sentences[i];
    const dotPreview = dotSent ? dotSent.tokens.slice(0, 6).map(tk => tk.form).join(' ') + (dotSent.tokens.length > 6 ? '…' : '') : '';
    dot.title = t(confirmed ? 'sent.dotTitleConf' : (hasFlags ? 'flag.sentDot' : 'sent.dotTitle'), {
      n: i + 1, toks: stats.totalTokens, diffs: stats.diffCount
    }) + (dotPreview ? `\n"${dotPreview}"` : '');
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
    frag.appendChild(dot);
  }
  sentMap.innerHTML = "";
  sentMap.appendChild(frag);
}

// ── Flags ──────────────────────────────────────────────────────────────────────

// Toggle the flag for a single token and update the row, minimap, and selector in place.
function toggleFlag(sentIdx, tokId){
  pushUndo();
  if(!state.flags[sentIdx]) state.flags[sentIdx] = new Set();
  const s = state.flags[sentIdx];
  if(s.has(tokId)){
    s.delete(tokId);
    if(s.size === 0) delete state.flags[sentIdx];
  } else {
    s.add(tokId);
  }
  // Update row, button, and sentText span in-place (no full re-render needed)
  const tr  = cmpTable.querySelector(`tr[data-id="${tokId}"]`);
  const btn = tr?.querySelector(".flagBtn");
  const isFlagged = !!state.flags[sentIdx]?.has(tokId);
  if(btn)  btn.classList.toggle("flagBtnActive", isFlagged);
  if(tr)   tr.classList.toggle("rowFlagged", isFlagged);
  // Also update sentText token spans (both read-only and editable modes)
  const span = sentText.querySelector(`[data-id="${tokId}"]`);
  if(span) span.classList.toggle("sentTokenFlagged", isFlagged);
  // Reflect flag change in the minimap and dropdown (renderSentSelectOptions calls renderSentMap)
  renderSentSelectOptions();
}
