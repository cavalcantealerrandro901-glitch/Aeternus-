/**
 * Aeternus Dashboard
 * Sistemas carregados de /systems/*.html
 */
const SYSTEM_PARTIALS = [
  { id: 'guild-view', url: '/systems/home.html' },
  { id: 'system-geral', url: '/systems/geral.html' },
  { id: 'system-welcome', url: '/systems/welcome.html' },
  { id: 'system-logs', url: '/systems/logs.html' },
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
let guildCategories = [];

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
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

    if (input.type === 'checkbox') {
      origVal = origVal === true || origVal === 'true';
    } else {
      origVal = origVal || '';
    }

    if (currentVal !== origVal) return true;
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
  if (activeSystemId === systemId) {
    document.getElementById('sidebar').classList.remove('open');
    return;
  }

  if (hasUnsavedChanges()) {
    document.getElementById('sidebar').classList.remove('open');
    showUnsavedModal();
    return;
  }

  document.getElementById('sidebar').classList.remove('open');
  const gv = document.getElementById('guild-view');
  if (gv) gv.style.display = 'none';
  document.querySelectorAll('.system-view').forEach(view => (view.style.display = 'none'));

  const targetView = document.getElementById(systemId);
  if (targetView) {
    targetView.style.display = 'block';
    activeSystemId = systemId;
  }

  const bar = document.getElementById('action-bar');
  if (bar) bar.classList.remove('show');
}

function showGuildView() {
  if (hasUnsavedChanges()) {
    showUnsavedModal();
    return;
  }
  document.querySelectorAll('.system-view').forEach(view => (view.style.display = 'none'));
  const gv = document.getElementById('guild-view');
  if (gv) gv.style.display = 'block';
  activeSystemId = null;
  const bar = document.getElementById('action-bar');
  if (bar) bar.classList.remove('show');
  document.getElementById('sidebar').classList.remove('open');
}

function filterMenu() {
  const q = (document.getElementById('menuSearch').value || '').toLowerCase();
  document.querySelectorAll('.menu-item').forEach(item => {
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
  const guildId = params.get('guild');
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

  document.getElementById('action-bar').classList.remove('show');
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function resetCurrentSystem() {
  if (!activeSystemId) return;
  const activeView = document.getElementById(activeSystemId);
  activeView.querySelectorAll('input, textarea, select').forEach(input => {
    const key = input.getAttribute('data-key');
    if (!key) return;
    const orig = originalSettings[key];
    if (input.type === 'checkbox') {
      input.checked = orig === true || orig === 'true';
    } else {
      input.value = orig || '';
    }
  });
  toggleLogSection('msgLogEnabled', 'msgLogArea');
  toggleLogSection('modLogEnabled', 'modLogArea');
  toggleLogSection('memberLogEnabled', 'memberLogArea');
  toggleLogSection('voiceLogEnabled', 'voiceLogArea');
  document.getElementById('action-bar').classList.remove('show');
}

function populateChannelSelects(categories) {
  guildCategories = categories || [];
  document.querySelectorAll('select.channel-select').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">Selecione um canal...</option>';
    guildCategories.forEach(cat => {
      const group = document.createElement('optgroup');
      group.label = cat.name || 'Sem categoria';
      (cat.channels || []).forEach(ch => {
        if (ch.typeLabel && /voice|stage/i.test(String(ch.typeLabel))) return;
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = '#' + ch.name;
        group.appendChild(opt);
      });
      if (group.children.length) select.appendChild(group);
    });
    if (current) select.value = current;
  });
}

async function loadData() {
  const params = new URLSearchParams(window.location.search);
  const guildId = params.get('guild');

  document.addEventListener('change', e => {
    if (e.target.matches('input, textarea, select')) checkChanges();
  });
  document.addEventListener('input', e => {
    if (e.target.matches('input, textarea, select')) checkChanges();
  });

  if (!guildId) {
    const container = document.getElementById('main-container');
    document.querySelectorAll('.system-view, #guild-view').forEach(el => {
      if (el) el.style.display = 'none';
    });
    const sel = document.getElementById('server-selector');
    if (sel) sel.style.display = 'block';

    try {
      const res = await fetch('/api/user/servers');
      const servers = await res.json();
      const listContainer = document.getElementById('servers-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';
      if (!Array.isArray(servers) || !servers.length) {
        listContainer.innerHTML = '<p style="color:#9ca3af">Nenhum servidor encontrado.</p>';
        return;
      }
      servers.forEach(server => {
        const a = document.createElement('a');
        a.href = '/dashboard?guild=' + server.id;
        a.className = 'server-item';
        a.innerHTML =
          '<img src="' +
          (server.icon || 'https://via.placeholder.com/40') +
          '" alt="">' +
          '<span><strong>' +
          server.name +
          '</strong></span>';
        listContainer.appendChild(a);
      });
    } catch (e) {
      const listContainer = document.getElementById('servers-list');
      if (listContainer)
        listContainer.innerHTML = '<p style="color:#ef4444">Erro ao carregar servidores.</p>';
    }
    return;
  }

  try {
    const resGuild = await fetch('/api/guild-data/' + guildId);
    const guildData = await resGuild.json();

    if (!guildData.error) {
      document.getElementById('guild-name').innerText = guildData.name;
      document.getElementById('guild-id').innerText = 'ID: ' + guildData.id;
      document.getElementById('guild-avatar').src = guildData.icon || 'https://via.placeholder.com/90';
      document.getElementById('guild-members').innerText = guildData.memberCount;
      document.getElementById('guild-roles').innerText = guildData.roleCount;
      document.getElementById('guild-channels').innerText = guildData.channelCount;
      document.getElementById('guild-desc').innerText = guildData.description;

      if (guildData.categories) populateChannelSelects(guildData.categories);
    }

    const resSettings = await fetch('/api/settings/' + guildId);
    originalSettings = await resSettings.json();

    document.querySelectorAll('.system-view input, .system-view textarea, .system-view select').forEach(input => {
      const key = input.getAttribute('data-key');
      if (originalSettings[key] !== undefined) {
        if (input.type === 'checkbox') {
          input.checked = originalSettings[key] === true || originalSettings[key] === 'true';
        } else {
          input.value = originalSettings[key];
        }
      }
    });

    toggleLogSection('msgLogEnabled', 'msgLogArea');
    toggleLogSection('modLogEnabled', 'modLogArea');
    toggleLogSection('memberLogEnabled', 'memberLogArea');
    toggleLogSection('voiceLogEnabled', 'voiceLogArea');
  } catch (err) {
    console.error('Erro ao carregar painel:', err);
  }
}

async function initDashboard() {
  await loadSystemPartials();
  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
