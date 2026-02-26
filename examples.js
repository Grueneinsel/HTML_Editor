// Beispieldateien für die Demo-Funktion.
// Drei CoNLL-U Dateien, drei Sätze — decken alle Vergleichsfälle ab:
//
//  ✅  HEAD + DEPREL + UPOS + XPOS identisch in allen Dateien
//  ⚠️  gleicher HEAD, unterschiedliches DEPREL
//  🅶/🅵 unterschiedlicher HEAD → Kante wechselt Elternknoten
//  UPOS-Unterschied  → goldene Spalte hervorgehoben, → Gold-Button im Baum
//  XPOS-Unterschied  → wie UPOS, aber XPOS-Spalte
//  UPOS+XPOS-Unterschied gleichzeitig
//  DEPREL+UPOS-Unterschied gleichzeitig
//  Satz ohne jede Abweichung (Datei 2, S3) → Diff-Block im Export übersprungen

const EXAMPLES = [
  // ── Datei 1: Referenzannotation ──────────────────────────────────────────
  {
    name: "datei1_referenz.conllu",
    content: [
      "# text = Der Hund beißt den Mann .",
      "1\tDer\tder\tDET\tART\t_\t3\tdet\t_\t_",
      "2\tHund\tHund\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tbeißt\tbeißen\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "4\tden\tder\tDET\tART\t_\t5\tdet\t_\t_",
      "5\tMann\tMann\tNOUN\tNN\t_\t3\tobj\t_\t_",
      "6\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",
      "",
      "# text = Sie lächelt immer .",
      "1\tSie\tsie\tPRON\tPPER\t_\t2\tnsubj\t_\t_",
      "2\tlächelt\tlächeln\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "3\timmer\timmer\tADV\tADV\t_\t2\tadvmod\t_\t_",
      "4\t.\t.\tPUNCT\t$.\t_\t2\tpunct\t_\t_",
      "",
      "# text = Das Wetter ist schön .",
      "1\tDas\tder\tDET\tART\t_\t2\tdet\t_\t_",
      "2\tWetter\tWetter\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tist\tsein\tAUX\tVAFIN\t_\t0\troot\t_\t_",
      "4\tschön\tschön\tADJ\tADJD\t_\t3\tamod\t_\t_",
      "5\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",
      "",
    ].join("\n"),
  },

  // ── Datei 2: DEPREL-Abweichungen + UPOS-Abweichungen ────────────────────
  // S1: Token 1 UPOS DET→PRON               (UPOS-Diff)
  //     Token 2 deprel nsubj→subj            (DEPREL-Diff ⚠️)
  //     Token 5 deprel obj→dobj + UPOS NOUN→PROPN  (DEPREL+UPOS-Diff)
  // S2: Token 3 deprel advmod→mod            (DEPREL-Diff ⚠️)
  //     Token 4 UPOS PUNCT→PUNC              (UPOS-Diff)
  // S3: identisch zu Datei 1 → kein Diff-Block im Export
  {
    name: "datei2_deprel_upos.conllu",
    content: [
      "# text = Der Hund beißt den Mann .",
      "1\tDer\tder\tPRON\tART\t_\t3\tdet\t_\t_",     // UPOS DET→PRON
      "2\tHund\tHund\tNOUN\tNN\t_\t3\tsubj\t_\t_",    // deprel nsubj→subj ⚠️
      "3\tbeißt\tbeißen\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "4\tden\tder\tDET\tART\t_\t5\tdet\t_\t_",
      "5\tMann\tMann\tPROPN\tNN\t_\t3\tdobj\t_\t_",   // deprel obj→dobj + UPOS NOUN→PROPN
      "6\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",
      "",
      "# text = Sie lächelt immer .",
      "1\tSie\tsie\tPRON\tPPER\t_\t2\tnsubj\t_\t_",
      "2\tlächelt\tlächeln\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "3\timmer\timmer\tADV\tADV\t_\t2\tmod\t_\t_",   // deprel advmod→mod ⚠️
      "4\t.\t.\tPUNC\t$.\t_\t2\tpunct\t_\t_",         // UPOS PUNCT→PUNC
      "",
      "# text = Das Wetter ist schön .",
      "1\tDas\tder\tDET\tART\t_\t2\tdet\t_\t_",
      "2\tWetter\tWetter\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tist\tsein\tAUX\tVAFIN\t_\t0\troot\t_\t_",
      "4\tschön\tschön\tADJ\tADJD\t_\t3\tamod\t_\t_",
      "5\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",        // S3 identisch ✅
      "",
    ].join("\n"),
  },

  // ── Datei 3: HEAD-Abweichungen + XPOS-Abweichungen ──────────────────────
  // S1: Token 1 head 3→2                    (HEAD-Diff → 🅶/🅵 im Baum)
  //     Token 6 XPOS $.→BEL                 (XPOS-Diff)
  // S2: Token 2 XPOS VVFIN→VVPS             (XPOS-Diff)
  //     Token 3 head 2→1                    (HEAD-Diff → 🅶/🅵 im Baum)
  // S3: Token 4 UPOS ADJ→ADV + XPOS ADJD→ADV  (UPOS+XPOS-Diff gleichzeitig)
  {
    name: "datei3_head_xpos.conllu",
    content: [
      "# text = Der Hund beißt den Mann .",
      "1\tDer\tder\tDET\tART\t_\t2\tdet\t_\t_",       // head 3→2  🅶/🅵
      "2\tHund\tHund\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tbeißt\tbeißen\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "4\tden\tder\tDET\tART\t_\t5\tdet\t_\t_",
      "5\tMann\tMann\tNOUN\tNN\t_\t3\tobj\t_\t_",
      "6\t.\t.\tPUNCT\tBEL\t_\t3\tpunct\t_\t_",        // XPOS $.→BEL
      "",
      "# text = Sie lächelt immer .",
      "1\tSie\tsie\tPRON\tPPER\t_\t2\tnsubj\t_\t_",
      "2\tlächelt\tlächeln\tVERB\tVVPS\t_\t0\troot\t_\t_",  // XPOS VVFIN→VVPS
      "3\timmer\timmer\tADV\tADV\t_\t1\tadvmod\t_\t_", // head 2→1  🅶/🅵
      "4\t.\t.\tPUNCT\t$.\t_\t2\tpunct\t_\t_",
      "",
      "# text = Das Wetter ist schön .",
      "1\tDas\tder\tDET\tART\t_\t2\tdet\t_\t_",
      "2\tWetter\tWetter\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tist\tsein\tAUX\tVAFIN\t_\t0\troot\t_\t_",
      "4\tschön\tschön\tADV\tADV\t_\t3\tamod\t_\t_",   // UPOS ADJ→ADV + XPOS ADJD→ADV
      "5\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",
      "",
    ].join("\n"),
  },
];
