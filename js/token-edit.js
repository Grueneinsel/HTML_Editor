// Token insert/delete helpers, sentence management, and custom annotation utilities.

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
  _showToast(t('token.inserted'), 'success');
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
  _showToast(t('token.deleted'), 'info');
}

// ── Sentence management ────────────────────────────────────────────────────────

// Render sentence add/delete controls + sentence list into #sentManageBar.
function renderSentManage(){
  const bar = document.getElementById("sentManageBar");
  if(!bar) return;
  if(!state.unlocked || state.maxSents === 0){ bar.innerHTML = ""; return; }

  bar.innerHTML = "";

  // ➕ Insert new sentence after current
  const addBtn = document.createElement("button");
  addBtn.className = "sentManageBtn";
  addBtn.textContent = t('sent.addSentBtn');
  addBtn.addEventListener("click", () => {
    pushUndo();
    const newSent = { text: "", tokens: [], comments: [], extras: [] };
    for(const d of state.docs) d.sentences.splice(state.currentSent + 1, 0, JSON.parse(JSON.stringify(newSent)));
    recomputeMaxSents();
    state.currentSent = state.currentSent + 1;
    renderSentSelect();
    renderSentence();
    renderConlluEditor(true);
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
    renderConlluEditor(true);
  });
  bar.appendChild(delBtn);

  // Sentence list — always visible, active sentence highlighted with accent color
  const listPanel = document.createElement("div");
  listPanel.className = "sentListPanel";

  for(let si = 0; si < state.maxSents; si++){
    const row = document.createElement("div");
    row.className = "sentListRow" + (si === state.currentSent ? " sentListRowActive" : "");

    // Sentence number
    const numSpan = document.createElement("span");
    numSpan.className = "sentListNum";
    numSpan.textContent = si + 1;
    row.appendChild(numSpan);

    // Sentence text preview (from first doc that has it)
    let preview = "";
    for(const d of state.docs){
      const s = d.sentences[si];
      if(s){ preview = s.text || s.tokens.map(t => t.form).join(" "); break; }
    }
    const textSpan = document.createElement("span");
    textSpan.className = "sentListText";
    textSpan.textContent = preview || t('sent.missing');
    row.appendChild(textSpan);

    // Status icons
    const iconsSpan = document.createElement("span");
    iconsSpan.className = "sentListIcons";
    if(state.confirmed.has(si)) iconsSpan.appendChild(Object.assign(document.createElement("span"), { textContent: "✓", title: t('sent.confirmed') }));
    if(state.flags[si]?.size > 0) iconsSpan.appendChild(Object.assign(document.createElement("span"), { textContent: "⚑" }));
    row.appendChild(iconsSpan);

    // Click row → navigate to that sentence
    row.addEventListener("click", () => {
      state.currentSent = si;
      renderSentSelect();
      renderSentence();
    });

    listPanel.appendChild(row);
  }

  // Scroll active row into view within the panel — use scrollTop directly
  // to avoid scrollIntoView() propagating up and moving the window scroll position.
  bar.appendChild(listPanel);
  const activeRow = listPanel.querySelector(".sentListRowActive");
  if(activeRow) requestAnimationFrame(() => {
    const top = activeRow.offsetTop;
    const bot = top + activeRow.offsetHeight;
    if(bot > listPanel.scrollTop + listPanel.clientHeight)
      listPanel.scrollTop = bot - listPanel.clientHeight;
    else if(top < listPanel.scrollTop)
      listPanel.scrollTop = top;
  });
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
