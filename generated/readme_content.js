// Auto-generated — do not edit manually.
// Regenerate with:  python make_readme_js.py

window.README_CONTENT_EN = `# CoNLL-U Comparison

Browser-based tool for comparing and annotating multiple CoNLL-U files.
Runs entirely locally without a server — simply open \`index.html\` in your browser.

---

## Feature Overview

| Feature | Description |
|---------|-------------|
| **Multi-project management** | Any number of projects with their own files, annotations, and undo stack |
| **CoNLL-U comparison** | Token-by-token diff of multiple files against a Gold annotation |
| **Interactive tree** | Dependency trees with drag-and-drop arcs, relation selector, ROOT drop zone |
| **Gold annotation** | Via click, popup, or keyboard shortcuts — custom values override file values |
| **CoNLL-U editor** | Structured editor and raw textarea per file; gold table visible in read-only mode |
| **Sentence management** | Insert, delete sentences — sentence list always visible |
| **Undo/Redo** | Up to 80 steps per project; saved with session |
| **Session export** | Save and load complete working state as JSON |
| **Autosave** | Working state saved every 30 seconds; automatically restored on next page open |
| **Tagset configuration** | Custom DEPREL lists, UPOS/XPOS values, and dependency layers via \`labels.js\` or JSON |
| **Export** | Download Gold CoNLL-U and tree view (all sentences) |
| **Guided Tour** | Interactive introduction with spotlight and tooltips using the English example |
| **Keyboard shortcuts** | Full operation without mouse |
| **Multi-language** | German / English; add more languages via \`lang/xx.js\` |
| **Tablet support** | Touch-optimised; arcs draggable, larger tap targets |

---

## Quick Start

1. Open \`index.html\` in your browser — last session is loaded automatically
2. Load at least two \`.conllu\` files — or click **"Load demo"**
3. Select a sentence → tree view and comparison table appear automatically
4. Click Gold cells or use keyboard shortcuts to edit annotations
5. Mark a finished sentence with **"✓ Confirm"** (or \`Space\`)
6. **💾 Save session** — save your progress as JSON at any time and resume later

---

## Projects

The tool supports multiple **projects** simultaneously — each with its own files, annotations, and undo history.

### Project Tab Bar

The tab bar appears directly below the header. Each tab has:

| Button | Function |
|---|---|
| **◀ / ▶** | Reorder projects |
| **✎** | Rename project |
| **×** | Delete project (only when more than one project exists) |
| **+** (far right) | Create a new empty project |

Click a tab to switch to that project. State (files, sentence position, undo stack) is automatically saved and restored on switch.

### Keyboard Shortcuts for Projects

| Key | Function |
|---|---|
| \`[\` | Previous project |
| \`]\` | Next project |

### Project Lock

Each project can be **locked** or **unlocked** (button in section 1, below the file list):

| State | Symbol | Behaviour |
|-------|--------|-----------|
| Locked | 🔒 | Read-only: no editing via table, popup, or tree |
| Unlocked | 🔓 | All editing features active; HEAD/DEPREL columns appear |

The state is saved with the session and restored on load.

### Automatic Assignment on Load

When files with **different sentence counts** are loaded, the tool assigns them to projects automatically:

1. **Own project** (active) — if empty or matching sentence count
2. **Other existing project** — with matching sentence count
3. **Other empty project** — as a last resort
4. **Create new project** — only if no match found

A brief notification appears when a new project is created automatically.

---

## 1) Load Files

| Action | Description |
|--------|-------------|
| **"Add files"** | Opens the file dialog; \`.conllu\`, \`.conll\`, \`.txt\` and \`.json\` files selectable |
| **"📤 Upload tagset"** | Also opens the file dialog — accepts all file types |
| **"📂 Load session"** | Also opens the file dialog — accepts all file types |
| **Drag & Drop** | Drop files directly onto the page — all types are recognised |
| **"Load demo"** | Three pre-built example files covering all comparison cases |
| **"Reset"** | Reset all files and annotations |

All upload paths (buttons and drag & drop) detect the file type automatically:

| Extension | Detected type | Action |
|-----------|---------------|--------|
| \`.conllu\`, \`.conll\`, \`.txt\` | CoNLL-U file | Load as annotator file |
| \`.json\` with \`version\` + \`docs\`/\`projects\` | Session | Import session |
| \`.json\` (everything else) | Tagset | Load as new tagset |

### Per-File Actions

Each loaded file has the following buttons:

| Button | Function |
|---|---|
| **⬇ Download** | Download file as CoNLL-U (original content) |
| **Project dropdown** | Move file to another project; **＋ New project …** creates one and moves the file immediately |
| **▲ / ▼** | Change order within the project |
| **Remove** | Remove file from the project |

### Text Consistency Warning

If two files have different tokens at the same sentence index:
- **⚠️ badge** next to the filename
- Orange **warning banner** below the file list

---

## 2) Select Sentence

### Dropdown

Each option shows:
- Sentence number and star \`★\` if confirmed
- Token count
- Number of differences (\`· N diffs\`) or a checkmark (\`· ✓\`) if fully matching

**Colours in the dropdown:**

| Colour | Meaning |
|--------|---------|
| Green | No differences |
| Red | At least one difference |
| Gold | Sentence confirmed (\`★\`) |

The **dropdown border** reflects the status of the current sentence (green / red / gold).

### Sentence Text

The sentence text is rendered as clickable tokens. Clicking a word:
- Jumps to the corresponding row in the comparison table
- Highlights the token in the sentence text (blue outline)
- Works in reverse too: keyboard navigation (↑/↓) highlights the active word in the sentence text

### Sentence Map

Below the sentence text, a row of small **coloured dots** appears — one per sentence:

| Colour | Meaning |
|--------|---------|
| Dark green | No diff |
| Dark red | Has diffs |
| Gold | Confirmed |
| Blue outline | Currently selected sentence |

Click a dot to jump directly to that sentence.

### Confirm Gold

Use **"✓ Confirm"** (or \`Space\`) to mark the current sentence as finished.
Confirmed sentences are coloured gold (dropdown, sentence map, sentence text border, button).
Pressing again removes the confirmation.

### Note per Sentence

Below the sentence text there is a **note field** — free text, saved per sentence and exported with the session.

### Copy CoNLL-U

The **"Copy CoNLL-U" button** (or key \`c\`) copies the Gold annotation of the current sentence as CoNLL-U to the clipboard.

---

## 3) Tree View

Shows the current sentence as dependency trees. For each loaded file a diff tree against the Gold annotation is displayed.

### Legend

| Symbol/Colour | Meaning |
|---|---|
| ✅ green | Edge identical to Gold |
| ⚠️ yellow | Same HEAD but different DEPREL / label columns (\`🅶X\\|🅵Y\`) |
| 🅶 gold | Edge only in Gold |
| 🅵 blue | Edge only in this file |
| 🌱 | Subtree root |

Differences in label columns (e.g. UPOS/XPOS) are annotated as \`[COLUMN:🅶X\\|🅵Y]\`.

### Interaction

- **Click a line** → jumps to the corresponding row in the comparison table
- **"→ Gold" button** at each 🌱 line → adopts the entire subtree as the Gold annotation

### Interactive Arc Diagram (Gold view)

The Gold arc diagram is directly editable:

| Action | Function |
|--------|---------|
| **Drag a token** (drag & drop) | Draw a new arc from token to token → sets new HEAD |
| **Deprel popup** | Appears automatically after dragging — or by clicking an arc label |
| **× button** (hover over arc) | Deletes the arc (resets to root) |
| **Click a token** (no drag) | Jumps to the corresponding table row |

**Cycle detection:** If a new arc would create a cycle, the target flashes red and the assignment is rejected.

**Arc colours** match the legend (green = matches Gold, yellow = DEPREL diff, gold = Gold only, blue = file only).

---

## 4) Comparison Table

### Columns

| Column | Content |
|--------|---------|
| **ID** | Token ID |
| **FORM** | Word form |
| **Label columns** | One column per configured label category (default: UPOS, XPOS); yellow border when files differ |
| **GOLD** | Current Gold annotation (\`HEAD / DEPREL\`); badge \`C\` = custom, \`D1\`/\`D2\`/… = file; label values shown below |
| **File columns** | Each file's annotation; green = matches Gold, red = differs |

In file columns, HEAD/DEPREL and all label columns are highlighted individually — differing fields appear **red** (\`.fDiff\`).

### Gold Selection

- **Click a file cell** → selects that file as the Gold source for this token (badge \`D1\`, \`D2\`, …)
- If a custom value is set, custom values always take precedence; file cells are then greyed out

### Gold Popup (Edit)

**Click a Gold cell** to open an edit popup:

| Field | Input |
|-------|-------|
| HEAD | Dropdown of all tokens in the current sentence |
| DEPREL (+ further dep layers) | Dropdown(s) from the tagset configuration |
| Label columns | One dropdown or free-text field per configured label category |

The number of fields adapts automatically to the loaded tagset configuration (any number of label columns and dependency layers supported).

Changes are saved immediately as a custom entry. **"Reset"** removes the custom entry for this token.

**Keyboard in popup:** \`Tab\`/\`Shift+Tab\` switch fields · \`Enter\` closes · \`r\` reset · \`Esc\` close

### Custom Annotation

- **"Custom from [file]" buttons** copy all values of the chosen file as a custom starting point
- **"Clear custom sentence"** removes all custom entries for the current sentence (with confirmation)
- Once a custom value is set, that token is treated as Gold (\`C\` badge)

### Show/Hide Columns

Use the **column toggle bar** to show or hide individual file columns.

---

## 5) CoNLL-U

Section 5 shows and edits the CoNLL-U data for the current sentence. Its behaviour depends on the **edit mode** (lock in section 1):

### Read-only mode (locked 🔒)

- **Gold table** shows all tokens with current Gold annotations (HEAD, DEPREL, UPOS, XPOS) — read-only
- Rows with active custom overrides are highlighted

### Edit mode (unlocked 🔓)

- **Gold table** (editable): adjust HEAD, DEPREL, UPOS, and XPOS directly — changes are saved immediately as custom values
- **Tab "📝 Structured Editor"**: all CoNLL-U fields of each file as a structured table; add/delete rows, edit values directly
- **Tab "Raw text"**: full CoNLL-U text per file as a textarea; grows automatically with content
  - Edit the text → **"✓ Apply"** transfers changes to all other views
  - **"✕ Reset"** discards changes and restores the last saved state

The section title switches automatically between **"5) CoNLL-U"** (read-only) and **"5) Edit CoNLL-U"** (edit mode).

---

## 6) Export

### Individual File

The **⬇ button** next to each file downloads the original file content as \`.conllu\`.

### Active Project

| Button | Content |
|--------|---------|
| **Download Gold CoNLL-U** | All sentences of the active project with current Gold annotations (HEAD, DEPREL, UPOS, XPOS); LEMMA/FEATS/DEPS/MISC from source file |
| **Download tree view (all sentences)** | All sentences as plain-text trees with Gold tree and diff trees per file |

### All Projects

| Button | Content |
|--------|---------|
| **Download all projects CoNLL-U** | Exports Gold CoNLL-U for each project as a separate file (\`gold_ProjectName.conllu\`) |
| **Download all projects tree view** | Exports tree views for each project as a separate file |

Keyboard shortcuts: \`e\` → CoNLL-U · \`E\` → tree view · \`c\` → copy current sentence to clipboard

### Session Export / Import

The **session mechanism** saves the complete working state of all projects:

- All projects with names, files, and annotations
- Custom annotations and Gold selection
- Confirmed sentences and notes
- Full undo/redo history per project
- Label configuration (\`labels.js\`)

| Action | Description |
|--------|-------------|
| **💾 Save session** | Exports everything as a \`.json\` file |
| **📂 Load session** | Imports a saved session file |
| **Drag & Drop** | Drop a \`.json\` file onto the page → automatically recognised as a session |

The session format is versioned (\`version: 2\`) and human-readable JSON.

### Autosave

The working state is automatically saved to the browser's LocalStorage every **30 seconds**. On the next page load, the last state is **restored automatically and silently** — no prompt.

---

## Undo / Redo

All annotation changes (file selection, custom popup, confirm, subtree adoption) can be undone. Each project has its own undo stack.

| Action | Description |
|--------|-------------|
| **↩ Undo** / \`Ctrl+Z\` | Undo last change |
| **↪ Redo** / \`Ctrl+Y\` | Redo undone change |

The history is saved with the session (up to 80 steps per project).

---

## Guided Tour

The **🎓 Guided Tour** button in the top-right corner starts an interactive introduction to all features.

- The tour automatically opens the English example in a **temporary project** — your own data is completely untouched
- A spotlight and tooltip walk you through all 16 steps: projects, files, sentence navigation, tree view, comparison table, gold annotation, edit mode, CoNLL-U editor, and export
- Exit with **"Skip tour"**, \`Esc\`, or the "Done" button — the tour project is removed automatically

---

## Keyboard Shortcuts

| Key | Function |
|-----|----------|
| \`←\` / \`→\` | Previous / next sentence |
| \`Ctrl+←\` / \`Ctrl+→\` | First / last sentence |
| \`n\` / \`N\` | Next / previous sentence with diffs |
| \`f\` / \`F\` | Next / previous flagged sentence (\`⚑\`) |
| \`[\` / \`]\` | Previous / next project |
| \`↑\` / \`↓\` | Navigate table rows |
| \`Enter\` | Open Gold popup for focused row |
| \`Space\` | Confirm / unconfirm sentence |
| \`1\`–\`9\` | Select file N as Gold source for focused row |
| \`Ctrl+1\`–\`9\` | Load custom from file N |
| \`Ctrl+Z\` | Undo |
| \`Ctrl+Y\` / \`Ctrl+Shift+Z\` | Redo |
| \`Del\` / \`Backspace\` | Delete custom for current sentence |
| \`c\` | Copy current sentence as CoNLL-U to clipboard |
| \`e\` | Export Gold CoNLL-U |
| \`E\` (Shift+e) | Export tree view |
| \`r\` | Read current sentence aloud (TTS) |
| \`?\` | Open / close help |
| \`Esc\` | Clear focus / close popup / close help |

---

## Multiple Languages

The interface supports **German** and **English** — switchable via the flag buttons in the top right. The chosen language is stored in the browser (\`localStorage\`).

### Adding More Languages

1. Create a new file \`lang/xx.js\` (following the pattern of \`lang/en.js\`):

\`\`\`javascript
window.LANG_XX = {
  'sec.files':   '...',
  // translate all keys from lang/en.js
};
\`\`\`

2. Include it in \`index.html\` (before \`js/i18n.js\`):

\`\`\`html
<script src="lang/xx.js"></script>
\`\`\`

3. Add a flag button:

\`\`\`html
<button class="langBtn" data-lang="xx" onclick="setLang('xx')" title="...">🏳️</button>
\`\`\`

Or register dynamically at runtime:

\`\`\`javascript
registerLang('xx', window.LANG_XX);
\`\`\`

---

## labels.js

\`labels.js\` in the same folder as \`index.html\` defines the dropdown contents.

### Classic format (backward compatible)

\`\`\`javascript
const LABELS = {
  "Core arguments": ["nsubj", "obj", "iobj", ...],
  "Non-core dependents": ["obl", "advmod", ...],
  // ...
  "__upos__": ["ADJ", "ADP", "ADV", "AUX", ...],
  "__xpos__": ["ADJA", "ADJD", "NN", "NE", ...],
  "__upos_name__": "UPOS",   // optional display name
  "__xpos_name__": "XPOS",
};
\`\`\`

| Key | Description |
|-----|-------------|
| Any string | Grouped section in the DEPREL dropdown |
| \`__upos__\` | Options for the UPOS field (empty → free-text input) |
| \`__xpos__\` | Options for the XPOS field (empty → free-text input) |
| \`__upos_name__\` | Display name for the UPOS column |
| \`__xpos_name__\` | Display name for the XPOS column |

### Extended format — arbitrary number of label and dependency columns

Use \`__cols__\` and \`__dep_cols__\` to define any number of columns:

\`\`\`json
{
  "__cols__": [
    { "key": "upos",    "name": "UPOS",       "values": ["ADJ", "NOUN", "VERB"] },
    { "key": "xpos",    "name": "XPOS",       "values": ["ADJA", "NN", "VVFIN"] },
    { "key": "entity",  "name": "Entity",     "values": ["PER", "ORG", "LOC", "O"] },
    { "key": "animacy", "name": "Animacy",    "values": ["Anim", "Inan"] }
  ],
  "__dep_cols__": [
    {
      "key": "ud",
      "name": "UD DepRel",
      "groups": {
        "Core arguments": ["nsubj", "obj", "iobj"],
        "Other":          ["punct", "root", "dep"]
      }
    },
    {
      "key": "srl",
      "name": "SRL",
      "groups": {
        "Arguments": ["ARG0", "ARG1", "ARG2", "ARGM"]
      }
    }
  ]
}
\`\`\`

| Key | Description |
|-----|-------------|
| \`__cols__\` | Array of label columns; \`key\` = internal field name, \`name\` = display name, \`values\` = dropdown options |
| \`__dep_cols__\` | Array of dependency annotation layers; first layer = primary HEAD/DEPREL fields; additional layers get their own HEAD and DEPREL dropdowns in the popup |

**CoNLL-U export:** \`__cols__[0]\` → UPOS column, \`__cols__[1]\` → XPOS column, further columns → MISC as \`key=value\`.

Labels are saved with the session and restored on load.

---

## Upload / Download Tagset

The tagset (label and dependency configuration) can be swapped at runtime — without restarting.

### Upload

1. Click **"📤 Upload tagset"**
2. Select a JSON file (classic or extended format)
3. The table, popups, and dropdowns update immediately

### Download

Click **"📥 Download tagset"** to export the current configuration as \`tagset.json\` — including any manually loaded customisations.

The downloaded JSON can be edited directly and re-uploaded.

---

## Help Modal

The **\`?\` button** in the top right (or press \`?\`) opens this documentation directly in the browser.

The help is loaded from \`generated/readme_content.js\` — a pre-built JS bundle:

\`\`\`bash
python make_readme_js.py
\`\`\`

This script reads \`README.md\` (English, primary) and \`README.de.md\` (German) and writes \`generated/readme_content.js\`. Run it once after editing either README, then reload the page.

---

## Project Structure

\`\`\`
HTML_Editor/
├── index.html                 ← Entry point; loads all scripts
├── labels.js                  ← Default tagset (DEPREL groups, UPOS, XPOS)
├── examples.js                ← Embedded demo data (three annotator files)
├── start.bat                  ← Windows startup script (opens browser locally)
├── bundler.py                 ← Builds dist/index.html (everything inline, no server needed)
├── make_readme_js.py          ← Generates generated/readme_content.js from READMEs
├── LICENSE
│
├── css/
│   └── style.css              ← All CSS (dark/light mode, tables, arcs, tabs)
│
├── js/                        ← Application logic (load order: state → undo → projects → … → main)
│   ├── state.js               ← Global state, LABEL_COLS, DEP_COLS, buildDeprelOptionsCache()
│   ├── undo.js                ← Undo/redo stack (getUndoState / loadUndoState)
│   ├── projects.js            ← Project tabs, snapshot-swap, autoAssignToProjects()
│   ├── parser.js              ← CoNLL-U parser, processFiles(), recomputeMaxSents()
│   ├── table.js               ← Comparison table, Gold popup, renderCompareTable()
│   ├── tree.js                ← Text tree view, diff trees, renderSentence()
│   ├── arcview.js             ← SVG arc diagram, drag & drop, cycle detection
│   ├── export.js              ← CoNLL-U export, session import/export
│   ├── keyboard.js            ← All keyboard shortcuts
│   ├── i18n.js                ← Translation engine (t(), setLang(), registerLang())
│   ├── theme.js               ← Dark/light mode toggle
│   ├── help.js                ← Help modal (loads readme_content.js)
│   ├── tour.js                ← Guided tour (temporary project, spotlight, tooltips)
│   └── main.js                ← Initialisation, event listeners, UI rendering
│
├── lang/
│   ├── de.js                  ← German UI strings (window.LANG_DE)
│   └── en.js                  ← English UI strings (window.LANG_EN)
│
├── generated/
│   └── readme_content.js      ← Auto-generated by make_readme_js.py; contains README HTML
│
├── dist/
│   └── index.html             ← Minified all-in-one bundle (built by bundler.py)
│
└── testdata/                  ← Example data for exploration
    ├── template.json          ← Blank tagset template (format reference)
    ├── ner/                   ← Example: Named Entity Recognition
    │   ├── tagset.json        ← NER tagset (UPOS + XPOS + BIO entity column)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── srl/                   ← Example: Semantic Role Labeling
    │   ├── tagset.json        ← SRL tagset (UD DepRel + SRL dependency layer)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── custom/                ← Example: Custom simplified schema
    │   ├── tagset.json        ← Custom tagset (word class, animacy, sentiment, simplified syntax)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── morph/                 ← Example: Morphology + Topological Fields
    │   ├── tagset.json        ← Genus / Kasus as label columns; topological field as dep layer
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── de_ud/                 ← Example: German Universal Dependencies + Multi-Word Token
    │   ├── tagset.json        ← UPOS + STTS XPOS + UD DepRel (__dep_cols__)
    │   ├── annotator_A.conllu ← Reference (3 sentences, MWT: "im" = in+dem)
    │   ├── annotator_B.conllu ← iobj↔obl, xcomp↔advmod, acl:relcl↔advcl
    │   └── annotator_C.conllu ← nmod-instead-of-obj, Park head, ccomp-instead-of-acl:relcl
    └── en_ud/                 ← Example: English Universal Dependencies + Empty Node
        ├── tagset.json        ← UPOS + PTB POS + UD DepRel (__dep_cols__)
        ├── annotator_A.conllu ← Reference (3 sentences, Empty Node for VP-ellipsis)
        └── annotator_B.conllu ← advmod-instead-of-amod, obj-instead-of-conj, advcl-instead-of-acl:relcl
\`\`\`

### Key Files at a Glance

| File | Purpose |
|------|---------|
| \`index.html\` | Entry point; defines HTML structure and script load order |
| \`labels.js\` | Default tagset; loaded at startup, replaceable via tagset upload |
| \`examples.js\` | Demo data as a JS array; used by "Load demo" |
| \`js/state.js\` | Central state store; \`LABEL_COLS\` and \`DEP_COLS\` control column configuration |
| \`js/projects.js\` | Project management; snapshot-swap on tab switch; auto-assignment for different sentence counts |
| \`js/arcview.js\` | SVG arc diagram with drag & drop and cycle detection |
| \`js/export.js\` | Session format v2 (multi-project); import/export, autosave |
| \`bundler.py\` | Bundles all resources into \`dist/index.html\` for offline/embedded use |
| \`make_readme_js.py\` | Converts \`README.md\` (EN) + \`README.de.md\` (DE) → \`generated/readme_content.js\` (for help modal) |

---

## Demo Data (\`testdata/\`)

The six example directories together cover all tool features:

| Directory | Language | Annotators | Notable Features |
|---|---|---|---|
| \`ner/\` | German | 2 | **Three label columns** (UPOS + XPOS + NER-BIO); \`__cols__\` with 3 entries |
| \`srl/\` | German | 2 | **Two dep layers** (UD DepRel + Semantic Role); \`__dep_cols__\` with 2 entries |
| \`custom/\` | German | 2 | **Fully custom schema**: 3 label columns (word class / animacy / sentiment) + simplified syntax |
| \`morph/\` | German | 2 | **Morphology**: Genus/Kasus as label columns; topological field as dep layer |
| \`de_ud/\` | German | **3** | **Multi-Word Token** (\`im\` = \`in\` + \`dem\`); UPOS + STTS; 3 annotators with typical disagreements |
| \`en_ud/\` | English | 2 | **Empty Node** (VP-ellipsis / gapping); UPOS + PTB POS; English sentences |

### Feature Overview

| Feature | Where demonstrated |
|---|---|
| Multiple annotators (≥ 3) | \`de_ud/\` |
| Multi-Word Token (MWT, ID \`N-M\`) | \`de_ud/\` |
| Empty Nodes (ID \`N.M\`) | \`en_ud/\` |
| Comment lines (\`# sent_id\`, \`# annotator\` …) | all directories |
| \`__cols__\` (N arbitrary label columns) | \`ner/\`, \`custom/\`, \`morph/\`, \`de_ud/\`, \`en_ud/\` |
| \`__dep_cols__\` (N dependency layers) | \`srl/\`, \`morph/\`, \`de_ud/\`, \`en_ud/\` |
| Per-project tagset | all directories with \`tagset.json\` |
| Auto-project assignment (different sentence counts) | mix files from different directories |

### Loading the Demos

1. **Tagset first**: load \`tagset.json\` from a directory via "📤 Upload tagset" or drag & drop
2. **Then the CoNLL-U files**: all \`annotator_*.conllu\` from the same directory via "Add files"
3. Alternatively: **all files at once** via drag & drop — the tool detects type and order automatically

---

## Limitations

- **Multi-word tokens** (IDs \`N-M\`) and **empty nodes** (IDs \`N.M\`) are stored on load and fully reconstructed on CoNLL-U export; only regular tokens appear in the comparison table and tree view
- At least **two files** are required for comparison and tree view
- Data lives only in **browser memory** — use session export to save your progress permanently
`;

window.README_CONTENT_DE = `# CoNLL-U Vergleich

Browserbasiertes Tool zum Vergleichen und Annotieren mehrerer CoNLL-U-Dateien.
Läuft vollständig lokal ohne Server — einfach \`index.html\` im Browser öffnen.

---

## Feature-Übersicht

| Feature | Beschreibung |
|---------|-------------|
| **Mehrprojekt-Verwaltung** | Beliebig viele Projekte mit eigenen Dateien, Annotationen und Undo-Stack |
| **CoNLL-U-Vergleich** | Token-für-Token-Diff mehrerer Dateien gegen eine Gold-Annotation |
| **Interaktiver Baum** | Abhängigkeitsbäume mit Drag-&-Drop-Pfeilen, Relation-Auswahl, ROOT-Zone |
| **Gold-Annotation** | Per Klick, Popup oder Tastaturkürzel — Custom-Werte überschreiben Datei-Werte |
| **CoNLL-U-Editor** | Strukturierter Editor und Roh-Textarea je Datei; Gold-Tabelle im Lesemodus sichtbar |
| **Satzverwaltung** | Sätze einfügen, löschen, sortieren — Satzliste immer sichtbar |
| **Undo/Redo** | Bis zu 80 Schritte pro Projekt; wird mit Session gespeichert |
| **Session-Export** | Vollständigen Arbeitsstand als JSON sichern und laden |
| **Autosave** | Arbeitsstand wird alle 30 Sekunden lokal gesichert und beim Start automatisch geladen |
| **Tagset-Konfiguration** | Eigene DEPREL-Listen, UPOS/XPOS-Werte und Dependency-Layer per \`labels.js\` oder JSON |
| **Export** | Gold CoNLL-U und Baumansicht (alle Sätze) herunterladen |
| **Guided Tour** | Interaktive Einführung mit Spotlight und Tooltips anhand des englischen Beispiels |
| **Tastaturkürzel** | Vollständige Bedienung ohne Maus |
| **Mehrsprachig** | Deutsch / Englisch; weitere Sprachen per \`lang/xx.js\` |
| **Tablet-Unterstützung** | Touch-optimiert; Pfeile ziehbar, vergrößerte Tap-Ziele |

---

## Schnellstart

1. \`index.html\` im Browser öffnen — letzte Session wird automatisch geladen
2. Mindestens zwei \`.conllu\`-Dateien laden — oder **„Demo laden"** klicken
3. Satz auswählen → Baumansicht und Vergleichstabelle erscheinen automatisch
4. Gold-Zellen klicken oder Tastaturkürzel nutzen, um Annotationen zu bearbeiten
5. Fertigen Satz mit **„✓ Bestätigen"** markieren (oder \`Space\`)
6. **💾 Session speichern** — Fortschritt jederzeit als JSON sichern und später fortsetzen

---

## Projekte

Das Tool unterstützt mehrere **Projekte** gleichzeitig — jedes mit eigenen Dateien, Annotationen und Undo-Verlauf.

### Projekt-Tab-Leiste

Die Tab-Leiste erscheint direkt unterhalb des Headers. Jeder Tab hat:

| Schaltfläche | Funktion |
|---|---|
| **◀ / ▶** | Projekt in der Reihenfolge verschieben |
| **✎** | Projekt umbenennen |
| **×** | Projekt löschen (nur wenn mehr als 1 Projekt vorhanden) |
| **+** (rechts außen) | Neues leeres Projekt anlegen |

Klick auf einen Tab → wechselt zum Projekt. Der Zustand (Dateien, Satzposition, Undo-Stack) wird beim Wechsel automatisch gespeichert und wiederhergestellt.

### Tastaturkürzel für Projekte

| Taste | Funktion |
|---|---|
| \`[\` | Vorheriges Projekt |
| \`]\` | Nächstes Projekt |

### Projektschloss

Jedes Projekt kann **gesperrt** oder **entsperrt** werden (Schaltfläche in Abschnitt 1 unterhalb der Dateiliste):

| Zustand | Symbol | Verhalten |
|---------|--------|-----------|
| Gesperrt | 🔒 | Nur lesend: keine Bearbeitung per Tabelle, Popup oder Baum |
| Entsperrt | 🔓 | Alle Bearbeitungsfunktionen aktiv; HEAD/DEPREL-Spalten erscheinen |

Der Zustand wird mit der Session gespeichert und wiederhergestellt.

### Automatische Zuweisung beim Laden

Werden Dateien mit **unterschiedlichen Satzzahlen** geladen, ordnet das Tool sie automatisch den passenden Projekten zu:

1. **Eigenes Projekt** (aktiv) — wenn leer oder passende Satzzahl
2. **Anderes bestehendes Projekt** — mit übereinstimmender Satzzahl
3. **Anderes leeres Projekt** — als letzter Ausweg
4. **Neues Projekt anlegen** — nur wenn kein passendes gefunden

Wenn ein neues Projekt automatisch angelegt wurde, erscheint kurz eine Hinweismeldung.

---

## 1) Dateien laden

| Aktion | Beschreibung |
|--------|-------------|
| **„Dateien hinzufügen"** | Öffnet den Datei-Dialog; \`.conllu\`, \`.conll\`, \`.txt\` und \`.json\` wählbar |
| **„📤 Tagset hochladen"** | Öffnet ebenfalls den Datei-Dialog — akzeptiert alle Dateitypen |
| **„📂 Session laden"** | Öffnet den Datei-Dialog — akzeptiert alle Dateitypen |
| **Drag & Drop** | Dateien direkt auf die Seite ziehen — alle Typen werden erkannt |
| **„Demo laden"** | Drei vorgefertigte Beispieldateien, die alle Vergleichsfälle abdecken |
| **„Reset"** | Alle Dateien und Annotationen zurücksetzen |

Alle Upload-Wege (Buttons und Drag & Drop) erkennen den Dateityp automatisch:

| Dateiendung | Erkannter Typ | Aktion |
|-------------|---------------|--------|
| \`.conllu\`, \`.conll\`, \`.txt\` | CoNLL-U-Datei | Als Annotator-Datei laden |
| \`.json\` mit \`version\` + \`docs\`/\`projects\` | Session | Session importieren |
| \`.json\` (alles andere) | Tagset | Als neues Tagset laden |

### Datei-Aktionen pro Zeile

Jede geladene Datei hat folgende Schaltflächen:

| Schaltfläche | Funktion |
|---|---|
| **⬇ Download** | Datei als CoNLL-U herunterladen (Original-Inhalt) |
| **Projekt-Dropdown** | Datei in ein anderes Projekt verschieben; **＋ Neues Projekt …** legt ein neues an und verschiebt sofort |
| **▲ / ▼** | Reihenfolge innerhalb des Projekts tauschen |
| **Löschen** | Datei aus dem Projekt entfernen |

### Textkonsistenzwarnung

Haben zwei Dateien bei gleicher Satznummer unterschiedliche Tokens:
- **⚠️-Badge** neben dem Dateinamen
- Oranges **Warnbanner** unterhalb der Dateiliste

---

## 2) Satz wählen

### Dropdown

Jede Option zeigt:
- Satznummer und Stern \`★\` wenn bestätigt
- Tokenanzahl
- Anzahl der Abweichungen (\`· N Diffs\`) oder Haken (\`· ✓\`) bei vollständiger Übereinstimmung

**Farben im Dropdown:**

| Farbe | Bedeutung |
|-------|-----------|
| Grün | Keine Abweichungen |
| Rot | Mindestens eine Abweichung |
| Gold | Satz wurde bestätigt (\`★\`) |

Der **Rahmen des Dropdowns** spiegelt den Status des aktuellen Satzes wider (grün / rot / gold).

### Satztext

Der Satztext erscheint als klickbare Tokens. Ein Klick auf ein Wort:
- Springt zur entsprechenden Zeile in der Vergleichstabelle
- Hebt das Token im Satztext hervor (blauer Rahmen)
- Funktioniert auch andersrum: Tastaturnavigation (↑/↓) hebt das aktive Wort im Satztext hervor

### Satz-Map

Unterhalb des Satztextes erscheint eine Reihe kleiner **farbiger Punkte** — einer pro Satz:

| Farbe | Bedeutung |
|-------|-----------|
| Dunkelgrün | Kein Diff |
| Dunkelrot | Hat Diffs |
| Gold | Bestätigt |
| Blauer Rahmen | Aktuell ausgewählter Satz |

Klick auf einen Punkt springt direkt zu diesem Satz.

### Gold bestätigen

Über **„✓ Bestätigen"** (oder \`Space\`) wird der aktuelle Satz als abgeschlossen markiert.
Bestätigte Sätze werden gold eingefärbt (Dropdown, Satz-Map, Satztext-Rahmen, Button).
Erneutes Drücken hebt die Bestätigung wieder auf.

### Notiz pro Satz

Unterhalb des Satztextes gibt es ein **Notizfeld** — freier Text, der pro Satz gespeichert und mit der Session exportiert wird.

### CoNLL-U kopieren

Der **„Copy CoNLL-U"-Button** (oder Taste \`c\`) kopiert die Gold-Annotation des aktuellen Satzes als CoNLL-U in die Zwischenablage.

---

## 3) Baumansicht

Zeigt den aktuellen Satz als Abhängigkeitsbäume. Für jede geladene Datei gibt es einen Diff-Baum gegen die Gold-Annotation.

### Legende

| Symbol/Farbe | Bedeutung |
|---|---|
| ✅ grün | Kante identisch mit Gold |
| ⚠️ gelb | Gleicher HEAD, aber abweichendes DEPREL / Label-Spalten (\`🅶X\\|🅵Y\`) |
| 🅶 gold | Kante nur in Gold vorhanden |
| 🅵 blau | Kante nur in dieser Datei vorhanden |
| 🌱 | Wurzel eines Teilbaums |

Unterschiede in Label-Spalten (z. B. UPOS/XPOS) werden als \`[SPALTE:🅶X\\|🅵Y]\` annotiert.

### Interaktion

- **Klick auf eine Zeile** → springt zur zugehörigen Zeile in der Vergleichstabelle
- **„→ Gold"-Button** an jeder 🌱-Zeile → übernimmt den gesamten Teilbaum als Gold-Annotation

### Interaktives Arc-Diagramm (Gold-Ansicht)

Das Gold-Arc-Diagramm ist direkt bearbeitbar:

| Aktion | Funktion |
|--------|---------|
| **Token ziehen** (Drag & Drop) | Zieht einen neuen Pfeil von Token zu Token → setzt neuen HEAD |
| **Deprel-Popup** | Erscheint automatisch nach dem Ziehen — oder per Klick auf ein Arc-Label |
| **× Button** (Hover über Arc) | Löscht die Kante (setzt auf Root zurück) |
| **Klick auf Token** (ohne Ziehen) | Springt zur zugehörigen Tabellenzeile |

**Zyklus-Erkennung:** Würde ein neuer Pfeil einen Zyklus erzeugen, wird das Ziel rot aufgeleuchtet und die Zuweisung abgelehnt.

**Pfeilfarben** entsprechen der Legende (grün = Gold-übereinstimmend, gelb = DEPREL-Diff, gold = nur Gold, blau = nur Datei).

---

## 4) Vergleichstabelle

### Spalten

| Spalte | Inhalt |
|--------|--------|
| **ID** | Token-ID |
| **FORM** | Wortform |
| **Label-Spalten** | Eine Spalte pro konfigurierter Label-Kategorie (Standard: UPOS, XPOS); gelber Rahmen wenn Dateien abweichen |
| **GOLD** | Aktuelle Gold-Annotation (\`HEAD / DEPREL\`); Badge \`C\` = Custom, \`D1\`/\`D2\`/… = Datei; darunter alle Label-Werte |
| **Datei-Spalten** | Annotation jeder Datei; grün = identisch mit Gold, rot = abweichend |

In den Datei-Spalten werden HEAD/DEPREL und alle Label-Spalten einzeln hervorgehoben — abweichende Felder erscheinen **rot** (\`.fDiff\`).

### Gold-Auswahl

- **Klick auf eine Datei-Zelle** → wählt diese Datei als Gold-Quelle für diesen Token (Badge \`D1\`, \`D2\`, …)
- Ist ein Custom-Wert gesetzt, haben Custom-Werte immer Vorrang; Datei-Zellen sind dann ausgegraut

### Gold-Popup (Bearbeiten)

**Klick auf eine Gold-Zelle** öffnet ein Popup zum direkten Bearbeiten:

| Feld | Eingabe |
|------|---------|
| HEAD | Dropdown aller Tokens des aktuellen Satzes |
| DEPREL (+ weitere Dep-Layer) | Dropdown(s) aus der Tagset-Konfiguration |
| Label-Spalten | Je ein Dropdown oder Freitextfeld pro konfigurierter Label-Kategorie |

Die Anzahl der Felder passt sich automatisch an die geladene Tagset-Konfiguration an (beliebig viele Label-Spalten und Dependency-Layer möglich).

Änderungen werden sofort als Custom-Eintrag gespeichert. **„Zurücksetzen"** löscht den Custom-Eintrag für diesen Token.

**Tastatur im Popup:** \`Tab\`/\`Shift+Tab\` wechselt Felder · \`Enter\` schließt · \`r\` zurücksetzen · \`Esc\` schließen

### Custom-Annotation

- **„Custom aus [Datei]"-Buttons** kopieren alle Werte der gewählten Datei als Custom-Ausgangsbasis
- **„Custom Satz löschen"** entfernt alle Custom-Einträge für den aktuellen Satz (mit Bestätigung)
- Sobald ein Custom-Wert gesetzt ist, gilt dieser Token als Gold (\`C\`-Badge)

### Spalten ein-/ausblenden

Über die **Spalten-Toggle-Leiste** lassen sich Datei-Spalten ein- und ausblenden.

---

## 5) CoNLL-U

Abschnitt 5 zeigt und bearbeitet die CoNLL-U-Daten des aktuellen Satzes. Das Verhalten hängt vom **Bearbeitungsmodus** ab (Schloss in Abschnitt 1):

### Lesemodus (gesperrt 🔒)

- **Gold-Tabelle** zeigt alle Tokens mit den aktuellen Gold-Annotationen (HEAD, DEPREL, UPOS, XPOS) — schreibgeschützt
- Zeilen mit aktiven Custom-Überschreibungen sind farbig hervorgehoben

### Bearbeitungsmodus (entsperrt 🔓)

- **Gold-Tabelle** (editierbar): HEAD, DEPREL, UPOS und XPOS direkt anpassen — Änderungen werden sofort als Custom-Werte gespeichert
- **Tab „📝 Strukturierter Editor"**: Alle CoNLL-U-Felder jeder Datei als strukturierte Tabelle; Zeilen hinzufügen/löschen, Werte direkt eingeben
- **Tab „Rohtext"**: Vollständiger CoNLL-U-Text je Datei als Textarea; wächst automatisch mit dem Inhalt
  - Änderungen eingeben → **„✓ Übernehmen"** überträgt sie in alle anderen Ansichten
  - **„✕ Zurücksetzen"** verwirft Änderungen und stellt den letzten gespeicherten Stand wieder her

Der Titel des Abschnitts wechselt automatisch zwischen **„5) CoNLL-U"** (Lesemodus) und **„5) CoNLL-U bearbeiten"** (Bearbeitungsmodus).

---

## 6) Export

### Einzelne Datei

Der **⬇-Button** neben jeder Datei lädt den Original-Inhalt der Datei als \`.conllu\` herunter.

### Aktives Projekt

| Button | Inhalt |
|--------|--------|
| **Gold CoNLL-U herunterladen** | Alle Sätze des aktiven Projekts mit aktuellen Gold-Annotationen (HEAD, DEPREL, UPOS, XPOS); LEMMA/FEATS/DEPS/MISC aus Quelldatei |
| **Baumansicht (alle Sätze) herunterladen** | Alle Sätze als Text-Bäume mit Gold-Baum und Diff-Bäumen pro Datei |

### Alle Projekte

| Button | Inhalt |
|--------|--------|
| **Alle Projekte CoNLL-U herunterladen** | Exportiert Gold-CoNLL-U für jedes Projekt als separate Datei (\`gold_Projektname.conllu\`) |
| **Alle Projekte Baumansicht herunterladen** | Exportiert Baumansichten für jedes Projekt als separate Datei |

Tastaturkürzel: \`e\` → CoNLL-U · \`E\` → Baumansicht · \`c\` → aktuellen Satz in Zwischenablage

### Session Export / Import

Der **Session-Mechanismus** sichert den vollständigen Arbeitsstand aller Projekte:

- Alle Projekte mit Namen, Dateien und Annotationen
- Custom-Annotationen und Gold-Auswahl
- Bestätigte Sätze und Notizen
- Vollständiger Undo-/Redo-Verlauf pro Projekt
- Labelkonfiguration (\`labels.js\`)

| Aktion | Beschreibung |
|--------|-------------|
| **💾 Session speichern** | Exportiert alles als \`.json\`-Datei |
| **📂 Session laden** | Importiert eine gespeicherte Session-Datei |
| **Drag & Drop** | \`.json\`-Datei auf die Seite ziehen → wird automatisch als Session erkannt |

Das Session-Format ist versioniert (\`version: 2\`) und als JSON lesbar.

### Autosave

Der Arbeitsstand wird alle **30 Sekunden** automatisch im Browser-LocalStorage gesichert. Beim nächsten Öffnen der Seite wird der letzte Stand **automatisch und lautlos wiederhergestellt** — ohne Rückfrage.

---

## Undo / Redo

Alle Annotationsänderungen (Datei-Auswahl, Custom-Popup, Bestätigen, Teilbaum-Übernahme) sind rückgängig machbar. Jedes Projekt hat seinen eigenen Undo-Stack.

| Aktion | Beschreibung |
|--------|-------------|
| **↩ Undo** / \`Ctrl+Z\` | Letzte Änderung rückgängig |
| **↪ Redo** / \`Ctrl+Y\` | Rückgängige Änderung wiederherstellen |

Der Verlauf wird in der Session mitgespeichert (bis zu 80 Schritte pro Projekt).

---

## Guided Tour

Der **🎓 Guided Tour**-Button oben rechts startet eine interaktive Einführung in alle Funktionen des Tools.

- Die Tour öffnet das englische Beispielprojekt automatisch in einem **temporären Projekt** — eigene Daten bleiben vollständig erhalten
- Spotlight und Tooltip führen Schritt für Schritt durch alle 16 Stationen: Projekte, Dateien, Satznavigation, Baumansicht, Vergleichstabelle, Gold-Annotation, Bearbeitungsmodus, CoNLL-U-Editor, Export
- Beenden mit **„Tour abbrechen"**, \`Esc\` oder dem „Fertig"-Button — das Tour-Projekt wird danach automatisch entfernt

---

## Tastaturkürzel

| Taste | Funktion |
|-------|----------|
| \`←\` / \`→\` | Vorheriger / nächster Satz |
| \`Ctrl+←\` / \`Ctrl+→\` | Erster / letzter Satz |
| \`n\` / \`N\` | Nächster / vorheriger Satz mit Diffs |
| \`f\` / \`F\` | Nächste / vorherige markierte Stelle (\`⚑\`) |
| \`[\` / \`]\` | Vorheriges / nächstes Projekt |
| \`↑\` / \`↓\` | Tabellenzeile navigieren |
| \`Enter\` | Gold-Popup für fokussierte Zeile öffnen |
| \`Space\` | Satz bestätigen / Bestätigung aufheben |
| \`1\`–\`9\` | Datei N als Gold-Quelle für fokussierte Zeile wählen |
| \`Ctrl+1\`–\`9\` | Custom aus Datei N laden |
| \`Ctrl+Z\` | Undo |
| \`Ctrl+Y\` / \`Ctrl+Shift+Z\` | Redo |
| \`Del\` / \`Backspace\` | Custom des aktuellen Satzes löschen |
| \`c\` | Aktuellen Satz als CoNLL-U in Zwischenablage kopieren |
| \`e\` | Gold CoNLL-U exportieren |
| \`E\` (Shift+e) | Baumansicht exportieren |
| \`r\` | Aktuellen Satz vorlesen (TTS) |
| \`?\` | Hilfe öffnen / schließen |
| \`Esc\` | Fokus / Popup / Hilfe schließen |

---

## Mehrsprachigkeit

Die Oberfläche unterstützt **Deutsch** und **Englisch** — umschaltbar über die Flaggen-Buttons oben rechts. Die gewählte Sprache wird im Browser gespeichert (\`localStorage\`).

### Weitere Sprachen hinzufügen

1. Neue Datei \`lang/xx.js\` anlegen (nach dem Schema von \`lang/de.js\`):

\`\`\`javascript
window.LANG_XX = {
  'sec.files':   '...',
  // alle Schlüssel aus lang/de.js übersetzen
};
\`\`\`

2. In \`index.html\` einbinden (vor \`js/i18n.js\`):

\`\`\`html
<script src="lang/xx.js"></script>
\`\`\`

3. Flaggen-Button hinzufügen:

\`\`\`html
<button class="langBtn" data-lang="xx" onclick="setLang('xx')" title="...">🏳️</button>
\`\`\`

Oder dynamisch zur Laufzeit:

\`\`\`javascript
registerLang('xx', window.LANG_XX);
\`\`\`

---

## labels.js

Im gleichen Ordner wie \`index.html\` liegt \`labels.js\`, die Dropdown-Inhalte definiert.

### Klassisches Format (Rückwärtskompatibel)

\`\`\`javascript
const LABELS = {
  "Core arguments": ["nsubj", "obj", "iobj", ...],
  "Non-core dependents": ["obl", "advmod", ...],
  // ...
  "__upos__": ["ADJ", "ADP", "ADV", "AUX", ...],
  "__xpos__": ["ADJA", "ADJD", "NN", "NE", ...],
  "__upos_name__": "UPOS",   // optionaler Anzeigename
  "__xpos_name__": "XPOS",
};
\`\`\`

| Schlüssel | Beschreibung |
|-----------|-------------|
| Beliebige Strings | Gruppierter Abschnitt im DEPREL-Dropdown |
| \`__upos__\` | Optionen für das UPOS-Feld (leer → Freitextfeld) |
| \`__xpos__\` | Optionen für das XPOS-Feld (leer → Freitextfeld) |
| \`__upos_name__\` | Anzeigename der UPOS-Spalte |
| \`__xpos_name__\` | Anzeigename der XPOS-Spalte |

### Erweitertes Format — beliebig viele Label- und Dependency-Spalten

Über \`__cols__\` und \`__dep_cols__\` lassen sich beliebig viele Spalten definieren:

\`\`\`json
{
  "__cols__": [
    { "key": "upos",    "name": "UPOS",       "values": ["ADJ", "NOUN", "VERB"] },
    { "key": "xpos",    "name": "XPOS",       "values": ["ADJA", "NN", "VVFIN"] },
    { "key": "entity",  "name": "Entity",     "values": ["PER", "ORG", "LOC", "O"] },
    { "key": "animacy", "name": "Animacy",    "values": ["Anim", "Inan"] }
  ],
  "__dep_cols__": [
    {
      "key": "ud",
      "name": "UD DepRel",
      "groups": {
        "Core arguments": ["nsubj", "obj", "iobj"],
        "Other":          ["punct", "root", "dep"]
      }
    },
    {
      "key": "srl",
      "name": "SRL",
      "groups": {
        "Arguments": ["ARG0", "ARG1", "ARG2", "ARGM"]
      }
    }
  ]
}
\`\`\`

| Schlüssel | Beschreibung |
|-----------|-------------|
| \`__cols__\` | Array von Label-Spalten; \`key\` = internes Feldname, \`name\` = Anzeigename, \`values\` = Dropdown-Optionen |
| \`__dep_cols__\` | Array von Dependency-Annotationslagen; erste Lage = primäre HEAD/DEPREL-Felder; weitere Lagen erhalten eigene HEAD- und DEPREL-Dropdowns im Popup |

**CoNLL-U-Export:** \`__cols__[0]\` → UPOS-Spalte, \`__cols__[1]\` → XPOS-Spalte, weitere → MISC als \`key=value\`.

Labels werden mit der Session gespeichert und beim Laden wiederhergestellt.

---

## Tagset hochladen / herunterladen

Das Tagset (Label- und Dependency-Konfiguration) kann zur Laufzeit ausgetauscht werden — ohne Neustart.

### Hochladen

1. Schaltfläche **„📤 Tagset hochladen"** klicken
2. JSON-Datei wählen (klassisches oder erweitertes Format)
3. Tabelle, Popups und Dropdowns aktualisieren sich sofort

### Herunterladen

Schaltfläche **„📥 Tagset herunterladen"** exportiert die aktuelle Konfiguration als \`tagset.json\` — inklusive aller manuell geladenen Anpassungen.

Das heruntergeladene JSON kann direkt bearbeitet und wieder hochgeladen werden.

---

## Hilfe-Modal

Der **\`?\`-Button** oben rechts (oder Taste \`?\`) öffnet diese Dokumentation direkt im Browser.

Die Hilfe wird aus \`generated/readme_content.js\` geladen — einem vorgefertigten JS-Bundle:

\`\`\`bash
python make_readme_js.py
\`\`\`

Das Skript liest \`README.md\` (Englisch, primär) und \`README.de.md\` (Deutsch) und schreibt \`generated/readme_content.js\`. Nach Änderungen an einer README einmal ausführen und die Seite neu laden.

---

## Projektstruktur

\`\`\`
HTML_Editor/
├── index.html                 ← Einstiegspunkt; lädt alle Skripte
├── labels.js                  ← Standard-Tagset (DEPREL-Gruppen, UPOS, XPOS)
├── examples.js                ← Eingebettete Demo-Daten (drei Annotator-Dateien)
├── start.bat                  ← Windows-Startskript (öffnet Browser lokal)
├── bundler.py                 ← Baut dist/index.html (alles inline, kein Server nötig)
├── make_readme_js.py          ← Generiert generated/readme_content.js aus README.md
├── LICENSE
│
├── css/
│   └── style.css              ← Gesamtes CSS (Dark/Light-Mode, Tabellen, Arcs, Tabs)
│
├── js/                        ← Anwendungslogik (Ladereihenfolge: state → undo → projects → … → main)
│   ├── state.js               ← Globaler Zustand, LABEL_COLS, DEP_COLS, buildDeprelOptionsCache()
│   ├── undo.js                ← Undo/Redo-Stack (getUndoState / loadUndoState)
│   ├── projects.js            ← Projekt-Tabs, Snapshot-Swap, autoAssignToProjects()
│   ├── parser.js              ← CoNLL-U-Parser, processFiles(), recomputeMaxSents()
│   ├── table.js               ← Vergleichstabelle, Gold-Popup, renderCompareTable()
│   ├── tree.js                ← Text-Baumansicht, Diff-Bäume, renderSentence()
│   ├── arcview.js             ← SVG-Arc-Diagramm, Drag & Drop, Zyklus-Erkennung
│   ├── export.js              ← CoNLL-U-Export, Session-Import/-Export
│   ├── keyboard.js            ← Alle Tastaturkürzel
│   ├── i18n.js                ← Übersetzungs-Engine (t(), setLang(), registerLang())
│   ├── theme.js               ← Dark/Light-Mode-Umschalter
│   ├── help.js                ← Hilfe-Modal (lädt readme_content.js)
│   ├── tour.js                ← Guided Tour (temporäres Projekt, Spotlight, Tooltips)
│   └── main.js                ← Initialisierung, Event-Listener, UI-Rendering
│
├── lang/
│   ├── de.js                  ← Deutsche UI-Texte (window.LANG_DE)
│   └── en.js                  ← Englische UI-Texte (window.LANG_EN)
│
├── generated/
│   └── readme_content.js      ← Auto-generiert von make_readme_js.py; enthält README-HTML
│
├── dist/
│   └── index.html             ← Minifiziertes All-in-one-Bundle (erzeugt von bundler.py)
│
└── testdata/                  ← Beispieldaten zum Ausprobieren
    ├── template.json          ← Leere Tagset-Vorlage (Formatreferenz)
    ├── ner/                   ← Beispiel: Named Entity Recognition
    │   ├── tagset.json        ← NER-Tagset (UPOS + XPOS + BIO-Entity-Spalte)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── srl/                   ← Beispiel: Semantic Role Labeling
    │   ├── tagset.json        ← SRL-Tagset (UD DepRel + SRL-Dep-Schicht)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── custom/                ← Beispiel: Eigenes vereinfachtes Schema
    │   ├── tagset.json        ← Custom-Tagset (Wortart, Belebtheit, Sentiment, Vereinfachte Syntax)
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── morph/                 ← Beispiel: Morphologie + Topologische Felder
    │   ├── tagset.json        ← Genus / Kasus als Label-Spalten; Topologisches Feld als Dep-Layer
    │   ├── annotator_A.conllu
    │   └── annotator_B.conllu
    ├── de_ud/                 ← Beispiel: Deutsches Universal Dependencies + Multi-Word-Token
    │   ├── tagset.json        ← UPOS + STTS XPOS + UD DepRel (__dep_cols__)
    │   ├── annotator_A.conllu ← Referenz (3 Sätze, MWT: „im" = in+dem)
    │   ├── annotator_B.conllu ← iobj↔obl, xcomp↔advmod, acl:relcl↔advcl
    │   └── annotator_C.conllu ← nmod-statt-obj, Park-Kopf, ccomp-statt-acl:relcl
    └── en_ud/                 ← Beispiel: Englisches Universal Dependencies + Empty Node
        ├── tagset.json        ← UPOS + PTB POS + UD DepRel (__dep_cols__)
        ├── annotator_A.conllu ← Referenz (3 Sätze, Empty Node für VP-Ellipse)
        └── annotator_B.conllu ← advmod-statt-amod, obj-statt-conj, advcl-statt-acl:relcl
\`\`\`

### Wichtige Dateien im Überblick

| Datei | Zweck |
|-------|-------|
| \`index.html\` | Einstiegspunkt; definiert HTML-Struktur und Lade-Reihenfolge der Skripte |
| \`labels.js\` | Standard-Tagset; wird beim Start geladen und kann per Tagset-Upload ersetzt werden |
| \`examples.js\` | Demo-Daten als JS-Array; „Demo laden" verwendet diese Daten |
| \`js/state.js\` | Zentraler Zustandsspeicher; \`LABEL_COLS\` und \`DEP_COLS\` steuern die Spalten-Konfiguration |
| \`js/projects.js\` | Projekt-Verwaltung; Snapshot-Swap beim Tab-Wechsel; Auto-Zuweisung bei unterschiedlicher Satzzahl |
| \`js/arcview.js\` | SVG-Arc-Diagramm mit Drag & Drop und Zyklus-Erkennung |
| \`js/export.js\` | Session-Format v2 (multi-project); Import/Export, Autosave |
| \`bundler.py\` | Bündelt alle Ressourcen in \`dist/index.html\` für offline/eingebetteten Einsatz |
| \`make_readme_js.py\` | Wandelt \`README.md\` (EN) + \`README.de.md\` (DE) → \`generated/readme_content.js\` (für Hilfe-Modal) |

---

## Demo-Daten (\`testdata/\`)

Die sechs Beispielverzeichnisse decken gemeinsam alle Funktionen des Tools ab:

| Verzeichnis | Sprache | Annotatorinnen | Besondere Features |
|---|---|---|---|
| \`ner/\` | Deutsch | 2 | **Drei Label-Spalten** (UPOS + XPOS + NER-BIO); \`__cols__\` mit 3 Einträgen |
| \`srl/\` | Deutsch | 2 | **Zwei Dep-Schichten** (UD DepRel + Semantic Role); \`__dep_cols__\` mit 2 Einträgen |
| \`custom/\` | Deutsch | 2 | **Vollständig eigenes Schema**: 3 Label-Spalten (Wortart / Belebtheit / Sentiment) + vereinfachte Syntax |
| \`morph/\` | Deutsch | 2 | **Morphologie**: Genus/Kasus als Label-Spalten; Topologisches Feld als Dep-Schicht |
| \`de_ud/\` | Deutsch | **3** | **Multi-Word-Token** (\`im\` = \`in\` + \`dem\`); UPOS + STTS; 3 Annotatorinnen mit typischen Uneinigkeiten |
| \`en_ud/\` | Englisch | 2 | **Empty Node** (VP-Ellipse / Gapping); UPOS + PTB POS; englischsprachige Sätze |

### Features-Übersicht

| Feature | wo demonstriert |
|---|---|
| Mehrere Annotatorinnen (≥ 3) | \`de_ud/\` |
| Multi-Word-Token (MWT, ID \`N-M\`) | \`de_ud/\` |
| Empty Nodes (ID \`N.M\`) | \`en_ud/\` |
| Kommentar-Zeilen (\`# sent_id\`, \`# annotator\` …) | alle Verzeichnisse |
| \`__cols__\` (N beliebige Label-Spalten) | \`ner/\`, \`custom/\`, \`morph/\`, \`de_ud/\`, \`en_ud/\` |
| \`__dep_cols__\` (N Dep-Schichten) | \`srl/\`, \`morph/\`, \`de_ud/\`, \`en_ud/\` |
| Projekt-spezifisches Tagset | alle Verzeichnisse mit \`tagset.json\` |
| Auto-Projekt-Zuweisung (unterschiedl. Satzzahlen) | Dateien aus verschiedenen Verzeichnissen mischen |

### Laden der Demos

1. **Tagset zuerst**: \`tagset.json\` aus einem Verzeichnis per „📤 Tagset hochladen" oder Drag & Drop laden
2. **Dann die CoNLL-U-Dateien**: alle \`annotator_*.conllu\` aus dem gleichen Verzeichnis per „Dateien hinzufügen"
3. Alternativ: **alle Dateien gleichzeitig** per Drag & Drop — das Tool erkennt Typ und Reihenfolge automatisch

---

## Einschränkungen

- **Multi-Word-Token** (IDs \`N-M\`) und **Empty Nodes** (IDs \`N.M\`) werden beim Laden gespeichert und beim CoNLL-U-Export vollständig rekonstruiert; in der Vergleichstabelle und Baumansicht erscheinen nur die regulären Token
- Mindestens **zwei Dateien** nötig für Vergleich und Baumansicht
- Daten liegen nur im **Browser-Speicher** — Session-Export verwenden, um den Stand dauerhaft zu sichern
`;

window.TAGSET_TEMPLATE = `{
  "_comment": "Leere Formatvorlage für den Tagset-Upload. Alle Felder sind optional.",

  "__cols__": [
    {
      "key":    "FELDNAME",
      "name":   "Anzeigename in der Spaltenüberschrift",
      "values": ["Option1", "Option2", "Option3"]
    }
  ],

  "__dep_cols__": [
    {
      "key":  "SCHEMANAME",
      "name": "Anzeigename des Dependency-Schemas",
      "groups": {
        "Gruppe 1": ["label1", "label2", "label3"],
        "Gruppe 2": ["label4", "label5"]
      }
    }
  ]
}
`;
