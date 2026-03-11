// Help overlay controller and lightweight Markdown-to-HTML renderer.
// Open/close is driven entirely by inline onclick attributes in HTML — no addEventListener needed.

// ── Helpers ────────────────────────────────────────────────────────────────────
function _helpOverlay(){ return document.getElementById("helpOverlay"); }
function _helpContent(){ return document.getElementById("helpContent"); }

// ── Public API (called from inline onclick in HTML) ────────────────────────────

// Open the help overlay; render README content if the language has changed.
function openHelp(){
  _helpOverlay().classList.add("open");
  const lang = (typeof getLang === 'function') ? getLang() : 'en';
  if(_helpLoadedLang === lang) return;
  const content = _readmeContent(lang);
  if(content){
    _helpContent().innerHTML = mdToHtml(content);
    _helpLoadedLang = lang;
  } else {
    _helpContent().innerHTML =
      '<p class="muted">' + escapeHtml(t('help.unavailable')) + '<br>' +
      '<code>python make_readme_js.py</code><br>' +
      escapeHtml(t('help.runScript')) + '</p>';
  }
}

// Close the help overlay.
function closeHelp(){
  _helpOverlay().classList.remove("open");
}

// Open and scroll to the section matching the given i18n key (e.g. 'sec.files').
function openHelpSection(sectionKey){
  openHelp();
  setTimeout(function(){
    var label = t(sectionKey).replace(/^\d+\)\s*/, '').trim().toLowerCase();
    var body  = document.querySelector('.helpDialogBody');
    var headings = _helpContent().querySelectorAll('h1.helpH, h2.helpH, h3.helpH');
    for(var i = 0; i < headings.length; i++){
      if(headings[i].textContent.trim().toLowerCase().indexOf(label) !== -1){
        if(body){
            var headRect = headings[i].getBoundingClientRect();
            var bodyRect = body.getBoundingClientRect();
            body.scrollTop += headRect.top - bodyRect.top - 8;
          }
        break;
      }
    }
  }, 80);
}

// ── Escape key ────────────────────────────────────────────────────────────────
document.addEventListener("keydown", function(e){
  if(e.key === "Escape" && _helpOverlay().classList.contains("open")){
    e.stopPropagation();
    closeHelp();
  }
}, true);

// ── Language tracking ─────────────────────────────────────────────────────────
var _helpLoadedLang = null;

function _readmeContent(lang){
  var w = /** @type {any} */ (window);
  if(lang === 'de' && typeof w.README_CONTENT_DE !== 'undefined') return w.README_CONTENT_DE;
  if(typeof w.README_CONTENT_EN !== 'undefined') return w.README_CONTENT_EN;
  if(typeof w.README_CONTENT_DE !== 'undefined') return w.README_CONTENT_DE;
  if(typeof w.README_CONTENT    !== 'undefined') return w.README_CONTENT;
  return null;
}

// ── Markdown → HTML renderer ──────────────────────────────────────────────────
function mdToHtml(md){
  var lines = md.split("\n");
  var out   = [];
  var inCode = false, inTable = false, tableHdrDone = false, inList = false, inOList = false;

  function flushBlocks(){
    if(inList)  { out.push("</ul>");  inList  = false; }
    if(inOList) { out.push("</ol>"); inOList = false; }
    if(inTable) {
      if(tableHdrDone) out.push("</tbody>");
      out.push("</table>");
      inTable = false; tableHdrDone = false;
    }
  }

  for(var ri = 0; ri < lines.length; ri++){
    var line = lines[ri].replace(/\s+$/, '');

    if(line.indexOf("```") === 0){
      if(!inCode){
        flushBlocks();
        var lang = line.slice(3).trim();
        out.push('<pre class="helpCode"><code' + (lang ? ' class="lang-' + lang + '"' : '') + '>');
        inCode = true;
      } else {
        out.push("</code></pre>"); inCode = false;
      }
      continue;
    }
    if(inCode){ out.push(esc(line)); continue; }

    if(line.charAt(0) === '|'){
      if(!inTable){ flushBlocks(); out.push('<table class="helpTable">'); inTable = true; tableHdrDone = false; }
      if(/^\|[\s|:-]+\|$/.test(line)){
        if(!tableHdrDone){ out.push("<tbody>"); tableHdrDone = true; }
        continue;
      }
      var cells = line.split("|").slice(1,-1).map(function(c){ return inlineMd(c.trim()); });
      if(!tableHdrDone) out.push("<thead><tr>" + cells.map(function(c){ return "<th>" + c + "</th>"; }).join("") + "</tr></thead>");
      else              out.push("<tr>"         + cells.map(function(c){ return "<td>" + c + "</td>"; }).join("") + "</tr>");
      continue;
    }
    if(inTable){ if(tableHdrDone) out.push("</tbody>"); out.push("</table>"); inTable = false; tableHdrDone = false; }

    if(/^---+$/.test(line)){ flushBlocks(); out.push('<hr class="helpHr">'); continue; }

    var hm = line.match(/^(#{1,3})\s+(.+)/);
    if(hm){ flushBlocks(); var lv = hm[1].length; out.push('<h' + lv + ' class="helpH">' + inlineMd(hm[2]) + '</h' + lv + '>'); continue; }

    var ulm = line.match(/^[-*]\s+(.+)/);
    if(ulm){
      if(inOList){ out.push("</ol>"); inOList = false; }
      if(!inList){ out.push('<ul class="helpUl">'); inList = true; }
      out.push('<li>' + inlineMd(ulm[1]) + '</li>');
      continue;
    }

    var olm = line.match(/^\d+\.\s+(.+)/);
    if(olm){
      if(inList){ out.push("</ul>"); inList = false; }
      if(!inOList){ out.push('<ol class="helpOl">'); inOList = true; }
      out.push('<li>' + inlineMd(olm[1]) + '</li>');
      continue;
    }

    if(line.trim() === ''){ flushBlocks(); continue; }
    out.push('<p class="helpP">' + inlineMd(line) + '</p>');
  }

  if(inCode) out.push("</code></pre>");
  flushBlocks();
  return out.join("\n");
}

function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function inlineMd(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="helpInlineCode">$1</code>');
}
