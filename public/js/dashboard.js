/**
 * Aeternus Dashboard
 */
const SYSTEM_PARTIALS = [
  { id: 'guild-view', url: '/systems/home.html' },
  { id: 'system-geral', url: '/systems/geral.html' },
  { id: 'system-welcome', url: '/systems/welcome.html' },
  { id: 'system-logs', url: '/systems/logs.html' },
  { id: 'system-music', url: '/systems/music.html' },
  { id: 'server-selector', url: '/systems/server-selector.html' }
];

async function loadSystemPartials() {
  const root = document.getElementById('main-container');
  if (!root) return;
  for (const part of SYSTEM_PARTIALS) {
    if (document.getElementById(part.id)) continue;
    try {
      const res = await fetch(part.url);
      if (!res.ok) throw new Error(part.url + ' ' + res.status);
      const html = await res.text();
      root.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.error('Falha ao carregar sistema:', part.id, err);
    }
  }
}

let originalSettings = {};
let activeSystemId = null;
window.originalSettings = originalSettings;

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

function toggleLogSection(switchId, areaId) {
  const el = document.getElementById(switchId);
  const area = document.getElementById(areaId);
  if (!el || !area) return;
  area.style.display = el.checked ? 'block' : 'none';
  checkChanges();
}

function hasUnsavedChanges() {
  if (!activeSystemId) return false;
  const activeView = document.getElementById(activeSystemId);
  if (!activeView) return false;
  const inputs = activeView.querySelectorAll('input, textarea, select');
  for (let input of inputs) {
    const key = input.getAttribute('data-key');
    if (!key) continue;
    let currentVal = input.type === 'checkbox' ? input.checked : input.value;
    let origVal = originalSettings[key];
    if (input.type === 'checkbox') origVal = origVal === true || origVal === 'true';
    else origVal = origVal || '';
    if (String(currentVal) !== String(origVal)) return true;
  }
  return false;
}

function showUnsavedModal() {
  const m = document.getElementById('unsaved-modal');
  if (m) m.style.display = 'flex';
}
function closeUnsavedModal() {
  const m = document.getElementById('unsaved-modal');
  if (m) m.style.display = 'none';
}

function openSystem(systemId) {
  if (hasUnsavedChanges() && activeSystemId && activeSystemId !== systemId) {
    showUnsavedModal();
    return;
  }

  document.body.classList.add('config-page-mode');
  document.querySelectorAll('.system-view').forEach((view) => (view.style.display = 'none'));
  const gv = document.getElementById('guild-view');
  if (gv) gv.style.display = 'none';

  document.querySelectorAll('.home-only, #bot-stats-card, #serverCard, .grid-stats').forEach((el) => {
    el.style.display = 'none';
  });

  const targetView = document.getElementById(systemId);
  if (targetView) {
    targetView.style.display = 'block';
    targetView.classList.add('system-page');
    activeSystemId = systemId;
  }

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('action-bar')?.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showGuildView() {
  if (hasUnsavedChanges()) {
    showUnsavedModal();
    return;
  }
  document.body.classList.remove('config-page-mode');
  document.querySelectorAll('.system-view').forEach((view) => {
    view.style.display = 'none';
    view.classList.remove('system-page');
  });
  document.querySelectorAll('.home-only, #bot-stats-card, #serverCard').forEach((el) => {
    el.style.display = '';
  });
  const gv = document.getElementById('guild-view');
  if (gv) gv.style.display = 'block';
  activeSystemId = null;
  document.getElementById('action-bar')?.classList.remove('show');
  document.getElementById('sidebar')?.classList.remove('open');
}

function filterMenu() {
  const q = (document.getElementById('menuSearch')?.value || '').toLowerCase();
  document.querySelectorAll('.menu-item').forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(q) ? 'flex' : 'none';
  });
}

function checkChanges() {
  const bar = document.getElementById('action-bar');
  if (!bar) return;
  if (hasUnsavedChanges()) bar.classList.add('show');
  else bar.classList.remove('show');
}

async function saveCurrentSystem() {
  if (!activeSystemId) return;
  const params = new URLSearchParams(window.location.search);
  const guildId = params.get('guild') || params.get('server');
  if (!guildId) return alert('Servidor não selecionado.');

  const activeView = document.getElementById(activeSystemId);
  const inputs = activeView.querySelectorAll('input, textarea, select');

  for (let input of inputs) {
    const key = input.getAttribute('data-key');
    if (!key) continue;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    await fetch('/api/set-setting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, key, value })
    });
    originalSettings[key] = value;
  }
  window.originalSettings = originalSettings;

  document.getElementById('action-bar')?.classList.remove('show');
  const toast = document.getElementById('toast');
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  } else {
    alert('Salvo!');
  }
}

window.openSystem = openSystem;
window.showGuildView = showGuildView;
window.toggleSidebar = toggleSidebar;
window.saveCurrentSystem = saveCurrentSystem;
window.checkChanges = checkChanges;
window.filterMenu = filterMenu;
window.loadSystemPartials = loadSystemPartials;
window.toggleLogSection = toggleLogSection;
window.closeUnsavedModal = closeUnsavedModal;
