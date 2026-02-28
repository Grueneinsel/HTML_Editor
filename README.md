# CoNLL-U Vergleich

Browserbasiertes Tool zum Vergleichen und Annotieren mehrerer CoNLL-U-Dateien.
Läuft vollständig lokal ohne Server — einfach `index.html` im Browser öffnen.

---

## Schnellstart

1. `index.html` im Browser öffnen
2. Mindestens zwei `.conllu`-Dateien laden — oder **„Demo laden"** klicken
3. Satz auswählen → Baumansicht und Vergleichstabelle erscheinen automatisch
4. Gold-Zellen klicken oder Tastaturkürzel nutzen, um Annotationen zu bearbeiten
5. Fertigen Satz mit **„✓ Bestätigen"** markieren (oder `Space`)
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
| `[` | Vorheriges Projekt |
| `]` | Nächstes Projekt |

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
| **„Dateien hinzufügen"** | Öffnet den Datei-Dialog; `.conllu`, `.conll`, `.txt` und `.json` wählbar |
| **„📤 Tagset hochladen"** | Öffnet ebenfalls den Datei-Dialog — akzeptiert alle Dateitypen |
| **„📂 Session laden"** | Öffnet den Datei-Dialog — akzeptiert alle Dateitypen |
| **Drag & Drop** | Dateien direkt auf die Seite ziehen — alle Typen werden erkannt |
| **„Demo laden"** | Drei vorgefertigte Beispieldateien, die alle Vergleichsfälle abdecken |
| **„Reset"** | Alle Dateien und Annotationen zurücksetzen |

Alle Upload-Wege (Buttons und Drag & Drop) erkennen den Dateityp automatisch:

| Dateiendung | Erkannter Typ | Aktion |
|-------------|---------------|--------|
| `.conllu`, `.conll`, `.txt` | CoNLL-U-Datei | Als Annotator-Datei laden |
| `.json` mit `version` + `docs`/`projects` | Session | Session importieren |
| `.json` (alles andere) | Tagset | Als neues Tagset laden |

### Datei-Aktionen pro Zeile

Jede geladene Datei hat folgende Schaltflächen:

| Schaltfläche | Funktion |
|---|---|
| **⬇** | Datei als CoNLL-U herunterladen (Original-Inhalt) |
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
- Satznummer und Stern `★` wenn bestätigt
- Tokenanzahl
- Anzahl der Abweichungen (`· N Diffs`) oder Haken (`· ✓`) bei vollständiger Übereinstimmung

**Farben im Dropdown:**

| Farbe | Bedeutung |
|-------|-----------|
| Grün | Keine Abweichungen |
| Rot | Mindestens eine Abweichung |
| Gold | Satz wurde bestätigt (`★`) |

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

Über **„✓ Bestätigen"** (oder `Space`) wird der aktuelle Satz als abgeschlossen markiert.
Bestätigte Sätze werden gold eingefärbt (Dropdown, Satz-Map, Satztext-Rahmen, Button).
Erneutes Drücken hebt die Bestätigung wieder auf.

### Notiz pro Satz

Unterhalb des Satztextes gibt es ein **Notizfeld** — freier Text, der pro Satz gespeichert und mit der Session exportiert wird.

### CoNLL-U kopieren

Der **„Copy CoNLL-U"-Button** (oder Taste `c`) kopiert die Gold-Annotation des aktuellen Satzes als CoNLL-U in die Zwischenablage.

---

## 3) Baumansicht

Zeigt den aktuellen Satz als Abhängigkeitsbäume. Für jede geladene Datei gibt es einen Diff-Baum gegen die Gold-Annotation.

### Legende

| Symbol/Farbe | Bedeutung |
|---|---|
| ✅ grün | Kante identisch mit Gold |
| ⚠️ gelb | Gleicher HEAD, aber abweichendes DEPREL / Label-Spalten (`🅶X\|🅵Y`) |
| 🅶 gold | Kante nur in Gold vorhanden |
| 🅵 blau | Kante nur in dieser Datei vorhanden |
| 🌱 | Wurzel eines Teilbaums |

Unterschiede in Label-Spalten (z. B. UPOS/XPOS) werden als `[SPALTE:🅶X\|🅵Y]` annotiert.

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
| **GOLD** | Aktuelle Gold-Annotation (`HEAD / DEPREL`); Badge `C` = Custom, `D1`/`D2`/… = Datei; darunter alle Label-Werte |
| **Datei-Spalten** | Annotation jeder Datei; grün = identisch mit Gold, rot = abweichend |

In den Datei-Spalten werden HEAD/DEPREL und alle Label-Spalten einzeln hervorgehoben — abweichende Felder erscheinen **rot** (`.fDiff`).

### Gold-Auswahl

- **Klick auf eine Datei-Zelle** → wählt diese Datei als Gold-Quelle für diesen Token (Badge `D1`, `D2`, …)
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

**Tastatur im Popup:** `Tab`/`Shift+Tab` wechselt Felder · `Enter` schließt · `r` zurücksetzen · `Esc` schließen

### Custom-Annotation

- **„Custom aus [Datei]"-Buttons** kopieren alle Werte der gewählten Datei als Custom-Ausgangsbasis
- **„Custom Satz löschen"** entfernt alle Custom-Einträge für den aktuellen Satz (mit Bestätigung)
- Sobald ein Custom-Wert gesetzt ist, gilt dieser Token als Gold (`C`-Badge)

### Spalten ein-/ausblenden

Über die **Spalten-Toggle-Leiste** lassen sich Datei-Spalten ein- und ausblenden.

---

## 5) Export

### Einzelne Datei

Der **⬇-Button** neben jeder Datei lädt den Original-Inhalt der Datei als `.conllu` herunter.

### Alle Sätze (Gold-Annotation)

| Button | Inhalt |
|--------|--------|
| **Gold CoNLL-U herunterladen** | Alle Sätze mit aktuellen Gold-Annotationen (HEAD, DEPREL, UPOS, XPOS); LEMMA/FEATS/DEPS/MISC aus Quelldatei |
| **Baumansicht herunterladen** | Alle Sätze als Text-Bäume mit Gold-Baum und Diff-Bäumen pro Datei |

Tastaturkürzel: `e` → CoNLL-U · `E` → Baumansicht · `c` → aktuellen Satz in Zwischenablage

### Session Export / Import

Der **Session-Mechanismus** sichert den vollständigen Arbeitsstand aller Projekte:

- Alle Projekte mit Namen, Dateien und Annotationen
- Custom-Annotationen und Gold-Auswahl
- Bestätigte Sätze und Notizen
- Vollständiger Undo-/Redo-Verlauf pro Projekt
- Labelkonfiguration (`labels.js`)

| Aktion | Beschreibung |
|--------|-------------|
| **💾 Session speichern** | Exportiert alles als `.json`-Datei |
| **📂 Session laden** | Importiert eine gespeicherte Session-Datei |
| **Drag & Drop** | `.json`-Datei auf die Seite ziehen → wird automatisch als Session erkannt |

Das Session-Format ist versioniert (`version: 2`) und als JSON lesbar. Ältere Sessions (`version: 1`) werden automatisch als einzelnes Projekt importiert.

### Autosave

Der Arbeitsstand wird alle **30 Sekunden** automatisch im Browser-LocalStorage gesichert. Beim nächsten Öffnen der Seite erscheint ein Banner mit der Option, den Stand wiederherzustellen oder zu verwerfen.

---

## 6) Undo / Redo

Alle Annotationsänderungen (Datei-Auswahl, Custom-Popup, Bestätigen, Teilbaum-Übernahme) sind rückgängig machbar. Jedes Projekt hat seinen eigenen Undo-Stack.

| Aktion | Beschreibung |
|--------|-------------|
| **↩ Undo** / `Ctrl+Z` | Letzte Änderung rückgängig |
| **↪ Redo** / `Ctrl+Y` | Rückgängige Änderung wiederherstellen |

Der Verlauf wird in der Session mitgespeichert (bis zu 80 Schritte pro Projekt).

---

## Tastaturkürzel

| Taste | Funktion |
|-------|----------|
| `←` / `→` | Vorheriger / nächster Satz |
| `Ctrl+←` / `Ctrl+→` | Erster / letzter Satz |
| `n` / `N` | Nächster / vorheriger Satz mit Diffs |
| `[` / `]` | Vorheriges / nächstes Projekt |
| `↑` / `↓` | Tabellenzeile navigieren |
| `Enter` | Gold-Popup für fokussierte Zeile öffnen |
| `Space` | Satz bestätigen / Bestätigung aufheben |
| `1`–`9` | Datei N als Gold-Quelle für fokussierte Zeile wählen |
| `Ctrl+1`–`9` | Custom aus Datei N laden |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Del` / `Backspace` | Custom des aktuellen Satzes löschen |
| `c` | Aktuellen Satz als CoNLL-U in Zwischenablage kopieren |
| `e` | Gold CoNLL-U exportieren |
| `E` (Shift+e) | Baumansicht exportieren |
| `?` | Hilfe öffnen / schließen |
| `Esc` | Fokus / Popup / Hilfe schließen |

---

## Mehrsprachigkeit

Die Oberfläche unterstützt **Deutsch** und **Englisch** — umschaltbar über die Flaggen-Buttons oben rechts. Die gewählte Sprache wird im Browser gespeichert (`localStorage`).

### Weitere Sprachen hinzufügen

1. Neue Datei `lang/xx.js` anlegen (nach dem Schema von `lang/de.js`):

```javascript
window.LANG_XX = {
  'sec.files':   '...',
  // alle Schlüssel aus lang/de.js übersetzen
};
```

2. In `index.html` einbinden (vor `js/i18n.js`):

```html
<script src="lang/xx.js"></script>
```

3. Flaggen-Button hinzufügen:

```html
<button class="langBtn" data-lang="xx" onclick="setLang('xx')" title="...">🏳️</button>
```

Oder dynamisch zur Laufzeit:

```javascript
registerLang('xx', window.LANG_XX);
```

---

## labels.js

Im gleichen Ordner wie `index.html` liegt `labels.js`, die Dropdown-Inhalte definiert.

### Klassisches Format (Rückwärtskompatibel)

```javascript
const LABELS = {
  "Core arguments": ["nsubj", "obj", "iobj", ...],
  "Non-core dependents": ["obl", "advmod", ...],
  // ...
  "__upos__": ["ADJ", "ADP", "ADV", "AUX", ...],
  "__xpos__": ["ADJA", "ADJD", "NN", "NE", ...],
  "__upos_name__": "UPOS",   // optionaler Anzeigename
  "__xpos_name__": "XPOS",
};
```

| Schlüssel | Beschreibung |
|-----------|-------------|
| Beliebige Strings | Gruppierter Abschnitt im DEPREL-Dropdown |
| `__upos__` | Optionen für das UPOS-Feld (leer → Freitextfeld) |
| `__xpos__` | Optionen für das XPOS-Feld (leer → Freitextfeld) |
| `__upos_name__` | Anzeigename der UPOS-Spalte |
| `__xpos_name__` | Anzeigename der XPOS-Spalte |

### Erweitertes Format — beliebig viele Label- und Dependency-Spalten

Über `__cols__` und `__dep_cols__` lassen sich beliebig viele Spalten definieren:

```json
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
```

| Schlüssel | Beschreibung |
|-----------|-------------|
| `__cols__` | Array von Label-Spalten; `key` = internes Feldname, `name` = Anzeigename, `values` = Dropdown-Optionen |
| `__dep_cols__` | Array von Dependency-Annotationslagen; erste Lage = primäre HEAD/DEPREL-Felder; weitere Lagen erhalten eigene HEAD- und DEPREL-Dropdowns im Popup |

**CoNLL-U-Export:** `__cols__[0]` → UPOS-Spalte, `__cols__[1]` → XPOS-Spalte, weitere → MISC als `key=value`.

Labels werden mit der Session gespeichert und beim Laden wiederhergestellt.

---

## Tagset hochladen / herunterladen

Das Tagset (Label- und Dependency-Konfiguration) kann zur Laufzeit ausgetauscht werden — ohne Neustart.

### Hochladen

1. Schaltfläche **„📤 Tagset hochladen"** klicken
2. JSON-Datei wählen (klassisches oder erweitertes Format)
3. Tabelle, Popups und Dropdowns aktualisieren sich sofort

### Herunterladen

Schaltfläche **„📥 Tagset herunterladen"** exportiert die aktuelle Konfiguration als `tagset.json` — inklusive aller manuell geladenen Anpassungen.

Das heruntergeladene JSON kann direkt bearbeitet und wieder hochgeladen werden.

---

## Hilfe-Modal

Der **`?`-Button** oben rechts (oder Taste `?`) öffnet diese Dokumentation direkt im Browser.

Die Hilfe wird aus `generated/readme_content.js` geladen — einem vorgefertigten JS-Bundle:

```bash
python make_readme_js.py
```

Das Skript liest `README.md` und schreibt `generated/readme_content.js`. Nach Änderungen an der README einmal ausführen und die Seite neu laden.

---

## Projektstruktur

```
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
    ├── vamos_ma_ruban.conllu  ← Standard-Demo: Annotatorvergleich (UD-Schema)
    ├── ai_ma_konopka.conllu   ← Standard-Demo: zweiter Annotator
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
    └── morph/                 ← Beispiel: Morphologie + Topologische Felder
        ├── tagset.json        ← Genus / Kasus als Label-Spalten; Topologisches Feld als Dep-Layer
        ├── annotator_A.conllu
        └── annotator_B.conllu
```

### Wichtige Dateien im Überblick

| Datei | Zweck |
|-------|-------|
| `index.html` | Einstiegspunkt; definiert HTML-Struktur und Lade-Reihenfolge der Skripte |
| `labels.js` | Standard-Tagset; wird beim Start geladen und kann per Tagset-Upload ersetzt werden |
| `examples.js` | Demo-Daten als JS-Array; „Demo laden" verwendet diese Daten |
| `js/state.js` | Zentraler Zustandsspeicher; `LABEL_COLS` und `DEP_COLS` steuern die Spalten-Konfiguration |
| `js/projects.js` | Projekt-Verwaltung; Snapshot-Swap beim Tab-Wechsel; Auto-Zuweisung bei unterschiedlicher Satzzahl |
| `js/arcview.js` | SVG-Arc-Diagramm mit Drag & Drop und Zyklus-Erkennung |
| `js/export.js` | Session-Format v2 (multi-project); abwärtskompatibel zu v1 |
| `bundler.py` | Bündelt alle Ressourcen in `dist/index.html` für offline/eingebetteten Einsatz |
| `make_readme_js.py` | Wandelt `README.md` → `generated/readme_content.js` (für Hilfe-Modal) |

---

## Einschränkungen

- **Multi-Word-Tokens** (IDs mit `-` oder `.`) werden ignoriert
- Mindestens **zwei Dateien** nötig für Vergleich und Baumansicht
- Daten liegen nur im **Browser-Speicher** — Session-Export verwenden, um den Stand dauerhaft zu sichern
