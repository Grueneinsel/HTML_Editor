// Beispieldateien für die Demo-Funktion
// Drei CoNLL-U Dateien, die alle möglichen Vergleichsfälle abdecken:
//   ✅  HEAD + DEPREL identisch in allen Dateien
//   ⚠️  gleicher HEAD, aber unterschiedliches DEPREL
//   🅶/🅵 unterschiedlicher HEAD → Kante nur in Gold bzw. nur in Datei
//   UPOS/XPOS-Unterschied → „→ Gold"-Button im Baum
//   Satz ohne jede Abweichung → Diff-Block wird übersprungen

const EXAMPLES = [
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
  {
    // Abweichungen: DEPREL bei Token 2 und 5 in S1, Token 3 in S2.
    // S3 identisch → Diff-Block wird im Export übersprungen (⚠️-only-Datei)
    name: "datei2_deprel_abweichungen.conllu",
    content: [
      "# text = Der Hund beißt den Mann .",
      "1\tDer\tder\tDET\tART\t_\t3\tdet\t_\t_",
      "2\tHund\tHund\tNOUN\tNN\t_\t3\tsubj\t_\t_",      // nsubj → subj  ⚠️
      "3\tbeißt\tbeißen\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "4\tden\tder\tDET\tART\t_\t5\tdet\t_\t_",
      "5\tMann\tMann\tNOUN\tNN\t_\t3\tdobj\t_\t_",       // obj → dobj    ⚠️
      "6\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",
      "",
      "# text = Sie lächelt immer .",
      "1\tSie\tsie\tPRON\tPPER\t_\t2\tnsubj\t_\t_",
      "2\tlächelt\tlächeln\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "3\timmer\timmer\tADV\tADV\t_\t2\tmod\t_\t_",      // advmod → mod  ⚠️
      "4\t.\t.\tPUNCT\t$.\t_\t2\tpunct\t_\t_",
      "",
      "# text = Das Wetter ist schön .",
      "1\tDas\tder\tDET\tART\t_\t2\tdet\t_\t_",
      "2\tWetter\tWetter\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tist\tsein\tAUX\tVAFIN\t_\t0\troot\t_\t_",
      "4\tschön\tschön\tADJ\tADJD\t_\t3\tamod\t_\t_",
      "5\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",          // S3 identisch → kein Diff ✅
      "",
    ].join("\n"),
  },
  {
    // Abweichungen: HEAD bei Token 1 in S1 (3→2, erzeugt 🅶/🅵),
    // UPOS bei Token 6 in S1 (PUNCT→PUNC, erzeugt „→ Gold"-Button).
    // S2 und S3 identisch → nur S1 hat Diff-Blöcke für diese Datei.
    name: "datei3_head_upos_abweichungen.conllu",
    content: [
      "# text = Der Hund beißt den Mann .",
      "1\tDer\tder\tDET\tART\t_\t2\tdet\t_\t_",         // head 3→2  🅶/🅵
      "2\tHund\tHund\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tbeißt\tbeißen\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "4\tden\tder\tDET\tART\t_\t5\tdet\t_\t_",
      "5\tMann\tMann\tNOUN\tNN\t_\t3\tobj\t_\t_",
      "6\t.\t.\tPUNC\t$.\t_\t3\tpunct\t_\t_",            // UPOS PUNCT→PUNC  → Gold-Button
      "",
      "# text = Sie lächelt immer .",
      "1\tSie\tsie\tPRON\tPPER\t_\t2\tnsubj\t_\t_",
      "2\tlächelt\tlächeln\tVERB\tVVFIN\t_\t0\troot\t_\t_",
      "3\timmer\timmer\tADV\tADV\t_\t2\tadvmod\t_\t_",
      "4\t.\t.\tPUNCT\t$.\t_\t2\tpunct\t_\t_",           // S2 identisch ✅
      "",
      "# text = Das Wetter ist schön .",
      "1\tDas\tder\tDET\tART\t_\t2\tdet\t_\t_",
      "2\tWetter\tWetter\tNOUN\tNN\t_\t3\tnsubj\t_\t_",
      "3\tist\tsein\tAUX\tVAFIN\t_\t0\troot\t_\t_",
      "4\tschön\tschön\tADJ\tADJD\t_\t3\tamod\t_\t_",
      "5\t.\t.\tPUNCT\t$.\t_\t3\tpunct\t_\t_",           // S3 identisch ✅
      "",
    ].join("\n"),
  },
];
