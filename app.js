// CoNLL-U Vergleich (v1) - simpel, mit Nachladen/Löschen/Reset

const state = {
  docs: [],       // [{key, name, sentences:[{text, tokens:[] }]}]
  currentSent: 0,
  maxSents: 0,
};

const fileInput = document.getElementById("fileInput");
const addBtn    = document.getElementById("addBtn");
const resetBtn  = document.getElementById("resetBtn");
const fileList  = document.getElementById("fileList");
const fileMeta  = document.getElementById("fileMeta");

const sentSelect = document.getElementById("sentSelect");
const prevBtn    = document.getElementById("prevBtn");
const nextBtn    = document.getElementById("nextBtn");
const sentMeta   = document.getElementById("sentMeta");
const sentText   = document.getElementById("sentText");
const cmpTable   = document.getElementById("cmpTable");

addBtn.addEventListener("click", () => fileInput.click());
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

function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, "utf-8");
  });
}

// Minimaler Parser: ignoriert Kommentare, Multiword-Tokens, nimmt Spalten 1,6,7
function parseConllu(text){
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sentences = [];
  let tokens = [];
  let textLine = null;

  const push = () => {
    if(tokens.length === 0 && !textLine) return;
    const fallbackText = tokens.map(t => t.form).join(" ");
    sentences.push({ text: textLine || fallbackText, tokens });
    tokens = [];
    textLine = null;
  };

  for(const line0 of lines){
    const line = line0.trimEnd();
    if(line.trim() === ""){
      push();
      continue;
    }
    if(line.startsWith("#")){
      const m = line.match(/^#\s*text\s*=\s*(.*)$/i);
      if(m) textLine = m[1];
      continue;
    }

    const cols = line.split("\t");
    if(cols.length < 8) continue;

    const idRaw = cols[0];
    if(idRaw.includes("-") || idRaw.includes(".")) continue;
    if(!/^\d+$/.test(idRaw)) continue;

    const id = parseInt(idRaw, 10);
    const form = cols[1] || "_";
    const head = /^\d+$/.test(cols[6]) ? parseInt(cols[6], 10) : null;
    const deprel = cols[7] || "_";
    tokens.push({ id, form, head, deprel });
  }
  push();
  return { sentences };
}

function fileKey(f){
  // ausreichend stabil zum Duplikate vermeiden
  return `${f.name}::${f.size}::${f.lastModified}`;
}

async function onFilesChosen(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0) return;

  for(const f of files){
    const key = fileKey(f);
    if(state.docs.some(d => d.key === key)) continue; // schon geladen

    const text = await readFileAsText(f);
    const doc = parseConllu(text);
    state.docs.push({ key, name: f.name, sentences: doc.sentences });
  }

  fileInput.value = ""; // wichtig: damit gleiche Dateien erneut gewählt werden können
  recomputeMaxSents();
  state.currentSent = 0;

  renderFiles();
  renderSentSelect();
  renderSentence();
}

function removeDoc(index){
  state.docs.splice(index, 1);
  recomputeMaxSents();
  state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));
  renderFiles();
  renderSentSelect();
  renderSentence();
}

function resetAll(){
  if(!confirm("Wirklich alles zurücksetzen?")) return;
  state.docs = [];
  state.currentSent = 0;
  state.maxSents = 0;
  fileInput.value = "";
  renderFiles();
  renderSentSelect();
  renderSentence();
}

function recomputeMaxSents(){
  state.maxSents = Math.max(0, ...state.docs.map(d => d.sentences.length), 0);
}

function renderFiles(){
  fileList.innerHTML = "";
  fileMeta.textContent = state.docs.length
    ? `${state.docs.length} Datei(en) geladen`
    : "Keine Dateien geladen";

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
      <button class="danger" data-idx="${idx}">Löschen</button>
    `;
    div.querySelector("button").addEventListener("click", () => removeDoc(idx));
    fileList.appendChild(div);
  });
}

function renderSentSelect(){
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  sentSelect.disabled = !ok;
  prevBtn.disabled = !ok;
  nextBtn.disabled = !ok;

  sentSelect.innerHTML = "";
  if(!ok) return;

  for(let i=0;i<state.maxSents;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Satz ${i+1}`;
    sentSelect.appendChild(opt);
  }
  sentSelect.value = String(state.currentSent);
}

function renderSentence(){
  const ok = state.docs.length >= 2 && state.maxSents > 0;
  if(!ok){
    sentText.textContent = "";
    cmpTable.innerHTML = "";
    sentMeta.textContent = "";
    return;
  }

  state.currentSent = Math.max(0, Math.min(state.currentSent, state.maxSents - 1));
  sentSelect.value = String(state.currentSent);

  const s0 = state.docs[0].sentences[state.currentSent];
  sentText.textContent = s0 ? s0.text : "(Satz fehlt in Datei 1)";
  sentMeta.textContent = `S${state.currentSent+1} / ${state.maxSents}`;

  const maps = state.docs.map(d => {
    const s = d.sentences[state.currentSent];
    const m = new Map();
    if(s) for(const t of s.tokens) m.set(t.id, t);
    return m;
  });

  const ids = new Set();
  for(const m of maps) for(const id of m.keys()) ids.add(id);
  const idList = Array.from(ids).sort((a,b)=>a-b);

  let html = "<thead><tr>";
  html += "<th>ID</th><th>FORM</th>";
  for(const d of state.docs){
    html += `<th>${escapeHtml(d.name)}</th>`;
  }
  html += "</tr></thead><tbody>";

  for(const id of idList){
    let form = "—";
    for(const m of maps){
      const t = m.get(id);
      if(t){ form = t.form; break; }
    }

    const values = maps.map(m => {
      const t = m.get(id);
      if(!t) return "—";
      return `${t.head ?? "_"} / ${t.deprel ?? "_"}`;
    });

    const nonMissing = values.filter(v => v !== "—");
    const unique = new Set(nonMissing);
    const isDiff = unique.size > 1;

    html += "<tr>";
    html += `<td>${id}</td>`;
    html += `<td>${escapeHtml(form)}</td>`;
    for(const v of values){
      const cls = (v === "—") ? "" : (isDiff ? "diff" : "same");
      html += `<td class="${cls}">${escapeHtml(v)}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody>";
  cmpTable.innerHTML = html;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// Initial render
renderFiles();
renderSentSelect();
renderSentence();
