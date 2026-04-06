// Undo/redo stack management and session serialisation for annotation history.

// ── Undo / Redo ───────────────────────────────────────────────────────────────
const _undoStack = [];
const _redoStack = [];
const UNDO_MAX   = 80; // maximum number of snapshots kept on either stack

function _cloneFlags(flags){
  const out = {};
  for(const [k, v] of Object.entries(flags || {})){
    const arr = v instanceof Set ? Array.from(v) : (Array.isArray(v) ? v : []);
    if(arr.length > 0) out[k] = new Set(arr);
  }
  return out;
}

// Capture a lightweight snapshot of the mutable annotation state.
// Also saves a shallow copy of the current sentence's tokens from each doc
// so that direct edits to d.sentences (arc editing) can be undone.
function _snapshot(){
  return {
    custom:    JSON.parse(JSON.stringify(state.custom)),
    goldPick:  JSON.parse(JSON.stringify(state.goldPick)),
    confirmed: new Set(state.confirmed),
    notes:     JSON.parse(JSON.stringify(state.notes)),
    flags:     _cloneFlags(state.flags),
    currentSent: state.currentSent,
    maxSents:    state.maxSents,
    hiddenCols:  new Set(state.hiddenCols),
    docSentences: state.docs.map(d => JSON.parse(JSON.stringify(d.sentences || []))),
  };
}

// Overwrite live state from a previously captured snapshot.
function _restore(snap){
  // Deep-clone to prevent later state mutations from corrupting the snapshot
  // still sitting in the undo/redo stack.
  state.custom    = JSON.parse(JSON.stringify(snap.custom));
  state.goldPick  = JSON.parse(JSON.stringify(snap.goldPick));
  state.confirmed = new Set(snap.confirmed);
  state.notes     = JSON.parse(JSON.stringify(snap.notes || {}));
  state.flags     = _cloneFlags(snap.flags || {});
  state.currentSent = snap.currentSent ?? state.currentSent;
  state.maxSents    = snap.maxSents ?? state.maxSents;
  state.hiddenCols  = new Set(snap.hiddenCols || []);
  // Annotations for any sentence may have changed — wipe the entire stats cache.
  _invalidateStatsCache();
  if(snap.docSentences != null){
    state.docs.forEach((d, i) => {
      const sents = snap.docSentences[i];
      if(!sents) return;
      d.sentences = JSON.parse(JSON.stringify(sents));
    });
  }
}

// Push the current state onto the undo stack before a destructive edit.
// Clears the redo stack so that branching histories don't accumulate.
function pushUndo(){
  _undoStack.push(_snapshot());
  if(_undoStack.length > UNDO_MAX) _undoStack.shift();
  _redoStack.length = 0;
  _syncUndoBtns();
}

function undo(){
  if(!_undoStack.length) return;
  _redoStack.push(_snapshot());
  _restore(_undoStack.pop());
  renderSentence();
  if(typeof renderConlluEditor === 'function') renderConlluEditor(true);
  _syncUndoBtns();
}

function redo(){
  if(!_redoStack.length) return;
  _undoStack.push(_snapshot());
  _restore(_redoStack.pop());
  renderSentence();
  if(typeof renderConlluEditor === 'function') renderConlluEditor(true);
  _syncUndoBtns();
}

// Update the disabled state and tooltip of the Undo/Redo toolbar buttons.
function _syncUndoBtns(){
  const u = document.getElementById("undoBtn");
  const r = document.getElementById("redoBtn");
  if(u) u.disabled = _undoStack.length === 0;
  if(r) r.disabled = _redoStack.length === 0;
  const topUndo = _undoStack[_undoStack.length - 1];
  const topRedo = _redoStack[_redoStack.length - 1];
  const sentSuffix = snap => snap?.currentSent != null ? ` (S${snap.currentSent + 1})` : '';
  if(u) u.title = t('undo.title', { n: _undoStack.length, s: tpSuffix(_undoStack.length, 'undo') }) + sentSuffix(topUndo);
  if(r) r.title = t('redo.title', { n: _redoStack.length, s: tpSuffix(_redoStack.length, 'redo') }) + sentSuffix(topRedo);
}

// ── Session serialisation helpers ─────────────────────────────────────────────

// Serialise both stacks to plain JSON-safe objects for session export.
// Sets (confirmed) are converted to arrays so they survive JSON round-trips.
function getUndoState(){
  const ser = snap => ({
    custom:    JSON.parse(JSON.stringify(snap.custom)),
    goldPick:  JSON.parse(JSON.stringify(snap.goldPick)),
    confirmed: Array.from(snap.confirmed),
    notes:     JSON.parse(JSON.stringify(snap.notes || {})),
    flags:     Object.fromEntries(Object.entries(snap.flags || {}).map(([k, v]) => [k, Array.from(v)])),
    currentSent: snap.currentSent ?? null,
    maxSents:    snap.maxSents ?? null,
    hiddenCols:  Array.from(snap.hiddenCols || []),
    docSentences: snap.docSentences ? snap.docSentences.map(sents => JSON.parse(JSON.stringify(sents))) : null,
  });
  return { undo: _undoStack.map(ser), redo: _redoStack.map(ser) };
}

// Deserialise stacks from a previously exported session object.
function loadUndoState({ undo = [], redo = [] }){
  const des = s => ({
    custom:    JSON.parse(JSON.stringify(s.custom   || {})),
    goldPick:  JSON.parse(JSON.stringify(s.goldPick || {})),
    confirmed: new Set(s.confirmed || []),
    notes:     JSON.parse(JSON.stringify(s.notes || {})),
    flags:     _cloneFlags(s.flags || {}),
    currentSent: s.currentSent ?? null,
    maxSents:    s.maxSents ?? null,
    hiddenCols:  new Set(s.hiddenCols || []),
    docSentences: s.docSentences ? s.docSentences.map(sents => JSON.parse(JSON.stringify(sents))) : null,
  });
  _undoStack.length = 0;
  _redoStack.length = 0;
  for(const s of undo) _undoStack.push(des(s));
  for(const s of redo) _redoStack.push(des(s));
  _syncUndoBtns();
}

// Bind undo/redo buttons once the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);
});
