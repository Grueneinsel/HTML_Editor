// Light/dark theme management with localStorage persistence and flash prevention.

// ── Theme initialisation ───────────────────────────────────────────────────────

// IIFE runs immediately (before DOMContentLoaded) to apply the saved theme before
// the first paint, preventing a flash of the wrong theme on page load.
(function(){
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = saved;
})();

// ── Theme API ──────────────────────────────────────────────────────────────────

function getTheme(){ return document.documentElement.dataset.theme || 'dark'; }

// Apply a named theme, persist it, and update the toggle button icon.
function setTheme(theme){
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  _syncThemeBtn();
}

function toggleTheme(){ setTheme(getTheme() === 'light' ? 'dark' : 'light'); }

// Update the theme toggle button icon to reflect the current theme.
function _syncThemeBtn(){
  const btn = document.getElementById('themeToggleBtn');
  if(btn) btn.textContent = getTheme() === 'light' ? '🌙' : '☀️';
}

document.addEventListener('DOMContentLoaded', _syncThemeBtn);
