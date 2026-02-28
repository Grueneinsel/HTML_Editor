// Undo/redo stack management and session serialisation for annotation history.

// ── Undo / Redo ───────────────────────────────────────────────────────────────
const _undoStack = [];
const _redoStack = [];
const UNDO_MAX   = 80; // maximum number of snapshots kept on either stack

// Capture a lightweight snapshot of the mutable annotation state.
function _snapshot(){
  return {
    custom:   JSON.parse(JSON.stringify(state.custom)),
    goldPick: JSON.parse(JSON.stringify(state.goldPick)),
    confirmed: new Set(state.confirmed),
  };
}

// Overwrite live state from a previously captured snapshot.
function _restore(snap){
  state.custom    = snap.custom;
  state.goldPick  = snap.goldPick;
  state.confirmed = snap.confirmed;
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
  _syncUndoBtns();
}

function redo(){
  if(!_redoStack.length) return;
  _undoStack.push(_snapshot());
  _restore(_redoStack.pop());
  renderSentence();
  _syncUndoBtns();
}

// Update the disabled state and tooltip of the Undo/Redo toolbar buttons.
function _syncUndoBtns(){
  const u = document.getElementById("undoBtn");
  const r = document.getElementById("redoBtn");
  if(u) u.disabled = _undoStack.length === 0;
  if(r) r.disabled = _redoStack.length === 0;
  if(u) u.title = t('undo.title', { n: _undoStack.length, s: tpSuffix(_undoStack.length, 'undo') });
  if(r) r.title = t('redo.title', { n: _redoStack.length, s: tpSuffix(_redoStack.length, 'undo') });
}

// ── Session serialisation helpers ─────────────────────────────────────────────

// Serialise both stacks to plain JSON-safe objects for session export.
// Sets (confirmed) are converted to arrays so they survive JSON round-trips.
function getUndoState(){
  const ser = snap => ({
    custom:    JSON.parse(JSON.stringify(snap.custom)),
    goldPick:  JSON.parse(JSON.stringify(snap.goldPick)),
    confirmed: Array.from(snap.confirmed),
  });
  return { undo: _undoStack.map(ser), redo: _redoStack.map(ser) };
}

// Deserialise stacks from a previously exported session object.
function loadUndoState({ undo = [], redo = [] }){
  const des = s => ({
    custom:    JSON.parse(JSON.stringify(s.custom   || {})),
    goldPick:  JSON.parse(JSON.stringify(s.goldPick || {})),
    confirmed: new Set(s.confirmed || []),
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
