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

const customInitBtns = document.getElementById("customInitBtns");
const customClearBtn = document.getElementById("customClearBtn");

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

// ---------- Labels init ----------
(async function initLabels(){
  try{
    const res = await fetch("labels.json", {cache:"no-store"});
    if(res.ok){
      const data = await res.json();
      if(data && typeof data === "object") LABELS = data;
    }
  }catch(_){}
  finally{
    buildDeprelOptionsCache();
    renderSentence();
  }
})();

// ---------- UI: Files ----------
function renderFiles(){
  fileList.innerHTML = "";
  fileMeta.textContent = state.docs.length ? `${state.docs.length} Datei(en) geladen` : "Keine Dateien geladen";
  if(state.docs.length === 0){
    fileList.innerHTML = `<div class="muted small">Lade mindestens 2 Dateien zum Vergleichen.</div>`;
    return;
  }
  state.docs.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "fileItem";
    div.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(d.name)}</div>
        <div class="meta">${d.sentences.length} Sätze</div>
      </div>
      <button class="danger">Löschen</button>
    `;
    div.querySelector("button").addEventListener("click", () => removeDoc(idx));
    fileList.appendChild(div);
  });
}

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
renderFiles();
renderSentSelect();
renderSentence();
