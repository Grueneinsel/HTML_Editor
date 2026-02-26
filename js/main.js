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
const dropOverlay     = document.getElementById("dropOverlay");
const textWarn        = document.getElementById("textWarn");

// ---------- Events ----------
fileInput.addEventListener("change", onFilesChosen);
resetBtn.addEventListener("click", resetAll);

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

// Delegation: Custom inputs
cmpTable.addEventListener("input", (e) => {
  const el = e.target;
  if(el instanceof HTMLInputElement && el.dataset.field && el.dataset.id){
    onCustomFieldChange(el);
  }
});
cmpTable.addEventListener("change", (e) => {
  const el = e.target;
  if(el instanceof HTMLSelectElement && el.dataset.field && el.dataset.id){
    onCustomFieldChange(el);
  }
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
      const formsA = ref.sentences[s].tokens.map(t => t.form).join(" ");
      const formsB = other.sentences[s].tokens.map(t => t.form).join(" ");
      if(formsA !== formsB){ warned.add(d); break; }
    }
  }
  return warned;
}

// ---------- UI: Files ----------
function renderFiles(){
  fileList.innerHTML = "";
  fileMeta.textContent = state.docs.length ? `${state.docs.length} Datei(en) geladen` : "Keine Dateien geladen";
  if(state.docs.length === 0){
    fileList.innerHTML = `<div class="muted small">Dateien hier ablegen oder Schaltfläche nutzen · .conllu / .conll / .txt</div>`;
    return;
  }
  const warnedIndices = getWarnedDocIndices();
  state.docs.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "fileItem";
    const warnBadge = warnedIndices.has(idx)
      ? ` <span class="fileWarnIcon" title="Unterschiedlicher Text!">⚠️</span>` : "";
    div.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(d.name)}${warnBadge}</div>
        <div class="meta">${d.sentences.length} Sätze</div>
      </div>
      <button class="danger">Löschen</button>
    `;
    div.querySelector("button").addEventListener("click", () => removeDoc(idx));
    fileList.appendChild(div);
  });

  textWarn.innerHTML = warnedIndices.size > 0
    ? `<div class="textWarnBanner">⚠️ Unterschiedliche Texte geladen — Vergleich möglicherweise fehlerhaft.</div>`
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
  const files = Array.from(e.dataTransfer.files).filter(f =>
    /\.(conllu|conll|txt)$/i.test(f.name)
  );
  if(files.length > 0) processFiles(files);
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
      btn.textContent = `Custom aus "${d.name}"`;
      btn.addEventListener("click", () => initCustomFromDoc(idx));
      customInitBtns.appendChild(btn);
    });
  }
  customClearBtn.disabled = !ok;
  sentSelect.innerHTML = "";
  if(!ok){ sentStats.textContent = ""; return; }
  for(let i=0;i<state.maxSents;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Satz ${i+1}`;
    sentSelect.appendChild(opt);
  }
  sentSelect.value = String(state.currentSent);
  updateExportButtons();
}

// ---------- UI: Column toggle ----------
function renderColToggleBar(){
  colToggleBar.innerHTML = "";
  if(state.docs.length < 2){ return; }
  const label = document.createElement("span");
  label.className = "muted small";
  label.textContent = "Spalten: ";
  colToggleBar.appendChild(label);

  state.docs.forEach((d, idx) => {
    const btn = document.createElement("button");
    btn.className = "colToggle" + (state.hiddenCols.has(idx) ? " colHidden" : " colVisible");
    btn.textContent = d.name;
    btn.title = state.hiddenCols.has(idx) ? "Spalte einblenden" : "Spalte ausblenden";
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
  const sent = ensureCustomSent(state.currentSent);
  for(const t of s.tokens){
    sent[t.id] = { head: t.head ?? null, deprel: t.deprel ?? null };
  }
  renderSentence();
}

function clearCustomForSentence(){
  if(!confirm("Custom für diesen Satz wirklich löschen?")) return;
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
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));
  sentSelect.value = String(state.currentSent);

  const s0 = state.docs[0].sentences[state.currentSent];
  sentText.textContent = s0 ? s0.text : "(Satz fehlt in Datei 1)";
  sentMeta.textContent = `S${state.currentSent+1} / ${state.maxSents}`;

  renderColToggleBar();
  renderCompareTable();
  renderPreview();
}

// ---------- Init ----------
buildDeprelOptionsCache();
renderFiles();
renderSentSelect();
renderSentence();
