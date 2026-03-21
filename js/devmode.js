// Dev mode: auto-reload on bundler rebuild, session restore after hot-reload.

const _DEV_MODE_KEY       = 'devMode';
const _DEV_SESSION_KEY    = 'devModeSession';
const _DEV_RELOADED_KEY   = 'devModeReloadedAt';
let   _devModeTimer    = null;
let   _devModeVersion  = null;   // last seen build version token
let   _devModeFails    = 0;      // consecutive fetch failures

function _devModePoll(){
  fetch('version.txt?_=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(ver => {
      _devModeFails = 0;
      ver = ver.trim();
      if(_devModeVersion === null){ _devModeVersion = ver; _devModeUpdateBadge(ver); return; }
      if(ver !== _devModeVersion){
        try {
          const snap = JSON.stringify(_buildSessionObject());
          sessionStorage.setItem(_DEV_SESSION_KEY, snap);
          sessionStorage.setItem(_DEV_RELOADED_KEY, String(Date.now()));
        } catch(_){}
        window.location.reload();
      }
    })
    .catch(() => {
      _devModeFails++;
      if(_devModeFails >= 3){
        // version.txt not reachable — auto-disable dev mode
        localStorage.setItem(_DEV_MODE_KEY, '0');
        _devModeStop();
        renderDevModeBar();
      }
    });
}

function _devModeStart(){
  if(_devModeTimer) return;
  _devModeVersion = null;
  _devModeFails   = 0;
  _devModeTimer = setInterval(_devModePoll, 2000);
  _devModePoll(); // immediate first check to set baseline version
}

function _devModeStop(){
  clearInterval(_devModeTimer);
  _devModeTimer   = null;
  _devModeVersion = null;
  _devModeUpdateBadge(null);
}

function _devModeUpdateBadge(ver){
  const badge = document.getElementById('devVersionBadge');
  if(!badge) return;
  if(!ver){ badge.hidden = true; return; }
  // ver is ISO datetime "2026-03-21T15:30:45" — parse directly (no Unix timestamp)
  const dt = new Date(ver);
  const ts = isNaN(dt) ? ver : dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  badge.innerHTML =
    `<span class="devBadgeLabel">🔨 ${ts}</span>` +
    `<button class="devBadgeClose" title="Dev-Modus beenden">✕</button>`;
  badge.querySelector('.devBadgeClose').addEventListener('click', () => {
    localStorage.setItem(_DEV_MODE_KEY, '0');
    _devModeStop();
    renderDevModeBar();
  });
  badge.hidden = false;
}

function renderDevModeBar(){
  const bar = document.getElementById('devModeBar');
  if(!bar) return;
  // Dev mode is activated only via ?dev URL param — no visible UI control
  bar.innerHTML = '';
  if(localStorage.getItem(_DEV_MODE_KEY) === '1') _devModeStart();
}

// Restore session if we reloaded due to a build change, then show reload toast.
function _devModeRestoreSession(){
  const snap       = sessionStorage.getItem(_DEV_SESSION_KEY);
  const reloadedAt = sessionStorage.getItem(_DEV_RELOADED_KEY);
  if(snap){
    sessionStorage.removeItem(_DEV_SESSION_KEY);
    try { importSession(snap); } catch(_){}
  }
  if(reloadedAt){
    sessionStorage.removeItem(_DEV_RELOADED_KEY);
    _devModeShowReloadToast(parseInt(reloadedAt, 10));
  }
}

// Show a brief toast notification that the page was auto-reloaded by dev mode.
function _devModeShowReloadToast(reloadedAt){
  const existing = document.getElementById('devReloadToast');
  if(existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'devReloadToast';
  toast.className = 'devReloadToast';

  const ts = new Date(reloadedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  toast.innerHTML =
    `<span class="devReloadIcon">🔄</span>` +
    `<span>${t('devMode.reloaded')} <span class="devReloadTime">${ts}</span></span>` +
    `<button class="devReloadClose" title="${t('kbd.close')}">✕</button>`;

  toast.querySelector('.devReloadClose').addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);

  // Auto-dismiss after 4 s
  setTimeout(() => { toast.classList.add('devReloadToastFade'); }, 3500);
  setTimeout(() => { toast.remove(); }, 4200);
}
