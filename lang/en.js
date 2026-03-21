window.LANG_EN = {
  // Sections
  'sec.files':   '1) Files',
  'sec.select':  '2) Select Sentence',
  'sec.tree':    '3) Tree View',
  'sec.compare': '4) Comparison',
  'sec.conllu':      '5) CoNLL-U',
  'sec.conllu.view': '5) CoNLL-U',
  'sec.conllu.edit': '5) Edit CoNLL-U',
  'footer.build':  'Build',
  'footer.author': 'Developed by Frederik Konopka',
  'footer.impressum': 'Legal Notice',
  'tour.startBtn':     '🎓 Guided Tour',
  'conllu.structured': '📝 Structured Editor',
  'conllu.goldLabel':  '⭐ Gold (this sentence)',
  'conllu.raw':        '📄 Raw Text Editor',
  'sec.export':  '6) Export',

  // File section
  'files.add':          'Add files',
  'files.reset':        'Reset project',
  'files.globalReset':  '↺ Reset all',
  'files.none':         'No files loaded',
  'files.loaded':       '{n} file(s) loaded',
  'files.drop':         'Drop files here or use the button · .conllu / .conll / .txt',
  'files.dropOverlay':  'Drop files here',
  'help.btnTitle':      'Help / show README',
  'files.demo':    'Load demo',
  'files.demoAll': 'Load all projects',
  'files.delete':        'Remove',
  'files.download':      'Download CoNLL-U',
  'files.moveToProject':    'Move to project …',
  'files.moveToNewProject': '＋ New project …',
  'files.sentences':    '{n} sentences',
  'files.warnBadge':    'Different text!',
  'files.warnBanner':   '⚠️ Different texts loaded — comparison may be inaccurate.',
  'files.resetConfirm':       'Really reset the current project?',
  'files.globalResetConfirm': 'Really reset ALL projects and annotations?',

  // Sentence select
  'nav.prev':          'Previous sentence',
  'nav.next':          'Next sentence',
  'nav.sentSelect':    'Select sentence',
  'sent.optLabel':     'Sentence {n}',
  'sent.progress':     '{done} / {total} confirmed',
  'sent.confirm':      '✓ Confirm',
  'sent.confirmed':    '✓ Confirmed',
  'sent.missing':      '(Sentence missing in file 1)',
  'sent.label':        'S{cur} / {max}',
  'sent.optOk':        '· ✓',
  'sent.optDiff':      '· {n} diff',
  'sent.optDiffs':     '· {n} diffs',
  'sent.dotTitle':     'Sentence {n}: {toks} tokens, {diffs} diffs',
  'sent.dotTitleConf': 'Sentence {n}: {toks} tokens, {diffs} diffs (confirmed)',
  'sent.clearConfirm': 'Really delete custom annotations for this sentence?',

  // Columns toggle
  'cols.label': 'Columns: ',

  // Custom
  'custom.initBtn': 'Custom from "{name}"',
  'custom.clear':   'Clear custom sentence',

  // Legend
  'legend.label': 'Legend:',
  'legend.ok':    '✅ identical',
  'legend.warn':  '⚠️ label difference',
  'legend.gold':  '🅶 gold only',
  'legend.file':  '🅵 this file only',
  'legend.root':  '🌱 subtree root',
  'legend.click': 'Click row → jump to table row',

  // Stats
  'stats.token':  '{n} token',
  'stats.tokens': '{n} tokens',
  'stats.diff':   '{n} diff',
  'stats.diffs':  '{n} diffs',

  // Undo / Redo
  'undo.btn':   '↩ Undo',
  'redo.btn':   '↪ Redo',
  'undo.title': 'Undo (Ctrl+Z)  —  {n} step{s}',
  'redo.title': 'Redo (Ctrl+Y)  —  {n} step{s}',
  'undo.step':  '',
  'undo.steps': 's',

  // Table columns
  'col.id':   'ID',
  'col.form': 'FORM',
  'col.upos': 'UPOS',
  'col.xpos': 'XPOS',
  'col.gold': 'GOLD',

  // Gold popup
  'popup.editTitle': 'Click to edit',
  'popup.head':      'HEAD',
  'popup.deprel':    'DEPREL',
  'popup.upos':      'UPOS',
  'popup.xpos':      'XPOS',
  'popup.reset':     'Reset',
  'popup.hint':      'Tab/Shift+Tab · Enter closes · r reset',
  'popup.root':      '(root)',
  'popup.unset':     '(no head)',

  // Export
  'export.conllu':     'Download Gold CoNLL-U',
  'export.conlluAll':  'All projects CoNLL-U',
  'export.trees':      'Download tree view',
  'export.treesAll':   'All projects tree view',
  'export.more':       'More exports',
  'export.conlluDesc': 'Gold CoNLL-U contains all sentences with current Gold annotations (HEAD, DEPREL, UPOS, XPOS). LEMMA / FEATS / DEPS / MISC are taken from the source file.',
  'export.mwtNote':    'Note: Multi-word tokens (IDs with "-" or ".") are ignored.',

  // Tagset
  'tagset.upload':       '📤 Upload tagset',
  'tagset.download':     '📥 Download tagset',
  'tagset.template':     '📋 Download template',
  'tagset.loaded':       '{deprel} deprels · {upos} UPOS · {xpos} XPOS loaded',
  'tagset.loadedToast':  '✓ Tagset loaded ({n} tags, {d} deprels)',
  'tagset.usedTooltip':  '✓ Used in project',
  'tagset.sectionTitle': '⚙ Tagset',
  'tagset.example':      '📄 Example',
  'tagset.noLabels':     'No tagset configured',
  'tagset.errJson':   'Invalid JSON file.',
  'tagset.errFormat': 'Tagset must be a JSON object.',
  'tagset.mapTitle':    'Tagset assignment',
  'tagset.mapQuestion': 'Which column should the tags be assigned to?',
  'tagset.mapCancel':   'Cancel',
  'tagset.edit':        '✏ Edit tagset',
  'tagset.editTitle':   'Edit Tagset',
  'tagset.labelCols':   'Label columns (UPOS / XPOS / …)',
  'tagset.depCols':     'Dependency relation columns',
  'tagset.addLabelCol': '+ Add label column',
  'tagset.addDepCol':   '+ Add dep column',
  'tagset.addGroup':    '+ Add group',
  'tagset.removeCol':   'Remove column',
  'tagset.removeGroup': 'Remove group',
  'tagset.colKey':      'Key',
  'tagset.colName':     'Name',
  'tagset.values':      'Values (one per line)',
  'tagset.groupName':   'Group name',
  'tagset.editSave':    'Apply',

  // Session
  'session.save':      '💾 Save session',
  'session.load':      '📂 Load session',
  'session.desc':      'Session saves all loaded files, annotations, and the complete undo/redo history as JSON.',
  'session.exported':  'Exported: {n} file(s), {u} undo steps',
  'session.loaded':    'Loaded: {n} file(s) · {s} sentences · {u} undo steps',
  'session.errJson':   'Invalid JSON file.',
  'session.errFormat': 'Unknown session format (expected version: 2).',
  'session.errNoDocs': 'Session contains no files.',

  // Keyboard shortcut legend (header)
  'kbd.nextDiff':     'Next diff',
  'kbd.prevDiff':     'Previous diff',
  'kbd.sent':         'Sentence',
  'kbd.firstLast':    'First/Last',
  'kbd.row':          'Row',
  'kbd.popup':        'Gold popup',
  'kbd.chooseDoc':    'Choose doc',
  'kbd.loadCustom':   'Load custom',
  'kbd.confirm':      'Confirm',
  'kbd.delCustom':    'Delete custom',
  'kbd.exportConllu': 'Export CoNLL-U',
  'kbd.exportTrees':  'Export trees',
  'kbd.help':         'Help',
  'kbd.close':        'Close',

  // Dropdown empty option
  'label.empty': '(empty)',

  // Tree view
  'tree.toGold':           '→ Gold',
  'tree.toGoldTitle':      'Adopt subtree from token {id} as Gold',
  'tree.adoptToken':       '→',
  'tree.adoptTokenTitle':  'Adopt this token as Gold (token {id})',
  'tree.jumpTitle':        'Jump to row: token {id}',
  'tree.rootJumpTitle':    'Jump to row: token {id} (root)',
  'tree.fileDefault':      'File {n}',
  'tree.vsGold':           'vs Gold',
  'tree.noTree':           '(no trees for this sentence)',

  // Export – tree text
  'export.treeGold':   '=== GOLD ===',
  'export.treeVsGold': '--- {name} vs Gold ---',
  'export.treeNoTree': '(no trees for this sentence)',

  // Note per sentence
  'note.label':       'Note:',
  'note.placeholder': 'Note for this sentence …',
  'note.indicator':   'This sentence has a note',

  // Clipboard
  'copy.btn':  'Copy Gold CoNLL-U',
  'copy.done': '✓ Gold CoNLL-U copied!',
  'copy.err':  'Copy failed',
  'kbd.copy':  'Copy',

  // File order
  'files.moveUp':     'Move up',
  'files.moveDown':   'Move down',
  'files.unlockEdit': 'Edit file (unlock)',
  'files.lockEdit':   'Lock file',
  'files.applyEdit':  'Apply',
  'files.cancelEdit': 'Cancel',

  // Autosave
  'autosave.found':   'Auto-save from {date} found.',
  'autosave.restore': 'Restore',
  'autosave.dismiss': 'Dismiss',
  'autosave.saved':   'Autosave stored',

  // Projects
  'project.badgeTitle':    '{done} of {total} sentences confirmed',
  'project.new':           'New project',
  'project.default':       'Project',
  'project.namePrompt':    'Project name:',
  'project.deleteConfirm': 'Really delete project "{name}"?',
  'project.autoCreated':   'New project "{name}" created automatically.',
  'project.autoCreatedN':  '{n} new projects created automatically.',
  'project.rename':        'Rename project',
  'project.renameHint':    'Click ✎ to rename',
  'project.moveLeft':      'Move left',
  'project.moveRight':     'Move right',

  // Row flags
  'flag.toggle':     'Flag / unflag row',
  'flag.sentDot':    'Sentence {n}: has flags',
  'flag.sentOpt':    ' ⚑',
  'kbd.flagNext':    'Next flag',
  'kbd.project':     'Switch project',
  'kbd.flagPrev':    'Previous flag',

  // Help
  'help.title':       'Help',
  'help.unavailable': 'Help not available.',
  'help.runScript':   'Please run python make_readme_js.py and reload the page.',
  'help.hintTitle':   'Open this section in help',

  // Text-to-Speech
  'tts.speak':        '🔊 Read aloud',
  'tts.stop':         '⏹ Stop',
  'tts.noSupport':    'TTS not supported by this browser.',
  'kbd.tts':          'Read aloud',

  // Auto-advance
  'sent.autoAdvance': 'Auto-advance',

  // Bulk actions
  'sent.bulkTitle':   'Bulk actions',
  'sent.confirmAll':  '✓ Confirm all without diffs',
  'sent.flagDiffs':   '⚑ Flag all with diffs',
  'sent.unflagAll':   '⚑ Clear flags',

  // Plain CoNLL-U view
  'plain.toggle':     '📄 Raw data',
  'plain.toggleOff':  '📄 Hide raw data',

  // Project mode
  'project.statusView': '📄 File editing off',
  'project.statusEdit': '✏ File editing on',
  'project.btnEdit':    'Enable file editing',
  'project.btnView':    'Disable file editing',

  // Sentence management
  'sent.editSentSave':   '✓ Apply',
  'sent.editSentCancel': '✕ Reset',
  'sent.addSentBtn':     '➕ Insert sentence',
  'sent.addSentPrompt':  'Sentence text (optional):',
  'sent.delSentBtn':     '🗑 Delete sentence',
  'sent.delSentConfirm': 'Really delete this sentence?',

  // Dev mode
  'devMode.label':    '🔄 Dev mode: Auto-reload on rebuild',
  'devMode.on':       'active',
  'devMode.off':      'inactive',
  'devMode.reloaded': 'Reloaded at',

  // Toast messages
  'bulk.confirmedN':    '✓ {n} sentences confirmed',
  'bulk.confirmedNone': 'All sentences already confirmed',
  'bulk.flaggedN':      '⚑ {n} sentences flagged',
  'bulk.flaggedNone':   'No sentences with diffs',
  'bulk.unflagged':     'All flags removed',
  'token.inserted':     'Token inserted',
  'token.deleted':      'Token deleted',
  'files.resetDone':        '↺ Project reset',
  'files.globalResetDone':  '↺ All projects reset',
  'arc.cycle':          '⚠ Cycle detected — not allowed',
  'session.loadedToast': '✓ Session loaded: {n} file(s)',
};
