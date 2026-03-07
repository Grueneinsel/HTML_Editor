window.LANG_DE = {
  // Abschnitte
  'sec.files':   '1) Dateien',
  'sec.select':  '2) Satz wählen',
  'sec.tree':    '3) Baumansicht',
  'sec.compare': '4) Vergleich',
  'sec.conllu':      '5) CoNLL-U',
  'sec.conllu.view': '5) CoNLL-U',
  'sec.conllu.edit': '5) CoNLL-U bearbeiten',
  'footer.author': 'Entwickelt von Frederik Konopka',
  'tour.startBtn':     '🎓 Guided Tour',
  'conllu.structured': '📝 Strukturierter Editor',
  'conllu.goldLabel':  '⭐ Gold (dieser Satz)',
  'conllu.raw':        '📄 Rohtexteditor',
  'sec.export':  '6) Export',

  // Datei-Bereich
  'files.add':          'Dateien hinzufügen',
  'files.reset':        'Projekt zurücksetzen',
  'files.globalReset':  '↺ Alles zurücksetzen',
  'files.none':         'Keine Dateien geladen',
  'files.loaded':       '{n} Datei(en) geladen',
  'files.drop':         'Dateien hier ablegen oder Schaltfläche nutzen · .conllu / .conll / .txt',
  'files.dropOverlay':  'Dateien hier ablegen',
  'help.btnTitle':      'Hilfe / README anzeigen',
  'files.demo':    'Demo laden',
  'files.demoAll': 'Alle Projekte laden',
  'files.delete':        'Löschen',
  'files.download':      'CoNLL-U herunterladen',
  'files.moveToProject':    'In Projekt verschieben …',
  'files.moveToNewProject': '＋ Neues Projekt …',
  'files.sentences':    '{n} Sätze',
  'files.warnBadge':    'Unterschiedlicher Text!',
  'files.warnBanner':   '⚠️ Unterschiedliche Texte geladen — Vergleich möglicherweise fehlerhaft.',
  'files.resetConfirm':        'Aktuelles Projekt wirklich zurücksetzen?',
  'files.globalResetConfirm':  'Wirklich ALLE Projekte und Annotationen zurücksetzen?',

  // Satz-Auswahl
  'sent.optLabel':     'Satz {n}',
  'sent.progress':     '{done} / {total} bestätigt',
  'sent.confirm':      '✓ Bestätigen',
  'sent.confirmed':    '✓ Bestätigt',
  'sent.missing':      '(Satz fehlt in Datei 1)',
  'sent.label':        'S{cur} / {max}',
  'sent.optOk':        '· ✓',
  'sent.optDiff':      '· {n} Diff',
  'sent.optDiffs':     '· {n} Diffs',
  'sent.dotTitle':     'Satz {n}: {toks} Tokens, {diffs} Diffs',
  'sent.dotTitleConf': 'Satz {n}: {toks} Tokens, {diffs} Diffs (bestätigt)',
  'sent.clearConfirm': 'Custom für diesen Satz wirklich löschen?',

  // Spalten-Toggle
  'cols.label': 'Spalten: ',

  // Custom
  'custom.initBtn': 'Custom aus „{name}"',
  'custom.clear':   'Custom Satz löschen',

  // Legende
  'legend.label': 'Legende:',
  'legend.ok':    '✅ gleich',
  'legend.warn':  '⚠️ Label-Unterschied',
  'legend.gold':  '🅶 nur in Gold',
  'legend.file':  '🅵 nur in dieser Datei',
  'legend.root':  '🌱 Teilbaum-Wurzel',
  'legend.click': 'Klick auf Zeile → springt zur Tabellenzeile',

  // Statistiken
  'stats.token':  '{n} Token',
  'stats.tokens': '{n} Tokens',
  'stats.diff':   '{n} Diff',
  'stats.diffs':  '{n} Diffs',

  // Undo / Redo
  'undo.btn':   '↩ Undo',
  'redo.btn':   '↪ Redo',
  'undo.title': 'Rückgängig (Ctrl+Z)  —  {n} Schritt{s}',
  'redo.title': 'Wiederholen (Ctrl+Y)  —  {n} Schritt{s}',
  'undo.step':  '',
  'undo.steps': 'e',

  // Tabellen-Spalten
  'col.id':   'ID',
  'col.form': 'FORM',
  'col.upos': 'UPOS',
  'col.xpos': 'XPOS',
  'col.gold': 'GOLD',

  // Gold-Popup
  'popup.editTitle': 'Klicken zum Bearbeiten',
  'popup.head':      'HEAD',
  'popup.deprel':    'DEPREL',
  'popup.upos':      'UPOS',
  'popup.xpos':      'XPOS',
  'popup.reset':     'Zurücksetzen',
  'popup.hint':      'Tab/Shift+Tab · Enter schließt · r zurücksetzen',
  'popup.root':      '(root)',
  'popup.unset':     '(kein Kopf)',

  // Export
  'export.conllu':     'Gold CoNLL-U herunterladen',
  'export.conlluAll':  'Alle Projekte CoNLL-U',
  'export.trees':      'Baumansicht herunterladen',
  'export.treesAll':   'Alle Projekte Baumansicht',
  'export.more':       'Weitere Exporte',
  'export.conlluDesc': 'Gold CoNLL-U enthält alle Sätze mit den aktuellen Gold-Annotationen (HEAD, DEPREL, UPOS, XPOS). LEMMA / FEATS / DEPS / MISC werden aus der Quelldatei übernommen.',
  'export.mwtNote':    'Hinweis: Multi-Word-Tokens (IDs mit „-" oder „.") werden ignoriert.',

  // Session
  'session.save':      '💾 Session speichern',
  'session.load':      '📂 Session laden',
  'session.desc':      'Session speichert alle geladenen Dateien, Annotationen und den kompletten Undo-/Redo-Verlauf als JSON.',
  'session.exported':  'Exportiert: {n} Datei(en), {u} Undo-Schritte',
  'session.loaded':    'Geladen: {n} Datei(en) · {s} Sätze · {u} Undo-Schritte',
  'session.errJson':   'Ungültige JSON-Datei.',
  'session.errFormat': 'Unbekanntes Session-Format (erwartet version: 2).',
  'session.errNoDocs': 'Session enthält keine Dateien.',

  // Tastaturkürzel-Legende (Header)
  'kbd.nextDiff':     'Nächster Diff',
  'kbd.prevDiff':     'Vorheriger Diff',
  'kbd.sent':         'Satz',
  'kbd.firstLast':    'Erster/Letzter',
  'kbd.row':          'Zeile',
  'kbd.popup':        'Gold-Popup',
  'kbd.chooseDoc':    'Doc wählen',
  'kbd.loadCustom':   'Custom laden',
  'kbd.confirm':      'Bestätigen',
  'kbd.delCustom':    'Custom löschen',
  'kbd.exportConllu': 'Export CoNLL-U',
  'kbd.exportTrees':  'Export Bäume',
  'kbd.help':         'Hilfe',
  'kbd.close':        'Schließen',

  // Tagset
  'tagset.upload':    '📤 Tagset hochladen',
  'tagset.download':  '📥 Tagset herunterladen',
  'tagset.template':  '📋 Vorlage herunterladen',
  'tagset.loaded':    '{deprel} Deprel · {upos} UPOS · {xpos} XPOS geladen',
  'tagset.sectionTitle': '⚙ Tagset',
  'tagset.example':      '📄 Beispiel',
  'tagset.noLabels':     'Kein Tagset konfiguriert',
  'tagset.errJson':   'Ungültige JSON-Datei.',
  'tagset.errFormat': 'Tagset muss ein JSON-Objekt sein.',

  // Dropdown-Leerauswahl
  'label.empty': '(leer)',

  // Baumansicht
  'tree.toGold':            '→ Gold',
  'tree.toGoldTitle':       'Teilbaum ab Token {id} als Gold übernehmen',
  'tree.adoptToken':        '→',
  'tree.adoptTokenTitle':   'Dieses Token als Gold übernehmen (Token {id})',
  'tree.jumpTitle':         'Zur Zeile springen: Token {id}',
  'tree.rootJumpTitle':     'Zur Zeile springen: Token {id} (Wurzel)',
  'tree.fileDefault':       'Datei {n}',
  'tree.vsGold':            'vs Gold',
  'tree.noTree':            '(keine Bäume für diesen Satz)',

  // Export – Baumtext
  'export.treeGold':  '=== GOLD ===',
  'export.treeVsGold':'--- {name} vs Gold ---',
  'export.treeNoTree':'(keine Bäume für diesen Satz)',

  // Notiz pro Satz
  'note.label':       'Notiz:',
  'note.placeholder': 'Notiz zum Satz …',

  // Zwischenablage
  'copy.btn':  'CoNLL-U kopieren',
  'copy.done': '✓ Kopiert!',
  'kbd.copy':  'Kopieren',

  // Datei-Reihenfolge
  'files.moveUp':     'Nach oben',
  'files.moveDown':   'Nach unten',
  'files.unlockEdit': 'Datei bearbeiten (entsperren)',
  'files.lockEdit':   'Bearbeitung sperren',
  'files.applyEdit':  'Übernehmen',
  'files.cancelEdit': 'Abbrechen',

  // Autosave
  'autosave.found':   'Automatische Sicherung vom {date} gefunden.',
  'autosave.restore': 'Wiederherstellen',
  'autosave.dismiss': 'Verwerfen',
  'autosave.saved':   'Autosave gespeichert',

  // Projekte
  'project.new':           'Neues Projekt',
  'project.default':       'Projekt',
  'project.namePrompt':    'Projektname:',
  'project.deleteConfirm': 'Projekt „{name}" wirklich löschen?',
  'project.autoCreated':   'Neues Projekt „{name}" automatisch erstellt.',
  'project.autoCreatedN':  '{n} neue Projekte automatisch erstellt.',
  'project.rename':        'Projekt umbenennen',
  'project.renameHint':    '✎ klicken zum Umbenennen',
  'project.moveLeft':      'Nach links verschieben',
  'project.moveRight':     'Nach rechts verschieben',

  // Zeilen-Markierung (Flags)
  'flag.toggle':     'Zeile markieren / Markierung aufheben',
  'flag.sentDot':    'Satz {n}: hat Markierungen',
  'flag.sentOpt':    ' ⚑',
  'kbd.flagNext':    'Nächste Markierung',
  'kbd.project':     'Projekt wechseln',
  'kbd.flagPrev':    'Vorherige Markierung',

  // Hilfe
  'help.title':       'Hilfe',
  'help.unavailable': 'Hilfe nicht verfügbar.',
  'help.runScript':   'Bitte python make_readme_js.py ausführen und die Seite neu laden.',
  'help.hintTitle':   'Diesen Abschnitt in der Hilfe öffnen',

  // Text-to-Speech
  'tts.speak':        '🔊 Vorlesen',
  'tts.stop':         '⏹ Stoppen',
  'tts.noSupport':    'TTS wird vom Browser nicht unterstützt.',
  'kbd.tts':          'Vorlesen',

  // Auto-weiter
  'sent.autoAdvance': 'Auto-weiter',

  // Massenoperationen
  'sent.bulkTitle':   'Massenaktionen',
  'sent.confirmAll':  '✓ Alle ohne Diffs bestätigen',
  'sent.flagDiffs':   '⚑ Alle Diffs markieren',
  'sent.unflagAll':   '⚑ Markierungen löschen',

  // Plain CoNLL-U Ansicht
  'plain.toggle':     '📄 Rohdaten',
  'plain.toggleOff':  '📄 Rohdaten ausblenden',

  // Projektmodus
  'project.statusView': '📄 Datei-Bearbeitung aus',
  'project.statusEdit': '✏ Datei-Bearbeitung ein',
  'project.btnEdit':    'Datei-Bearbeitung einschalten',
  'project.btnView':    'Datei-Bearbeitung ausschalten',

  // Satzverwaltung
  'sent.editSentSave':   '✓ Übernehmen',
  'sent.editSentCancel': '✕ Zurücksetzen',
  'sent.addSentBtn':     '➕ Satz einfügen',
  'sent.addSentPrompt':  'Satztext (optional):',
  'sent.delSentBtn':     '🗑 Satz löschen',
  'sent.delSentConfirm': 'Aktuellen Satz wirklich löschen?',

  // Dev mode
  'devMode.label':    '🔄 Dev-Modus: Auto-Reload bei Neubundle',
  'devMode.on':       'aktiv',
  'devMode.off':      'inaktiv',
  'devMode.reloaded': 'Neu geladen um',

  // Toast-Meldungen
  'bulk.confirmedN':    '✓ {n} Sätze bestätigt',
  'bulk.confirmedNone': 'Alle Sätze bereits bestätigt',
  'bulk.flaggedN':      '⚑ {n} Sätze markiert',
  'bulk.flaggedNone':   'Keine Sätze mit Diffs',
  'bulk.unflagged':     'Alle Markierungen entfernt',
  'token.inserted':     'Token eingefügt',
  'token.deleted':      'Token gelöscht',
  'files.resetDone':        '↺ Projekt zurückgesetzt',
  'files.globalResetDone':  '↺ Alles zurückgesetzt',
  'arc.cycle':          '⚠ Kreisreferenz — nicht erlaubt',
  'session.loadedToast': '✓ Session geladen: {n} Datei(en)',
};
