// CoNLL-U file parser, file-key generation, and file management (load, remove, reorder).

// ── CoNLL-U Parser ────────────────────────────────────────────────────────────

// Read a File object as UTF-8 text using the FileReader API.
function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, "utf-8");
  });
}

// Parse a CoNLL-U text string into a structured {sentences} object.
// Handles multi-word tokens (MWT), empty nodes, and sentence-level comments.
function parseConllu(text){
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sentences = [];
  let tokens   = [];
  let textLine = null;
  let comments = [];  // all # lines preserved verbatim
  let extras   = [];  // MWT and empty-node lines: {type:"mwt"|"empty", insertBefore, raw}

  // Flush the current token buffer into a new sentence entry.
  const push = () => {
    if(tokens.length === 0 && comments.length === 0) return;
    const fallbackText = tokens.map(t => t.form).join(" ");
    sentences.push({ text: textLine || fallbackText, tokens, comments: [...comments], extras: [...extras] });
    tokens   = [];
    textLine = null;
    comments = [];
    extras   = [];
  };

  for(const line0 of lines){
    const line = line0.trimEnd();
    if(line.trim() === ""){ push(); continue; }
    if(line.startsWith("#")){
      comments.push(line);
      // Extract the sentence text from the "# text = …" metadata line.
      const m = line.match(/^#\s*text\s*=\s*(.*)$/i);
      if(m) textLine = m[1];
      continue;
    }
    const cols = line.split("\t");
    if(cols.length < 2) continue;
    const idRaw = cols[0];
    if(idRaw.includes("-")){
      // Multi-word token: output before the first token of the range
      const insertBefore = parseInt(idRaw.split("-")[0], 10);
      extras.push({ type: "mwt", insertBefore, raw: line });
      continue;
    }
    if(idRaw.includes(".")){
      // Empty node: output after its integer anchor, so insertBefore = anchor + 1
      const insertBefore = parseInt(idRaw.split(".")[0], 10) + 1;
      extras.push({ type: "empty", insertBefore, raw: line });
      continue;
    }
    if(!/^\d+$/.test(idRaw)) continue;
    if(cols.length < 8) continue;
    const id = parseInt(idRaw, 10);
    const head = /^\d+$/.test(cols[6]) ? parseInt(cols[6], 10) : null;
    tokens.push({
      id,
      form:   cols[1] || "_",
      lemma:  cols[2] || "_",
      upos:   cols[3] || "_",
      xpos:   cols[4] || "_",
      feats:  cols[5] || "_",
      head,
      deprel: cols[7] || "_",
      deps:   cols[8] || "_",
      misc:   cols[9] || "_",
    });
  }
  push();
  return { sentences };
}

// Produce a stable identity key for a File object based on name, size, and last-modified time.
function fileKey(f){
  return `${f.name}::${f.size}::${f.lastModified}`;
}

// ── File management ───────────────────────────────────────────────────────────

// Parse an array of File objects and delegate them to autoAssignToProjects().
// Files already present in the current project (matched by key) are skipped.
async function processFiles(files){
  const parsed = [];
  for(const f of files){
    const key = fileKey(f);
    // Skip if already present in the current project
    if(state.docs.some(d => d.key === key)) continue;
    const text = await readFileAsText(f);
    const doc = parseConllu(text);
    parsed.push({ key, name: f.name, content: text, sentences: doc.sentences });
  }
  // Delegate to project-aware assignment (defined in projects.js)
  autoAssignToProjects(parsed);
}

// Handler for the file <input> change event.
async function onFilesChosen(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0) return;
  fileInput.value = "";
  await _dispatchFiles(files);
}

// Remove a document by index from the current project, then remap all
// dependent index references (hiddenCols, goldPick) accordingly.
function removeDoc(index){
  state.docs.splice(index, 1);
  state.hiddenCols.delete(index);
  // Shift indices above the removed doc down by 1
  const newHidden = new Set();
  for(const v of state.hiddenCols){
    if(v > index) newHidden.add(v - 1);
    else if(v < index) newHidden.add(v);
  }
  state.hiddenCols = newHidden;

  // Remap goldPick: picks pointing at the removed doc default to 0
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

// Swap the positions of two documents and remap hiddenCols / goldPick accordingly.
function moveDoc(idx, dir){
  const other = idx + dir;
  if(other < 0 || other >= state.docs.length) return;

  // Swap docs
  [state.docs[idx], state.docs[other]] = [state.docs[other], state.docs[idx]];

  // Remap hiddenCols: swap entries for the two affected indices
  const newHidden = new Set();
  for(const v of state.hiddenCols){
    if(v === idx)   newHidden.add(other);
    else if(v === other) newHidden.add(idx);
    else newHidden.add(v);
  }
  state.hiddenCols = newHidden;

  // Remap goldPick: swap values idx <-> other so picks follow the moved docs
  for(const sKey of Object.keys(state.goldPick)){
    const m = state.goldPick[sKey];
    for(const tKey of Object.keys(m)){
      const v = m[tKey];
      if(typeof v !== "number") continue;
      if(v === idx)   m[tKey] = other;
      else if(v === other) m[tKey] = idx;
    }
  }

  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Reset only the current project (docs, annotations, undo). Other projects untouched. */
function resetProject(){
  if(!confirm(t('files.resetConfirm'))) return;
  state.docs        = [];
  state.custom      = {};
  state.goldPick    = {};
  state.notes       = {};
  state.flags       = {};
  state.hiddenCols  = new Set();
  state.confirmed   = new Set();
  state.currentSent = 0;
  state.maxSents    = 0;
  loadUndoState({ undo: [], redo: [] });
  fileInput.value   = "";
  _saveActiveProject();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Reset ALL projects — full application reset. */
function resetAll(){
  if(!confirm(t('files.globalResetConfirm'))) return;
  state.docs        = [];
  state.custom      = {};
  state.goldPick    = {};
  state.notes       = {};
  state.flags       = {};
  state.hiddenCols  = new Set();
  state.confirmed   = new Set();
  state.currentSent = 0;
  state.maxSents    = 0;
  state.projects    = [_emptyProject(`${t('project.default')} 1`)];
  state.activeProjectIdx = 0;
  loadUndoState({ undo: [], redo: [] });
  fileInput.value   = "";
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

// Recompute state.maxSents as the length of the longest loaded document.
function recomputeMaxSents(){
  state.maxSents = Math.max(0, ...state.docs.map(d => d.sentences.length), 0);
}
