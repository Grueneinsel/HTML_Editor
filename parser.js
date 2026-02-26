// ---------- CoNLL-U Parser ----------
function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, "utf-8");
  });
}

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
    if(line.trim() === ""){ push(); continue; }
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
    const form   = cols[1] || "_";
    const upos   = cols[3] || "_";
    const xpos   = cols[4] || "_";
    const head   = /^\d+$/.test(cols[6]) ? parseInt(cols[6], 10) : null;
    const deprel = cols[7] || "_";
    tokens.push({ id, form, upos, xpos, head, deprel });
  }
  push();
  return { sentences };
}

function fileKey(f){
  return `${f.name}::${f.size}::${f.lastModified}`;
}

// ---------- File management ----------
async function processFiles(files){
  for(const f of files){
    const key = fileKey(f);
    if(state.docs.some(d => d.key === key)) continue;
    const text = await readFileAsText(f);
    const doc = parseConllu(text);
    state.docs.push({ key, name: f.name, sentences: doc.sentences });
  }
  recomputeMaxSents();
  state.currentSent = 0;
  renderFiles();
  renderSentSelect();
  renderSentence();
}

async function onFilesChosen(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0) return;
  await processFiles(files);
  fileInput.value = "";
}

function removeDoc(index){
  state.docs.splice(index, 1);
  state.hiddenCols.delete(index);
  const newHidden = new Set();
  for(const v of state.hiddenCols){
    if(v > index) newHidden.add(v - 1);
    else if(v < index) newHidden.add(v);
  }
  state.hiddenCols = newHidden;

  for(const sKey of Object.keys(state.goldPick)){
    const m = state.goldPick[sKey];
    for(const tKey of Object.keys(m)){
      const v = m[tKey];
      if(typeof v !== "number") continue;
      if(v === index) m[tKey] = 0;
      else if(v > index) m[tKey] = v - 1;
    }
  }
  recomputeMaxSents();
  state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));
  renderFiles();
  renderSentSelect();
  renderSentence();
}

function resetAll(){
  if(!confirm("Wirklich alles zurücksetzen?")) return;
  state.docs = [];
  state.custom = {};
  state.goldPick = {};
  state.hiddenCols = new Set();
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
