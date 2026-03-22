// Internationalisation (i18n): language registry, translation lookup, and UI re-application.

// ── Language registry ──────────────────────────────────────────────────────────

// Populated from window.LANG_DE / window.LANG_EN injected by the language bundle scripts.
const LANGS = {};
if(window.LANG_DE) LANGS['de'] = window.LANG_DE;
if(window.LANG_EN) LANGS['en'] = window.LANG_EN;

// Persist the user's language choice across page loads. Default: English.
let _currentLang = localStorage.getItem('lang') || ((navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en');
if(!localStorage.getItem('lang')) localStorage.setItem('lang', _currentLang);

// ── Translation helpers ────────────────────────────────────────────────────────

// Look up a translation key in the current language, falling back to English, then the key itself.
// Supports {param} substitution: t('msg', { n: 5 }) replaces {n} with "5".
function t(key, params = {}){
  const dict = LANGS[_currentLang] || LANGS['en'] || {};
  const str  = dict[key] ?? LANGS['en']?.[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

// Return the correct singular/plural suffix string for a count.
// Example: tpSuffix(1, 'undo') → '' (singular), tpSuffix(3, 'undo') → 's' (plural).
function tpSuffix(n, prefix){
  return n !== 1 ? t(prefix + '.steps') : t(prefix + '.step');
}

function getLang(){ return _currentLang; }

// Switch the active language, persist the choice, and re-render all dynamic UI.
function setLang(code){
  if(!LANGS[code]) return;
  _currentLang = code;
  localStorage.setItem('lang', code);
  document.documentElement.lang = code;
  applyI18n();
  document.querySelectorAll('.langBtn').forEach(b =>
    b.classList.toggle('langBtnActive', b.dataset.lang === code)
  );
  // Reset popup so it is recreated with new language strings
  if(typeof _resetPopup === 'function') _resetPopup();
  // Rebuild label caches so the "(empty)" option label updates
  if(typeof buildDeprelOptionsCache === 'function') buildDeprelOptionsCache();
  // Re-render all dynamic UI sections
  if(typeof renderFiles      === 'function') renderFiles();
  if(typeof renderSentSelect === 'function') renderSentSelect();
  if(typeof renderSentence   === 'function') renderSentence();
  if(typeof _syncUndoBtns    === 'function') _syncUndoBtns();
  // If help overlay is open, reload its content in the new language
  if(typeof _helpLoadedLang !== 'undefined') _helpLoadedLang = null;
  if(typeof openHelp === 'function'){
    const overlay = document.getElementById('helpOverlay');
    if(overlay?.classList.contains('open')) openHelp();
  }
}

// Register an additional language dictionary at runtime (e.g. from a plugin).
function registerLang(code, dict){
  LANGS[code] = dict;
}

// Apply translations to all elements that carry a data-i18n or data-i18n-title attribute.
// When an element has child elements (e.g. a ? help button), only the leading text node
// is updated so that child nodes are preserved.
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const text = t(el.dataset.i18n);
    if(el.children.length === 0){
      el.textContent = text;
    } else {
      // Find or create the leading text node and update only that
      let tn = null;
      for(const node of el.childNodes){
        if(node.nodeType === 3){ tn = node; break; }
      }
      if(tn) tn.nodeValue = text + " ";
      else   el.insertBefore(document.createTextNode(text + " "), el.firstChild);
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset['i18nTitle']);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset['i18nAriaLabel']));
  });
}

// On first load: set the html[lang] attribute, translate static elements,
// and mark the active language button.
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = _currentLang;
  applyI18n();
  document.querySelectorAll('.langBtn').forEach(b =>
    b.classList.toggle('langBtnActive', b.dataset.lang === _currentLang)
  );
});
