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
  // Root drag: dragging FROM root zone DOWN onto a token → set that token as root
  if (drag.isRootDrag) {
    const ni = _arcNearest(mx, my, drag.centers, drag.wordY, drag.cellH);
    if (ni !== null && drag.onSetHead) {
      const tok = drag.toks[ni];
      if (tok.head !== 0) drag.onSetHead(tok.id, 0);
      if (drag.onSetDeprel) {
        _arcShowDeprelPopup(e.clientX, e.clientY, tok.id, tok.deprel ?? 'root', drag.onSetDeprel);
      }
    }
    return;
  }
  // Check for ROOT drop zone: pointer released inside the labeled ROOT strip at the top
  const rootZoneBoundary = drag.rootZoneH > 0 ? drag.rootZoneH + 6 : drag.wordY - drag.rootH;
  if (my < rootZoneBoundary && drag.onSetHead) {
    const curHead = drag.toks[drag.tokIdx]?.head;
    if (curHead !== 0) drag.onSetHead(drag.depId, 0);
    // Always show deprel popup so the user can set/change the root relation label
    if (drag.onSetDeprel) {
      const curDeprel = drag.toks[drag.tokIdx].deprel ?? 'root';
      _arcShowDeprelPopup(e.clientX, e.clientY, drag.depId, curDeprel, drag.onSetDeprel);
    }
    return;
  }
  const ni = _arcNearest(mx, my, drag.centers, drag.wordY, drag.cellH);
  if (ni !== null && drag.toks[ni].id !== drag.depId) {
    // Arrow direction: head → dependent.
    // Dragged-FROM token (drag.depId) = head, dropped-ON token (toks[ni]) = dependent.
    const newDepId  = drag.toks[ni].id;
    const newHeadId = drag.depId;
    if (_arcWouldCycle(newDepId, newHeadId, drag.toks)) {
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
    drag.onSetHead(newDepId, newHeadId);
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
  // Root drag starts from pointer position; token drag starts from token center
  const sx = pd.isRootDrag ? (pd.startX - r.left) : pd.centers[pd.tokIdx];
  const sy = pd.isRootDrag ? (pd.startY - r.top)  : pd.wordY + pd.cellH / 2;
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
  // Highlight source token (skipped for root drag — no source token)
  let srcEl = null;
  if (!pd.isRootDrag) {
    srcEl = _tokElCache.get(pd.toks[pd.tokIdx].id);
    if (srcEl) srcEl.style.fill = 'rgba(255,200,50,0.35)';
  }
  // Short haptic pulse on touch devices to confirm drag start
  if (pd.isTouch) navigator.vibrate?.(12);
  _arcDrag = { ...pd, line, dot, _hovId:null, _hovEl:null, _hovBad:false, _tokElCache, _srcEl:srcEl, _svgRect:null };
}

// Find the nearest token center within a vertical hit band around the word row.
// Returns the token index or null if the cursor is too far from any token.
function _arcNearest(mx, my, centers, wordY, cellH) {
  if (my < wordY - 10 || my > wordY + cellH + 10) return null;
  let best = null, bestD = 64;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(mx - centers[i]);
    if (d < bestD) { best = i; bestD = d; }
  }
  return best;
}

// Highlight the drop target token during a drag (blue = valid, red = would cycle).
// Also highlights the ROOT zone when the pointer is above the arc area (token drag only).
function _arcHighlightDrop(mx, my) {
  // Root zone highlight — only for token→root drag, not root→token drag
  if (!_arcDrag.isRootDrag) {
    const rootZoneBoundary = _arcDrag.rootZoneH > 0 ? _arcDrag.rootZoneH + 6 : _arcDrag.wordY - _arcDrag.rootH;
    const inRootZone = my < rootZoneBoundary;
    const rz = _arcDrag.svg._arcRootZone;
    if (rz) {
      const curHead = _arcDrag.toks[_arcDrag.tokIdx]?.head;
      if (inRootZone && curHead !== 0) {
        rz.setAttribute('fill', 'rgba(61,232,154,0.22)');
        rz.setAttribute('stroke', 'var(--ok)');
        rz.setAttribute('opacity', '1');
      } else {
        rz.setAttribute('fill', 'rgba(61,232,154,0.05)');
        rz.setAttribute('stroke', 'var(--ok)');
        rz.setAttribute('opacity', '0.55');
      }
    }
    if (inRootZone) {
      // Only clear the token hover highlight, not the root zone (we just set it above)
      if (_arcDrag._hovEl) { _arcDrag._hovEl.style.fill = 'transparent'; _arcDrag._hovEl = null; }
      _arcDrag._hovId = null; _arcDrag._hovBad = false;
      return;
    }
  }
  const ni  = _arcNearest(mx, my, _arcDrag.centers, _arcDrag.wordY, _arcDrag.cellH);
  const nid = (ni !== null && _arcDrag.toks[ni].id !== _arcDrag.depId) ? _arcDrag.toks[ni].id : null;
  if (nid === _arcDrag._hovId) return;
  _arcClearHighlight(_arcDrag);
  _arcDrag._hovId = nid;
  if (nid !== null && _arcDrag.svg.isConnected) {
    // Use pre-built element cache instead of querySelector on every frame
    const el = _arcDrag._tokElCache?.get(nid) ?? _arcDrag.svg.querySelector(`[data-arctokid="${nid}"]`);
    if (el) {
      const bad = _arcWouldCycle(nid, _arcDrag.depId, _arcDrag.toks);
      if (bad) {
        el.classList.add('arcBadHover');
        el.style.fill = '';
      } else {
        el.style.fill = 'rgba(74,158,255,0.30)';
      }
      _arcDrag._hovEl  = el;
      _arcDrag._hovBad = bad;
    }
  }
}

// Clear any active drop-target highlight (token and root zone).
function _arcClearHighlight(drag) {
  if (drag._hovEl) {
    drag._hovEl.classList.remove('arcBadHover');
    drag._hovEl.style.fill = 'transparent';
    drag._hovEl = null;
  }
  drag._hovId  = null;
  drag._hovBad = false;
  // Restore root zone to default idle appearance (always visible, just dimmer)
  const rz = drag.svg._arcRootZone;
  if (rz) {
    rz.setAttribute('fill', 'rgba(61,232,154,0.05)');
    rz.setAttribute('stroke', 'var(--ok)');
    rz.setAttribute('opacity', '0.55');
  }
}

// ── Cycle detection ───────────────────────────────────────────────────────────
// Returns true if making depId point to newHeadId would create a cycle.
// Uses path tracing from newHeadId upward through the current token heads.
function _arcWouldCycle(depId, newHeadId, toks) {
  if (depId === newHeadId) return true;
  const idToHead = new Map(toks.map(t => [t.id, t.head]));
  const seen = new Set([depId]);
  let cur = newHeadId;
  while (cur != null && cur !== 0) {
    if (seen.has(cur)) return true;
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
// Pass onSetHead/onDeleteArc/onSetDeprel to make the diagram editable.
function buildArcDiagram(tokMap, { onSetHead = null, onDeleteArc = null, onSetDeprel = null, scrollToTok = null, edgeColors = null } = {}) {
  const NS      = 'http://www.w3.org/2000/svg';
  const toks    = Array.from(tokMap.values()).sort((a, b) => a.id - b.id);
  if (!toks.length) return null;

  const editable  = !!onSetHead;
  const _touch    = window.matchMedia('(pointer: coarse)').matches;

  // ── Layout constants (larger on touch/tablet for easier tap targets) ──────
  const HPAD      = _touch ? 18 : 14;  // horizontal padding inside word box
  const CELL_H    = _touch ? 48 : 34;  // word box height
  const GAP       = _touch ? 22 : 18;  // gap between word boxes
  const FONT_SZ   = _touch ? 14 : 12;  // token label font size
  const MIN_W     = _touch ? 66 : 52;  // minimum word box width
  const ARC_U     = 36;   // px per token-distance unit (controls arc height scaling)
  const ARC_MX    = 210;  // maximum arc height cap
  const ROOT_H    = 30;   // height of the vertical root arrow
  const ROOT_ZONE = editable ? 36 : 0; // always reserve a visible ROOT drop zone for editable diagrams
  const PTOP      = ROOT_ZONE + 6; // top SVG padding (includes root zone height)
  const PBOT      = 8;    // bottom SVG padding
  const FONT_M = "'JetBrains Mono', ui-monospace, Consolas, monospace";

  // Measure text widths via an offscreen canvas for accurate box sizing
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = `bold ${FONT_SZ}px ${FONT_M}`;
  const cellW = toks.map(t => Math.max(MIN_W, mc.measureText(t.form).width + HPAD * 2));

  // Compute the x-center of each token box
  let xo = GAP;
  const centers = toks.map((_, i) => { const c = xo + cellW[i] / 2; xo += cellW[i] + GAP; return c; });
  const svgW = xo;

  // Build edge descriptors from token head fields
  const idxOf = new Map(toks.map((t, i) => [t.id, i]));
  const edges  = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.head == null) continue;
    if (t.head === 0) {
      edges.push({ dep:i, head:-1, label:t.deprel??'_', isRoot:true,  h:0 });
    } else {
      const hi = idxOf.get(t.head);
      if (hi == null) continue;
      // Arc height scales with token distance, capped at ARC_MX
      edges.push({ dep:i, head:hi, label:t.deprel??'_', isRoot:false,
        h: Math.min(ARC_U * Math.abs(hi - i), ARC_MX) });
    }
  }
  // Draw shorter arcs first so longer arcs appear behind them
  edges.sort((a, b) => a.h - b.h);

  const maxArcH = Math.max(0, ...edges.filter(e => !e.isRoot).map(e => e.h));
  // Always reserve ROOT_H space in editable diagrams so root arrows always have room to draw
  const arcArea = Math.max(maxArcH, (editable || edges.some(e => e.isRoot)) ? ROOT_H : 0);
  const wordY   = PTOP + arcArea + 14;
  const svgH    = wordY + CELL_H + PBOT;

  const mk = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };
  // On touch/tablet (coarse pointer) show delete buttons permanently instead of hover-only.

  const svg = mk('svg', { width:svgW, height:svgH });
  // Allow vertical page-scroll over the diagram; touch-action:none is applied
  // only on token boxes so drags still work reliably on tablets.
  svg.style.cssText = 'display:block; overflow:visible; cursor:default; touch-action:pan-y;';

  mc.font = '10px sans-serif';

  // ── Draw edges — two passes ───────────────────────────────────────────────
  // Pass 1: arc path curves appended in sorted order (short arcs behind long arcs).
  // Pass 2: arc labels + ✕ buttons collected here; appended last so they always
  //         render on top of all arc paths regardless of arc length ordering.
  const edgeLabelGroups = [];

  for (const e of edges) {
    const g      = mk('g');
    const depId  = toks[e.dep].id;
    const arcColor = edgeColors?.get(depId) ?? 'var(--ok)';

    if (e.isRoot) {
      // Vertical root arrow — always green regardless of edgeColors
      const rootColor = 'var(--ok)';
      const dx = centers[e.dep];
      const ty = wordY - ROOT_H;
      g.appendChild(mk('line', { x1:dx, y1:ty+4, x2:dx, y2:wordY-8,
        stroke:rootColor, 'stroke-width':1.8 }));
      g.appendChild(mk('polygon', {
        points:`${dx-5},${wordY-14} ${dx+5},${wordY-14} ${dx},${wordY-3}`,
        fill:rootColor }));
      svg.appendChild(g);

      // Root label — separate group for top-layer rendering
      const lw = mc.measureText(e.label).width;
      const labelG = mk('g');
      if (editable && onSetDeprel) labelG.style.cssText = 'cursor:pointer;';
      labelG.appendChild(mk('rect', { x:dx+6, y:ty+2, width:lw+8, height:13, rx:3, fill:'var(--card)' }));
      const lt = mk('text', { x:dx+10, y:ty+12, 'font-size':10, fill:'var(--ok)', 'font-weight':700 });
      lt.textContent = e.label;
      labelG.appendChild(lt);
      if (editable && onSetDeprel) {
        labelG.addEventListener('click', ev => {
          ev.stopPropagation();
          const svgR = svg.getBoundingClientRect();
          _arcShowDeprelPopup(svgR.left + dx + 14 + lw, svgR.top + ty + 2, depId, e.label, onSetDeprel);
        });
      }

      // Root ✕ delete button (shown on hover; always visible on touch devices)
      let rootBtnG = null;
      if (editable && onDeleteArc) {
        rootBtnG = mk('g');
        const _rInit = _touch ? 'opacity:0.7; pointer-events:all;' : 'opacity:0; pointer-events:none;';
        rootBtnG.style.cssText = `cursor:pointer; ${_rInit} transition:opacity .12s;`;
        const bx = dx + lw + 22;
        const by = ty + 7;
        // Transparent hit-area circle (large touch target)
        rootBtnG.appendChild(mk('circle', { cx:bx, cy:by, r:18, fill:'transparent' }));
        rootBtnG.appendChild(mk('circle', { cx:bx, cy:by, r:7, fill:'var(--bad)', opacity:0.9 }));
        const rxt = mk('text', { x:bx, y:by+4, 'text-anchor':'middle',
          'font-size':11, 'font-weight':900, fill:'#fff', 'pointer-events':'none' });
        rxt.textContent = '×';
        rootBtnG.appendChild(rxt);
        rootBtnG.addEventListener('click', ev => { ev.stopPropagation(); onDeleteArc(depId); });
        let rootHideTimer = null;
        const rootShow = () => { clearTimeout(rootHideTimer); rootBtnG.style.opacity='1'; rootBtnG.style.pointerEvents=''; };
        const rootHide = () => { rootHideTimer = setTimeout(() => { rootBtnG.style.opacity='0'; rootBtnG.style.pointerEvents='none'; }, 300); };
        g.addEventListener('pointerenter', rootShow);
        g.addEventListener('pointerleave', rootHide);
        labelG.addEventListener('pointerenter', rootShow);
        labelG.addEventListener('pointerleave', rootHide);
        rootBtnG.addEventListener('pointerenter', () => clearTimeout(rootHideTimer));
        rootBtnG.addEventListener('pointerleave', rootHide);
      }

      edgeLabelGroups.push(labelG);
      if (rootBtnG) edgeLabelGroups.push(rootBtnG);

    } else {
      const x1   = centers[e.dep];
      const x2   = centers[e.head];
      const apex = wordY - e.h;
      // The cubic Bezier M x1 y C x1 a x2 a x2 y peaks at t=0.5 at y=0.25*wordY+0.75*apex,
      // not at the control-point apex. Use the true curve peak for label/button placement.
      const curveApex = Math.round(0.25 * wordY + 0.75 * apex);
      const mid  = (x1 + x2) / 2;
      const lw   = mc.measureText(e.label).width;

      // Fat invisible stroke along the arc curve — for hover detection
      g.appendChild(mk('path', {
        d:`M ${x1} ${wordY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wordY}`,
        stroke:'rgba(128,128,128,0.01)', 'stroke-width':14, fill:'none',
        'pointer-events':'stroke' }));

      // Invisible hit rect covering the label + button area (at true curve peak)
      const lblHx = mid - lw/2 - 8;
      const lblHw = lw + 10 + (editable ? 30 : 8);
      g.appendChild(mk('rect', {
        x:lblHx, y:curveApex-22, width:lblHw, height:22,
        fill:'transparent', 'pointer-events':'all' }));

      // Visible cubic Bezier arc curve
      g.appendChild(mk('path', {
        d:`M ${x1} ${wordY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wordY}`,
        stroke:arcColor, 'stroke-width':1.8, fill:'none',
        'stroke-linecap':'round', 'pointer-events':'none' }));

      // Arrowhead at the dependent end (arrow points from head → dependent)
      g.appendChild(mk('polygon', {
        points:`${x1-4},${wordY-10} ${x1+4},${wordY-10} ${x1},${wordY-2}`,
        fill:arcColor, 'pointer-events':'none' }));

      svg.appendChild(g);

      // Arc label group — rendered in top layer, at true curve peak
      const labelG = mk('g');
      if (editable && onSetDeprel) labelG.style.cssText = 'cursor:pointer;';
      labelG.appendChild(mk('rect', {
        x:mid-lw/2-5, y:curveApex-14, width:lw+10, height:14,
        rx:3, fill:'var(--card)', stroke:arcColor, 'stroke-width':0.8 }));
      const lt = mk('text', { x:mid, y:curveApex-4, 'text-anchor':'middle',
        'font-size':10, 'font-weight':600, fill:'var(--text)', 'pointer-events':'none' });
      lt.textContent = e.label;
      labelG.appendChild(lt);
      if (editable && onSetDeprel) {
        labelG.addEventListener('click', ev => {
          ev.stopPropagation();
          const svgR = svg.getBoundingClientRect();
          _arcShowDeprelPopup(svgR.left + mid, svgR.top + curveApex - 14, depId, e.label, onSetDeprel);
        });
      }

      // ✕ delete button — rendered in top layer; hover-only on mouse, always visible on touch
      let btnG = null;
      if (editable && onDeleteArc) {
        btnG = mk('g');
        const _bInit = _touch ? 'opacity:0.7; pointer-events:all;' : 'opacity:0; pointer-events:none;';
        btnG.style.cssText = `cursor:pointer; ${_bInit} transition:opacity .12s;`;
        const bx = mid + lw/2 + 14;
        const by = curveApex - 7;
        // Transparent hit-area circle (large touch target)
        btnG.appendChild(mk('circle', { cx:bx, cy:by, r:18, fill:'transparent' }));
        btnG.appendChild(mk('circle', { cx:bx, cy:by, r:7, fill:'var(--bad)', opacity:0.9 }));
        const xt = mk('text', { x:bx, y:by+4, 'text-anchor':'middle',
          'font-size':11, 'font-weight':900, fill:'#fff', 'pointer-events':'none' });
        xt.textContent = '×';
        btnG.appendChild(xt);
        btnG.addEventListener('click', ev => { ev.stopPropagation(); onDeleteArc(depId); });
      }

      // Hover on path group OR label → show ✕ button; pointer-events toggled to avoid
      // invisible button accidentally blocking clicks when hidden.
      if (btnG) {
        let hideTimer = null;
        const show = () => {
          clearTimeout(hideTimer);
          btnG.style.opacity = '1';
          btnG.style.pointerEvents = '';
        };
        const hide = () => {
          hideTimer = setTimeout(() => {
            btnG.style.opacity = '0';
            btnG.style.pointerEvents = 'none';
          }, 300);
        };
        g.addEventListener('pointerenter', show);
        g.addEventListener('pointerleave', hide);
        labelG.addEventListener('pointerenter', show);
        labelG.addEventListener('pointerleave', hide);
        btnG.addEventListener('pointerenter', () => clearTimeout(hideTimer));
        btnG.addEventListener('pointerleave', hide);
      }

      edgeLabelGroups.push(labelG);
      if (btnG) edgeLabelGroups.push(btnG);
    }
  }

  // ── Draw token boxes ───────────────────────────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    const t   = toks[i];
    const cxi = centers[i];
    const bw  = cellW[i];
    const bx  = cxi - bw / 2;

    svg.appendChild(mk('rect', { x:bx, y:wordY, width:bw, height:CELL_H,
      rx:6, fill:'var(--card)', stroke:'var(--line2)', 'stroke-width':1 }));
    // Token ID in small text at top-left corner of the box
    const idT = mk('text', { x:bx+5, y:wordY+11, 'font-size':9,
      fill:'var(--muted)', 'font-weight':600 });
    idT.textContent = t.id;
    svg.appendChild(idT);
    // Token form centered in the box
    const fmT = mk('text', { x:cxi, y:wordY+CELL_H/2+5,
      'text-anchor':'middle', 'font-size':FONT_SZ, 'font-weight':700,
      fill:'var(--text)', 'font-family':FONT_M });
    fmT.textContent = t.form;
    svg.appendChild(fmT);

    // Transparent overlay acts as the drag source (editable) or click target (read-only)
    const overlay = mk('rect', { x:bx, y:wordY, width:bw, height:CELL_H,
      rx:6, fill:'transparent',
      cursor: editable ? 'grab' : (scrollToTok ? 'pointer' : 'default') });
    overlay.dataset.arctokid = t.id;
    if (editable) {
      // Touch: allow vertical scroll (pan-y) — hold timer decides if it's a drag.
      // Mouse: block all default pointer actions (none) so drag starts immediately.
      overlay.style.touchAction = 'pan-y';

      overlay.addEventListener('pointerdown', ev => {
        // Ignore right-clicks on mouse; accept all buttons for stylus/touch
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;

        const isTouch = ev.pointerType !== 'mouse';
        const tokData = {
          startX: ev.clientX, startY: ev.clientY,
          pointerId: ev.pointerId,
          isTouch,
          tokIdx: i, depId: t.id,
          svg, centers, wordY, cellH: CELL_H, rootH: ROOT_H, rootZoneH: ROOT_ZONE, toks,
          onSetHead, onSetDeprel, onScrollTok: scrollToTok,
          _hovId: null, _hovEl: null, _hovBad: false,
        };

        if (isTouch) {
          // Hold-to-drag: capture pointer early so we track movement reliably,
          // but don't enter drag mode until hold timer fires.
          // If the user moves > _ARC_HOLD_CANCEL px before the timer, we release
          // capture and let the browser handle the gesture (e.g. vertical scroll).
          overlay.setPointerCapture(ev.pointerId);
          _arcPreHold = { ...tokData, overlayEl: overlay };
          _arcHoldTimer = setTimeout(() => {
            if (!_arcPreHold) return;
            const ph = _arcPreHold; _arcPreHold = null;
            // Hold confirmed — enter pre-drag mode with visual + haptic feedback
            ph.overlayEl.style.fill = 'rgba(255,200,50,0.35)';
            navigator.vibrate?.(15);
            _arcPreDrag = ph;
          }, _ARC_HOLD_MS);
        } else {
          // Mouse: immediate pre-drag (existing behaviour)
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

  // ── Render arc labels + buttons on top of all arc paths ───────────────────
  // Appended after token boxes so they are always visible above overlapping paths.
  for (const lg of edgeLabelGroups) svg.appendChild(lg);

  // ── ROOT drop zone (editable only) ────────────────────────────────────────
  // A labeled dashed rectangle at the very top of the SVG.
  // Always visible so users know they can drag a token here to make it a root.
  // Highlights green when a drag enters the zone; dropping sets head=0 (root).
  if (editable && onSetHead) {
    const rz = mk('rect', {
      x: GAP, y: 2, width: svgW - GAP * 2, height: ROOT_ZONE - 4,
      rx: 5, fill: 'rgba(61,232,154,0.05)', stroke: 'var(--ok)',
      'stroke-dasharray': '5,3', 'stroke-width': 1.2,
      'pointer-events': 'fill', opacity: 0.55 });
    rz.style.cursor = 'grab';
    svg.appendChild(rz);

    const rzLabel = mk('text', {
      x: svgW / 2, y: 2 + (ROOT_ZONE - 4) / 2 + 4,
      'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ok)',
      'font-weight': 700, 'letter-spacing': '1px',
      'pointer-events': 'none', opacity: 0.65 });
    rzLabel.textContent = 'ROOT';
    svg.appendChild(rzLabel);

    svg._arcRootZone  = rz;
    svg._arcRootLabel = rzLabel;

    // Allow dragging FROM the ROOT zone down onto a token to make it root
    rz.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      const isTouch = ev.pointerType !== 'mouse';
      const tokData = {
        startX: ev.clientX, startY: ev.clientY,
        pointerId: ev.pointerId,
        isTouch, isRootDrag: true,
        tokIdx: null, depId: null,
        svg, centers, wordY, cellH: CELL_H, rootH: ROOT_H, rootZoneH: ROOT_ZONE, toks,
        onSetHead, onSetDeprel, onScrollTok: null,
        _hovId: null, _hovEl: null, _hovBad: false,
      };
      rz.setPointerCapture(ev.pointerId);
      if (isTouch) {
        _arcPreHold = { ...tokData, overlayEl: rz };
        _arcHoldTimer = setTimeout(() => {
          if (!_arcPreHold) return;
          const ph = _arcPreHold; _arcPreHold = null;
          navigator.vibrate?.(15);
          _arcPreDrag = ph;
        }, _ARC_HOLD_MS);
      } else {
        ev.preventDefault();
        _arcPreDrag = tokData;
      }
    });
  }

  const wrap = document.createElement('div');
  wrap.className = 'arcDiagramWrap';
  wrap.appendChild(svg);
  return wrap;
}
