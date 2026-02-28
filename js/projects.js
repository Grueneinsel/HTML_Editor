// Project management: create, switch, rename, delete, reorder, and auto-assign documents to projects.

// ── Internal helpers ──────────────────────────────────────────────────────────

// Return a blank project skeleton with all fields initialised to empty defaults.
function _emptyProject(name){
  return {
    name,
    docs:        [],
    custom:      {},
    goldPick:    {},
    confirmed:   [],   // serialised Set (array of ints)
    notes:       {},
    flags:       {},   // serialised: { sentIdx: tokId[] }
    currentSent: 0,
    maxSents:    0,
    hiddenCols:  [],   // serialised Set (array of ints)
    undoStack:   [],
    redoStack:   [],
    labels:      null, // null → use DEFAULT_LABELS; object → project-specific tagset
  };
}

/** Serialize state.flags → plain object { sentIdx: tokId[] } */
function _serializeFlags(flags){
  const out = {};
  for(const [k, v] of Object.entries(flags)){
    const arr = v instanceof Set ? Array.from(v) : (Array.isArray(v) ? v : []);
    if(arr.length > 0) out[k] = arr;
  }
  return out;
}

/** Deserialize stored flags → { sentIdx(number): Set<tokId> } */
function _deserializeFlags(raw){
  const out = {};
  for(const [k, v] of Object.entries(raw || {})){
    const arr = Array.isArray(v) ? v : [];
    if(arr.length > 0) out[Number(k)] = new Set(arr);
  }
  return out;
}

/** Save live state → projects[activeProjectIdx] */
function _saveActiveProject(){
  if(!state.projects.length) return;
  const { undo, redo } = getUndoState();
  state.projects[state.activeProjectIdx] = {
    name:        state.projects[state.activeProjectIdx].name,
    docs:        state.docs,
    custom:      JSON.parse(JSON.stringify(state.custom)),
    goldPick:    JSON.parse(JSON.stringify(state.goldPick)),
    confirmed:   Array.from(state.confirmed),
    notes:       JSON.parse(JSON.stringify(state.notes)),
    flags:       _serializeFlags(state.flags),
    currentSent: state.currentSent,
    maxSents:    state.maxSents,
    hiddenCols:  Array.from(state.hiddenCols),
    undoStack:   undo,
    redoStack:   redo,
    labels:      JSON.parse(JSON.stringify(LABELS)),
  };
}

/** Load projects[activeProjectIdx] → live state */
function _loadActiveProject(){
  const p = state.projects[state.activeProjectIdx];
  state.docs        = p.docs       || [];
  state.custom      = JSON.parse(JSON.stringify(p.custom    || {}));
  state.goldPick    = JSON.parse(JSON.stringify(p.goldPick  || {}));
  state.confirmed   = new Set(p.confirmed || []);
  state.notes       = JSON.parse(JSON.stringify(p.notes     || {}));
  state.flags       = _deserializeFlags(p.flags || {});
  state.currentSent = p.currentSent || 0;
  state.maxSents    = p.maxSents    || 0;
  state.hiddenCols  = new Set(p.hiddenCols || []);
  loadUndoState({ undo: p.undoStack || [], redo: p.redoStack || [] });
  // Restore project-specific tagset (fall back to default when null)
  LABELS = JSON.parse(JSON.stringify(p.labels || DEFAULT_LABELS || {}));
  buildDeprelOptionsCache();
  if(typeof _resetPopup === "function") _resetPopup();
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Called once on page-load to set up the default project. */
function initProjects(){
  if(state.projects.length === 0){
    const name = `${t('project.default')} 1`;
    state.projects.push(_emptyProject(name));
    state.activeProjectIdx = 0;
  }
  renderProjectTabs();
}

/** Switch to project at idx (save current first). */
function switchProject(idx){
  if(idx === state.activeProjectIdx) return;
  _saveActiveProject();
  state.activeProjectIdx = idx;
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Create a new empty project and switch to it. */
function createProject(name){
  _saveActiveProject();
  const n = name || `${t('project.default')} ${state.projects.length + 1}`;
  state.projects.push(_emptyProject(n));
  state.activeProjectIdx = state.projects.length - 1;
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Delete project at idx. Requires >1 project. */
function deleteProject(idx){
  if(state.projects.length <= 1) return;
  const name = state.projects[idx].name;
  if(!confirm(t('project.deleteConfirm', { name }))) return;
  state.projects.splice(idx, 1);
  // Keep activeProjectIdx valid after removal
  if(state.activeProjectIdx >= state.projects.length){
    state.activeProjectIdx = state.projects.length - 1;
  } else if(state.activeProjectIdx > idx){
    state.activeProjectIdx--;
  }
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Rename project at idx. */
function renameProject(idx, name){
  if(!name || !name.trim()) return;
  state.projects[idx].name = name.trim();
  renderProjectTabs();
}

/** Move project at idx by dir (+1 / -1). */
function moveProject(idx, dir){
  const other = idx + dir;
  if(other < 0 || other >= state.projects.length) return;
  _saveActiveProject();
  // Swap the two project entries
  [state.projects[idx], state.projects[other]] = [state.projects[other], state.projects[idx]];
  // Follow the active project to its new position
  if(state.activeProjectIdx === idx)        state.activeProjectIdx = other;
  else if(state.activeProjectIdx === other) state.activeProjectIdx = idx;
  renderProjectTabs();
}

/** Move doc at docIdx from the active project to targetProjectIdx. */
function moveDocToProject(docIdx, targetProjectIdx){
  if(targetProjectIdx === state.activeProjectIdx) return;
  const doc = state.docs[docIdx];
  if(!doc) return;

  // Remove from live state
  state.docs.splice(docIdx, 1);

  // Remap hiddenCols: indices above the removed doc shift down by 1
  const newHidden = new Set();
  for(const v of state.hiddenCols){
    if(v > docIdx) newHidden.add(v - 1);
    else if(v < docIdx) newHidden.add(v);
  }
  state.hiddenCols = newHidden;

  // Remap goldPick indices: any pick pointing at the removed doc reverts to 0
  for(const sKey of Object.keys(state.goldPick)){
    const m = state.goldPick[sKey];
    for(const tKey of Object.keys(m)){
      const v = m[tKey];
      if(typeof v !== "number") continue;
      if(v === docIdx)   m[tKey] = 0;
      else if(v > docIdx) m[tKey] = v - 1;
    }
  }

  recomputeMaxSents();
  state.currentSent = Math.min(state.currentSent, Math.max(0, state.maxSents - 1));

  // Snapshot source project (now without the moved doc)
  _saveActiveProject();

  // Add to target project (skip duplicates by key)
  const target = state.projects[targetProjectIdx];
  if(!target.docs.some(d => d.key === doc.key)){
    target.docs.push(doc);
    target.maxSents = Math.max(0, ...target.docs.map(d => d.sentences.length), 0);
  }

  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();
}

/** Rebuild the #projectTabBar DOM. */
function renderProjectTabs(){
  const bar = document.getElementById("projectTabBar");
  if(!bar) return;
  bar.innerHTML = "";

  const n = state.projects.length;

  state.projects.forEach((p, idx) => {
    const tab = document.createElement("div");
    tab.className = "projectTab" + (idx === state.activeProjectIdx ? " projectTabActive" : "");

    // Move left button (hidden when there is only one project)
    if(n > 1){
      const leftBtn = document.createElement("button");
      leftBtn.className = "projectTabMoveBtn";
      leftBtn.textContent = "◀";
      leftBtn.title = t('project.moveLeft');
      leftBtn.disabled = idx === 0;
      leftBtn.addEventListener("click", (e) => { e.stopPropagation(); moveProject(idx, -1); });
      tab.appendChild(leftBtn);
    }

    // Name span
    const nameSpan = document.createElement("span");
    nameSpan.className = "projectTabName";
    nameSpan.textContent = p.name;
    nameSpan.title = t('project.renameHint');
    tab.appendChild(nameSpan);

    // Rename button
    const renameBtn = document.createElement("button");
    renameBtn.className = "projectTabRenameBtn";
    renameBtn.textContent = "✎";
    renameBtn.title = t('project.rename');
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newName = prompt(t('project.namePrompt'), p.name);
      if(newName !== null) renameProject(idx, newName);
    });
    tab.appendChild(renameBtn);

    // Move right button (hidden when there is only one project)
    if(n > 1){
      const rightBtn = document.createElement("button");
      rightBtn.className = "projectTabMoveBtn";
      rightBtn.textContent = "▶";
      rightBtn.title = t('project.moveRight');
      rightBtn.disabled = idx === n - 1;
      rightBtn.addEventListener("click", (e) => { e.stopPropagation(); moveProject(idx, +1); });
      tab.appendChild(rightBtn);
    }

    // Close button (only shown when more than one project exists)
    if(n > 1){
      const closeBtn = document.createElement("button");
      closeBtn.className = "projectTabClose";
      closeBtn.textContent = "×";
      closeBtn.title = t('project.deleteConfirm', { name: p.name });
      closeBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteProject(idx); });
      tab.appendChild(closeBtn);
    }

    tab.addEventListener("click", () => switchProject(idx));
    bar.appendChild(tab);
  });

  // "+" button to create a new project
  const addBtn = document.createElement("button");
  addBtn.className = "projectTabAdd";
  addBtn.textContent = "+";
  addBtn.title = t('project.new');
  addBtn.addEventListener("click", () => {
    const name = prompt(
      t('project.namePrompt'),
      `${t('project.default')} ${state.projects.length + 1}`
    );
    if(name !== null) createProject(name);
  });
  bar.appendChild(addBtn);
}

// ── Auto-assignment ───────────────────────────────────────────────────────────

/**
 * Called by processFiles() with an array of already-parsed doc objects.
 * Groups docs by sentence count. One group → current project.
 * Multiple groups → auto-assign to projects by matching maxSents.
 */
function autoAssignToProjects(parsedDocs){
  if(!parsedDocs.length) return;

  // Group by sentence count
  const groups = new Map(); // sentCount → [doc, ...]
  for(const doc of parsedDocs){
    const cnt = doc.sentences.length;
    if(!groups.has(cnt)) groups.set(cnt, []);
    groups.get(cnt).push(doc);
  }

  if(groups.size === 1){
    const [[sentCount]] = groups.entries();
    // Fast path: current project is empty or already has the same sentence count
    if(state.docs.length === 0 || state.maxSents === sentCount){
      for(const doc of parsedDocs){
        if(!state.docs.some(d => d.key === doc.key)) state.docs.push(doc);
      }
      recomputeMaxSents();
      state.currentSent = 0;
      renderFiles();
      renderSentSelect();
      renderSentence();
      return;
    }
    // Mismatch with current project → fall through to distribution logic below
  }

  // Multiple groups OR sentence count differs from current project → distribute
  _saveActiveProject();

  const newProjectNames = [];

  for(const [sentCount, docs] of groups.entries()){
    let targetIdx = -1;

    // Prefer the active project if it is empty or already has matching sentence count
    const ap = state.projects[state.activeProjectIdx];
    if((ap.docs.length === 0 || ap.maxSents === sentCount) &&
       !docs.some(d => ap.docs.some(pd => pd.key === d.key))){
      targetIdx = state.activeProjectIdx;
    }

    if(targetIdx === -1){
      // Second: any other project with a matching sentence count
      targetIdx = state.projects.findIndex((p, i) =>
        i !== state.activeProjectIdx &&
        p.docs.length > 0 && p.maxSents === sentCount &&
        !docs.some(d => p.docs.some(pd => pd.key === d.key))
      );
    }

    if(targetIdx === -1){
      // Third: any other empty project (last resort before creating a new one)
      targetIdx = state.projects.findIndex((p, i) =>
        i !== state.activeProjectIdx && p.docs.length === 0
      );
    }

    if(targetIdx === -1){
      // Create a new project and record its name for the notification
      const name = `${t('project.default')} ${state.projects.length + 1}`;
      state.projects.push(_emptyProject(name));
      targetIdx = state.projects.length - 1;
      newProjectNames.push(name);
    }

    const p = state.projects[targetIdx];
    for(const doc of docs){
      if(!p.docs.some(d => d.key === doc.key)) p.docs.push(doc);
    }
    p.maxSents = Math.max(0, ...p.docs.map(d => d.sentences.length), 0);
  }

  // Reload the active project
  _loadActiveProject();
  renderProjectTabs();
  renderFiles();
  renderSentSelect();
  renderSentence();

  // Notify user about auto-created projects
  if(newProjectNames.length === 1){
    _showSessionMeta(t('project.autoCreated', { name: newProjectNames[0] }));
  } else if(newProjectNames.length > 1){
    _showSessionMeta(t('project.autoCreatedN', { n: newProjectNames.length }));
  }
}
