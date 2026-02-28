// Interactive SVG arc diagram (displaCy-style) with drag-to-reattach and deprel popup.
//
// Interaction (editable / gold view):
//   • Drag FROM any token box → drop on another token → assigns new head
//     → deprel popup appears immediately after to set relation type
//   • Single click on token box (no drag) → scrolls to table row
//   • Hover over arc → red ✕ button appears → click to reset head
//   • Click on arc label → deprel popup (change relation type)
//
// Read-only (file views): click on token box scrolls to table row only.
// ─────────────────────────────────────────────────────────────────────────────

const _ARC_THRESH = 5; // px movement required to promote a mousedown to a real drag

let _arcPreDrag = null; // pending drag state set on mousedown, before threshold is crossed
let _arcDrag    = null; // active drag state after threshold has been crossed

// Global mousemove: promote pre-drag to real drag once the movement threshold is exceeded,
// then update the drag line and drop-target highlight while dragging.
window.addEventListener('mousemove', e => {
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

// Global mouseup: handle drop — either a plain click (no threshold crossed) or a real drag.
window.addEventListener('mouseup', e => {
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
    // Show deprel popup immediately after assigning new head
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

// ── Deprel popup ──────────────────────────────────────────────────────────────
// Show a small floating popup at (screenX, screenY) to pick a dependency relation.
// onSetDeprel(depId, deprel) is called when the user confirms the selection.
function _arcShowDeprelPopup(screenX, screenY, depId, currentDeprel, onSetDeprel) {
  document.getElementById('arcDeprelPopup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'arcDeprelPopup';
  popup.style.cssText = [
    'position:fixed', 'z-index:9999',
    `left:${screenX + 10}px`, `top:${screenY - 10}px`,
    'background:var(--card)', 'border:1px solid var(--line)',
    'border-radius:8px', 'padding:10px', 'box-shadow:0 4px 20px rgba(0,0,0,.5)',
    'display:flex', 'flex-direction:column', 'gap:7px', 'min-width:160px',
  ].join(';');

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.05em;';
  lbl.textContent = 'Relation type';
  popup.appendChild(lbl);

  // Build select — use global DEPREL_OPTIONS_HTML if available, otherwise fall back to UD list
  const sel = document.createElement('select');
  const optsHtml = (typeof DEPREL_OPTIONS_HTML !== 'undefined' && DEPREL_OPTIONS_HTML)
    ? DEPREL_OPTIONS_HTML
    : ['_','nsubj','obj','iobj','csubj','ccomp','xcomp','obl','vocative','expl',
       'dislocated','advcl','advmod','discourse','aux','cop','mark','nmod','appos',
       'nummod','acl','amod','det','clf','case','conj','cc','fixed','flat','compound',
       'list','parataxis','orphan','goeswith','reparandum','punct','root','dep']
      .map(d => `<option value="${d}">${d}</option>`).join('');
  sel.innerHTML = optsHtml;
  sel.value = currentDeprel;
  sel.style.cssText = 'width:100%; padding:5px 6px; background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:5px; font-size:12px;';
  popup.appendChild(sel);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:6px; justify-content:flex-end;';

  const applyBtn = document.createElement('button');
  applyBtn.textContent = '✓ OK';
  applyBtn.style.cssText = 'padding:4px 12px; font-size:12px; cursor:pointer; background:var(--ok); color:#fff; border:none; border-radius:5px; font-weight:600;';
  applyBtn.addEventListener('click', () => { onSetDeprel(depId, sel.value); popup.remove(); });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'padding:4px 9px; font-size:13px; cursor:pointer; background:var(--bg-control,#333); color:var(--text); border:1px solid var(--line); border-radius:5px;';
  closeBtn.addEventListener('click', () => popup.remove());

  btnRow.appendChild(applyBtn);
  btnRow.appendChild(closeBtn);
  popup.appendChild(btnRow);
  document.body.appendChild(popup);

  // Keyboard shortcuts: Enter = apply, Escape = close
  sel.addEventListener('keydown', ev => {
    if (ev.key === 'Enter')  { onSetDeprel(depId, sel.value); popup.remove(); }
    if (ev.key === 'Escape') { popup.remove(); }
  });

  // Adjust position so popup stays inside the viewport
  requestAnimationFrame(() => {
    const r = popup.getBoundingClientRect();
    if (r.right  > window.innerWidth)  popup.style.left = `${screenX - r.width - 10}px`;
    if (r.bottom > window.innerHeight) popup.style.top  = `${screenY - r.height}px`;
  });

  sel.focus();

  // Close on outside click (delay avoids closing on the same mousedown that opened it)
  setTimeout(() => {
    function outside(ev) {
      if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('mousedown', outside); }
    }
    document.addEventListener('mousedown', outside);
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
  svg.style.cssText = 'display:block; overflow:visible; cursor:default;';

  mc.font = '10px sans-serif';

  // ── Draw edges ────────────────────────────────────────────────────────────
  for (const e of edges) {
    const g     = mk('g');
    const depId = toks[e.dep].id;
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

      // Root label — clickable when editable
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
      g.appendChild(labelG);

    } else {
      const x1   = centers[e.dep];
      const x2   = centers[e.head];
      const apex = wordY - e.h;
      const mid  = (x1 + x2) / 2;

      const lw = mc.measureText(e.label).width;

      // Invisible hit rect that covers the full arc+label+button area for reliable hover
      const hLeft  = Math.min(x1, x2) - 8;
      const hRight = Math.max(x1, x2) + lw / 2 + 26;
      g.appendChild(mk('rect', {
        x: hLeft, y: apex - 22, width: hRight - hLeft, height: wordY - apex + 22,
        fill: 'transparent', 'pointer-events': 'all' }));

      // Visible cubic Bezier arc curve
      g.appendChild(mk('path', {
        d:`M ${x1} ${wordY} C ${x1} ${apex} ${x2} ${apex} ${x2} ${wordY}`,
        stroke:arcColor, 'stroke-width':1.8, fill:'none',
        'stroke-linecap':'round', 'pointer-events':'none' }));

      // Arrowhead at the dependent end
      g.appendChild(mk('polygon', {
        points:`${x2-4},${wordY-10} ${x2+4},${wordY-10} ${x2},${wordY-2}`,
        fill:arcColor, 'pointer-events':'none' }));

      // Arc label — clickable when editable
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
          _arcShowDeprelPopup(svgR.left + mid + lw/2 + 5, svgR.top + apex - 14, depId, e.label, onSetDeprel);
        });
      }
      g.appendChild(labelG);

      // ✕ delete button (editable only) — fades in on arc group hover
      if (editable && onDeleteArc) {
        const btnG = mk('g');
        btnG.style.cssText = 'cursor:pointer; opacity:0; transition:opacity .12s;';

        const bx = mid + lw/2 + 14;
        const by = apex - 7;
        btnG.appendChild(mk('circle', { cx:bx, cy:by, r:7, fill:'var(--bad)', opacity:0.9 }));
        const xt = mk('text', { x:bx, y:by+4, 'text-anchor':'middle',
          'font-size':11, 'font-weight':900, fill:'#fff', 'pointer-events':'none' });
        xt.textContent = '×';
        btnG.appendChild(xt);

        btnG.addEventListener('click', ev => { ev.stopPropagation(); onDeleteArc(depId); });
        g.appendChild(btnG);

        // Small delay before hiding to prevent button vanishing during mouse travel
        let hideTimer = null;
        g.addEventListener('mouseenter', () => { clearTimeout(hideTimer); btnG.style.opacity = '1'; });
        g.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => { btnG.style.opacity = '0'; }, 300); });
        btnG.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      }
    }
    svg.appendChild(g);
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
      overlay.addEventListener('mousedown', ev => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        // Record pre-drag state; actual drag starts only after _ARC_THRESH movement
        _arcPreDrag = {
          startX: ev.clientX, startY: ev.clientY,
          tokIdx: i, depId: t.id,
          svg, centers, wordY, cellH: CELL_H, toks,
          onSetHead, onSetDeprel, onScrollTok: scrollToTok,
          _hovId: null, _hovEl: null, _hovBad: false,
        };
      });
      overlay.addEventListener('mouseenter', () => { overlay.style.fill = 'rgba(74,158,255,0.10)'; });
      overlay.addEventListener('mouseleave', () => { overlay.style.fill = 'transparent'; });
    } else if (scrollToTok) {
      overlay.addEventListener('click', () => scrollToTok(t.id));
      overlay.addEventListener('mouseenter', () => { overlay.style.fill = 'rgba(255,255,255,0.06)'; });
      overlay.addEventListener('mouseleave', () => { overlay.style.fill = 'transparent'; });
    }
    svg.appendChild(overlay);
  }

  const wrap = document.createElement('div');
  wrap.className = 'arcDiagramWrap';
  wrap.appendChild(svg);
  return wrap;
}
