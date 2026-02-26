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

  // ? → Help modal (immer, auch in Inputs)
  if(e.key === "?" && !inInput){
    e.preventDefault();
    const modal = document.getElementById("helpModal");
    if(modal?.classList.contains("active")) closeHelp();
    else openHelp();
    return;
  }

  if(inInput) return;

  switch(e.key){

    // ── Satz-Navigation ──────────────────────────────────────────────────────
    case "ArrowLeft":
      e.preventDefault();
      if(e.ctrlKey || e.metaKey){
        state.currentSent = 0;
      } else {
        if(state.currentSent <= 0) return;
        state.currentSent--;
      }
      keyFocusTokId = null;
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
      renderSentence();
      break;

    // ── Zeilen-Navigation ────────────────────────────────────────────────────
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

    // ── Gold-Popup für fokussierte Zeile öffnen ───────────────────────────────
    case "Enter": {
      if(keyFocusTokId === null) break;
      e.preventDefault();
      const tr = cmpTable.querySelector(`tr[data-id="${keyFocusTokId}"]`);
      const goldCell = tr?.querySelector("td[data-col='gold']");
      if(goldCell) goldCell.click();
      break;
    }

    // ── Gold bestätigen ──────────────────────────────────────────────────────
    case " ":
      e.preventDefault();
      toggleConfirm();
      break;

    // ── Export ───────────────────────────────────────────────────────────────
    case "e":
      e.preventDefault();
      exportGoldConllu();
      break;

    case "E":
      e.preventDefault();
      exportTreesTxt();
      break;

    // ── Custom löschen ───────────────────────────────────────────────────────
    case "Delete":
    case "Backspace":
      e.preventDefault();
      clearCustomForSentence();
      break;

    // ── Escape: Fokus + Popup schließen ──────────────────────────────────────
    case "Escape":
      setKeyFocus(null);
      break;

    default: {
      const num = parseInt(e.key, 10);
      if(isNaN(num) || num < 1 || num > 9) break;

      // Ctrl+1–9: Custom aus Datei N laden
      if(e.ctrlKey || e.metaKey){
        if(num > state.docs.length) break;
        e.preventDefault();
        initCustomFromDoc(num - 1);
        break;
      }

      // 1–9: Doc-Spalte als Gold wählen für fokussierte Zeile
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
