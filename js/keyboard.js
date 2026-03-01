// Keyboard navigation and shortcut handler for sentence/token navigation and editing.

let keyFocusTokId = null; // token ID currently highlighted by keyboard focus (null = none)

// Highlight the given token row in the table and sync the sentence-text token highlight.
function setKeyFocus(tokId){
  cmpTable.querySelectorAll("tr.keyFocus").forEach(r => r.classList.remove("keyFocus"));
  keyFocusTokId = tokId;
  // Sync sentText token highlight
  sentText?.querySelectorAll(".sentToken").forEach(s => s.classList.remove("sentTokenActive"));
  if(tokId === null) return;
  const tr = cmpTable.querySelector(`tr[data-id="${tokId}"]`);
  if(tr){
    tr.classList.add("keyFocus");
    tr.scrollIntoView({ block:"nearest", behavior:"smooth" });
  }
  sentText?.querySelector(`.sentToken[data-id="${tokId}"]`)?.classList.add("sentTokenActive");
}

// Return all token rows in document order.
function getTableRows(){
  return Array.from(cmpTable.querySelectorAll("tr[data-id]"));
}

document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  // Inline table editors must not block global shortcuts — treat them as non-input
  const isInlinePos = active?.classList.contains("posInlineSelect") ||
                      active?.classList.contains("posInlineInput");
  const inInput = !isInlinePos && active &&
    (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA");

  // Ctrl+Z → Undo, Ctrl+Y / Ctrl+Shift+Z → Redo (always, even inside inputs)
  if((e.ctrlKey || e.metaKey) && e.key === "z"){
    e.preventDefault();
    undo();
    return;
  }
  if((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "Z" && e.shiftKey))){
    e.preventDefault();
    redo();
    return;
  }

  // ? → toggle help modal (always, even inside inputs)
  if(e.key === "?" && !inInput){
    e.preventDefault();
    const modal = document.getElementById("helpModal");
    if(modal?.classList.contains("active")) closeHelp();
    else openHelp();
    return;
  }

  if(inInput) return;

  switch(e.key){

    // ── Sentence navigation ───────────────────────────────────────────────────
    case "ArrowLeft":
      e.preventDefault();
      if(e.ctrlKey || e.metaKey){
        state.currentSent = 0;
      } else {
        if(state.currentSent <= 0) return;
        state.currentSent--;
      }
      keyFocusTokId = null;
      if(typeof _sentListOpen  !== 'undefined') _sentListOpen  = false;
      renderSentence();
      break;

    case "ArrowRight":
      e.preventDefault();
      if(e.ctrlKey || e.metaKey){
        state.currentSent = Math.max(0, state.maxSents - 1);
      } else {
        if(state.currentSent >= state.maxSents - 1) return;
        state.currentSent++;
      }
      keyFocusTokId = null;
      if(typeof _sentListOpen  !== 'undefined') _sentListOpen  = false;
      renderSentence();
      break;

    // ── Row navigation ────────────────────────────────────────────────────────
    case "ArrowUp": {
      const rows = getTableRows();
      if(!rows.length) return;
      e.preventDefault();
      const idx = rows.findIndex(r => parseInt(r.dataset.id, 10) === keyFocusTokId);
      const next = idx <= 0 ? rows.length - 1 : idx - 1;
      setKeyFocus(parseInt(rows[next].dataset.id, 10));
      break;
    }

    case "ArrowDown": {
      const rows = getTableRows();
      if(!rows.length) return;
      e.preventDefault();
      const idx = rows.findIndex(r => parseInt(r.dataset.id, 10) === keyFocusTokId);
      const next = (idx === -1 || idx === rows.length - 1) ? 0 : idx + 1;
      setKeyFocus(parseInt(rows[next].dataset.id, 10));
      break;
    }

    // ── Open gold popup for the focused row ───────────────────────────────────
    case "Enter": {
      if(keyFocusTokId === null) break;
      e.preventDefault();
      const tr = cmpTable.querySelector(`tr[data-id="${keyFocusTokId}"]`);
      const goldCell = tr?.querySelector("td[data-col='gold']");
      if(goldCell) goldCell.click();
      break;
    }

    // ── Confirm / unconfirm sentence ──────────────────────────────────────────
    case " ":
      e.preventDefault();
      toggleConfirm();
      break;

    // ── Jump to next / previous sentence with diffs ───────────────────────────
    // n = forward, N = backward; wraps around.
    case "n":
    case "N": {
      if(state.maxSents === 0) break;
      e.preventDefault();
      const forward = e.key === "n";
      const step    = forward ? 1 : -1;
      const start   = state.currentSent;
      let found = false;
      for(let i = 1; i < state.maxSents; i++){
        // Modular arithmetic to wrap around in both directions
        const idx = ((start + step * i) % state.maxSents + state.maxSents) % state.maxSents;
        const stats = _sentStats(idx);
        if(stats.diffCount > 0){
          state.currentSent = idx;
          keyFocusTokId = null;
          renderSentence();
          found = true;
          break;
        }
      }
      if(!found) break; // no sentence with diffs found
      break;
    }

    // ── Switch project ────────────────────────────────────────────────────────
    case "[":
      e.preventDefault();
      if(state.activeProjectIdx > 0) switchProject(state.activeProjectIdx - 1);
      break;

    case "]":
      e.preventDefault();
      if(state.activeProjectIdx < state.projects.length - 1)
        switchProject(state.activeProjectIdx + 1);
      break;

    // ── Jump to next / previous sentence with flags ───────────────────────────
    // f = forward, F = backward; wraps around.
    case "f":
    case "F": {
      if(state.maxSents === 0) break;
      e.preventDefault();
      const forward = e.key === "f";
      const step    = forward ? 1 : -1;
      const start   = state.currentSent;
      for(let i = 1; i < state.maxSents; i++){
        const idx = ((start + step * i) % state.maxSents + state.maxSents) % state.maxSents;
        if(state.flags[idx]?.size > 0){
          state.currentSent = idx;
          keyFocusTokId = null;
          renderSentence();
          break;
        }
      }
      break;
    }

    // ── TTS: read current sentence aloud (toggle) ─────────────────────────────
    case "r":
      e.preventDefault();
      if(typeof speakSentence === 'function') speakSentence();
      break;

    // ── Copy current sentence as CoNLL-U to clipboard ─────────────────────────
    case "c":
      e.preventDefault();
      copySentenceConllu();
      break;

    // ── Export shortcuts ──────────────────────────────────────────────────────
    case "e":
      e.preventDefault();
      exportGoldConllu();
      break;

    case "E":
      e.preventDefault();
      exportTreesTxt();
      break;

    // ── Clear custom annotations for current sentence ─────────────────────────
    case "Delete":
    case "Backspace":
      e.preventDefault();
      clearCustomForSentence();
      break;

    // ── Clear keyboard focus and close popup ──────────────────────────────────
    case "Escape":
      setKeyFocus(null);
      break;

    default: {
      const num = parseInt(e.key, 10);
      if(isNaN(num) || num < 1 || num > 9) break;

      // Ctrl+1–9: initialise custom annotations from document N
      if(e.ctrlKey || e.metaKey){
        if(num > state.docs.length) break;
        e.preventDefault();
        initCustomFromDoc(num - 1);
        break;
      }

      // 1–9: choose document N as the gold source for the focused token
      if(keyFocusTokId === null) break;
      const docIdx = num - 1;
      if(docIdx >= state.docs.length) break;
      // Skip if a custom override already exists for this token
      if(getCustomEntry(state.currentSent, keyFocusTokId)) break;
      e.preventDefault();
      setDocChoice(state.currentSent, keyFocusTokId, docIdx);
      renderSentence();
      setKeyFocus(keyFocusTokId);
      break;
    }
  }
});
