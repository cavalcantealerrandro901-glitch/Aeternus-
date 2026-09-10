const $ = (id) => document.getElementById(id);
const val = (id) => ($ (id)?.value || '').trim();
let gid = null;
let data = null;
let dropExtra = [];
let dropBlocked = [];
let dropBypass = [];

function toast(msg) {
  const t = $('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function fill(sel, items, placeholder) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '';
  const o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = placeholder || 'Selecione';
  sel.appendChild(o0);
  for (const it of items || []) {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it.name || it.id;
    sel.appendChild(o);
  }
  if (cur) sel.value = cur;
}

document.querySelectorAll('.nb').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.disabled) return;
    document.querySelectorAll('.nb').forEach((x) => x.classList.remove('on'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    const p = $(b.dataset.p);
    if (p) p.classList.add('on');
  });
});

async function loadMe() {
  const r = await fetch('/api/me');
  if (!r.ok) {
    location.href = '/login';
    return;
  }
  const j = await r.json();
  if ($('meInfo')) {
    $('meInfo').textContent = (j.user?.username || '') + ' · ' + (j.user?.id || '');
  }
  const list = $('guildList');
  if (!list) return;
  list.innerHTML = '';
  for (const g of j.guilds || []) {
    const d = document.createElement('div');
    d.className = 'sys';
    d.innerHTML = '<b>' + (g.name || g.id) + '</b>';
    d.onclick = () => selectGuild(g.id);
    list.appendChild(d);
  }
}

async function selectGuild(id) {
  gid = id;
  const r = await fetch('/api/guild/' + id);
  if (!r.ok) return toast('Falha ao carregar servidor');
  data = await r.json();
  document.querySelectorAll('.nb').forEach((b) => {
    if (b.dataset.p && b.dataset.p !== 'servers' && b.dataset.p !== 'me') b.disabled = false;
  });
  const s = data.settings || {};
  const roles = data.roles || [];
  const ch = data.channels || [];
  if ($('dropChannel')) fill($('dropChannel'), ch, 'Canal padrão');
  if ($('dropVipRole')) fill($('dropVipRole'), roles, 'Cargo VIP');
  if ($('dropBlockedRole')) fill($('dropBlockedRole'), roles, 'Cargo bloqueado');
  if ($('dropBypassRole')) fill($('dropBypassRole'), roles, 'Cargo que ignora requisitos');
  if ($('partChannel')) fill($('partChannel'), ch, 'Canal');
  if ($('partRole')) fill($('partRole'), roles, 'Cargo');
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
      ? dropExtra
          .map((e, i) => {
            const rn = (data?.roles || []).find((r) => r.id === e.roleId)?.name || e.roleId;
            return '<div style="margin:.25rem 0">• <b>' + (e.label || rn) + '</b> (+' + e.entries + ') <a href="#" onclick="dropVipRm(' + i + ');return false" style="color:#f87171">remover</a></div>';
          })
          .join('')
      : 'Nenhum VIP com entrada extra';
  }
  if (blkEl) {
    blkEl.innerHTML = dropBlocked.length
      ? dropBlocked
          .map((id, i) => {
            const rn = (data?.roles || []).find((r) => r.id === id)?.name || id;
            return '<div style="margin:.25rem 0">• ' + rn + ' <a href="#" onclick="dropBlockedRm(' + i + ');return false" style="color:#f87171">remover</a></div>';
          })
          .join('')
      : 'Nenhum bloqueado';
  }
  if (bypEl) {
    bypEl.innerHTML = dropBypass.length
      ? dropBypass
          .map((id, i) => {
            const rn = (data?.roles || []).find((r) => r.id === id)?.name || id;
            return '<div style="margin:.25rem 0">• ' + rn + ' <a href="#" onclick="dropBypassRm(' + i + ');return false" style="color:#f87171">remover</a></div>';
          })
          .join('')
      : 'Nenhum cargo de bypass';
  }
}

function dropVipAdd() {
  const roleId = val('dropVipRole');
  const entries = Math.max(1, Math.floor(Number(val('dropVipEntries')) || 1));
  const label = val('dropVipLabel') || '';
  if (!roleId) return toast('Escolha um cargo VIP');
  if (dropExtra.some((e) => e.roleId === roleId)) return toast('Esse cargo já está na lista');
  dropExtra.push({ roleId, entries, label });
  dropRenderLists();
}
function dropVipRm(i) {
  dropExtra.splice(i, 1);
  dropRenderLists();
}
function dropBlockedAdd() {
  const roleId = val('dropBlockedRole');
  if (!roleId) return toast('Escolha um cargo');
  if (dropBlocked.includes(roleId)) return toast('Já bloqueado');
  dropBlocked.push(roleId);
  dropRenderLists();
}
function dropBlockedRm(i) {
  dropBlocked.splice(i, 1);
  dropRenderLists();
}
function dropBypassAdd() {
  const roleId = val('dropBypassRole');
  if (!roleId) return toast('Escolha um cargo');
  if (dropBypass.includes(roleId)) return toast('Já está na lista');
  dropBypass.push(roleId);
  dropRenderLists();
}
function dropBypassRm(i) {
  dropBypass.splice(i, 1);
  dropRenderLists();
}

function dropLoadFromSettings(s) {
  const d = s?.drops || {};
  if ($('dropEnabled')) $('dropEnabled').checked = d.enabled !== false;
  if ($('dropChannel')) $('dropChannel').value = d.channelId || '';
  if ($('dropMinLevel')) $('dropMinLevel').value = d.requirements?.minLevel || 0;
  dropExtra = Array.isArray(d.extraEntries)
    ? d.extraEntries.map((e) => ({
        roleId: String(e.roleId),
        entries: Math.max(1, Number(e.entries) || 1),
        label: e.label || e.name || ''
      }))
    : [];
  dropBlocked = Array.isArray(d.requirements?.blockedRoleIds)
    ? d.requirements.blockedRoleIds.map(String)
    : [];
  dropBypass = Array.isArray(d.requirements?.bypassRoleIds)
    ? d.requirements.bypassRoleIds.map(String)
    : [];
  dropRenderLists();
}

async function dropSave() {
  if (!gid) return toast('Selecione um servidor');
  const body = {
    enabled: $('dropEnabled')?.checked !== false,
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
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) return toast(j.error || 'Erro ao salvar');
  toast('Drops salvos');
}

function partLoadFromSettings(s) {
  const p = s?.partnership || {};
  if ($('partEnabled')) $('partEnabled').checked = p.enabled !== false;
  if ($('partChannel')) $('partChannel').value = p.channelId || '';
  if ($('partRole')) $('partRole').value = p.roleId || '';
  if ($('partPhrase'))
    $('partPhrase').value =
      p.phrase ||
      '🤝 **Nova parceria!**\nRepresentante: {rep}\nServidor: **{server}**\nConvite: {invite}';
  if ($('partImage')) $('partImage').value = p.image || '';
}

async function partSave() {
  if (!gid) return toast('Selecione um servidor');
  const body = {
    enabled: $('partEnabled')?.checked !== false,
    channelId: val('partChannel') || null,
    roleId: val('partRole') || null,
    phrase: val('partPhrase') || '',
    image: val('partImage') || null
  };
  const r = await fetch('/api/guild/' + gid + '/partnership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) return toast(j.error || 'Erro ao salvar');
  toast('Parcerias salvas');
}

loadMe().catch(() => (location.href = '/login'));
