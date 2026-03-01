window.LANG_EN = {
  // Sections
  'sec.files':   '1) Files',
  'sec.select':  '2) Select Sentence',
  'sec.tree':    '3) Tree View',
  'sec.compare': '4) Comparison',
  'sec.export':  '5) Export',

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
  'export.conlluAll':  'Download all projects CoNLL-U',
  'export.trees':      'Download tree view (all sentences)',
  'export.treesAll':   'Download all projects tree view',
  'export.conlluDesc': 'Gold CoNLL-U contains all sentences with current Gold annotations (HEAD, DEPREL, UPOS, XPOS). LEMMA / FEATS / DEPS / MISC are taken from the source file.',
  'export.mwtNote':    'Note: Multi-word tokens (IDs with "-" or ".") are ignored.',

  // Tagset
  'tagset.upload':    '📤 Upload tagset',
  'tagset.download':  '📥 Download tagset',
  'tagset.loaded':    '{deprel} deprels · {upos} UPOS · {xpos} XPOS loaded',
  'tagset.errJson':   'Invalid JSON file.',
  'tagset.errFormat': 'Tagset must be a JSON object.',

  // Session
  'session.save':      '💾 Save session',
  'session.load':      '📂 Load session',
  'session.desc':      'Session saves all loaded files, annotations, and the complete undo/redo history as JSON.',
  'session.exported':  'Exported: {n} file(s), {u} undo steps',
  'session.loaded':    'Loaded: {n} file(s) · {s} sentences · {u} undo steps',
  'session.errJson':   'Invalid JSON file.',
  'session.errFormat': 'Unknown session format (version ≠ 1).',
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

  // Clipboard
  'copy.btn':  'Copy CoNLL-U',
  'copy.done': '✓ Copied!',
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
  'kbd.flagPrev':    'Previous flag',

  // Help
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
  'sent.editSentBtn':    '✎ Edit CoNLL-U',
  'sent.editSentSave':   '✓ Apply',
  'sent.editSentCancel': '✕ Cancel',
  'sent.addSentBtn':     '➕ Insert sentence',
  'sent.addSentPrompt':  'Sentence text (optional):',
  'sent.delSentBtn':     '🗑 Delete sentence',
  'sent.delSentConfirm': 'Really delete this sentence?',

  // Dev mode
  'devMode.label':    '🔄 Dev mode: Auto-reload on rebuild',
  'devMode.on':       'active',
  'devMode.off':      'inactive',
  'devMode.reloaded': 'Reloaded at',
};
