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

const _ARC_THRESH = 5; // px movement required to promote a pointerdown to a real drag

let _arcPreDrag = null; // pending drag state set on pointerdown, before threshold is crossed
let _arcDrag    = null; // active drag state after threshold has been crossed

// Global pointermove: promote pre-drag to real drag once the movement threshold is exceeded,
// then update the drag line and drop-target highlight while dragging.
window.addEventListener('pointermove', e => {
  // Only track the pointer that started the drag
  if (_arcPreDrag && e.pointerId !== _arcPreDrag.pointerId) return;
  if (_arcDrag    && e.pointerId !== _arcDrag.pointerId)    return;
  // Promote pre-drag to real drag once threshold is crossed
  if (_arcPreDrag && !_arcDrag) {
    const dx = e.clientX - _arcPreDrag.startX;
    const dy = e.clientY - _arcPreDrag.startY;
    if (Math.hypot(dx, dy) > _ARC_THRESH) _arcBeginDrag(e);
  }
  if (!_arcDrag) return;
  // Guard: SVG might have been replaced by a re-render
  if (!_arcDrag.svg.isConnected) { _arcDrag = null; return; }
  const r  = _arcDrag.svg.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  _arcDrag.line.setAttribute('x2', mx);
  _arcDrag.line.setAttribute('y2', my);
  _arcDrag.dot.setAttribute('cx', mx);
  _arcDrag.dot.setAttribute('cy', my);
  _arcHighlightDrop(mx, my);
});

// Global pointerup: handle drop — either a plain click (no threshold crossed) or a real drag.
window.addEventListener('pointerup', e => {
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
  if (drag.svg.isConnected) {
    drag.line.remove();
    drag.dot.remove();
    drag.svg.style.cursor = '';
    _arcClearHighlight(drag);
  }
  const r  = drag.svg.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const ni = _arcNearest(mx, my, drag.centers, drag.wordY, drag.cellH);
  if (ni !== null && drag.toks[ni].id !== drag.depId) {
    const newHeadId = drag.toks[ni].id;
    if (_arcWouldCycle(drag.depId, newHeadId, drag.toks)) {
      // Reject the drop: flash the target token red to signal the cycle
      if (drag.svg.isConnected) {
        const el = drag.svg.querySelector(`[data-arctokid="${newHeadId}"]`);
        if (el) {
          el.style.fill = 'rgba(255,70,70,0.50)';
          setTimeout(() => { el.style.fill = 'transparent'; }, 700);
        }
      }
      return;
    }
    drag.onSetHead(drag.depId, newHeadId);
    // Show deprel listbox immediately after assigning new head
    if (drag.onSetDeprel) {
      const currentDeprel = drag.toks[drag.tokIdx].deprel ?? '_';
      _arcShowDeprelPopup(e.clientX, e.clientY, drag.depId, currentDeprel, drag.onSetDeprel);
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
  const sy = pd.wordY + pd.cellH / 2;
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const line = mk('line', { x1:sx, y1:sy, x2:mx, y2:my,
    stroke:'var(--warn)', 'stroke-width':2, 'stroke-dasharray':'5,3', 'pointer-events':'none' });
  const dot = mk('circle', { cx:mx, cy:my, r:5, fill:'var(--warn)', 'pointer-events':'none' });
  pd.svg.appendChild(line);
  pd.svg.appendChild(dot);
  pd.svg.style.cursor = 'grabbing';
  _arcDrag = { ...pd, line, dot, _hovId:null, _hovEl:null, _hovBad:false };
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
function _arcHighlightDrop(mx, my) {
  const ni  = _arcNearest(mx, my, _arcDrag.centers, _arcDrag.wordY, _arcDrag.cellH);
  const nid = (ni !== null && _arcDrag.toks[ni].id !== _arcDrag.depId) ? _arcDrag.toks[ni].id : null;
  if (nid === _arcDrag._hovId) return;
  _arcClearHighlight(_arcDrag);
  _arcDrag._hovId = nid;
  if (nid !== null && _arcDrag.svg.isConnected) {
    const el = _arcDrag.svg.querySelector(`[data-arctokid="${nid}"]`);
    if (el) {
      const bad = _arcWouldCycle(_arcDrag.depId, nid, _arcDrag.toks);
      el.style.fill = bad ? 'rgba(255,70,70,0.40)' : 'rgba(74,158,255,0.30)';
      _arcDrag._hovEl  = el;
      _arcDrag._hovBad = bad;
    }
  }
}

// Clear any active drop-target highlight.
function _arcClearHighlight(drag) {
  if (drag._hovEl) { drag._hovEl.style.fill = 'transparent'; drag._hovEl = null; }
  drag._hovId  = null;
  drag._hovBad = false;
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

  const sel = document.createElement('select');
  sel.size = 12;
  sel.innerHTML = optsHtml;
  sel.value = currentDeprel;
  sel.style.cssText = 'display:block; border:none; outline:none; background:var(--bg); color:var(--text); font-size:12px; font-family:inherit; cursor:pointer; min-width:110px;';

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

  const editable = !!onSetHead;

  // ── Layout constants ──────────────────────────────────────────────────────
  const HPAD   = 14;   // horizontal padding inside word box
  const CELL_H = 34;   // word box height
  const GAP    = 18;   // gap between word boxes
  const ARC_U  = 36;   // px per token-distance unit (controls arc height scaling)
  const ARC_MX = 210;  // maximum arc height cap
  const ROOT_H = 30;   // height of the vertical root arrow
  const PTOP   = 14;   // top SVG padding
  const PBOT   = 8;    // bottom SVG padding
  const FONT_M = "'JetBrains Mono', ui-monospace, Consolas, monospace";

  // Measure text widths via an offscreen canvas for accurate box sizing
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = `bold 12px ${FONT_M}`;
  const cellW = toks.map(t => Math.max(52, mc.measureText(t.form).width + HPAD * 2));

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
  const arcArea = Math.max(maxArcH, edges.some(e => e.isRoot) ? ROOT_H : 0);
  const wordY   = PTOP + arcArea + 14;
  const svgH    = wordY + CELL_H + PBOT;

  const mk = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };

  const svg = mk('svg', { width:svgW, height:svgH });
  svg.style.cssText = 'display:block; overflow:visible; cursor:default; touch-action:none;';

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
      edgeLabelGroups.push(labelG);

    } else {
      const x1   = centers[e.dep];
      const x2   = centers[e.head];
      const apex = wordY - e.h;
      const mid  = (x1 + x2) / 2;
      const lw   = mc.measureText(e.label).width;

      // Fat invisible stroke along the arc curve — for hover detection
      g.appendChild(mk('path', {
        d:`M ${x1} ${wordY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wordY}`,
        stroke:'rgba(128,128,128,0.01)', 'stroke-width':14, fill:'none',
        'pointer-events':'stroke' }));

      // Invisible hit rect covering the label + button area (gap above arc apex)
      const lblHx = mid - lw/2 - 8;
      const lblHw = lw + 10 + (editable ? 30 : 8);
      g.appendChild(mk('rect', {
        x:lblHx, y:apex-22, width:lblHw, height:22,
        fill:'transparent', 'pointer-events':'all' }));

      // Visible cubic Bezier arc curve
      g.appendChild(mk('path', {
        d:`M ${x1} ${wordY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wordY}`,
        stroke:arcColor, 'stroke-width':1.8, fill:'none',
        'stroke-linecap':'round', 'pointer-events':'none' }));

      // Arrowhead at the dependent end
      g.appendChild(mk('polygon', {
        points:`${x2-4},${wordY-10} ${x2+4},${wordY-10} ${x2},${wordY-2}`,
        fill:arcColor, 'pointer-events':'none' }));

      svg.appendChild(g);

      // Arc label group — rendered in top layer
      const labelG = mk('g');
      if (editable && onSetDeprel) labelG.style.cssText = 'cursor:pointer;';
      labelG.appendChild(mk('rect', {
        x:mid-lw/2-5, y:apex-14, width:lw+10, height:14,
        rx:3, fill:'var(--card)', stroke:arcColor, 'stroke-width':0.8 }));
      const lt = mk('text', { x:mid, y:apex-4, 'text-anchor':'middle',
        'font-size':10, 'font-weight':600, fill:'var(--text)', 'pointer-events':'none' });
      lt.textContent = e.label;
      labelG.appendChild(lt);
      if (editable && onSetDeprel) {
        labelG.addEventListener('click', ev => {
          ev.stopPropagation();
          const svgR = svg.getBoundingClientRect();
          _arcShowDeprelPopup(svgR.left + mid, svgR.top + apex - 14, depId, e.label, onSetDeprel);
        });
      }

      // ✕ delete button — rendered in top layer, initially hidden
      let btnG = null;
      if (editable && onDeleteArc) {
        btnG = mk('g');
        btnG.style.cssText = 'cursor:pointer; opacity:0; pointer-events:none; transition:opacity .12s;';
        const bx = mid + lw/2 + 14;
        const by = apex - 7;
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
      'text-anchor':'middle', 'font-size':12, 'font-weight':700,
      fill:'var(--text)', 'font-family':FONT_M });
    fmT.textContent = t.form;
    svg.appendChild(fmT);

    // Transparent overlay acts as the drag source (editable) or click target (read-only)
    const overlay = mk('rect', { x:bx, y:wordY, width:bw, height:CELL_H,
      rx:6, fill:'transparent',
      cursor: editable ? 'grab' : (scrollToTok ? 'pointer' : 'default') });
    overlay.dataset.arctokid = t.id;

    if (editable) {
      overlay.addEventListener('pointerdown', ev => {
        // Ignore right-clicks on mouse; accept all buttons for stylus/touch
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        ev.preventDefault();
        // Capture pointer so pointermove/pointerup stay reliable even outside the element
        overlay.setPointerCapture(ev.pointerId);
        // Record pre-drag state; actual drag starts only after _ARC_THRESH movement
        _arcPreDrag = {
          startX: ev.clientX, startY: ev.clientY,
          pointerId: ev.pointerId,
          tokIdx: i, depId: t.id,
          svg, centers, wordY, cellH: CELL_H, toks,
          onSetHead, onSetDeprel, onScrollTok: scrollToTok,
          _hovId: null, _hovEl: null, _hovBad: false,
        };
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

  const wrap = document.createElement('div');
  wrap.className = 'arcDiagramWrap';
  wrap.appendChild(svg);
  return wrap;
}
