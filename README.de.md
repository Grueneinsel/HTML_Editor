# Arbonotate

> **Arbonotate** = *Arbor* (lateinisch: Baum) + *annotate* (annotieren) — eine browserbasierte Arbeitsumgebung zum Annotieren und Vergleichen von Abhängigkeitsbäumen.

**GitHub:** [github.com/Grueneinsel/Arbonotate](https://github.com/Grueneinsel/Arbonotate) · **Aktueller Release:** [dist/index.html herunterladen](https://github.com/Grueneinsel/Arbonotate/releases/latest)

Browserbasiertes Tool zum Vergleichen und Annotieren von Abhängigkeitsbäumen in CoNLL-U-Dateien.
Läuft vollständig lokal ohne Server — einfach `index.html` im Browser öffnen.

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
| **Tagset-Konfiguration** | Eigene DEPREL-Listen, UPOS/XPOS-Werte und Dependency-Layer per `labels.js` oder JSON |
| **Export** | Gold CoNLL-U und Baumansicht (alle Sätze) herunterladen |
| **Guided Tour** | Interaktive Einführung mit Spotlight und Tooltips anhand des englischen Beispiels |
| **Tastaturkürzel** | Vollständige Bedienung ohne Maus |
| **Mehrsprachig** | Deutsch / Englisch; weitere Sprachen per `lang/xx.js` |
| **Tablet-Unterstützung** | Touch-optimiert; Pfeile ziehbar, vergrößerte Tap-Ziele |

---

## Schnellstart

1. `index.html` im Browser öffnen — letzte Session wird automatisch geladen
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

Der **⬇-Button** neben jeder Datei lädt den Original-Inhalt der Datei als `.conllu` herunter.

### Aktives Projekt

| Button | Inhalt |
|--------|--------|
| **Gold CoNLL-U herunterladen** | Alle Sätze des aktiven Projekts mit aktuellen Gold-Annotationen (HEAD, DEPREL, UPOS, XPOS); LEMMA/FEATS/DEPS/MISC aus Quelldatei |
| **Baumansicht (alle Sätze) herunterladen** | Alle Sätze als Text-Bäume mit Gold-Baum und Diff-Bäumen pro Datei |

### Alle Projekte

| Button | Inhalt |
|--------|--------|
| **Alle Projekte CoNLL-U herunterladen** | Exportiert Gold-CoNLL-U für jedes Projekt als separate Datei (`gold_Projektname.conllu`) |
| **Alle Projekte Baumansicht herunterladen** | Exportiert Baumansichten für jedes Projekt als separate Datei |

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

Das Session-Format ist versioniert (`version: 2`) und als JSON lesbar.

### Autosave

Der Arbeitsstand wird alle **30 Sekunden** automatisch im Browser-LocalStorage gesichert. Beim nächsten Öffnen der Seite wird der letzte Stand **automatisch und lautlos wiederhergestellt** — ohne Rückfrage.

---

## Undo / Redo

Alle Annotationsänderungen (Datei-Auswahl, Custom-Popup, Bestätigen, Teilbaum-Übernahme) sind rückgängig machbar. Jedes Projekt hat seinen eigenen Undo-Stack.

| Aktion | Beschreibung |
|--------|-------------|
| **↩ Undo** / `Ctrl+Z` | Letzte Änderung rückgängig |
| **↪ Redo** / `Ctrl+Y` | Rückgängige Änderung wiederherstellen |

Der Verlauf wird in der Session mitgespeichert (bis zu 80 Schritte pro Projekt).

---

## Guided Tour

Der **🎓 Guided Tour**-Button oben rechts startet eine interaktive Einführung in alle Funktionen des Tools.

- Die Tour öffnet das englische Beispielprojekt automatisch in einem **temporären Projekt** — eigene Daten bleiben vollständig erhalten
- Spotlight und Tooltip führen Schritt für Schritt durch alle 16 Stationen: Projekte, Dateien, Satznavigation, Baumansicht, Vergleichstabelle, Gold-Annotation, Bearbeitungsmodus, CoNLL-U-Editor, Export
- Beenden mit **„Tour abbrechen"**, `Esc` oder dem „Fertig"-Button — das Tour-Projekt wird danach automatisch entfernt

---

## Tastaturkürzel

| Taste | Funktion |
|-------|----------|
| `←` / `→` | Vorheriger / nächster Satz |
| `Ctrl+←` / `Ctrl+→` | Erster / letzter Satz |
| `n` / `N` | Nächster / vorheriger Satz mit Diffs |
| `f` / `F` | Nächste / vorherige markierte Stelle (`⚑`) |
| `[` / `]` | Vorheriges / nächstes Projekt |
| `↑` / `↓` | Tabellenzeile navigieren |
| `Enter` | Gold-Popup für fokussierte Zeile öffnen |
| `Space` | Satz bestätigen / Bestätigung aufheben |
| `1`–`9` | Datei N als Gold-Quelle für fokussierte Zeile wählen |
| `Ctrl+1`–`9` | Custom aus Datei N laden |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Del` / `Backspace` | Custom des aktuellen Satzes löschen |
| `c` | Aktuellen Satz als CoNLL-U in Zwischenablage kopieren |
| `e` | Gold CoNLL-U exportieren |
| `E` (Shift+e) | Baumansicht exportieren |
| `r` | Aktuellen Satz vorlesen (TTS) |
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

### Intern bearbeiten

Schaltfläche **„✏ Tagset bearbeiten"** öffnet den eingebauten Editor — kein externes JSON nötig:

- **Label-Spalten** (UPOS / XPOS / …): anlegen, umbenennen, löschen; Werte einzeilig eingeben
- **Dependency-Spalten**: Gruppen mit Namen und eine Relation pro Zeile
- Klassisches Format (`__upos__`, `__xpos__`, Gruppen als Top-Level-Keys) wird beim Öffnen automatisch konvertiert
- Validierung verhindert leere oder doppelte Spalten-Schlüssel
- Änderungen werden sofort nach „Übernehmen" aktiv

---

## Hilfe-Modal

Der **`?`-Button** oben rechts (oder Taste `?`) öffnet diese Dokumentation direkt im Browser.

Die Hilfe wird aus `generated/readme_content.js` geladen — einem vorgefertigten JS-Bundle:

```bash
python make_readme_js.py
```

Das Skript liest `README.md` (Englisch, primär) und `README.de.md` (Deutsch) und schreibt `generated/readme_content.js`. Nach Änderungen an einer README einmal ausführen und die Seite neu laden.

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
| `js/export.js` | Session-Format v2 (multi-project); Import/Export, Autosave |
| `bundler.py` | Bündelt alle Ressourcen in `dist/index.html` für offline/eingebetteten Einsatz |
| `make_readme_js.py` | Wandelt `README.md` (EN) + `README.de.md` (DE) → `generated/readme_content.js` (für Hilfe-Modal) |

---

## Demo-Daten (`testdata/`)

Die sechs Beispielverzeichnisse decken gemeinsam alle Funktionen des Tools ab:

| Verzeichnis | Sprache | Annotatorinnen | Besondere Features |
|---|---|---|---|
| `ner/` | Deutsch | 2 | **Drei Label-Spalten** (UPOS + XPOS + NER-BIO); `__cols__` mit 3 Einträgen |
| `srl/` | Deutsch | 2 | **Zwei Dep-Schichten** (UD DepRel + Semantic Role); `__dep_cols__` mit 2 Einträgen |
| `custom/` | Deutsch | 2 | **Vollständig eigenes Schema**: 3 Label-Spalten (Wortart / Belebtheit / Sentiment) + vereinfachte Syntax |
| `morph/` | Deutsch | 2 | **Morphologie**: Genus/Kasus als Label-Spalten; Topologisches Feld als Dep-Schicht |
| `de_ud/` | Deutsch | **3** | **Multi-Word-Token** (`im` = `in` + `dem`); UPOS + STTS; 3 Annotatorinnen mit typischen Uneinigkeiten |
| `en_ud/` | Englisch | 2 | **Empty Node** (VP-Ellipse / Gapping); UPOS + PTB POS; englischsprachige Sätze |

### Features-Übersicht

| Feature | wo demonstriert |
|---|---|
| Mehrere Annotatorinnen (≥ 3) | `de_ud/` |
| Multi-Word-Token (MWT, ID `N-M`) | `de_ud/` |
| Empty Nodes (ID `N.M`) | `en_ud/` |
| Kommentar-Zeilen (`# sent_id`, `# annotator` …) | alle Verzeichnisse |
| `__cols__` (N beliebige Label-Spalten) | `ner/`, `custom/`, `morph/`, `de_ud/`, `en_ud/` |
| `__dep_cols__` (N Dep-Schichten) | `srl/`, `morph/`, `de_ud/`, `en_ud/` |
| Projekt-spezifisches Tagset | alle Verzeichnisse mit `tagset.json` |
| Auto-Projekt-Zuweisung (unterschiedl. Satzzahlen) | Dateien aus verschiedenen Verzeichnissen mischen |

### Laden der Demos

1. **Tagset zuerst**: `tagset.json` aus einem Verzeichnis per „📤 Tagset hochladen" oder Drag & Drop laden
2. **Dann die CoNLL-U-Dateien**: alle `annotator_*.conllu` aus dem gleichen Verzeichnis per „Dateien hinzufügen"
3. Alternativ: **alle Dateien gleichzeitig** per Drag & Drop — das Tool erkennt Typ und Reihenfolge automatisch

---

## Einschränkungen

- **Multi-Word-Token** (IDs `N-M`) und **Empty Nodes** (IDs `N.M`) werden beim Laden gespeichert und beim CoNLL-U-Export vollständig rekonstruiert; in der Vergleichstabelle und Baumansicht erscheinen nur die regulären Token
- Mindestens **zwei Dateien** nötig für Vergleich und Baumansicht
- Daten liegen nur im **Browser-Speicher** — Session-Export verwenden, um den Stand dauerhaft zu sichern

---

## Impressum

**Frederik Konopka**
✉️ [arbonotate@frederik-konopka.de](mailto:arbonotate@frederik-konopka.de)
🐙 [github.com/Grueneinsel/Arbonotate](https://github.com/Grueneinsel/Arbonotate)

Arbonotate ist ein nicht-kommerzielles, quelloffenes Forschungstool. Es werden keine Nutzerdaten erhoben oder übertragen.
