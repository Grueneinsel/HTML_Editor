// Interactive SVG arc diagram (displaCy-style) with drag-to-reattach and deprel popup.
//
// Interaction (editable / gold view):
//   • Drag FROM any token box → drop on another token → assigns new head
//     → deprel listbox appears immediately after to set relation type
//   • Single click on token box (no drag) → scrolls to table row
//   • Hover over arc → red ✕ button appears → click to reset head
//   • Click on arc label → deprel listbox (change relation type, one click to apply)
//
// Read-only (file views): click on token box scrolls to table row only.
// ─────────────────────────────────────────────────────────────────────────────

const _ARC_THRESH       = 5;   // px movement required on mouse to promote pointerdown to drag
const _ARC_THRESH_TOUCH = 14;  // movement threshold after hold fires
const _ARC_HOLD_MS      = 230; // ms to hold still before touch drag mode activates
const _ARC_HOLD_CANCEL  = 9;   // px movement during hold period that cancels hold (user is scrolling)

let _arcPreDrag  = null; // pending drag state set on pointerdown, before threshold is crossed
let _arcDrag     = null; // active drag state after threshold has been crossed
let _arcRafId    = null; // rAF handle for pointermove throttle (avoids layout thrashing on tablet)
let _arcLastMoveE = null; // latest captured pointermove event (consumed inside rAF)
let _arcPreHold  = null; // touch-only: state before hold timer fires (no drag yet)
let _arcHoldTimer = null; // setTimeout handle for hold-to-drag

// Core pointermove logic — called inside a requestAnimationFrame so it runs at most
// once per display frame instead of at the raw event rate (important for tablet perf).
function _arcProcessMove(e) {
  // Handle pre-hold: if the user moves too much during the hold period, cancel it
  // so the browser can handle the gesture (e.g. vertical scroll).
  if (_arcPreHold && e.pointerId === _arcPreHold.pointerId) {
    const dx = e.clientX - _arcPreHold.startX;
    const dy = e.clientY - _arcPreHold.startY;
    if (Math.hypot(dx, dy) > _ARC_HOLD_CANCEL) {
      clearTimeout(_arcHoldTimer); _arcHoldTimer = null;
      // Release capture so the browser can resume scroll handling
      try { _arcPreHold.overlayEl.releasePointerCapture(_arcPreHold.pointerId); } catch {}
      _arcPreHold = null;
    }
    return; // Don't process as drag yet regardless
  }

  if (_arcPreDrag && e.pointerId !== _arcPreDrag.pointerId) return;
  if (_arcDrag    && e.pointerId !== _arcDrag.pointerId)    return;
  // Promote pre-drag to real drag once the appropriate threshold is crossed
  if (_arcPreDrag && !_arcDrag) {
    const dx = e.clientX - _arcPreDrag.startX;
    const dy = e.clientY - _arcPreDrag.startY;
    const thresh = _arcPreDrag.isTouch ? _ARC_THRESH_TOUCH : _ARC_THRESH;
    if (Math.hypot(dx, dy) > thresh) _arcBeginDrag(e);
  }
  if (!_arcDrag) return;
  // Guard: SVG might have been replaced by a re-render
  if (!_arcDrag.svg.isConnected) { _arcDrag = null; return; }
  // Re-fetch bounding rect once per rAF frame (not on every raw event)
  const r  = _arcDrag.svg.getBoundingClientRect();
  _arcDrag._svgRect = r;
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  _arcDrag.line.setAttribute('x2', mx);
  _arcDrag.line.setAttribute('y2', my);
  _arcDrag.dot.setAttribute('cx', mx);
  _arcDrag.dot.setAttribute('cy', my);
  _arcHighlightDrop(mx, my);
}

// Global pointermove: capture the latest event and schedule one rAF update per frame.
window.addEventListener('pointermove', e => {
  if (!_arcPreDrag && !_arcDrag) return;
  _arcLastMoveE = e;
  if (_arcRafId !== null) return; // already scheduled
  _arcRafId = requestAnimationFrame(() => {
    _arcRafId = null;
    if (_arcLastMoveE) { _arcProcessMove(_arcLastMoveE); _arcLastMoveE = null; }
  });
});

// Global pointercancel: browser cancelled the pointer (e.g. scroll gesture took over on tablet).
// Clean up any active drag so the rubber-band line doesn't stay stuck on screen.
window.addEventListener('pointercancel', e => {
  // Cancel pre-hold if the browser took over
  if (_arcPreHold && e.pointerId === _arcPreHold.pointerId) {
    clearTimeout(_arcHoldTimer); _arcHoldTimer = null;
    _arcPreHold = null;
  }
  if (_arcPreDrag && e.pointerId !== _arcPreDrag.pointerId) return;
  if (_arcDrag    && e.pointerId !== _arcDrag.pointerId)    return;
  if (_arcRafId !== null) { cancelAnimationFrame(_arcRafId); _arcRafId = null; _arcLastMoveE = null; }
  if (_arcDrag?.svg?.isConnected) {
    _arcDrag.line?.remove();
    _arcDrag.dot?.remove();
    _arcDrag.svg.style.cursor = '';
    if (_arcDrag._srcEl) _arcDrag._srcEl.style.fill = 'transparent';
    _arcClearHighlight(_arcDrag);
  }
  _arcPreDrag = null;
  _arcDrag    = null;
});

// Global pointerup: handle drop — either a plain click (no threshold crossed) or a real drag.
window.addEventListener('pointerup', e => {
  // Touch hold released before timer fired → treat as click
  if (_arcPreHold && e.pointerId === _arcPreHold.pointerId) {
    clearTimeout(_arcHoldTimer); _arcHoldTimer = null;
    const ph = _arcPreHold; _arcPreHold = null;
    if (ph.onScrollTok) ph.onScrollTok(ph.depId);
    return;
  }
  if (_arcPreDrag && e.pointerId !== _arcPreDrag.pointerId) return;
  if (_arcDrag    && e.pointerId !== _arcDrag.pointerId)    return;
  if (_arcPreDrag && !_arcDrag) {
    // Was a plain click — scroll to token in the comparison table
    const pd = _arcPreDrag; _arcPreDrag = null;
    if (pd.onScrollTok) pd.onScrollTok(pd.depId);
    return;
  }
  _arcPreDrag = null;
  if (!_arcDrag) return;
  const drag = _arcDrag; _arcDrag = null;
  // Cancel any pending rAF update — the drag is over
  if (_arcRafId !== null) { cancelAnimationFrame(_arcRafId); _arcRafId = null; _arcLastMoveE = null; }
  if (drag.svg.isConnected) {
    drag.line.remove();
    drag.dot.remove();
    drag.svg.style.cursor = '';
    if (drag._srcEl) drag._srcEl.style.fill = 'transparent';
    _arcClearHighlight(drag);
  }
  // Use cached rect when available (set during drag) to avoid an extra reflow
  const r  = drag._svgRect ?? drag.svg.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const ni = _arcNearest(mx, my, drag.centers, drag.wordYs, drag.cellH);
  if (ni === 0 && drag.depId !== 0 && drag.onSetHead) {
    // Drop on ROOT box (from a real token) → set drag.depId as root (head=0)
    if (drag.toks[drag.tokIdx]?.head !== 0) drag.onSetHead(drag.depId, 0);
    if (drag.onSetDeprel) {
      _arcShowDeprelPopup(e.clientX, e.clientY, drag.depId,
        drag.toks[drag.tokIdx]?.deprel ?? 'root', drag.onSetDeprel);
    }
    return;
  }
  if (ni !== null && drag.toks[ni].id !== drag.depId) {
    // Arrow direction: head → dependent.
    // Dragged-FROM token (drag.depId) = head, dropped-ON token (toks[ni]) = dependent.
    const newDepId  = drag.toks[ni].id;
    const newHeadId = drag.depId;
    // A direct reversal: the proposed head currently has the proposed dep as its own head.
    // Allow it — the onSetHead callback will also clear the old reverse arc automatically.
    const srcHead = drag.toks[drag.tokIdx]?.head;
    const isReversal = srcHead === newDepId;
    if (!isReversal && _arcWouldCycle(newDepId, newHeadId, drag.toks)) {
      // Reject the drop: shake-flash the target token and give haptic buzz
      navigator.vibrate?.([40, 20, 40]);
      _showToast(t('arc.cycle'), 'error');
      if (drag.svg.isConnected) {
        const el = drag.svg.querySelector(`[data-arctokid="${newDepId}"]`);
        if (el) {
          el.classList.remove('arcCycleFlash', 'arcBadHover');
          void el.getBoundingClientRect(); // force reflow to restart animation
          el.classList.add('arcCycleFlash');
          el.addEventListener('animationend', () => {
            el.classList.remove('arcCycleFlash');
            el.style.fill = 'transparent';
          }, { once: true });
        }
      }
      return;
    }
    // For reversals pass newHeadId as breakOldDepId so the callback can clear the reverse arc
    drag.onSetHead(newDepId, newHeadId, isReversal ? newHeadId : undefined);
    // Show deprel listbox immediately after assigning new head
    if (drag.onSetDeprel) {
      const currentDeprel = drag.toks[ni].deprel ?? '_';
      _arcShowDeprelPopup(e.clientX, e.clientY, newDepId, currentDeprel, drag.onSetDeprel);
    }
  }
});

// Initialise a real drag: draw the rubber-band line and leader dot in the SVG.
function _arcBeginDrag(e) {
  const pd = _arcPreDrag; _arcPreDrag = null;
  if (!pd.svg.isConnected) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(a||{})) n.setAttribute(k,String(v)); return n; };
  const r  = pd.svg.getBoundingClientRect();
  const sx = pd.centers[pd.tokIdx];
  const sy = pd.wordYs[pd.tokIdx] + pd.cellH / 2;
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const line = mk('line', { x1:sx, y1:sy, x2:mx, y2:my,
    stroke:'var(--warn)', 'stroke-width':2, 'stroke-dasharray':'5,3', 'pointer-events':'none' });
  const dot = mk('circle', { cx:mx, cy:my, r:5, fill:'var(--warn)', 'pointer-events':'none' });
  pd.svg.appendChild(line);
  pd.svg.appendChild(dot);
  pd.svg.style.cursor = 'grabbing';
  // Pre-build a Map<tokenId → overlayElement> so _arcHighlightDrop never needs querySelector
  const _tokElCache = new Map();
  for (const t of pd.toks) {
    const el = pd.svg.querySelector(`[data-arctokid="${t.id}"]`);
    if (el) _tokElCache.set(t.id, el);
  }
  // Highlight source token (skip for ROOT drag — ROOT box has its own distinct style)
  const srcEl = pd.tokIdx === 0 ? null : (_tokElCache.get(pd.toks[pd.tokIdx].id) ?? null);
  if (srcEl) srcEl.style.fill = 'rgba(255,200,50,0.35)';
  // Short haptic pulse on touch devices to confirm drag start
  if (pd.isTouch) navigator.vibrate?.(12);
  _arcDrag = { ...pd, line, dot, _hovId:null, _hovEl:null, _hovBad:false, _tokElCache, _srcEl:srcEl, _svgRect:null };
}

// Find the nearest token center within a vertical hit band around the word row.
// wordYs is a per-token array (each token may be on a different row in multi-row mode).
// Returns the token index or null if the cursor is too far from any token.
function _arcNearest(mx, my, centers, wordYs, cellH) {
  let best = null, bestD = 64;
  for (let i = 0; i < centers.length; i++) {
    const wy = wordYs[i];
    if (my < wy - 10 || my > wy + cellH + 10) continue;
    const d = Math.abs(mx - centers[i]);
    if (d < bestD) { best = i; bestD = d; }
  }
  return best;
}

// Highlight the drop target token during a drag (blue = valid, red = would cycle).
// Dropping on the ROOT box (index 0) is always valid (green).
function _arcHighlightDrop(mx, my) {
  const ni  = _arcNearest(mx, my, _arcDrag.centers, _arcDrag.wordYs, _arcDrag.cellH);
  const nid = (ni !== null && _arcDrag.toks[ni].id !== _arcDrag.depId) ? _arcDrag.toks[ni].id : null;
  if (nid === _arcDrag._hovId) return;
  _arcClearHighlight(_arcDrag);
  _arcDrag._hovId = nid;
  if (nid !== null && _arcDrag.svg.isConnected) {
    const el = _arcDrag._tokElCache?.get(nid) ?? _arcDrag.svg.querySelector(`[data-arctokid="${nid}"]`);
    if (el) {
      if (nid === 0) {
        // ROOT box is always a valid drop target
        el.style.fill = 'rgba(61,232,154,0.30)';
        _arcDrag._hovBad = false;
      } else {
        // Reversals (direct 2-cycle) are allowed — the old reverse arc is auto-cleared
        const srcHead = _arcDrag.toks[_arcDrag.tokIdx]?.head;
        const bad = srcHead !== nid && _arcWouldCycle(nid, _arcDrag.depId, _arcDrag.toks);
        if (bad) { el.classList.add('arcBadHover'); el.style.fill = ''; }
        else     { el.style.fill = 'rgba(74,158,255,0.30)'; }
        _arcDrag._hovBad = bad;
      }
      _arcDrag._hovEl = el;
    }
  }
}

// Clear any active drop-target highlight.
function _arcClearHighlight(drag) {
  if (drag._hovEl) {
    drag._hovEl.classList.remove('arcBadHover');
    drag._hovEl.style.fill = 'transparent';
    drag._hovEl = null;
  }
  drag._hovId  = null;
  drag._hovBad = false;
}

// ── Cycle detection ───────────────────────────────────────────────────────────
// Returns true if setting depId.head = newHeadId would introduce a new cycle.
// Traces the head chain starting from newHeadId in the graph AFTER the change.
// Only flags cycles that pass through the new edge (pre-existing cycles are ignored).
function _arcWouldCycle(depId, newHeadId, toks) {
  const idToHead = new Map(toks.map(t => [t.id, t.head]));
  idToHead.set(depId, newHeadId); // apply the proposed change
  // Starting from newHeadId, follow head pointers. If we reach depId, the new
  // edge closes a cycle. Stop at null/0 (root) or if we loop without hitting depId.
  const seen = new Set();
  let cur = newHeadId;
  while (cur != null && cur !== 0) {
    if (cur === depId) return true;
    if (seen.has(cur)) return false; // existing cycle not involving the new edge
    seen.add(cur);
    cur = idToHead.get(cur) ?? null;
  }
  return false;
}

// ── Deprel listbox ────────────────────────────────────────────────────────────
// Show a compact listbox near (anchorX, anchorY). Clicking an option immediately
// calls onSetDeprel(depId, deprel) — no OK button needed.
function _arcShowDeprelPopup(anchorX, anchorY, depId, currentDeprel, onSetDeprel) {
  document.getElementById('arcDeprelPopup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'arcDeprelPopup';
  popup.style.cssText = [
    'position:fixed', 'z-index:9999',
    `left:${anchorX}px`, `top:${anchorY}px`,
    'background:var(--card)', 'border:1px solid var(--accent)',
    'border-radius:6px', 'padding:3px',
    'box-shadow:0 4px 16px rgba(0,0,0,.4)',
  ].join(';');

  const optsHtml = (typeof DEPREL_OPTIONS_HTML !== 'undefined' && DEPREL_OPTIONS_HTML)
    ? DEPREL_OPTIONS_HTML
    : ['_','nsubj','obj','iobj','csubj','ccomp','xcomp','obl','vocative','expl',
       'dislocated','advcl','advmod','discourse','aux','cop','mark','nmod','appos',
       'nummod','acl','amod','det','clf','case','conj','cc','fixed','flat','compound',
       'list','parataxis','orphan','goeswith','reparandum','punct','root','dep']
      .map(d => `<option value="${d}">${d}</option>`).join('');

  const _popupTouch = window.matchMedia('(pointer: coarse)').matches;
  const sel = document.createElement('select');
  sel.size = _popupTouch ? 10 : 12;
  sel.innerHTML = optsHtml;
  sel.value = currentDeprel;
  sel.style.cssText = `display:block; border:none; outline:none; background:var(--bg); color:var(--text); font-size:${_popupTouch ? 16 : 12}px; font-family:inherit; cursor:pointer; min-width:${_popupTouch ? 150 : 110}px;`;

  const close = () => popup.remove();
  sel.addEventListener('change', () => { onSetDeprel(depId, sel.value); close(); });
  sel.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') close();
    if (ev.key === 'Enter')  { onSetDeprel(depId, sel.value); close(); }
  });

  popup.appendChild(sel);
  document.body.appendChild(popup);

  requestAnimationFrame(() => {
    const r = popup.getBoundingClientRect();
    if (r.right  > window.innerWidth)  popup.style.left = `${anchorX - r.width}px`;
    if (r.bottom > window.innerHeight) popup.style.top  = `${anchorY - r.height}px`;
    const curOpt = sel.querySelector('option:checked');
    if (curOpt) curOpt.scrollIntoView({ block: 'nearest' });
    sel.focus();
  });

  setTimeout(() => {
    function outside(ev) {
      if (!popup.contains(ev.target)) { close(); document.removeEventListener('pointerdown', outside); }
    }
    document.addEventListener('pointerdown', outside);
  }, 120);
}

// ── Main builder ──────────────────────────────────────────────────────────────
// Build and return a displaCy-style SVG arc diagram wrapped in a div.
// For long sentences (> 20 real tokens) tokens are wrapped into multiple rows.
// Cross-row arcs are shown as stub indicators at both endpoints.
// Pass onSetHead/onDeleteArc/onSetDeprel to make the diagram editable.
function buildArcDiagram(tokMap, { onSetHead = null, onDeleteArc = null, onSetDeprel = null, scrollToTok = null, edgeColors = null } = {}) {
  const NS       = 'http://www.w3.org/2000/svg';
  const realToks = Array.from(tokMap.values()).sort((a, b) => a.id - b.id);
  if (!realToks.length) return null;
  // Prepend virtual ROOT token so it appears as position 0 in the word row
  const toks = [{ id: 0, form: 'ROOT', head: null }, ...realToks];

  const editable = !!onSetHead;
  const _touch   = window.matchMedia('(pointer: coarse)').matches;

  // ── Layout constants ───────────────────────────────────────────────────────
  const HPAD    = _touch ? 18 : 14;
  const CELL_H  = _touch ? 48 : 34;
  const GAP     = _touch ? 22 : 18;
  const FONT_SZ = _touch ? 14 : 12;
  const MIN_W   = _touch ? 66 : 52;
  const ARC_U   = 36;
  const ARC_MX  = 210;
  const PTOP    = 6;
  const PBOT    = 8;
  const FONT_M  = "'JetBrains Mono', ui-monospace, Consolas, monospace";
  const ROW_GAP = 18;  // vertical gap between rows
  const MIN_ARC = 20;  // minimum arc-area height per row

  // Measure text widths via an offscreen canvas for accurate box sizing
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = `bold ${FONT_SZ}px ${FONT_M}`;
  const cellW = toks.map(t => Math.max(MIN_W, mc.measureText(t.form).width + HPAD * 2));
  mc.font = '10px sans-serif';

  // ── Row layout ─────────────────────────────────────────────────────────────
  // Short sentences (≤ 20 real tokens) stay on a single row.
  // Longer sentences: wrap at WRAP_AT tokens per row, size based on viewport.
  const n = realToks.length;
  // Estimate available panel width (arc diagram panel is ~58% of viewport)
  const panelEst = Math.max(400, Math.floor(window.innerWidth * 0.58));
  const WRAP_AT = n <= 20 ? toks.length
    : Math.min(25, Math.max(10, Math.floor((panelEst - GAP) / (MIN_W + GAP))));

  // Each token gets a row index; ROOT always shares row 0 with first real tokens
  const rowOfTok   = toks.map((_, i) => Math.floor(i / WRAP_AT));
  const nRows      = rowOfTok[toks.length - 1] + 1;
  const rowTokIdxs = Array.from({ length: nRows }, (_, r) =>
    toks.reduce((a, _, i) => { if (rowOfTok[i] === r) a.push(i); return a; }, []));

  // Per-token x-centers: every row is left-aligned starting from x=GAP.
  // The SVG is set to min-width:100% so it always fills its container;
  // wider rows can scroll horizontally.
  const flatCenters = new Array(toks.length);
  const rowWidths = [];
  for (let r = 0; r < nRows; r++) {
    const idxs = rowTokIdxs[r];
    let xo = GAP;
    for (const i of idxs) { flatCenters[i] = xo + cellW[i] / 2; xo += cellW[i] + GAP; }
    rowWidths.push(xo);
  }
  const svgW = Math.max(...rowWidths);

  // ── Edge descriptors ───────────────────────────────────────────────────────
  const idxOf = new Map(toks.map((t, i) => [t.id, i]));
  const allEdges = [];
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (t.head == null) continue;
    const hi = idxOf.get(t.head);
    if (hi == null) continue;
    allEdges.push({ dep: i, head: hi, label: t.deprel ?? '_', depId: t.id,
      h: Math.min(ARC_U * Math.abs(hi - i), ARC_MX),
      rowDep: rowOfTok[i], rowHead: rowOfTok[hi] });
  }
  allEdges.sort((a, b) => a.h - b.h);

  // Split into intra-row and cross-row edge sets
  const intraByRow = Array.from({ length: nRows }, () => []);
  const crossEdges = [];
  for (const e of allEdges) {
    if (e.rowDep === e.rowHead) intraByRow[e.rowDep].push(e);
    else crossEdges.push(e);
  }

  // ── Row geometry ───────────────────────────────────────────────────────────
  const arcAreaH = Array.from({ length: nRows }, (_, r) => {
    const intraH = intraByRow[r].length ? Math.max(...intraByRow[r].map(e => e.h)) : 0;
    return Math.max(intraH, MIN_ARC);
  });

  // Stack rows: compute wordY (y of token box row) for each row
  const rowWordY = new Array(nRows);
  let yo = PTOP;
  for (let r = 0; r < nRows; r++) {
    rowWordY[r] = yo + arcAreaH[r] + 14;
    yo += arcAreaH[r] + 14 + CELL_H + (r < nRows - 1 ? ROW_GAP : 0);
  }
  const svgH = yo + PBOT;

  // Per-token flat arrays for the drag system
  const flatWordYs = toks.map((_, i) => rowWordY[rowOfTok[i]]);

  const mk = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };

  const svg = mk('svg', { width: svgW, height: svgH });
  svg.style.cssText = 'display:block; overflow:visible; cursor:default; touch-action:pan-y; min-width:100%;';

  // ── Row separator lines ────────────────────────────────────────────────────
  for (let r = 1; r < nRows; r++) {
    svg.appendChild(mk('line', {
      x1: 0, y1: rowWordY[r - 1] + CELL_H + ROW_GAP / 2, x2: svgW, y2: rowWordY[r - 1] + CELL_H + ROW_GAP / 2,
      stroke: 'var(--line2)', 'stroke-width': 0.5, 'stroke-dasharray': '4,4', 'pointer-events': 'none',
    }));
  }

  // ── Two-pass edge rendering ────────────────────────────────────────────────
  // Pass 1 appends arc path curves (short arcs first → longer arcs rendered on top).
  // Pass 2 (edgeLabelGroups) appends labels + buttons after all token boxes so they
  // render on top of everything.
  const edgeLabelGroups = [];

  // Label collision avoidance: track occupied x-ranges per y-slot per row.
  // Returns a y position bumped downward until it doesn't overlap existing labels.
  const LBL_H = 15; // label height including a small padding
  const _labelSlots = new Map(); // key = row, value = [{x0,x1,y}]
  function _placeLabel(row, x, w) {
    if (!_labelSlots.has(row)) _labelSlots.set(row, []);
    const slots = _labelSlots.get(row);
    const x0 = x - w / 2 - 6, x1 = x + w / 2 + 6;
    // Find lowest y (highest on screen = most negative) that doesn't overlap
    // Existing slots are stored as y (top of label). We try slots from innermost outward.
    const taken = slots.filter(s => s.x1 > x0 && s.x0 < x1).map(s => s.y).sort((a, b) => b - a);
    let y = taken.length ? taken[0] - LBL_H : null;
    if (y !== null) {
      slots.push({ x0, x1, y });
      return y;
    }
    return null; // will use default curveApex
  }

  for (const e of allEdges) {
    const arcColor = edgeColors?.get(e.depId) ?? 'var(--ok)';

    if (e.rowDep === e.rowHead) {
      // ── Intra-row arc: standard cubic Bezier curve ──────────────────────
      const wY        = rowWordY[e.rowDep];
      const x1        = flatCenters[e.dep];
      const x2        = flatCenters[e.head];
      const apex      = wY - e.h;
      let   curveApex = Math.round(0.25 * wY + 0.75 * apex);
      const mid       = (x1 + x2) / 2;
      const lw        = mc.measureText(e.label).width;

      // Push label up if it overlaps another label in the same arc-area row
      const bumped = _placeLabel(e.rowDep, mid, lw);
      if (bumped !== null) curveApex = bumped;
      else _labelSlots.get(e.rowDep)?.push({ x0: mid - lw/2 - 6, x1: mid + lw/2 + 6, y: curveApex });
      // Clamp: label must not overlap the token boxes (stay above wY - CELL_H / 2)
      curveApex = Math.min(curveApex, wY - 16);

      const g = mk('g');
      // Fat invisible stroke for hover/click detection along the arc
      g.appendChild(mk('path', {
        d: `M ${x1} ${wY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wY}`,
        stroke: 'rgba(128,128,128,0.01)', 'stroke-width': 14, fill: 'none', 'pointer-events': 'stroke',
      }));
      // Invisible hit rect at the label/button area (true curve peak)
      g.appendChild(mk('rect', {
        x: mid - lw/2 - 8, y: curveApex - 22,
        width: lw + 10 + (editable ? 30 : 8), height: 22,
        fill: 'transparent', 'pointer-events': 'all',
      }));
      // Visible Bezier curve
      g.appendChild(mk('path', {
        d: `M ${x1} ${wY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wY}`,
        stroke: arcColor, 'stroke-width': 1.8, fill: 'none',
        'stroke-linecap': 'round', 'pointer-events': 'none',
      }));
      // Arrowhead at the dependent end (head → dependent direction)
      g.appendChild(mk('polygon', {
        points: `${x1-4},${wY-10} ${x1+4},${wY-10} ${x1},${wY-2}`,
        fill: arcColor, 'pointer-events': 'none',
      }));
      svg.appendChild(g);

      // Arc label group (rendered in top layer)
      const labelG = mk('g');
      if (editable && onSetDeprel) labelG.style.cssText = 'cursor:pointer;';
      labelG.appendChild(mk('rect', {
        x: mid - lw/2 - 5, y: curveApex - 14, width: lw + 10, height: 14,
        rx: 3, fill: 'var(--card)', stroke: arcColor, 'stroke-width': 0.8,
      }));
      const lt = mk('text', { x: mid, y: curveApex - 4, 'text-anchor': 'middle',
        'font-size': 10, 'font-weight': 600, fill: 'var(--text)', 'pointer-events': 'none' });
      lt.textContent = e.label;
      labelG.appendChild(lt);
      if (editable && onSetDeprel) {
        labelG.addEventListener('click', ev => {
          ev.stopPropagation();
          const svgR = svg.getBoundingClientRect();
          _arcShowDeprelPopup(svgR.left + mid, svgR.top + curveApex - 14, e.depId, e.label, onSetDeprel);
        });
      }

      // ✕ delete button — hover-only on mouse, always visible on touch
      let btnG = null;
      if (editable && onDeleteArc) {
        btnG = mk('g');
        const _bInit = _touch ? 'opacity:0.7; pointer-events:all;' : 'opacity:0; pointer-events:none;';
        btnG.style.cssText = `cursor:pointer; ${_bInit} transition:opacity .12s;`;
        const bx = mid + lw/2 + 14, by = curveApex - 7;
        btnG.appendChild(mk('circle', { cx: bx, cy: by, r: 18, fill: 'transparent' }));
        btnG.appendChild(mk('circle', { cx: bx, cy: by, r: 7, fill: 'var(--bad)', opacity: 0.9 }));
        const xt = mk('text', { x: bx, y: by + 4, 'text-anchor': 'middle',
          'font-size': 11, 'font-weight': 900, fill: '#fff', 'pointer-events': 'none' });
        xt.textContent = '×';
        btnG.appendChild(xt);
        btnG.addEventListener('click', ev => { ev.stopPropagation(); onDeleteArc(e.depId); });
      }

      if (btnG) {
        let hideTimer = null;
        const show = () => { clearTimeout(hideTimer); btnG.style.opacity = '1'; btnG.style.pointerEvents = ''; };
        const hide = () => { hideTimer = setTimeout(() => { btnG.style.opacity = '0'; btnG.style.pointerEvents = 'none'; }, 300); };
        g.addEventListener('pointerenter', show); g.addEventListener('pointerleave', hide);
        labelG.addEventListener('pointerenter', show); labelG.addEventListener('pointerleave', hide);
        btnG.addEventListener('pointerenter', () => clearTimeout(hideTimer));
        btnG.addEventListener('pointerleave', hide);
      }
      edgeLabelGroups.push(labelG);
      if (btnG) edgeLabelGroups.push(btnG);

    } else {
      // ── Cross-row arc: S-curve Bezier connecting head to dep across rows ──
      // The curve rises ARC_U pixels above the head token, crosses through the
      // inter-row space, and arrives ARC_U pixels above the dep token.
      // Drawn before token boxes so boxes render on top (long arcs pass "behind"
      // intermediate rows).
      const x_h  = flatCenters[e.head];
      const x_d  = flatCenters[e.dep];
      const rowH = e.rowHead < e.rowDep ? e.rowHead : e.rowDep; // upper row
      const y_h  = rowWordY[e.rowHead];
      const y_d  = rowWordY[e.rowDep];
      const peak = ARC_U;
      // S-curve: rise above head, curve to dep, descend to dep
      const pathD = `M ${x_h} ${y_h} C ${x_h} ${y_h - peak} ${x_d} ${y_d - peak} ${x_d} ${y_d}`;
      // Place label in the inter-row gap between the two rows it spans
      const gapCenterY = rowWordY[rowH] + CELL_H + ROW_GAP / 2;
      // x at t=0.5 of the Bezier
      const lx = (x_h + x_d) / 2;
      const lw = mc.measureText(e.label).width;
      const mid = lx;
      // Anchor label in gap; offset slightly per arc to avoid stacking
      const crossIdx = crossEdges.indexOf(e);
      const ly = gapCenterY - 6 + (crossIdx % 2) * 13;

      const g = mk('g');
      g.appendChild(mk('path', {
        d: pathD, stroke: 'rgba(128,128,128,0.01)', 'stroke-width': 14,
        fill: 'none', 'pointer-events': 'stroke',
      }));
      g.appendChild(mk('rect', {
        x: mid - lw/2 - 8, y: ly - 22,
        width: lw + 10 + (editable ? 30 : 8), height: 22,
        fill: 'transparent', 'pointer-events': 'all',
      }));
      g.appendChild(mk('path', {
        d: pathD, stroke: arcColor, 'stroke-width': 1.8, fill: 'none',
        'stroke-linecap': 'round', 'pointer-events': 'none',
        'stroke-dasharray': '6,3',
      }));
      // Arrowhead at dep (arc arrives from above — tangent is downward)
      g.appendChild(mk('polygon', {
        points: `${x_d-4},${y_d-10} ${x_d+4},${y_d-10} ${x_d},${y_d-2}`,
        fill: arcColor, 'pointer-events': 'none',
      }));
      svg.appendChild(g);

      // Label at Bezier midpoint
      const labelG = mk('g');
      if (editable && onSetDeprel) labelG.style.cssText = 'cursor:pointer;';
      labelG.appendChild(mk('rect', {
        x: mid - lw/2 - 5, y: ly - 14, width: lw + 10, height: 14,
        rx: 3, fill: 'var(--card)', stroke: arcColor, 'stroke-width': 0.8,
      }));
      const lt = mk('text', { x: mid, y: ly - 4, 'text-anchor': 'middle',
        'font-size': 10, 'font-weight': 600, fill: 'var(--text)', 'pointer-events': 'none' });
      lt.textContent = e.label;
      labelG.appendChild(lt);
      if (editable && onSetDeprel) {
        labelG.addEventListener('click', ev => {
          ev.stopPropagation();
          const svgR = svg.getBoundingClientRect();
          _arcShowDeprelPopup(svgR.left + mid, svgR.top + ly - 14, e.depId, e.label, onSetDeprel);
        });
      }

      let btnG = null;
      if (editable && onDeleteArc) {
        btnG = mk('g');
        const _bInit = _touch ? 'opacity:0.7; pointer-events:all;' : 'opacity:0; pointer-events:none;';
        btnG.style.cssText = `cursor:pointer; ${_bInit} transition:opacity .12s;`;
        const bx = mid + lw/2 + 14, by = ly - 7;
        btnG.appendChild(mk('circle', { cx: bx, cy: by, r: 18, fill: 'transparent' }));
        btnG.appendChild(mk('circle', { cx: bx, cy: by, r: 7, fill: 'var(--bad)', opacity: 0.9 }));
        const xt = mk('text', { x: bx, y: by + 4, 'text-anchor': 'middle',
          'font-size': 11, 'font-weight': 900, fill: '#fff', 'pointer-events': 'none' });
        xt.textContent = '×';
        btnG.appendChild(xt);
        btnG.addEventListener('click', ev => { ev.stopPropagation(); onDeleteArc(e.depId); });
      }

      if (btnG) {
        let hideTimer = null;
        const show = () => { clearTimeout(hideTimer); btnG.style.opacity = '1'; btnG.style.pointerEvents = ''; };
        const hide = () => { hideTimer = setTimeout(() => { btnG.style.opacity = '0'; btnG.style.pointerEvents = 'none'; }, 300); };
        g.addEventListener('pointerenter', show); g.addEventListener('pointerleave', hide);
        labelG.addEventListener('pointerenter', show); labelG.addEventListener('pointerleave', hide);
        btnG.addEventListener('pointerenter', () => clearTimeout(hideTimer));
        btnG.addEventListener('pointerleave', hide);
      }
      edgeLabelGroups.push(labelG);
      if (btnG) edgeLabelGroups.push(btnG);
    }
  }

  // ── Token boxes ────────────────────────────────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    const t   = toks[i];
    const cxi = flatCenters[i];
    const bw  = cellW[i];
    const bx  = cxi - bw / 2;
    const wY  = flatWordYs[i];

    if (i === 0) {
      // ── ROOT box: dashed green border ────────────────────────────────────
      svg.appendChild(mk('rect', { x:bx, y:wY, width:bw, height:CELL_H,
        rx:6, fill:'rgba(61,232,154,0.06)', stroke:'var(--ok)',
        'stroke-width':1.5, 'stroke-dasharray':'5,3' }));
      const fmT = mk('text', { x:cxi, y:wY+CELL_H/2+5,
        'text-anchor':'middle', 'font-size':FONT_SZ, 'font-weight':700,
        fill:'var(--ok)', 'font-family':FONT_M, 'letter-spacing':'1px' });
      fmT.textContent = 'ROOT';
      svg.appendChild(fmT);
      if (editable && onSetHead) {
        const ov = mk('rect', { x:bx, y:wY, width:bw, height:CELL_H,
          rx:6, fill:'transparent', cursor:'grab' });
        ov.dataset.arctokid = '0';
        ov.style.touchAction = 'pan-y';
        ov.addEventListener('pointerenter', () => { if (!_arcDrag) ov.style.fill = 'rgba(61,232,154,0.12)'; });
        ov.addEventListener('pointerleave', () => { ov.style.fill = 'transparent'; });
        ov.addEventListener('pointerdown', ev => {
          if (ev.pointerType === 'mouse' && ev.button !== 0) return;
          const isTouch = ev.pointerType !== 'mouse';
          const tokData = {
            startX: ev.clientX, startY: ev.clientY,
            pointerId: ev.pointerId, isTouch,
            tokIdx: 0, depId: 0,
            svg, centers: flatCenters, wordYs: flatWordYs, cellH: CELL_H, toks,
            onSetHead, onSetDeprel, onScrollTok: null,
            _hovId: null, _hovEl: null, _hovBad: false,
          };
          if (isTouch) {
            ov.setPointerCapture(ev.pointerId);
            _arcPreHold = { ...tokData, overlayEl: ov };
            _arcHoldTimer = setTimeout(() => {
              if (!_arcPreHold) return;
              const ph = _arcPreHold; _arcPreHold = null;
              navigator.vibrate?.(15);
              _arcPreDrag = ph;
            }, _ARC_HOLD_MS);
          } else {
            ev.preventDefault();
            ov.setPointerCapture(ev.pointerId);
            _arcPreDrag = tokData;
          }
        });
        svg.appendChild(ov);
      }
      continue;
    }

    // ── Regular token box ─────────────────────────────────────────────────
    svg.appendChild(mk('rect', { x:bx, y:wY, width:bw, height:CELL_H,
      rx:6, fill:'var(--card)', stroke:'var(--line2)', 'stroke-width':1 }));
    const idT = mk('text', { x:bx+5, y:wY+11,
      'font-size':9, fill:'var(--muted)', 'font-weight':600 });
    idT.textContent = t.id;
    svg.appendChild(idT);
    const fmT = mk('text', { x:cxi, y:wY+CELL_H/2+5,
      'text-anchor':'middle', 'font-size':FONT_SZ, 'font-weight':700,
      fill:'var(--text)', 'font-family':FONT_M });
    fmT.textContent = t.form;
    svg.appendChild(fmT);

    const overlay = mk('rect', { x:bx, y:wY, width:bw, height:CELL_H,
      rx:6, fill:'transparent',
      cursor: editable ? 'grab' : (scrollToTok ? 'pointer' : 'default') });
    overlay.dataset.arctokid = t.id;
    if (editable) {
      overlay.style.touchAction = 'pan-y';
      overlay.addEventListener('pointerdown', ev => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        const isTouch = ev.pointerType !== 'mouse';
        const tokData = {
          startX: ev.clientX, startY: ev.clientY,
          pointerId: ev.pointerId, isTouch,
          tokIdx: i, depId: t.id,
          svg, centers: flatCenters, wordYs: flatWordYs, cellH: CELL_H, toks,
          onSetHead, onSetDeprel, onScrollTok: scrollToTok,
          _hovId: null, _hovEl: null, _hovBad: false,
        };
        if (isTouch) {
          overlay.setPointerCapture(ev.pointerId);
          _arcPreHold = { ...tokData, overlayEl: overlay };
          _arcHoldTimer = setTimeout(() => {
            if (!_arcPreHold) return;
            const ph = _arcPreHold; _arcPreHold = null;
            ph.overlayEl.style.fill = 'rgba(255,200,50,0.35)';
            navigator.vibrate?.(15);
            _arcPreDrag = ph;
          }, _ARC_HOLD_MS);
        } else {
          ev.preventDefault();
          overlay.setPointerCapture(ev.pointerId);
          _arcPreDrag = tokData;
        }
      });
      overlay.addEventListener('pointerenter', () => { overlay.style.fill = 'rgba(74,158,255,0.10)'; });
      overlay.addEventListener('pointerleave', () => { overlay.style.fill = 'transparent'; });
    } else if (scrollToTok) {
      overlay.addEventListener('click', () => scrollToTok(t.id));
      overlay.addEventListener('pointerenter', () => { overlay.style.fill = 'rgba(255,255,255,0.06)'; });
      overlay.addEventListener('pointerleave', () => { overlay.style.fill = 'transparent'; });
    }
    svg.appendChild(overlay);
  }

  // ── Arc labels + buttons on top of all arc paths and token boxes ──────────
  for (const g of edgeLabelGroups) svg.appendChild(g);

  const wrap = document.createElement('div');
  wrap.className = 'arcDiagramWrap';
  wrap.appendChild(svg);
  return wrap;
}
