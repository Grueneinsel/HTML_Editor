// ---------- Data structures ----------
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

function firstToken(docMaps, tokId){
  for(const m of docMaps){ const t = m.get(tokId); if(t) return t; }
  return null;
}

function buildGoldTokenMap(sentIndex, idList, docMaps){
  const gold = new Map();
  for(const id of idList){
    const base = firstToken(docMaps, id);
    if(!base) continue;
    const ce   = getCustomEntry(sentIndex, id);
    const pick = getDocChoice(sentIndex, id);
    const t    = docMaps[pick]?.get(id) || base;
    // custom fields override the picked doc; nullish-coalesce falls through to picked doc
    const head   = ce?.head   ?? t.head   ?? null;
    const deprel = ce?.deprel ?? t.deprel ?? null;
    const upos   = ce?.upos   ?? t.upos   ?? null;
    const xpos   = ce?.xpos   ?? t.xpos   ?? null;
    gold.set(id, { id, form: base.form, upos, xpos, head, deprel });
  }
  return gold;
}

// ---------- Comparison table ----------
function renderCompareTable(){
  const sentIndex = state.currentSent;
  const { docMaps, idList } = buildDocMapsAndIds();
  const goldMap = buildGoldTokenMap(sentIndex, idList, docMaps);
  _lastIdList  = idList;
  _lastDocMaps = docMaps;

  const stats = computeStats(sentIndex, idList, docMaps, goldMap);
  sentStats.innerHTML = `
    <span class="statBadge">${stats.totalTokens} Tokens</span>
    <span class="statBadge ${stats.diffCount > 0 ? 'statDiff' : 'statOk'}">
      ${stats.diffCount} Diff${stats.diffCount !== 1 ? 's' : ''}
    </span>
  `;

  let html = "<thead><tr>";
  html += "<th>ID</th><th>FORM</th><th>UPOS</th><th>XPOS</th>";
  html += "<th>GOLD</th>";
  for(let i=0; i<state.docs.length; i++){
    if(state.hiddenCols.has(i)) continue;
    html += `<th>${escapeHtml(state.docs[i].name)}</th>`;
  }
  // Custom column removed — editing via Gold-cell popup
  html += "</tr></thead><tbody>";

  for(const id of idList){
    let form="—";
    for(const m of docMaps){ const t=m.get(id); if(t){ form=t.form; break; } }

    const goldTok  = goldMap.get(id);
    const goldVal  = goldTok ? valueStr(goldTok.head, goldTok.deprel) : "—";
    const goldUpos = goldTok?.upos ?? "_";
    const goldXpos = goldTok?.xpos ?? "_";

    const ce           = getCustomEntry(sentIndex, id);
    const customExists = !!ce;
    const customUpos   = getCustomUpos(sentIndex, id);
    const customXpos   = getCustomXpos(sentIndex, id);

    // per-file values (hd = "head / deprel", upos, xpos)
    const allVals = state.docs.map((_, i) => {
      const t = docMaps[i].get(id);
      if(!t) return null;
      return { hd: valueStr(t.head, t.deprel), upos: t.upos ?? "_", xpos: t.xpos ?? "_" };
    });

    // row is "diff" if any file differs from gold in ANY of the four fields
    const hasDiff = goldTok != null && allVals.some(v => v !== null && (
      v.hd   !== goldVal  ||
      v.upos !== goldUpos ||
      v.xpos !== goldXpos
    ));

    // does any file disagree with gold UPOS / XPOS?
    const uposDiff = allVals.some(v => v !== null && v.upos !== goldUpos);
    const xposDiff = allVals.some(v => v !== null && v.xpos !== goldXpos);

    html += `<tr data-id="${id}" class="${hasDiff ? 'rowDiff' : ''}">`;
    html += `<td>${id}</td>`;
    html += `<td>${escapeHtml(form)}</td>`;

    // UPOS / XPOS — inline editable dropdown (or text input if no options)
    const uposEl = UPOS_OPTIONS_HTML
      ? `<select data-col="upos" class="posInlineSelect">${UPOS_OPTIONS_HTML}</select>`
      : `<input data-col="upos" type="text" class="posInlineInput" value="${escapeHtml(goldUpos)}">`;
    html += `<td class="posCell${customUpos ? ' posCustom' : ''}${uposDiff ? ' posDiff' : ''}">${uposEl}</td>`;

    const xposEl = XPOS_OPTIONS_HTML
      ? `<select data-col="xpos" class="posInlineSelect">${XPOS_OPTIONS_HTML}</select>`
      : `<input data-col="xpos" type="text" class="posInlineInput" value="${escapeHtml(goldXpos)}">`;
    html += `<td class="posCell${customXpos ? ' posCustom' : ''}${xposDiff ? ' posDiff' : ''}">${xposEl}</td>`;

    // GOLD column — HEAD/DEPREL + UPOS·XPOS
    const goldSrc = customExists ? '<span class="srcTag srcCustom">C</span>' :
      `<span class="srcTag srcDoc">D${getDocChoice(sentIndex,id)+1}</span>`;
    html += `<td data-col="gold" class="goldCell goldEditable" title="Klicken zum Bearbeiten">${goldSrc} ${escapeHtml(goldVal)}` +
      `<div class="posLine">${escapeHtml(goldUpos)}·${escapeHtml(goldXpos)}</div></td>`;

    // Per-file columns — HEAD/DEPREL + UPOS·XPOS with per-field diff coloring
    for(let i=0; i<state.docs.length; i++){
      if(state.hiddenCols.has(i)) continue;
      const v          = allVals[i];
      const clsDisabled = customExists ? "disabledPick" : "";
      const clsPicked   = (!customExists && i === getDocChoice(sentIndex, id)) ? "picked" : "";
      if(v === null){
        html += `<td data-col="doc${i}" data-doc-idx="${i}" class="pickable ${clsDisabled} ${clsPicked}">—</td>`;
      } else {
        const hdOk  = goldTok && v.hd   === goldVal;
        const uOk   = goldTok && v.upos === goldUpos;
        const xOk   = goldTok && v.xpos === goldXpos;
        const clsCmp = goldTok ? (hdOk && uOk && xOk ? "same" : "diff") : "";
        html += `<td data-col="doc${i}" data-doc-idx="${i}" class="pickable ${clsCmp} ${clsDisabled} ${clsPicked}">` +
          `<div class="${hdOk ? '' : 'fDiff'}">${escapeHtml(v.hd)}</div>` +
          `<div class="posLine">` +
            `<span class="${uOk ? '' : 'fDiff'}">${escapeHtml(v.upos)}</span>` +
            `·<span class="${xOk ? '' : 'fDiff'}">${escapeHtml(v.xpos)}</span>` +
          `</div></td>`;
      }
    }

    html += `</tr>`;
  }

  html += "</tbody>";
  cmpTable.innerHTML = html;

  // Set UPOS/XPOS select values (can't use 'selected' in HTML string efficiently)
  for(const tr of cmpTable.querySelectorAll("tr[data-id]")){
    const id = parseInt(tr.dataset.id, 10);
    const gt = goldMap.get(id);
    _setPosEl(tr, "upos", gt?.upos ?? "_");
    _setPosEl(tr, "xpos", gt?.xpos ?? "_");
  }

  // Reposition popup after re-render (if currently open)
  if(_popupTokId !== null && _popup?.classList.contains("active")){
    const goldCell = cmpTable.querySelector(`tr[data-id="${_popupTokId}"] td[data-col='gold']`);
    if(goldCell){ _populatePopup(_popupTokId); _positionPopup(goldCell); }
  }
}

// ── Gold-cell popup ──────────────────────────────────────────────────────
let _popup      = null;
let _popupTokId = null;
let _lastIdList  = [];
let _lastDocMaps = [];

function _ensurePopup(){
  if(_popup) return _popup;
  _popup = document.createElement("div");
  _popup.className = "goldPopup";

  const uposField = UPOS_OPTIONS_HTML
    ? `<select id="gpUpos">${UPOS_OPTIONS_HTML}</select>`
    : `<input id="gpUpos" type="text" class="gpTextInput" placeholder="UPOS">`;
  const xposField = XPOS_OPTIONS_HTML
    ? `<select id="gpXpos">${XPOS_OPTIONS_HTML}</select>`
    : `<input id="gpXpos" type="text" class="gpTextInput" placeholder="XPOS">`;

  _popup.innerHTML = `
    <div class="gpTitle">Token <b id="gpNum"></b>: <span id="gpForm"></span></div>
    <div class="gpRow"><label>HEAD</label><select id="gpHead"></select></div>
    <div class="gpRow"><label>DEPREL</label><select id="gpDeprel">${DEPREL_OPTIONS_HTML}</select></div>
    <div class="gpRow"><label>UPOS</label>${uposField}</div>
    <div class="gpRow"><label>XPOS</label>${xposField}</div>
    <div class="gpActions"><button id="gpClear" class="danger" title="Shortcut: r">Zurücksetzen</button></div>
    <div class="gpHint">Tab/Shift+Tab · Enter schließt · r zurücksetzen</div>
  `;
  document.body.appendChild(_popup);

  ["gpHead","gpDeprel","gpUpos","gpXpos"].forEach(eid => {
    const el = document.getElementById(eid);
    if(!el) return;
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", _onPopupChange);
  });

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

    // r → Zurücksetzen (nur wenn kein Input-Feld fokussiert)
    if(e.key === "r" || e.key === "R"){
      const active = document.activeElement;
      if(active?.tagName !== "INPUT"){
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("gpClear")?.click();
        return;
      }
    }

    // Tab-Trap: innerhalb des Popups bleiben
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

function _onPopupChange(e){
  if(_popupTokId === null) return;
  const field = { gpHead:"head", gpDeprel:"deprel", gpUpos:"upos", gpXpos:"xpos" }[e.target.id];
  if(!field) return;
  const raw = e.target.value.trim();
  const val = field === "head"
    ? (raw === "" ? null : (parseInt(raw, 10) >= 0 ? parseInt(raw, 10) : null))
    : (raw === "" ? null : raw);
  setCustomField(state.currentSent, _popupTokId, field, val);
  renderSentence(); // renderCompareTable will reposition popup
}

function _closePopup(){
  _popup?.classList.remove("active");
  _popupTokId = null;
}

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

function _populatePopup(tokId){
  _ensurePopup();
  const si      = state.currentSent;
  const goldTok = buildGoldTokenMap(si, _lastIdList, _lastDocMaps).get(tokId);

  document.getElementById("gpNum").textContent = tokId;
  let form = "?";
  for(const m of _lastDocMaps){ const t = m.get(tokId); if(t){ form = t.form; break; } }
  document.getElementById("gpForm").textContent = form;

  // Build HEAD dropdown from current sentence tokens
  const headSel = document.getElementById("gpHead");
  headSel.innerHTML = `<option value="0">0 — (root)</option>`;
  for(const id of _lastIdList){
    let f = "?";
    for(const m of _lastDocMaps){ const t = m.get(id); if(t){ f = t.form; break; } }
    const opt = document.createElement("option");
    opt.value = String(id); opt.textContent = `${id}: ${f}`;
    headSel.appendChild(opt);
  }
  headSel.value = goldTok?.head != null ? String(goldTok.head) : "0";

  _setSelectOrInput("gpDeprel", goldTok?.deprel ?? "");
  _setSelectOrInput("gpUpos",   goldTok?.upos   ?? "_");
  _setSelectOrInput("gpXpos",   goldTok?.xpos   ?? "_");
}

function _openPopup(tokId, cellEl){
  _popupTokId = tokId;
  _populatePopup(tokId);
  _positionPopup(cellEl);
  // Auto-focus HEAD-Feld
  setTimeout(() => document.getElementById("gpHead")?.focus(), 0);
}

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

// Click on Gold cell → open / close popup
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

// ── Inline UPOS / XPOS editing ──────────────────────────────────────────────

function _setPosEl(tr, field, value){
  const el = tr.querySelector(`[data-col="${field}"]`);
  if(!el) return;
  if(el.tagName === "SELECT"){
    el.value = value;
    if(el.value !== String(value)){
      const opt = document.createElement("option");
      opt.value = String(value); opt.textContent = String(value); opt.dataset.extra = "1";
      el.insertBefore(opt, el.firstChild);
      el.value = String(value);
    }
  } else {
    el.value = value;
  }
}

cmpTable.addEventListener("change", (e) => {
  const el = e.target;
  const field = el.dataset?.col;
  if(field !== "upos" && field !== "xpos") return;
  const tr = el.closest("tr[data-id]");
  if(!tr) return;
  const tokId = parseInt(tr.dataset.id, 10);
  const raw = el.value.trim();
  const val = (raw === "" || raw === "_") ? null : raw;
  setCustomField(state.currentSent, tokId, field, val);
  renderSentence();
});
