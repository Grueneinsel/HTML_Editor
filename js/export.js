// ---------- Export buttons ----------
const exportConlluBtn = document.getElementById("exportConlluBtn");
const exportTreeBtn   = document.getElementById("exportTreeBtn");

exportConlluBtn.addEventListener("click", exportGoldConllu);
exportTreeBtn.addEventListener("click",   exportTreesTxt);

function updateExportButtons(){
  const ok = state.docs.length >= 1;
  exportConlluBtn.disabled = !ok;
  exportTreeBtn.disabled   = !(ok && state.maxSents > 0);
}

// ---------- Download helper ----------
function downloadText(content, filename){
  const blob = new Blob([content], { type:"text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Gold CoNLL-U (alle Sätze) ----------
function exportGoldConllu(){
  if(state.docs.length < 1) return;
  const out = [];

  for(let sentIdx = 0; sentIdx < state.maxSents; sentIdx++){
    const docMaps = state.docs.map(d => {
      const s = d.sentences[sentIdx];
      const m = new Map();
      if(s) for(const t of s.tokens) m.set(t.id, t);
      return m;
    });

    const ids = new Set();
    for(const m of docMaps) for(const id of m.keys()) ids.add(id);
    const customSent = state.custom[sentIdx] || {};
    for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
    const idList = Array.from(ids).sort((a,b) => a - b);

    const goldMap = buildGoldTokenMap(sentIdx, idList, docMaps);

    // # text header
    let sentText = "";
    for(const d of state.docs){
      const s = d.sentences[sentIdx];
      if(s && s.text){ sentText = s.text; break; }
    }
    if(sentText) out.push(`# text = ${sentText}`);

    for(const id of idList){
      let base = null;
      for(const m of docMaps){ const t = m.get(id); if(t){ base = t; break; } }
      if(!base) continue;

      const goldTok     = goldMap.get(id);
      const customEntry = getCustomEntry(sentIdx, id);

      const head   = goldTok?.head   ?? null;
      const deprel = goldTok?.deprel ?? "_";
      const upos   = goldTok?.upos ?? "_";
      const xpos   = goldTok?.xpos ?? "_";

      out.push([
        id,
        base.form   || "_",
        base.lemma  || "_",
        upos        || "_",
        xpos        || "_",
        base.feats  || "_",
        head === null ? "_" : String(head),
        deprel,
        base.deps   || "_",
        base.misc   || "_",
      ].join("\t"));
    }
    out.push(""); // Leerzeile zwischen Sätzen
  }

  downloadText(out.join("\n"), "gold_annotation.conllu");
}

// ---------- Baumansicht als .txt (alle Sätze) ----------
function exportTreesTxt(){
  if(state.docs.length < 1) return;
  const parts = [];

  for(let sentIdx = 0; sentIdx < state.maxSents; sentIdx++){
    const docMaps = state.docs.map(d => {
      const s = d.sentences[sentIdx];
      const m = new Map();
      if(s) for(const t of s.tokens) m.set(t.id, t);
      return m;
    });
    const ids = new Set();
    for(const m of docMaps) for(const id of m.keys()) ids.add(id);
    const customSent = state.custom[sentIdx] || {};
    for(const idStr of Object.keys(customSent)) ids.add(parseInt(idStr, 10));
    const idList   = Array.from(ids).sort((a,b) => a - b);
    const goldMap  = buildGoldTokenMap(sentIdx, idList, docMaps);
    const sentText = getSentenceTextFallback(sentIdx);

    // Hilfsfunktion: erste Zeile (📝 Satztext) abtrennen
    const stripHeader = txt => txt.split("\n").slice(1).join("\n");

    let block = `${"=".repeat(60)}\n`;
    block += `📝 S${sentIdx + 1}: ${sentText}\n\n`;
    block += `=== GOLD ===\n`;
    const goldBody = stripHeader(renderTreePlain(sentIdx, goldMap, sentText));
    block += goldBody.trim() ? goldBody + "\n" : "(keine Bäume für diesen Satz)\n";

    for(let i = 0; i < state.docs.length; i++){
      const diffBody = stripHeader(renderTreeDiff(sentIdx, goldMap, docMaps[i], sentText));
      if(!diffBody.trim()) continue;
      const name = state.docs[i]?.name ?? `Datei ${i+1}`;
      block += `\n--- ${name} vs Gold ---\n`;
      block += diffBody + "\n";
    }
    parts.push(block);
  }

  downloadText(parts.join("\n"), "alle_baeume.txt");
}
