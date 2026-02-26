// ---------- Keyboard navigation ----------
let keyFocusTokId = null;

function setKeyFocus(tokId){
  cmpTable.querySelectorAll("tr.keyFocus").forEach(r => r.classList.remove("keyFocus"));
  keyFocusTokId = tokId;
  if(tokId === null) return;
  const tr = cmpTable.querySelector(`tr[data-id="${tokId}"]`);
  if(tr){
    tr.classList.add("keyFocus");
    tr.scrollIntoView({ block:"nearest", behavior:"smooth" });
  }
}

function getTableRows(){
  return Array.from(cmpTable.querySelectorAll("tr[data-id]"));
}

document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  const inInput = active &&
    (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA");

  if(inInput) return;

  switch(e.key){
    case "ArrowLeft":
      if(state.currentSent <= 0) return;
      e.preventDefault();
      state.currentSent--;
      keyFocusTokId = null;
      renderSentence();
      break;

    case "ArrowRight":
      if(state.currentSent >= state.maxSents - 1) return;
      e.preventDefault();
      state.currentSent++;
      keyFocusTokId = null;
      renderSentence();
      break;

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

    case "Escape":
      setKeyFocus(null);
      break;

    default: {
      // 1–9: Doc-Spalte als Gold wählen für fokussierte Zeile
      const num = parseInt(e.key, 10);
      if(isNaN(num) || num < 1 || num > 9) break;
      if(keyFocusTokId === null) break;
      const docIdx = num - 1;
      if(docIdx >= state.docs.length) break;
      if(getCustomEntry(state.currentSent, keyFocusTokId)) break;
      e.preventDefault();
      setDocChoice(state.currentSent, keyFocusTokId, docIdx);
      renderSentence();
      setKeyFocus(keyFocusTokId);
      break;
    }
  }
});
