// Internationalisation (i18n): language registry, translation lookup, and UI re-application.

// ── Language registry ──────────────────────────────────────────────────────────

// Populated from window.LANG_DE / window.LANG_EN injected by the language bundle scripts.
const LANGS = {};
if(window.LANG_DE) LANGS['de'] = window.LANG_DE;
if(window.LANG_EN) LANGS['en'] = window.LANG_EN;

// Persist the user's language choice across page loads.
let _currentLang = localStorage.getItem('lang') || 'de';

// ── Translation helpers ────────────────────────────────────────────────────────

// Look up a translation key in the current language, falling back to German, then the key itself.
// Supports {param} substitution: t('msg', { n: 5 }) replaces {n} with "5".
function t(key, params = {}){
  const dict = LANGS[_currentLang] || LANGS['de'] || {};
  const str  = dict[key] ?? LANGS['de']?.[key] ?? key;
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
  // If help modal is open, reload its content in the new language
  if(typeof openHelp === 'function'){
    const modal = document.getElementById('helpModal');
    if(modal?.classList.contains('active')) openHelp();
  }
}

// Register an additional language dictionary at runtime (e.g. from a plugin).
function registerLang(code, dict){
  LANGS[code] = dict;
}

// Apply translations to all elements that carry a data-i18n or data-i18n-title attribute.
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset['i18nTitle']);
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
