// Guided tour — walks through the English demo in a temporary project.
// The tour project is created on start and removed on close, leaving all
// existing projects and annotations completely untouched.
// ─────────────────────────────────────────────────────────────────────────────

// ── Bilingual step content ────────────────────────────────────────────────────
const _TOUR_CONTENT = {
  de: [
    {
      title: 'Willkommen bei CoNLL-U Vergleich!',
      text: 'Diese Tour zeigt alle Funktionen anhand des englischen Beispiels. Es wird in einem temporären Projekt geöffnet — deine eigenen Daten bleiben unberührt. Mit «Tour abbrechen» oder Esc jederzeit beenden.',
    },
    {
      title: 'Projekte',
      text: 'Jeder Tab ist ein eigenes Projekt mit separaten Dateien, Annotationen und Undo-Verlauf. Wechseln mit [ ] oder Klick auf den Tab. Das «Guided Tour»-Projekt wird beim Beenden der Tour automatisch entfernt.',
    },
    {
      title: '1) Dateien',
      text: 'Zwei CoNLL-U-Dateien sind geladen: annotator_A und annotator_B mit je 2 Sätzen. Eigene Dateien per Drag & Drop oder «Dateien hinzufügen» laden. Tagsets (JSON) für eigene Label-Menüs importieren.',
    },
    {
      title: '2) Satz wählen',
      text: 'Mit ← → oder dem Dropdown zwischen Sätzen navigieren. Das Badge zeigt abweichende Tokens. Aktuell: Satz 1 — «The quick brown fox jumps over the lazy dog.»',
    },
    {
      title: 'Satztext',
      text: '«The quick brown fox jumps over the lazy dog.» — Tokens als Kacheln. Klick springt zur Zeile in der Vergleichstabelle. Orange = abweichende Tokens. Gelb = bestätigter Satz.',
    },
    {
      title: 'Garden-Path-Satz',
      text: '«Time flies like an arrow.» — Klassische Ambiguität: Annotator A liest «Time» als Nomen, Annotator B als Verb. Fast alle Tokens weichen ab — alles orange.',
    },
    {
      title: '3) Baumansicht',
      text: 'Abhängigkeitsbäume beider Annotatoren nebeneinander. Grün = identisch, orange/rot = Unterschied. Pfeilspitze zeigt zum Dependenten. Farbbalken neben Dateiname = Bogenfarbe.',
    },
    {
      title: '4) Vergleichstabelle',
      text: 'Jede Zeile = ein Token, alle CoNLL-U-Felder sichtbar. Farbige Zellen = Unterschiede. Die erste Datei gilt als Gold-Referenz. Spalten ein-/ausblenden über die Buttons oben.',
    },
    {
      title: 'Gold-Annotation wählen',
      text: 'Klicke eine markierte Zelle → Gold-Popup öffnet sich. Datei 1 oder 2 wählen oder eigenen Wert eingeben. Tastenkürzel: Pfeiltasten ↑↓ wählen Token, 1 oder 2 wählt Annotator, Enter öffnet Popup.',
    },
    {
      title: 'Undo / Redo',
      text: 'Jede Änderung ist rückgängig machbar. Ctrl+Z = Undo, Ctrl+Y = Redo. Die Buttons zeigen im Tooltip die Anzahl verfügbarer Schritte.',
    },
    {
      title: 'Satz bestätigen',
      text: 'Wenn die Annotationen fertig sind: «Bestätigen» oder Space. Das ✓ erscheint im Dropdown. «Alle ohne Diffs bestätigen» erledigt alle konfliktfreien Sätze in einem Schritt.',
    },
    {
      title: 'Bearbeitungsmodus freischalten',
      text: 'Das Schloss schützt vor versehentlichen Änderungen. Im Bearbeitungsmodus können Bögen neu gezogen, Tokens eingefügt/gelöscht und alle Felder direkt bearbeitet werden.',
    },
    {
      title: 'Bögen ziehen',
      text: 'Ziehe von einem Token-Kasten zu einem anderen, um den Kopf neu zuzuweisen. In die grüne ROOT-Zone oben = head=0. Nach dem Drop erscheint ein Deprel-Auswahlfenster.',
    },
    {
      title: '5) CoNLL-U',
      text: 'Alle 10 CoNLL-U-Felder direkt in der Tabelle bearbeiten — aktiviert wenn Bearbeitung freigeschaltet ist. Gold-Tabelle oben zeigt die aktuellen Gold-Annotationen. Über Tabs zwischen Strukturiertem Editor und Rohtext wechseln.',
    },
    {
      title: '6) Export',
      text: 'Gold-CoNLL-U herunterladen, Baumansichten exportieren oder die gesamte Session (alle Projekte + Undo-Verlauf) als JSON speichern und später wiederherstellen.',
    },
    {
      title: 'Tour abgeschlossen!',
      text: 'Das Tour-Projekt wird jetzt entfernt und du kehrst zu deinen Daten zurück. Lade eigene .conllu-Dateien per Drag & Drop und fang an. Taste ? öffnet jederzeit die vollständige Hilfe.',
    },
  ],
  en: [
    {
      title: 'Welcome to CoNLL-U Vergleich!',
      text: 'This tour uses the English example in a temporary project — your own data is completely untouched. Press Esc or "Skip tour" to exit at any time.',
    },
    {
      title: 'Projects',
      text: 'Each tab is a separate project with its own files, annotations and undo history. Switch with [ ] keys or by clicking a tab. The "Guided Tour" project is removed automatically when the tour ends.',
    },
    {
      title: '1) Files',
      text: 'Two CoNLL-U files are loaded: annotator_A and annotator_B, 2 sentences each. Load your own files via drag & drop or "Add files". Import a tagset JSON for custom label menus.',
    },
    {
      title: '2) Select Sentence',
      text: 'Navigate with ← → arrows or the dropdown. The badge shows differing token count. Currently: Sentence 1 — "The quick brown fox jumps over the lazy dog."',
    },
    {
      title: 'Sentence Text',
      text: '"The quick brown fox jumps over the lazy dog." — Tokens shown as tiles. Click a token to jump to its row in the comparison table. Orange = differing tokens. Yellow = confirmed sentence.',
    },
    {
      title: 'Garden-Path Sentence',
      text: '"Time flies like an arrow." — Classic ambiguity: Annotator A reads "Time" as a noun, Annotator B as a verb. Almost every token differs — all orange.',
    },
    {
      title: '3) Tree View',
      text: 'Dependency trees of both annotators side by side. Green = identical arcs, orange/red = differences. Arrowhead points to the dependent. Colour bar by filename matches arc colour.',
    },
    {
      title: '4) Comparison Table',
      text: 'Each row is one token, all CoNLL-U fields visible. Highlighted cells show disagreements. File 1 is the default gold reference. Toggle columns with the buttons above.',
    },
    {
      title: 'Choosing Gold Annotations',
      text: 'Click a highlighted cell → gold picker opens. Choose file 1 or 2, or type your own value. Keyboard: ↑↓ select token row, 1 or 2 picks annotator, Enter opens picker.',
    },
    {
      title: 'Undo / Redo',
      text: 'Every change is undoable. Ctrl+Z = Undo, Ctrl+Y = Redo. Button tooltips show the number of available steps.',
    },
    {
      title: 'Confirm Sentence',
      text: 'When annotations are complete, click Confirm or press Space. The ✓ appears in the dropdown. "Confirm all without diffs" handles all conflict-free sentences at once.',
    },
    {
      title: 'Unlock Edit Mode',
      text: 'The lock protects against accidental edits. In edit mode you can drag arcs to reassign heads, add/delete tokens, and edit all fields directly.',
    },
    {
      title: 'Drag Arcs',
      text: 'Drag from any token box to another to reassign its head. Drop in the green ROOT zone at the top to set head=0. A deprel picker appears after each drop.',
    },
    {
      title: '5) CoNLL-U',
      text: 'Edit all 10 CoNLL-U fields in the structured table — available when edit mode is unlocked. The gold table at the top shows current gold annotations. Switch between Structured Editor and Raw Text via the tabs.',
    },
    {
      title: '6) Export',
      text: 'Download gold CoNLL-U, export tree views, or save the entire session (all projects + undo history) as JSON to continue later.',
    },
    {
      title: 'Tour Complete!',
      text: 'The tour project is now removed and you return to your data. Load your own .conllu files via drag & drop and start annotating. Press ? for the full help reference.',
    },
  ],
};

// ── Step definitions ──────────────────────────────────────────────────────────
const _TOUR_STEPS = [
  { sel: null                                                      }, //  0 Welcome
  { sel: '#projectTabBar'                                          }, //  1 Projects
  { sel: '#fileList'                                               }, //  2 Files
  { sel: '#sentNavRow',  before: () => _tourGoSent(0)             }, //  3 Sentence nav
  { sel: '#sentText'                                               }, //  4 Sentence 1
  { sel: '#sentText',    before: () => _tourGoSent(1)             }, //  5 Garden-path
  { sel: '#treeGrid',    before: () => _tourGoSent(0)             }, //  6 Tree view
  { sel: '#cmpTable'                                               }, //  7 Table
  { sel: '#cmpTable'                                               }, //  8 Gold pick
  { sel: '#undoBtn'                                                }, //  9 Undo
  { sel: '#confirmBtn'                                             }, // 10 Confirm
  { sel: '#projectLockBar'                                         }, // 11 Lock
  { sel: '#treeGrid',    before: _tourUnlock                      }, // 12 Drag arcs
  { sel: '#conlluEditorSection'                                    }, // 13 CoNLL-U
  { sel: '#exportSection', before: _tourLock                      }, // 14 Export
  { sel: null                                                      }, // 15 Done
];

// ── State ─────────────────────────────────────────────────────────────────────
let _tourIdx         = -1;
let _tourRoot        = null;
let _tourHighlighted = null; // { el, origPos, origZ }
let _tourOrigIdx     = -1;   // project index before tour started
let _tourProjIdx     = -1;   // index of the temporary tour project

// ── Tour project helpers ──────────────────────────────────────────────────────
function _tourCreateProject() {
  if (typeof DEMO_SESSION === 'undefined' || typeof parseConllu === 'undefined') return false;
  let parsed;
  try { parsed = JSON.parse(DEMO_SESSION); } catch { return false; }
  const src = parsed.projects?.[1]; // English — Penn Tagset
  if (!src) return false;

  // Save current project state before switching away
  if (typeof _saveActiveProject === 'function') _saveActiveProject();
  _tourOrigIdx = state.activeProjectIdx;

  // Build tour project (plain clone, no session import so existing projects are untouched)
  const lang  = (typeof getLang === 'function') ? getLang() : 'de';
  const name  = lang === 'de' ? 'Guided Tour' : 'Guided Tour';
  const docs  = (src.docs || []).map(d => {
    const p = parseConllu(d.content);
    return { key: `tour::${d.name}`, name: d.name, content: d.content, sentences: p.sentences };
  });
  const tourProj = {
    name:        name,
    docs,
    custom:      {},
    goldPick:    {},
    confirmed:   [],
    notes:       {},
    flags:       {},
    currentSent: 0,
    maxSents:    Math.max(0, ...docs.map(d => d.sentences.length)),
    hiddenCols:  [],
    undoStack:   [],
    redoStack:   [],
    labels:      src.labels || null,
    unlocked:    false,
  };

  state.projects.push(tourProj);
  _tourProjIdx = state.projects.length - 1;
  state.activeProjectIdx = _tourProjIdx;

  if (typeof _loadActiveProject === 'function') _loadActiveProject();
  if (typeof renderProjectTabs  === 'function') renderProjectTabs();
  if (typeof renderFiles        === 'function') renderFiles();
  if (typeof renderSentSelect   === 'function') renderSentSelect();
  if (typeof renderSentence     === 'function') renderSentence();
  if (typeof renderConlluEditor === 'function') renderConlluEditor(true);
  return true;
}

function _tourRemoveProject() {
  if (_tourProjIdx < 0) return;
  const idx = _tourProjIdx;
  _tourProjIdx = -1;

  // Switch back to the original project (its index is unchanged because we appended)
  state.activeProjectIdx = Math.min(_tourOrigIdx, state.projects.length - 2);
  _tourOrigIdx = -1;

  state.projects.splice(idx, 1);

  if (typeof _loadActiveProject === 'function') _loadActiveProject();
  if (typeof renderProjectTabs  === 'function') renderProjectTabs();
  if (typeof renderFiles        === 'function') renderFiles();
  if (typeof renderSentSelect   === 'function') renderSentSelect();
  if (typeof renderSentence     === 'function') renderSentence();
  if (typeof renderConlluEditor === 'function') renderConlluEditor(true);
}

// ── Step helpers ──────────────────────────────────────────────────────────────
function _tourGoSent(n) {
  if (typeof state === 'undefined') return;
  state.currentSent = n;
  if (typeof renderSentSelect   === 'function') renderSentSelect();
  if (typeof renderSentence     === 'function') renderSentence();
  if (typeof renderConlluEditor === 'function') renderConlluEditor(true);
}

function _tourUnlock() {
  if (typeof state === 'undefined' || state.unlocked) return;
  state.unlocked = true;
  if (typeof _saveActiveProject === 'function') _saveActiveProject();
  if (typeof renderProjectLock  === 'function') renderProjectLock();
  if (typeof renderFiles        === 'function') renderFiles();
  if (typeof renderSentence     === 'function') renderSentence();
}

function _tourLock() {
  if (typeof state === 'undefined' || !state.unlocked) return;
  state.unlocked = false;
  if (typeof _saveActiveProject === 'function') _saveActiveProject();
  if (typeof renderProjectLock  === 'function') renderProjectLock();
  if (typeof renderFiles        === 'function') renderFiles();
  if (typeof renderSentence     === 'function') renderSentence();
}

function _tourRestoreHighlight() {
  if (!_tourHighlighted) return;
  const { el, origPos, origZ } = _tourHighlighted;
  el.style.position = origPos;
  el.style.zIndex   = origZ;
  _tourHighlighted  = null;
}

// ── Public API ────────────────────────────────────────────────────────────────
function startTour() {
  // If tour is already running, close cleanly first
  if (_tourRoot) closeTour();
  if (!_tourCreateProject()) return;
  _tourBuildDOM();
  document.body.style.overflow = 'hidden';
  setTimeout(() => _tourShowStep(0), 450);
}

function closeTour() {
  _tourRestoreHighlight();
  document.getElementById('tourOverlay')?.remove();
  document.getElementById('tourSpot')?.remove();
  document.getElementById('tourTip')?.remove();
  _tourRoot = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _tourEscHandler);
  _tourRemoveProject();
  _tourIdx = -1;
}

// ── DOM construction ──────────────────────────────────────────────────────────
// Overlay, spotlight, and tooltip are SEPARATE direct children of <body> so that
// their z-index values are compared in the root stacking context.
// If they were nested inside a single parent with its own z-index, the parent's
// stacking level would be used when comparing against elevated target elements.
function _tourBuildDOM() {
  // Click-blocking backdrop
  const overlay = document.createElement('div');
  overlay.id = 'tourOverlay';
  overlay.className = 'tourOverlay';
  document.body.appendChild(overlay);

  // Spotlight rectangle — box-shadow darkens everything outside it
  const spot = document.createElement('div');
  spot.id = 'tourSpot';
  spot.className = 'tourSpot';
  document.body.appendChild(spot);

  // Tooltip card
  const tip = document.createElement('div');
  tip.id = 'tourTip';
  tip.className = 'tourTip';
  tip.innerHTML = `
    <div class="tourProgress"></div>
    <div class="tourTitle"></div>
    <div class="tourText"></div>
    <div class="tourBtns">
      <button class="tourBtnSkip"></button>
      <div class="tourBtnRight">
        <button class="tourBtnPrev"></button>
        <button class="tourBtnNext"></button>
      </div>
    </div>`;
  document.body.appendChild(tip);

  // _tourRoot is just a sentinel — we use IDs to find the elements
  _tourRoot = overlay;
  document.addEventListener('keydown', _tourEscHandler);
}

function _tourEscHandler(e) {
  if (e.key === 'Escape') closeTour();
}

// ── Step rendering ────────────────────────────────────────────────────────────
function _tourShowStep(idx) {
  if (!_tourRoot) return;
  const step = _TOUR_STEPS[idx];
  const go = () => { if (_tourRoot) _tourRenderStep(idx); };
  if (step.before) {
    step.before();
    setTimeout(go, 400);
  } else {
    requestAnimationFrame(go);
  }
}

function _tourRenderStep(idx) {
  if (!_tourRoot) return;
  _tourIdx = idx;

  const lang    = (typeof getLang === 'function') ? getLang() : 'de';
  const content = _TOUR_CONTENT[lang] || _TOUR_CONTENT.de;
  const texts   = content[idx] || { title: '', text: '' };
  const total   = _TOUR_STEPS.length;
  const step    = _TOUR_STEPS[idx];
  const isLast  = idx === total - 1;
  const isDE    = lang === 'de';

  const lblStep = isDE ? `Schritt ${idx+1} / ${total}` : `Step ${idx+1} / ${total}`;
  const lblSkip = isDE ? 'Tour abbrechen' : 'Skip tour';
  const lblPrev = isDE ? '← Zurück' : '← Back';
  const lblNext = isDE ? 'Weiter →' : 'Next →';
  const lblDone = isDE ? 'Fertig' : 'Done';

  const tip = document.getElementById('tourTip');
  if (!tip) return;
  tip.querySelector('.tourProgress').textContent = lblStep;
  tip.querySelector('.tourTitle').textContent    = texts.title;
  tip.querySelector('.tourText').textContent     = texts.text;

  const skipBtn = tip.querySelector('.tourBtnSkip');
  const prevBtn = tip.querySelector('.tourBtnPrev');
  const nextBtn = tip.querySelector('.tourBtnNext');

  skipBtn.textContent   = lblSkip;
  prevBtn.textContent   = lblPrev;
  prevBtn.style.display = idx > 0 ? '' : 'none';
  nextBtn.textContent   = isLast ? lblDone : lblNext;

  // Replace nodes to strip stale listeners
  const ns = skipBtn.cloneNode(true); skipBtn.replaceWith(ns);
  const np = prevBtn.cloneNode(true); prevBtn.replaceWith(np);
  const nn = nextBtn.cloneNode(true); nextBtn.replaceWith(nn);
  ns.addEventListener('click', closeTour);
  np.addEventListener('click', () => _tourShowStep(idx - 1));
  nn.addEventListener('click', () => isLast ? closeTour() : _tourShowStep(idx + 1));

  // Highlight target
  _tourRestoreHighlight();
  const targetEl = step.sel ? document.querySelector(step.sel) : null;
  const spot     = document.getElementById('tourSpot');

  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'instant', block: 'center' });

    const computed = window.getComputedStyle(targetEl).position;
    _tourHighlighted = { el: targetEl, origPos: targetEl.style.position, origZ: targetEl.style.zIndex };
    if (computed === 'static') targetEl.style.position = 'relative';
    targetEl.style.zIndex = '9013';

    requestAnimationFrame(() => {
      if (!_tourRoot || _tourIdx !== idx) return;
      const r    = targetEl.getBoundingClientRect();
      const P    = 8;
      const maxH = window.innerHeight * 0.55;
      const h    = Math.min(r.height, maxH);

      spot.style.transition = 'none';
      spot.style.cssText = `display:block;left:${r.left-P}px;top:${r.top-P}px;width:${r.width+P*2}px;height:${h+P*2}px`;
      requestAnimationFrame(() => { if (spot) spot.style.transition = ''; });

      _tourPositionTip(tip, { left: r.left, top: r.top, right: r.right,
                               bottom: r.top + h, width: r.width, height: h });
    });
  } else {
    spot.style.transition = 'none';
    spot.style.display    = 'none';
    requestAnimationFrame(() => { if (spot) spot.style.transition = ''; });
    _tourPositionTip(tip, null);
  }
}

function _tourPositionTip(tip, targetRect) {
  tip.style.left = '-9999px';
  tip.style.top  = '-9999px';

  requestAnimationFrame(() => {
    if (!document.getElementById('tourTip')) return;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const GAP = 12;

    // Measure tip size now that it's off-screen but rendered
    const tw  = Math.min(tip.offsetWidth  || 320, vw - GAP * 2);
    const th  = tip.offsetHeight || 200;

    // Clamp helper — always keeps value in [lo, hi]; if hi < lo, returns lo
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

    let left, top;

    if (!targetRect) {
      left = Math.round(clamp((vw - tw) / 2, GAP, vw - tw - GAP));
      top  = Math.round(clamp((vh - th) / 2, GAP, vh - th - GAP));
    } else {
      const r = targetRect;
      // Prefer below target, then above, then top of screen
      if (r.bottom + th + GAP <= vh) {
        top = r.bottom + GAP;
      } else if (r.top - th - GAP >= 0) {
        top = r.top - th - GAP;
      } else {
        top = GAP;
      }
      // Align left edge with target, but keep fully inside viewport
      left = clamp(r.left, GAP, vw - tw - GAP);
      // Ensure bottom edge is also in viewport
      top  = clamp(top, GAP, vh - th - GAP);
      top  = Math.round(top);
      left = Math.round(left);
    }

    tip.style.width = `${tw}px`; // prevent reflow-caused width changes after placement
    tip.style.left  = `${left}px`;
    tip.style.top   = `${top}px`;
  });
}
