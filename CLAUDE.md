# Developer Guide for AI Assistants

This file documents the architecture and conventions of this project so that AI coding
assistants (Claude, Copilot, etc.) can extend it correctly. Read this before making any
changes.

---

## Project Overview

**CoNLL-U Comparison** is a single-page browser app for comparing and annotating CoNLL-U
dependency treebank files. It has no build step for development — open `index.html` directly.
`bundler.py` produces `dist/index.html` (all resources inlined) for deployment.

---

## Language and i18n

**Default language is English.** German is the secondary option.

- Every user-facing string must have a key in **both** `lang/en.js` and `lang/de.js`.
- Use `t('key')` for all UI text — never hardcode strings.
- When adding new strings: add to `lang/en.js` first, then `lang/de.js`.
- The `t()` fallback chain: current language → English → key itself.
- `buildDeprelOptionsCache()` must be called after language changes (it rebuilds the
  `(empty)` option label).

---

## File Structure and Load Order

Scripts are loaded in dependency order in `index.html`. The order matters — do not reorder:

```
lang/de.js, lang/en.js     → window.LANG_DE / LANG_EN (must come before i18n.js)
generated/readme_content.js → window.README_CONTENT_EN / README_CONTENT_DE
js/state.js                → globals: state, LABELS, LABEL_COLS, DEP_COLS, escapeHtml()
js/undo.js                 → _pushUndo(), getUndoState(), loadUndoState()
js/projects.js             → project tabs, snapshot-swap
js/parser.js               → processFiles(), CoNLL-U parser
js/table.js                → renderCompareTable(), Gold popup
js/tree.js                 → renderPreview(), buildTreeSection()
js/arcview.js              → buildArcDiagram(), SVG arc editing
js/export.js               → session import/export, _showToast()
js/sentmap.js              → sentence map dots, toggleConfirm()
js/keyboard.js             → keyboard shortcuts
js/i18n.js                 → t(), setLang(), applyI18n()
js/theme.js, js/help.js, js/tour.js, js/devmode.js
js/main.js                 → init(), renderSentence() (entry point)
```

---

## Global State

All mutable app state lives in `js/state.js`. Key globals:

| Variable | Description |
|----------|-------------|
| `state` | Central object: `docs`, `currentSent`, `custom`, `goldPick`, `projects`, `activeProjectIdx`, … |
| `LABELS` | Active tagset object (`__cols__`, `__dep_cols__`, or legacy format) |
| `LABEL_COLS` | Derived array `[{key, name, optionsHtml}]` — rebuilt by `buildDeprelOptionsCache()` |
| `DEP_COLS` | Derived array `[{key, name, headField, deprelField, optionsHtml, valueSet}]` |
| `DEFAULT_LABELS` | Initial tagset snapshot; used as fallback for projects without a custom tagset |

**Rules:**
- Never write to `LABEL_COLS` or `DEP_COLS` directly — always call `buildDeprelOptionsCache()`.
- Always call `buildDeprelOptionsCache()` after changing `LABELS`.
- Access the active project via `state.projects[state.activeProjectIdx]`.
- Persist tagset changes to the active project: `p.labels = JSON.parse(JSON.stringify(LABELS))`.

---

## Undo / Redo

**All annotation changes must go through the undo stack.**

```js
_pushUndo();          // call before making any change
setCustomField(...);  // then make the change
renderSentence();     // then re-render
```

The undo stack is per-project and capped at 80 steps. `_pushUndo()` is defined in `js/undo.js`.
Stats cache must be invalidated after changes: `_invalidateStatsCache(sentIndex)`.

---

## Rendering

- `renderSentence()` (in `js/main.js`) is the main re-render entry point — it calls all
  sub-renderers (tree, table, arc diagrams, etc.).
- Do not manipulate the DOM directly outside of render functions.
- `renderFiles()` updates the file list panel.
- `renderProjectTabs()` updates project tab badges (confirmed sentence counts).
  Call this whenever `state.confirmed` changes.

---

## Tagset / LABELS Format

Two formats are supported:

**Extended (preferred):**
```json
{
  "__cols__":     [{ "key": "upos", "name": "UPOS", "values": ["NOUN", "VERB"] }],
  "__dep_cols__": [{ "key": "dep",  "name": "DepRel", "groups": { "Core": ["nsubj", "obj"] } }]
}
```

**Legacy (backward-compatible):**
```json
{
  "Core arguments": ["nsubj", "obj"],
  "__upos__": ["NOUN", "VERB"],
  "__xpos__": ["NN", "VB"]
}
```

`buildDeprelOptionsCache()` handles both formats and populates `LABEL_COLS` and `DEP_COLS`.

CoNLL-U export: `__cols__[0]` → UPOS field, `__cols__[1]` → XPOS field, further cols → MISC.

---

## Arc Diagram (`js/arcview.js`)

Key conventions:

- **Arrow direction:** head → dependent. The arrowhead is drawn at `x1` (the dependent's
  x position), not at `x2` (the head). This is intentional — do not reverse.
- **Bezier arc peak:** The actual visual peak of the cubic Bezier `M x1 y C x1 apex x2 apex x2 y`
  is at `curveApex = 0.25 * wordY + 0.75 * apex`, not at `apex`. Use `curveApex` for label
  and button placement.
- **Drag semantics:** Dragged-FROM = HEAD, dropped-ON = DEPENDENT.
  In `pointerup`: `newDepId = drag.toks[ni].id` (drop target), `newHeadId = drag.depId` (drag source).
- **Cycle detection:** `_arcWouldCycle(depId, newHeadId, toks)` — first argument is the
  dependent, second is the proposed new head.

---

## Security

- All dynamic HTML must use `escapeHtml(s)` (defined in `js/state.js`).
- Never set `innerHTML` with unsanitised user data.
- No external network requests — the app is fully offline.

---

## Tree View Layout (`js/tree.js`)

The tree section uses a flex-row layout:

```
.treeSectionBody
  ├── .treePre          (left: text tree)
  └── .arcDiagramWrap   (right: SVG arc diagram, scrollable)
```

After appending to DOM, call `scrollWidth` (not `clientWidth`) to equalize `.treePre` widths
so all arc diagrams start at the same horizontal position.

Sync horizontal scroll across all `.arcDiagramWrap` elements in the same sentence group
using `scroll` event listeners with a `_syncScrolling` guard flag.

---

## Project Management (`js/projects.js`)

- On tab switch, the active project's state is snapshot-saved and the new project's snapshot
  is restored. This swap is done by `_swapToProject(idx)`.
- `autoAssignToProjects(newDocs)` distributes newly loaded files across projects based on
  sentence count matching.
- Always use `state.activeProjectIdx` to access the current project — never cache the index.

---

## Session Format

Sessions are JSON with `version: 2`. Detection: `data.version === 2 && Array.isArray(data.projects)`.
Session import is handled by `importSession()` in `js/export.js`.

The smart file dispatcher `_smartDispatchJson()` (in `js/tagset.js`) automatically routes:
- Session JSON → `importSession()`
- UD-style tagset `{tags:[{tag_name}]}` → mapping dialog → `applyTagsetJson()`
- Everything else → `applyTagsetJson()`

---

## Build and README Pipeline

**After any JS/CSS change:**
```bash
python bundler.py
```
This inlines all JS/CSS into `dist/index.html` and base64-encodes local `url()` references in CSS.

**After any README change:**
```bash
python make_readme_js.py
```
This converts `README.md` (English, primary) and `README.de.md` (German) into
`generated/readme_content.js` for the in-browser help modal.

Watch mode (auto-rebuilds on file change):
```bash
python bundler.py --watch
```

---

## Touch / Pointer Events

- Use `pointerdown` / `pointermove` / `pointerup` — never `mousedown`/`mouseup` only.
- Detect touch UI via `window.matchMedia('(pointer: coarse)').matches`.
- Touch targets and font sizes are scaled up for coarse-pointer devices (see arc diagram popup).

---

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---------|-----------------|
| Hardcoding UI text | Use `t('key')` and add key to both lang files |
| Changing `LABEL_COLS`/`DEP_COLS` directly | Call `buildDeprelOptionsCache()` |
| Forgetting `_pushUndo()` before annotation changes | Always push undo first |
| Not calling `renderProjectTabs()` after confirm changes | Call it in `toggleConfirm()` |
| Using `apex` as arc label position | Use `curveApex = 0.25*wordY + 0.75*apex` |
| Setting innerHTML with unsanitised data | Always use `escapeHtml()` |
| Modifying dist files directly | Edit source files and rebuild with `bundler.py` |
| Adding new i18n keys to only one language file | Add to both `lang/en.js` and `lang/de.js` |
