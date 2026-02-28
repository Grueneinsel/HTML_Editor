// Help modal controller and lightweight Markdown-to-HTML renderer for README content.

// ── Help modal ─────────────────────────────────────────────────────────────────
const helpBtn     = document.getElementById("helpBtn");
const helpModal   = document.getElementById("helpModal");
const helpClose   = document.getElementById("helpCloseBtn");
const helpContent = document.getElementById("helpContent");

helpBtn.addEventListener("click", openHelp);
helpClose.addEventListener("click", closeHelp);
// Click on the modal backdrop (outside the content box) closes the modal.
helpModal.addEventListener("click", e => { if(e.target === helpModal) closeHelp(); });

// Escape closes the modal (capture phase: fires before keyboard.js can handle it).
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && helpModal.classList.contains("active")){
    e.stopPropagation();
    closeHelp();
  }
}, true);

// Track which language the help content was last rendered in to avoid redundant re-renders.
let _helpLoadedLang = null;

// Return the README content string for the current language.
// Falls back to German, then to a legacy single-language bundle constant.
function _readmeContent(){
  const lang = (typeof getLang === 'function') ? getLang() : 'de';
  const w = /** @type {any} */ (window);
  if(lang === 'en' && typeof w.README_CONTENT_EN !== 'undefined') return w.README_CONTENT_EN;
  if(typeof w.README_CONTENT_DE !== 'undefined') return w.README_CONTENT_DE;
  // Legacy fallback for old single-language bundle
  if(typeof w.README_CONTENT    !== 'undefined') return w.README_CONTENT;
  return null;
}

// Open the help modal, rendering README content if the language has changed.
function openHelp(){
  const lang = (typeof getLang === 'function') ? getLang() : 'de';
  helpModal.classList.add("active");
  if(_helpLoadedLang === lang) return; // content already up to date
  const content = _readmeContent();
  if(content){
    helpContent.innerHTML = mdToHtml(content);
    _helpLoadedLang = lang;
  } else {
    // README bundle not found — show instructions for generating it
    helpContent.innerHTML =
      `<p class="muted">${escapeHtml(t('help.unavailable'))}<br>
       <code>python make_readme_js.py</code><br>
       ${escapeHtml(t('help.runScript'))}</p>`;
  }
}

function closeHelp(){
  helpModal.classList.remove("active");
}

// Open the help modal and scroll to the section whose heading contains the
// translated label of the given i18n key (e.g. 'sec.files' → 'Dateien').
function openHelpSection(sectionKey){
  openHelp();
  // Use a short delay so the modal content is fully rendered before scrolling.
  setTimeout(() => {
    // Derive a short keyword from the translated section label.
    // Strip leading "N) " prefix (e.g. "1) Dateien" → "Dateien").
    const label = t(sectionKey).replace(/^\d+\)\s*/, '').trim().toLowerCase();
    const headings = helpContent.querySelectorAll('h1.helpH, h2.helpH, h3.helpH');
    for(const h of headings){
      if(h.textContent.trim().toLowerCase().includes(label)){
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }, 80);
}

// ── Markdown → HTML renderer ───────────────────────────────────────────────────

// Convert a Markdown string to an HTML string.
// Supports: fenced code blocks, tables, headings (h1–h3), unordered/ordered lists,
// horizontal rules, and inline bold + inline code.
function mdToHtml(md){
  const lines = md.split("\n");
  const out   = [];
  let inCode          = false;
  let inTable         = false;
  let tableHdrDone    = false;
  let inList          = false;
  let inOList         = false;

  // Close any open block-level elements before starting a new one.
  const flushBlocks = () => {
    if(inList)  { out.push("</ul>");             inList  = false; }
    if(inOList) { out.push("</ol>");             inOList = false; }
    if(inTable) {
      if(tableHdrDone) out.push("</tbody>");
      out.push("</table>");
      inTable = false; tableHdrDone = false;
    }
  };

  for(const raw of lines){
    const line = raw.trimEnd();

    // ── Fenced code block ──────────────────────────────────────────────────
    if(line.startsWith("```")){
      if(!inCode){
        flushBlocks();
        const lang = line.slice(3).trim();
        out.push(`<pre class="helpCode"><code${lang ? ` class="lang-${lang}"` : ""}>`);
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }
    // Inside a code block: escape HTML but preserve the content verbatim.
    if(inCode){ out.push(esc(line)); continue; }

    // ── Table ──────────────────────────────────────────────────────────────
    if(line.startsWith("|")){
      if(!inTable){
        flushBlocks();
        out.push('<table class="helpTable">');
        inTable = true; tableHdrDone = false;
      }
      // Separator row (e.g. |---|---|): closes the header and opens tbody.
      if(/^\|[\s|:-]+\|$/.test(line)){
        if(!tableHdrDone){ out.push("<tbody>"); tableHdrDone = true; }
        continue;
      }
      const cells = line.split("|").slice(1,-1).map(c => inlineMd(c.trim()));
      if(!tableHdrDone){
        out.push("<thead><tr>" + cells.map(c=>`<th>${c}</th>`).join("") + "</tr></thead>");
      } else {
        out.push("<tr>" + cells.map(c=>`<td>${c}</td>`).join("") + "</tr>");
      }
      continue;
    }
    // A non-pipe line after a table — close the table.
    if(inTable){
      if(tableHdrDone) out.push("</tbody>");
      out.push("</table>");
      inTable = false; tableHdrDone = false;
    }

    // ── Horizontal rule ────────────────────────────────────────────────────
    if(/^---+$/.test(line)){ flushBlocks(); out.push('<hr class="helpHr">'); continue; }

    // ── Headings (h1–h3) ───────────────────────────────────────────────────
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if(hm){
      flushBlocks();
      const lvl = hm[1].length;
      out.push(`<h${lvl} class="helpH">${inlineMd(hm[2])}</h${lvl}>`);
      continue;
    }

    // ── Unordered list ─────────────────────────────────────────────────────
    const ulm = line.match(/^[-*]\s+(.+)/);
    if(ulm){
      if(inOList){ out.push("</ol>"); inOList = false; }
      if(!inList){ out.push('<ul class="helpUl">'); inList = true; }
      out.push(`<li>${inlineMd(ulm[1])}</li>`);
      continue;
    }

    // ── Ordered list ───────────────────────────────────────────────────────
    const olm = line.match(/^\d+\.\s+(.+)/);
    if(olm){
      if(inList){ out.push("</ul>"); inList = false; }
      if(!inOList){ out.push('<ol class="helpOl">'); inOList = true; }
      out.push(`<li>${inlineMd(olm[1])}</li>`);
      continue;
    }

    // ── Blank line: flush open blocks ──────────────────────────────────────
    if(line.trim() === ""){ flushBlocks(); continue; }

    // ── Paragraph ─────────────────────────────────────────────────────────
    out.push(`<p class="helpP">${inlineMd(line)}</p>`);
  }

  // Close any still-open blocks at end of input
  if(inCode) out.push("</code></pre>");
  flushBlocks();
  return out.join("\n");
}

// Escape special HTML characters (used inside code blocks where inlineMd is not applied).
function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// Apply inline Markdown formatting: HTML-escape first, then render **bold** and `code`.
function inlineMd(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="helpInlineCode">$1</code>');
}
