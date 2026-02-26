# CoNLL-U Vergleich

Browserbasiertes Tool zum Vergleichen und Annotieren mehrerer CoNLL-U-Dateien. Läuft vollständig lokal ohne Server — einfach `index.html` im Browser öffnen.

---

## Schnellstart

1. `index.html` im Browser öffnen
2. Mindestens zwei `.conllu`-Dateien laden (Schaltfläche oder Drag & Drop)
3. Satz auswählen → Baumansicht und Vergleichstabelle erscheinen automatisch

---

## 1) Dateien laden

| Aktion | Beschreibung |
|--------|-------------|
| **Schaltfläche „Dateien hinzufügen"** | Öffnet den Datei-Dialog; mehrere Dateien gleichzeitig wählbar |
| **Drag & Drop** | Dateien direkt auf die Seite ziehen; ein Overlay erscheint als Bestätigung |
| **Löschen** | Einzelne Dateien über den „Löschen"-Button in der Dateiliste entfernen |
| **Reset** | Alle Dateien und Annotationen auf einmal zurücksetzen |

Unterstützte Formate: `.conllu`, `.conll`, `.txt`

### Textkonsistenzwarnung

Haben zwei Dateien bei gleicher Satznummer unterschiedliche Tokens, erscheint:
- Ein **⚠️-Badge** direkt neben dem Dateinamen in der Liste
- Ein oranges **Warnbanner** unterhalb der Dateiliste

---

## 2) Satz wählen

- **Dropdown** zeigt alle Sätze (Satz 1 … Satz N)
- **← / →** Buttons zum Blättern
- Rechts neben den Buttons: Satztext und Statistik-Badges
  - `X Tokens` — Anzahl der Tokens im aktuellen Satz
  - `X Diffs` — Anzahl der Tokens, die vom Gold-Stand abweichen (grün = keine Abweichungen)

---

## 3) Baumansicht

Zeigt den aktuellen Satz als Abhängigkeitsbäume. Für jede geladene Datei gibt es einen Diff-Baum gegen die Gold-Annotation.

### Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Kante in Gold und Datei **identisch** |
| ⚠️ | Kante existiert in beiden, aber **unterschiedliches Label** (`🅶Label\|🅵Label`) |
| 🅶 | Kante **nur in Gold** vorhanden |
| 🅵 | Kante **nur in dieser Datei** vorhanden |
| 🌱 | Wurzel eines Teilbaums |

Zeilen sind entsprechend **farbig** hervorgehoben (grün / gelb / orange / blau).

### Interaktion

- **Klick auf eine Zeile** → springt zur zugehörigen Zeile in der Vergleichstabelle (mit kurzer Hervorhebung)
- **„→ Gold"-Button** an jeder 🌱-Zeile (erscheint nur bei vorhandenen Unterschieden) → übernimmt den gesamten Teilbaum dieser Datei als Gold-Annotation für alle Tokens des Teilbaums

---

## 4) Vergleichstabelle

### Spalten

| Spalte | Inhalt |
|--------|--------|
| **ID** | Token-ID aus der CoNLL-U-Datei |
| **FORM** | Wortform |
| **UPOS** | Universal POS-Tag (Dropdown wenn `labels.json` `__upos__` enthält, sonst Text) |
| **XPOS** | Sprach-spezifischer POS-Tag (Dropdown wenn `labels.json` `__xpos__` enthält, sonst Text) |
| **GOLD** | Aktuelle Gold-Annotation (`HEAD / DEPREL`); Quelle als Badge: `C` = Custom, `D1`/`D2`/… = Datei |
| **Datei-Spalten** | Annotation jeder geladenen Datei; farbig: grün = gleich wie Gold, rot = abweichend |
| **Custom HEAD / DEP** | Manuelle Eingabe: Zahlfeld für HEAD, Dropdown für DEPREL |

### Gold-Auswahl

- **Klick auf eine Datei-Zelle** → wählt diese Datei als Gold-Quelle für diesen Token
- Die gewählte Zelle wird hervorgehoben (Badge `D1`, `D2`, …)
- Ist für einen Token ein **Custom-Wert** gesetzt, hat dieser **immer Vorrang** gegenüber der Datei-Auswahl; die Datei-Zellen sind dann ausgegraut

### Custom-Annotation

- **Custom-Felder** (ganz rechts): HEAD als Zahl, DEPREL als Dropdown eingeben
- Sobald ein Custom-Wert gesetzt ist, gilt dieser Token als Gold (`C`-Badge)
- **„Custom aus [Datei]"-Buttons** initialisieren alle Custom-Felder des aktuellen Satzes mit den Werten der gewählten Datei — nützlich als Ausgangsbasis zum Bearbeiten
- **„Custom Satz löschen"** entfernt alle Custom-Einträge für den aktuellen Satz (mit Bestätigungsdialog)

### Spalten ein-/ausblenden

Über die **Spalten-Toggle-Leiste** oberhalb der Tabelle lassen sich einzelne Datei-Spalten aus- und wieder einblenden (sinnvoll bei vielen Dateien).

### Zeilenmarkierung

Zeilen mit mindestens einem Unterschied zwischen den Dateien sind **rot hinterlegt** (`rowDiff`).

---

## labels.json

Im gleichen Ordner wie `index.html` kann eine `labels.json` abgelegt werden, um die Dropdown-Inhalte anzupassen.

```json
{
  "Core arguments": ["nsubj", "obj", "iobj", "csubj", "ccomp", "xcomp"],
  "Non-core dependents": ["obl", "vocative", "expl", "dislocated"],
  "Modifier words": ["advcl", "advmod", "discourse"],
  "Function Words": ["aux", "cop", "mark"],
  "Nominal dependents": ["nmod", "appos", "nummod", "acl", "amod", "det", "clf", "case"],
  "Coordination": ["conj", "cc"],
  "Other": ["fixed", "flat", "list", "parataxis", "compound", "orphan", "goeswith", "reparandum", "punct", "root", "dep"],

  "__upos__": ["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X"],

  "__xpos__": ["ADJA", "ADJD", "ADV", "NN", "NE", "VVFIN", "..."]
}
```

| Schlüssel | Beschreibung |
|-----------|-------------|
| Beliebige Strings | Gruppierter Abschnitt im DEPREL-Dropdown |
| `__upos__` | Liste für das UPOS-Dropdown (leer → Textspalte statt Dropdown) |
| `__xpos__` | Liste für das XPOS-Dropdown (leer → Textspalte statt Dropdown) |

Fehlt die Datei oder ist sie ungültig, werden die Standard-UD-Labels verwendet.

---

## Einschränkungen

- **Multi-Word-Tokens** (IDs mit `-` oder `.`) werden ignoriert
- Mindestens **zwei Dateien** müssen geladen sein, damit Vergleich und Baumansicht erscheinen
- Alle Daten liegen nur **im Browser-Speicher** — beim Neuladen der Seite gehen Custom-Annotationen und Gold-Auswahl verloren
