// Comparison table rendering, gold-cell popup, and inline label editing.

// ── Data structures ────────────────────────────────────────────────────────────

// Build per-document token Maps and the union of token IDs for the current sentence.
// Custom-only tokens (not present in any file) are included via state.custom.
function buildDocMapsAndIds(){
  const sentIndex = state.currentSent;
  const docMaps = state.docs.map(d => {
    const s = d.sentences[sentIndex];
    const m = new Map();
    if(s) for(const t of s.tokens) m.set(t.id, t);
    return m;
  });
  const ids = new Set();
  for(const m of docMaps) for(const id of m.keys()) ids.add(id);
  const customSent = state.custom[sentIndex] || {};
  for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
  const idList = Array.from(ids).sort((a,b)=>a-b);
  return { docMaps, idList };
}

// Return the first token found across all docMaps for a given token ID.
function firstToken(docMaps, tokId){
  for(const m of docMaps){ const t = m.get(tokId); if(t) return t; }
  return null;
}

// Build the "gold" token map for one sentence: each token reflects the user's
// current annotation choices (custom overrides > chosen doc > first available doc).
function buildGoldTokenMap(sentIndex, idList, docMaps){
  const gold = new Map();
  for(const id of idList){
    const base = firstToken(docMaps, id);
    if(!base) continue;
    const ce   = getCustomEntry(sentIndex, id);
    const pick = getDocChoice(sentIndex, id);
    const t    = docMaps[pick]?.get(id) || base;
    const tok  = { id, form: base.form };
    // Primary dep (always head + deprel for backward compat)
    tok.head   = ce?.head   ?? t.head   ?? null;
    tok.deprel = ce?.deprel ?? t.deprel ?? null;
    // Dynamic label columns
    for(const col of LABEL_COLS){
      tok[col.key] = ce?.[col.key] ?? t[col.key] ?? null;
    }
    // Additional dep columns (beyond the primary head/deprel)
    for(let di = 1; di < DEP_COLS.length; di++){
      const dc = DEP_COLS[di];
      tok[dc.headField]   = ce?.[dc.headField]   ?? t[dc.headField]   ?? null;
      tok[dc.deprelField] = ce?.[dc.deprelField] ?? t[dc.deprelField] ?? null;
    }
    gold.set(id, tok);
  }
  return gold;
}

// ── Comparison table ──────────────────────────────────────────────────────────

// Re-render the full comparison table for the current sentence.
// Also computes per-sentence diff statistics shown in the stat badges.
function renderCompareTable(){
  const sentIndex = state.currentSent;
  const { docMaps, idList } = buildDocMapsAndIds();
  const goldMap = buildGoldTokenMap(sentIndex, idList, docMaps);
  // Cache for popup and tree view re-use
  _lastIdList  = idList;
  _lastDocMaps = docMaps;

  const stats = computeStats(sentIndex, idList, docMaps, goldMap);
  sentStats.innerHTML = `
    <span class="statBadge">${t(stats.totalTokens !== 1 ? 'stats.tokens' : 'stats.token', { n: stats.totalTokens })}</span>
    <span class="statBadge ${stats.diffCount > 0 ? 'statDiff' : 'statOk'}">
      ${t(stats.diffCount !== 1 ? 'stats.diffs' : 'stats.diff', { n: stats.diffCount })}
    </span>
  `;

  const anyUnlocked = state.unlocked;
  // Show per-file columns when comparing 2+ docs, or when any file is unlocked for editing
  // (so the user can see raw-file data alongside the edited GOLD column)
  const showFileCols = state.docs.length >= 2 || anyUnlocked;

  let html = "<thead><tr>";
  html += `<th>${t('col.id')}</th><th>${t('col.form')}</th>`;
  for(const col of LABEL_COLS) html += `<th>${escapeHtml(col.name)}</th>`;
  if(anyUnlocked){
    html += `<th>${escapeHtml(t('popup.head'))}</th><th>${escapeHtml(t('popup.deprel'))}</th>`;
  }
  html += `<th>${t('col.gold')}</th>`;
  if(showFileCols){
    for(let i=0; i<state.docs.length; i++){
      if(state.hiddenCols.has(i)) continue;
      html += `<th>${escapeHtml(state.docs[i].name)}</th>`;
    }
  }
  // Custom column removed — editing via Gold-cell popup
  html += "</tr></thead><tbody>";

  for(const id of idList){
    let form="—";
    for(const m of docMaps){ const t=m.get(id); if(t){ form=t.form; break; } }

    const goldTok  = goldMap.get(id);
    const goldVal  = goldTok ? valueStr(goldTok.head, goldTok.deprel) : "—";

    const ce           = getCustomEntry(sentIndex, id);
    const customExists = !!ce;

    // Collect head/deprel and label values per file for comparison
    const allVals = state.docs.map((_, i) => {
      const tok = docMaps[i].get(id);
      if(!tok) return null;
      const v = { hd: valueStr(tok.head, tok.deprel) };
      for(const col of LABEL_COLS) v[col.key] = tok[col.key] ?? "_";
      return v;
    });

    // Row is "diff" if any file differs from gold in any field
    const hasDiff = goldTok != null && allVals.some(v => v !== null && (
      v.hd !== goldVal ||
      LABEL_COLS.some(col => v[col.key] !== (goldTok[col.key] ?? "_"))
    ));

    const isFlagged = !!state.flags[sentIndex]?.has(id);
    let rowCls = hasDiff ? 'rowDiff' : '';
    if(isFlagged) rowCls += ' rowFlagged';
    html += `<tr data-id="${id}" class="${rowCls.trim()}">`;
    html += `<td>${id}<button class="flagBtn${isFlagged ? ' flagBtnActive' : ''}" title="${escapeHtml(t('flag.toggle'))}">!</button></td>`;
    html += `<td>${escapeHtml(form)}</td>`;

    // Dynamic label columns — inline editable dropdown or text input
    for(const col of LABEL_COLS){
      const goldColVal   = goldTok?.[col.key] ?? "_";
      const customColVal = ce?.[col.key] ?? null;
      const colDiff      = allVals.some(v => v !== null && v[col.key] !== goldColVal);
      const colEl = col.optionsHtml
        ? `<select data-col="${escapeHtml(col.key)}" class="posInlineSelect">${col.optionsHtml}</select>`
        : `<input data-col="${escapeHtml(col.key)}" type="text" class="posInlineInput" value="${escapeHtml(goldColVal)}" placeholder="${escapeHtml(col.name)}">`;
      html += `<td class="posCell${customColVal ? ' posCustom' : ''}${colDiff ? ' posDiff' : ''}" title="${escapeHtml(col.name)}">${colEl}</td>`;
    }

    // Inline HEAD / DEPREL cells — only when single file is in edit mode
    if(anyUnlocked){
      const hv = goldTok?.head;
      const headVal = hv != null ? String(hv) : "";
      html += `<td class="posCell"><input type="number" min="0" class="posInlineInput headInlineInput" data-col="head" value="${escapeHtml(headVal)}" placeholder="HEAD"></td>`;
      html += `<td class="posCell"><select class="posInlineSelect deprelInlineSelect" data-col="deprel"><option value=""></option>${DEPREL_OPTIONS_HTML}</select></td>`;
    }

    // Gold column — HEAD/DEPREL + label col summary line
    // Source tag (D1/C) only shown when per-file columns are visible
    const goldSrc = showFileCols
      ? (customExists ? '<span class="srcTag srcCustom">C</span>'
          : `<span class="srcTag srcDoc">D${getDocChoice(sentIndex,id)+1}</span>`)
      : '';
    const posLineHtml = LABEL_COLS.map(col => escapeHtml(goldTok?.[col.key] ?? "_")).join('·');
    html += `<td data-col="gold" class="goldCell goldEditable" title="${escapeHtml(t('popup.editTitle'))}">${goldSrc} ${escapeHtml(goldVal)}` +
      `<div class="posLine">${posLineHtml}</div></td>`;

    // Per-file columns — rendered when 2+ docs loaded, or any file is unlocked
    if(showFileCols){
      for(let i=0; i<state.docs.length; i++){
        if(state.hiddenCols.has(i)) continue;
        const v          = allVals[i];
        const clsDisabled = customExists ? "disabledPick" : "";
        const clsPicked   = (!customExists && i === getDocChoice(sentIndex, id)) ? "picked" : "";
        if(v === null){
          html += `<td data-col="doc${i}" data-doc-idx="${i}" class="pickable ${clsDisabled} ${clsPicked}">—</td>`;
        } else {
          const hdOk      = goldTok && v.hd === goldVal;
          const labelsOk  = LABEL_COLS.every(col => !goldTok || v[col.key] === (goldTok[col.key] ?? "_"));
          const clsCmp    = goldTok ? (hdOk && labelsOk ? "same" : "diff") : "";
          const labelSpans = LABEL_COLS.map(col => {
            const gv = goldTok?.[col.key] ?? "_";
            const ok = goldTok && v[col.key] === gv;
            return `<span class="${ok ? '' : 'fDiff'}">${escapeHtml(v[col.key] ?? "_")}</span>`;
          }).join('·');
          html += `<td data-col="doc${i}" data-doc-idx="${i}" class="pickable ${clsCmp} ${clsDisabled} ${clsPicked}">` +
            `<div class="${hdOk ? '' : 'fDiff'}">${escapeHtml(v.hd)}</div>` +
            `<div class="posLine">${labelSpans}</div></td>`;
        }
      }
    }

    html += `</tr>`;
  }

  html += "</tbody>";
  cmpTable.innerHTML = html;

  // Set label-col select values after render (can't use 'selected' in innerHTML efficiently)
  for(const tr of cmpTable.querySelectorAll("tr[data-id]")){
    const id = parseInt(tr.dataset.id, 10);
    const gt = goldMap.get(id);
    for(const col of LABEL_COLS){
      _setPosEl(tr, col.key, gt?.[col.key] ?? "_");
    }
    if(anyUnlocked){
      _setPosEl(tr, "deprel", gt?.deprel ?? "_");
    }
  }

  // Reposition popup after re-render (if currently open)
  if(_popupTokId !== null && _popup?.classList.contains("active")){
    const goldCell = cmpTable.querySelector(`tr[data-id="${_popupTokId}"] td[data-col='gold']`);
    if(goldCell){ _populatePopup(_popupTokId); _positionPopup(goldCell); }
  }
}

// ── Gold-cell popup ───────────────────────────────────────────────────────────
let _popup      = null;
let _popupTokId = null;

// Called by i18n.js setLang() to force popup recreation with new language strings.
function _resetPopup(){ _popup?.remove(); _popup = null; }
// Cached token list and doc maps from the last renderCompareTable() call.
let _lastIdList  = [];
let _lastDocMaps = [];

// Lazily create and return the floating gold-edit popup element.
// The popup is built once per language; _resetPopup() forces recreation on language change.
function _ensurePopup(){
  if(_popup) return _popup;
  _popup = document.createElement("div");
  _popup.className = "goldPopup";

  // Build popup HTML dynamically from DEP_COLS and LABEL_COLS
  const primaryDep = DEP_COLS[0];
  let popupHtml = `<div class="gpTitle">Token <b id="gpNum"></b>: <span id="gpForm"></span></div>`;
  // Primary dep col: head + deprel
  popupHtml += `<div class="gpRow"><label>${t('popup.head')}</label><select id="gpHead"></select></div>`;
  popupHtml += `<div class="gpRow"><label>${escapeHtml(primaryDep?.name || t('popup.deprel'))}</label><select id="gpDeprel">${primaryDep?.optionsHtml || DEPREL_OPTIONS_HTML}</select></div>`;
  // Additional dep cols (key != "")
  for(let di = 1; di < DEP_COLS.length; di++){
    const dc = DEP_COLS[di];
    popupHtml += `<div class="gpRow"><label>${escapeHtml(t('popup.head'))} (${escapeHtml(dc.name)})</label><select id="gpHead_${escapeHtml(dc.key)}"></select></div>`;
    popupHtml += `<div class="gpRow"><label>${escapeHtml(dc.name)}</label><select id="gpDeprel_${escapeHtml(dc.key)}">${dc.optionsHtml}</select></div>`;
  }
  // Label cols
  for(const col of LABEL_COLS){
    const fieldEl = col.optionsHtml
      ? `<select id="gpLabelCol_${escapeHtml(col.key)}">${col.optionsHtml}</select>`
      : `<input id="gpLabelCol_${escapeHtml(col.key)}" type="text" class="gpTextInput" placeholder="${escapeHtml(col.name)}">`;
    popupHtml += `<div class="gpRow"><label>${escapeHtml(col.name)}</label>${fieldEl}</div>`;
  }
  popupHtml += `<div class="gpActions"><button id="gpClear" class="danger" title="Shortcut: r">${t('popup.reset')}</button></div>`;
  popupHtml += `<div class="gpHint">${t('popup.hint')}</div>`;

  _popup.innerHTML = popupHtml;
  document.body.appendChild(_popup);

  // Event listeners for primary dep col
  ["gpHead", "gpDeprel"].forEach(eid => {
    const el = document.getElementById(eid);
    if(el) el.addEventListener("change", _onPopupChange);
  });
  // Event listeners for additional dep cols
  for(let di = 1; di < DEP_COLS.length; di++){
    const dc = DEP_COLS[di];
    [`gpHead_${dc.key}`, `gpDeprel_${dc.key}`].forEach(eid => {
      const el = document.getElementById(eid);
      if(el) el.addEventListener("change", _onPopupChange);
    });
  }
  // Event listeners for label cols
  for(const col of LABEL_COLS){
    const el = document.getElementById(`gpLabelCol_${col.key}`);
    if(el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", _onPopupChange);
  }

  // "Reset" button clears all custom overrides for the current token.
  document.getElementById("gpClear").addEventListener("click", () => {
    if(_popupTokId === null) return;
    const si = state.currentSent;
    const s  = state.custom[si];
    if(s){ delete s[_popupTokId]; if(!Object.keys(s).length) delete state.custom[si]; }
    _popupTokId = null;
    renderSentence();
  });

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if(!_popup?.classList.contains("active")) return;
    if(_popup.contains(e.target)) return;
    if(e.target.closest?.("td[data-col='gold']")) return;
    _closePopup();
  });

  // Keyboard handling inside popup (capture phase, before keyboard.js)
  document.addEventListener("keydown", (e) => {
    if(!_popup?.classList.contains("active")) return;

    if(e.key === "Escape"){
      e.stopPropagation();
      _closePopup();
      return;
    }

    if(e.key === "Enter"){
      e.preventDefault();
      e.stopPropagation();
      _closePopup();
      return;
    }

    // "r" key resets the token (only when no text input is focused)
    if(e.key === "r" || e.key === "R"){
      const active = document.activeElement;
      if(active?.tagName !== "INPUT"){
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("gpClear")?.click();
        return;
      }
    }

    // Tab trap: keep keyboard focus within the popup
    if(e.key === "Tab"){
      const focusable = Array.from(_popup.querySelectorAll("select, input, button"));
      if(!focusable.length) return;
      const idx = focusable.indexOf(document.activeElement);
      e.preventDefault();
      if(e.shiftKey){
        focusable[idx <= 0 ? focusable.length - 1 : idx - 1].focus();
      } else {
        focusable[(idx + 1) % focusable.length].focus();
      }
    }
  }, true);

  return _popup;
}

// Handle any field change inside the popup and write it to state.custom.
function _onPopupChange(e){
  if(_popupTokId === null) return;
  const eid = e.target.id;
  let field = null;
  let isHead = false;

  if(eid === "gpHead")   { field = "head";   isHead = true; }
  else if(eid === "gpDeprel") { field = "deprel"; }
  else {
    // Additional dep cols
    for(let di = 1; di < DEP_COLS.length; di++){
      const dc = DEP_COLS[di];
      if(eid === `gpHead_${dc.key}`)   { field = dc.headField;   isHead = true; break; }
      if(eid === `gpDeprel_${dc.key}`) { field = dc.deprelField;               break; }
    }
    // Label cols
    if(field === null){
      for(const col of LABEL_COLS){
        if(eid === `gpLabelCol_${col.key}`) { field = col.key; break; }
      }
    }
  }
  if(field === null) return;
  const raw = e.target.value.trim();
  // Head fields are stored as integers (or null); deprel/label fields as strings.
  const val = isHead
    ? (raw === "" ? null : (parseInt(raw, 10) >= 0 ? parseInt(raw, 10) : null))
    : (raw === "" ? null : raw);
  setCustomField(state.currentSent, _popupTokId, field, val);
  renderSentence(); // renderCompareTable will reposition popup
}

function _closePopup(){
  _popup?.classList.remove("active");
  _popupTokId = null;
}

// Set a <select> or <input> element to a given value.
// If the value is not in the option list, inject a temporary extra option.
function _setSelectOrInput(eid, value){
  const el = document.getElementById(eid);
  if(!el) return;
  if(el.tagName === "SELECT"){
    // Remove previously injected extra option
    el.querySelector("option[data-extra]")?.remove();
    el.value = value ?? "";
    // If value not found in list, inject it temporarily
    if(value && el.value !== String(value)){
      const opt = document.createElement("option");
      opt.value = String(value); opt.textContent = String(value); opt.dataset.extra = "1";
      el.insertBefore(opt, el.firstChild);
      el.value = String(value);
    }
  } else {
    el.value = value ?? "";
  }
}

// Populate a head <select> with options for all tokens in the current sentence,
// then set it to the current head value of the given token.
function _buildHeadDropdown(selId, goldTok, headField){
  const sel = document.getElementById(selId);
  if(!sel) return;
  sel.innerHTML = `<option value="">${t('popup.unset')}</option><option value="0">0 — ${t('popup.root')}</option>`;
  for(const id of _lastIdList){
    let f = "?";
    for(const m of _lastDocMaps){ const tok = m.get(id); if(tok){ f = tok.form; break; } }
    const opt = document.createElement("option");
    opt.value = String(id); opt.textContent = `${id}: ${f}`;
    sel.appendChild(opt);
  }
  const hv = goldTok?.[headField];
  sel.value = hv != null ? String(hv) : "";
}

// Fill all popup fields with the current gold values for the given token.
function _populatePopup(tokId){
  _ensurePopup();
  const si      = state.currentSent;
  const goldTok = buildGoldTokenMap(si, _lastIdList, _lastDocMaps).get(tokId);

  document.getElementById("gpNum").textContent = tokId;
  let form = "?";
  for(const m of _lastDocMaps){ const tok = m.get(tokId); if(tok){ form = tok.form; break; } }
  document.getElementById("gpForm").textContent = form;

  // Primary dep col: head + deprel
  _buildHeadDropdown("gpHead", goldTok, "head");
  _setSelectOrInput("gpDeprel", goldTok?.deprel ?? "");

  // Additional dep cols
  for(let di = 1; di < DEP_COLS.length; di++){
    const dc = DEP_COLS[di];
    _buildHeadDropdown(`gpHead_${dc.key}`, goldTok, dc.headField);
    _setSelectOrInput(`gpDeprel_${dc.key}`, goldTok?.[dc.deprelField] ?? "");
  }

  // Label cols — treat "_" (CoNLL-U null marker) and null as empty/unset
  for(const col of LABEL_COLS){
    const cv = goldTok?.[col.key];
    _setSelectOrInput(`gpLabelCol_${col.key}`, (cv == null || cv === "_") ? "" : cv);
  }
}

// Open the popup for a token and push an undo snapshot.
function _openPopup(tokId, cellEl){
  pushUndo();
  _popupTokId = tokId;
  _populatePopup(tokId);
  _positionPopup(cellEl);
  // Auto-focus the HEAD field for immediate keyboard editing
  setTimeout(() => document.getElementById("gpHead")?.focus(), 0);
}

// Position the popup below (or above if clipped) the triggering table cell.
function _positionPopup(cellEl){
  if(!_popup) return;
  _popup.classList.add("active");
  const rect = cellEl.getBoundingClientRect();
  const pw = _popup.offsetWidth  || 240;
  const ph = _popup.offsetHeight || 220;
  let top  = rect.bottom + 4;
  let left = rect.left;
  if(top  + ph > window.innerHeight - 8) top  = rect.top - ph - 4;
  if(left + pw > window.innerWidth  - 8) left = window.innerWidth - pw - 8;
  if(left < 8) left = 8;
  if(top  < 8) top  = 8;
  _popup.style.top  = `${top}px`;
  _popup.style.left = `${left}px`;
}

// Click on flag button → toggle flag for that token row.
cmpTable.addEventListener("click", (e) => {
  const btn = e.target.closest?.(".flagBtn");
  if(!btn) return;
  const tr = btn.closest("tr[data-id]");
  if(!tr) return;
  e.stopPropagation();
  toggleFlag(state.currentSent, parseInt(tr.dataset.id, 10));
});

// Click on Gold cell → open or close the annotation popup for that token.
cmpTable.addEventListener("click", (e) => {
  const td = e.target.closest?.("td[data-col='gold']");
  if(!td) return;
  const tr = td.closest("tr[data-id]");
  if(!tr) return;
  const tokId = parseInt(tr.dataset.id, 10);
  if(_popupTokId === tokId && _popup?.classList.contains("active")){
    _closePopup(); return;
  }
  _openPopup(tokId, td);
});

// ── Inline label (UPOS / XPOS) editing ───────────────────────────────────────

// Set the value of an inline label select or input within a table row.
// Injects a temporary option when the value is not in the predefined list.
// "_" (CoNLL-U null marker) is treated as empty/unset in the UI.
function _setPosEl(tr, field, value){
  const el = tr.querySelector(`[data-col="${field}"]`);
  if(!el) return;
  // Treat CoNLL-U null marker "_" and null/undefined as empty (the blank option)
  const displayVal = (value == null || value === "_") ? "" : String(value);
  if(el.tagName === "SELECT"){
    el.querySelector("option[data-extra]")?.remove();
    el.value = displayVal;
    if(displayVal && el.value !== displayVal){
      const opt = document.createElement("option");
      opt.value = displayVal; opt.textContent = displayVal; opt.dataset.extra = "1";
      el.insertBefore(opt, el.firstChild);
      el.value = displayVal;
    }
  } else {
    el.value = displayVal;
  }
}

// Handle change events on inline label dropdowns/inputs in the table.
cmpTable.addEventListener("change", (e) => {
  const el = e.target;
  const field = el.dataset?.col;
  const isLabelCol   = LABEL_COLS.some(col => col.key === field);
  const isInlineHead = field === "head"   && el.classList.contains("headInlineInput");
  const isInlineDep  = field === "deprel" && el.classList.contains("deprelInlineSelect");
  if(!isLabelCol && !isInlineHead && !isInlineDep) return;
  const tr = el.closest("tr[data-id]");
  if(!tr) return;
  const tokId = parseInt(tr.dataset.id, 10);
  const raw = el.value.trim();
  let val;
  if(isInlineHead){
    val = raw === "" ? null : (parseInt(raw, 10) >= 0 ? parseInt(raw, 10) : null);
  } else {
    val = (raw === "" || raw === "_") ? null : raw;
  }
  pushUndo();
  setCustomField(state.currentSent, tokId, field, val);
  el.blur();
  renderSentence();
});

// Escape on inline pos elements → blur (return keyboard focus to document)
cmpTable.addEventListener("keydown", (e) => {
  if(e.key !== "Escape") return;
  const el = e.target;
  if(el.classList.contains("posInlineSelect") || el.classList.contains("posInlineInput")){
    e.stopPropagation();
    el.blur();
  }
});
