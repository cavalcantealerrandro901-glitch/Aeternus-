const $ = (id) => document.getElementById(id);
const val = (id) => (($(id) && $(id).value) || '').trim();

let gid = null;
let data = null;
let dropExtra = [];
let dropBlocked = [];
let dropBypass = [];

function toast(msg, err) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('err', !!err);
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2400);
}

function fill(sel, items, placeholder) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '';
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = placeholder || 'Selecione';
  sel.appendChild(o0);
  (items || []).forEach(function (it) {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it.name || it.id;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function roleName(id) {
  const r = (data && data.roles || []).find(function (x) { return x.id === id; });
  return r ? r.name : id;
}

document.querySelectorAll('.nb').forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.disabled) return;
    document.querySelectorAll('.nb').forEach(function (x) { x.classList.remove('on'); });
    document.querySelectorAll('.panel').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    const p = $(b.dataset.p);
    if (p) p.classList.add('on');
  });
});

async function loadMe() {
  const r = await fetch('/api/me');
  if (!r.ok) { location.href = '/login'; return; }
  const j = await r.json();
  if ($('meInfo')) {
    $('meInfo').textContent =
      (j.user && (j.user.global_name || j.user.username) || 'Usuário') +
      ' · ID ' + (j.user && j.user.id || '—');
  }
  const list = $('guildList');
  if (!list) return;
  list.innerHTML = '';
  const guilds = j.guilds || [];
  if (!guilds.length) {
    list.innerHTML = '<p class="hint">Nenhum servidor em comum com o bot.</p>';
    return;
  }
  guilds.forEach(function (g) {
    const d = document.createElement('div');
    d.className = 'sys';
    d.innerHTML = '<b>' + (g.name || g.id) + '</b>';
    d.onclick = function () { selectGuild(g.id, g.name); };
    list.appendChild(d);
  });
}

async function selectGuild(id, name) {
  gid = id;
  const r = await fetch('/api/guild/' + id);
  if (!r.ok) return toast('Falha ao carregar servidor', true);
  data = await r.json();
  document.querySelectorAll('.nb').forEach(function (b) {
    if (b.dataset.p && b.dataset.p !== 'servers' && b.dataset.p !== 'me') b.disabled = false;
  });
  if ($('ovName')) $('ovName').textContent = name || (data.guild && data.guild.name) || id;

  const s = data.settings || {};
  const roles = data.roles || [];
  const ch = data.channels || [];

  ['welChannel', 'leaveChannel', 'dropChannel', 'partChannel'].forEach(function (id) {
    fill($(id), ch, 'Canal');
  });
  ['dropVipRole', 'dropBlockedRole', 'dropBypassRole', 'partRole', 'partNotifyRole'].forEach(function (id) {
    fill($(id), roles, 'Cargo');
  });

  if ($('welEnabled')) $('welEnabled').checked = s.welcome && s.welcome.enabled === true;
  if ($('welChannel')) $('welChannel').value = (s.welcome && s.welcome.channelId) || '';
  if ($('welMsg')) $('welMsg').value = (s.welcome && s.welcome.message) || '';
  if ($('leaveEnabled')) $('leaveEnabled').checked = s.leave && s.leave.enabled === true;
  if ($('leaveChannel')) $('leaveChannel').value = (s.leave && s.leave.channelId) || '';
  if ($('leaveMsg')) $('leaveMsg').value = (s.leave && s.leave.message) || '';

  if ($('amEnabled')) $('amEnabled').checked = !s.automod || s.automod.enabled !== false;
  if ($('amSpam')) $('amSpam').checked = !s.automod || s.automod.antiSpam !== false;
  if ($('amInvite')) $('amInvite').checked = !s.automod || s.automod.antiInvite !== false;

  if ($('ecoMin')) $('ecoMin').value = (s.economy && s.economy.dailyMin) != null ? s.economy.dailyMin : 5000;
  if ($('ecoMax')) $('ecoMax').value = (s.economy && s.economy.dailyMax) != null ? s.economy.dailyMax : 50000;

  const ov = $('ovStats');
  if (ov) {
    const rows = [
      ['Prefixo', s.prefix || 'O.'],
      ['Drops', s.drops && s.drops.enabled === false ? 'Off' : 'On'],
      ['Automod', s.automod && s.automod.enabled === false ? 'Off' : 'On']
    ];
    ov.innerHTML = rows.map(function (pair) {
      return '<div class="st"><b>' + pair[1] + '</b><span>' + pair[0] + '</span></div>';
    }).join('');
  }

  dropLoadFromSettings(s);
  partLoadFromSettings(s);
  toast('Servidor carregado');
}

function dropRenderLists() {
  const vipEl = $('dropVipList');
  const blkEl = $('dropBlockedList');
  const bypEl = $('dropBypassList');
  if (vipEl) {
    vipEl.innerHTML = dropExtra.length
      ? dropExtra.map(function (e, i) {
          return '<div class="list-item"><span><b>' + (e.label || roleName(e.roleId)) +
            '</b> +' + e.entries + '</span><a href="#" onclick="dropVipRm(' + i + ');return false">remover</a></div>';
        }).join('')
      : 'Nenhum VIP';
  }
  if (blkEl) {
    blkEl.innerHTML = dropBlocked.length
      ? dropBlocked.map(function (id, i) {
          return '<div class="list-item"><span>' + roleName(id) +
            '</span><a href="#" onclick="dropBlockedRm(' + i + ');return false">remover</a></div>';
        }).join('')
      : 'Nenhum';
  }
  if (bypEl) {
    bypEl.innerHTML = dropBypass.length
      ? dropBypass.map(function (id, i) {
          return '<div class="list-item"><span>' + roleName(id) +
            '</span><a href="#" onclick="dropBypassRm(' + i + ');return false">remover</a></div>';
        }).join('')
      : 'Nenhum';
  }
}

function dropVipAdd() {
  const roleId = val('dropVipRole');
  const entries = Math.max(1, Math.floor(Number(val('dropVipEntries')) || 1));
  const label = val('dropVipLabel') || '';
  if (!roleId) return toast('Escolha um cargo', true);
  if (dropExtra.some(function (e) { return e.roleId === roleId; })) return toast('Já na lista', true);
  dropExtra.push({ roleId: roleId, entries: entries, label: label });
  dropRenderLists();
}
function dropVipRm(i) { dropExtra.splice(i, 1); dropRenderLists(); }
function dropBlockedAdd() {
  const roleId = val('dropBlockedRole');
  if (!roleId) return toast('Escolha um cargo', true);
  if (dropBlocked.indexOf(roleId) < 0) dropBlocked.push(roleId);
  dropRenderLists();
}
function dropBlockedRm(i) { dropBlocked.splice(i, 1); dropRenderLists(); }
function dropBypassAdd() {
  const roleId = val('dropBypassRole');
  if (!roleId) return toast('Escolha um cargo', true);
  if (dropBypass.indexOf(roleId) < 0) dropBypass.push(roleId);
  dropRenderLists();
}
function dropBypassRm(i) { dropBypass.splice(i, 1); dropRenderLists(); }

function dropLoadFromSettings(s) {
  const d = (s && s.drops) || {};
  if ($('dropEnabled')) $('dropEnabled').checked = d.enabled !== false;
  if ($('dropChannel')) $('dropChannel').value = d.channelId || '';
  if ($('dropMinLevel')) $('dropMinLevel').value = (d.requirements && d.requirements.minLevel) || 0;
  dropExtra = Array.isArray(d.extraEntries)
    ? d.extraEntries.map(function (e) {
        return {
          roleId: String(e.roleId),
          entries: Math.max(1, Number(e.entries) || 1),
          label: e.label || e.name || ''
        };
      })
    : [];
  dropBlocked = Array.isArray(d.requirements && d.requirements.blockedRoleIds)
    ? d.requirements.blockedRoleIds.map(String)
    : [];
  dropBypass = Array.isArray(d.requirements && d.requirements.bypassRoleIds)
    ? d.requirements.bypassRoleIds.map(String)
    : [];
  dropRenderLists();
}

async function dropSave() {
  if (!gid) return toast('Selecione um servidor', true);
  const body = {
    enabled: !$('dropEnabled') || $('dropEnabled').checked !== false,
    channelId: val('dropChannel') || null,
    minLevel: Number(val('dropMinLevel')) || 0,
    extraEntries: dropExtra,
    blockedRoleIds: dropBlocked,
    bypassRoleIds: dropBypass,
    requiredRoleIds: []
  };
  const r = await fetch('/api/guild/' + gid + '/drops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(function () { return {}; });
  if (!r.ok || j.error) return toast(j.error || 'Erro', true);
  toast('Drops salvos');
}

function partLoadFromSettings(s) {
  const p = (s && s.partnership) || {};
  if ($('partEnabled')) $('partEnabled').checked = p.enabled !== false;
  if ($('partChannel')) $('partChannel').value = p.channelId || '';
  if ($('partRole')) $('partRole').value = p.roleId || '';
  if ($('partNotifyRole')) $('partNotifyRole').value = p.notifyRoleId || '';
  if ($('partPhrase'))
    $('partPhrase').value =
      p.phrase ||
      '🤝 **Nova parceria!**\nRepresentante: {rep}\nServidor: **{server}**\nConvite: {invite}';
  if ($('partImage')) $('partImage').value = p.image || '';
}

async function partSave() {
  if (!gid) return toast('Selecione um servidor', true);
  const body = {
    enabled: !$('partEnabled') || $('partEnabled').checked !== false,
    channelId: val('partChannel') || null,
    roleId: val('partRole') || null,
    notifyRoleId: val('partNotifyRole') || null,
    phrase: val('partPhrase') || '',
    image: val('partImage') || null
  };
  const r = await fetch('/api/guild/' + gid + '/partnership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(function () { return {}; });
  if (!r.ok || j.error) return toast(j.error || 'Erro', true);
  toast('Parcerias salvas');
}

async function patchSettings(patch) {
  if (!gid) return toast('Selecione um servidor', true);
  const r = await fetch('/api/guild/' + gid + '/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  const j = await r.json().catch(function () { return {}; });
  if (!r.ok || j.error) return toast(j.error || 'Erro', true);
  toast('Salvo');
}

function saveWelcome() {
  return patchSettings({
    welcome: {
      enabled: $('welEnabled') && $('welEnabled').checked === true,
      channelId: val('welChannel') || null,
      message: val('welMsg') || 'Bem-vindo {user}!'
    }
  });
}

function saveLeave() {
  return patchSettings({
    leave: {
      enabled: $('leaveEnabled') && $('leaveEnabled').checked === true,
      channelId: val('leaveChannel') || null,
      message: val('leaveMsg') || '{user} saiu.'
    }
  });
}

function saveAutomod() {
  return patchSettings({
    automod: {
      enabled: !$('amEnabled') || $('amEnabled').checked !== false,
      antiSpam: !$('amSpam') || $('amSpam').checked !== false,
      antiInvite: !$('amInvite') || $('amInvite').checked !== false
    }
  });
}

function saveEconomy() {
  return patchSettings({
    economy: {
      dailyMin: Number(val('ecoMin')) || 5000,
      dailyMax: Number(val('ecoMax')) || 50000
    }
  });
}

loadMe().catch(function () { location.href = '/login'; });
