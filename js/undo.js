// ---------- Undo / Redo ----------
const _undoStack = [];
const _redoStack = [];
const UNDO_MAX   = 80;

function _snapshot(){
  return {
    custom:   JSON.parse(JSON.stringify(state.custom)),
    goldPick: JSON.parse(JSON.stringify(state.goldPick)),
    confirmed: new Set(state.confirmed),
  };
}

function _restore(snap){
  state.custom    = snap.custom;
  state.goldPick  = snap.goldPick;
  state.confirmed = snap.confirmed;
}

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

function _syncUndoBtns(){
  const u = document.getElementById("undoBtn");
  const r = document.getElementById("redoBtn");
  if(u) u.disabled = _undoStack.length === 0;
  if(r) r.disabled = _redoStack.length === 0;
  if(u) u.title = `Rückgängig (Ctrl+Z)  —  ${_undoStack.length} Schritt${_undoStack.length !== 1 ? 'e' : ''}`;
  if(r) r.title = `Wiederholen (Ctrl+Y)  —  ${_redoStack.length} Schritt${_redoStack.length !== 1 ? 'e' : ''}`;
}

// ---------- Session serialisation helpers ----------
function getUndoState(){
  const ser = snap => ({
    custom:    JSON.parse(JSON.stringify(snap.custom)),
    goldPick:  JSON.parse(JSON.stringify(snap.goldPick)),
    confirmed: Array.from(snap.confirmed),
  });
  return { undo: _undoStack.map(ser), redo: _redoStack.map(ser) };
}

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

// Buttons werden nach DOM-Bereitschaft angebunden
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);
});
