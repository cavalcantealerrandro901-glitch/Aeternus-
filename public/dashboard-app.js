let gid = null, data = null, rrRoles = [];
const $ = (id) => document.getElementById(id);
const val = (id) => $(id)?.value ?? '';

const SYS_HUB = [
  ['welcome', '👋', 'Welcome'],
  ['leave', '🚪', 'Despedida'],
  ['autorole', '🎭', 'Autorole'],
  ['verification', '✅', 'Verificação'],
  ['starboard', '⭐', 'Starboard'],
  ['suggestions', '💡', 'Sugestões'],
  ['reports', '🚨', 'Denúncias'],
  ['tickets', '🎫', 'Tickets'],
  ['antinuke', '🛡️', 'Anti-nuke'],
  ['birthday', '🎂', 'Aniversários'],
  ['counting', '🔢', 'Contagem'],
  ['sticky', '📌', 'Sticky'],
  ['memberCounter', '👥', 'Contador'],
  ['autoReact', '😊', 'Auto-react'],
  ['autoThread', '💬', 'Auto-thread'],
  ['dmWelcome', '📩', 'DM welcome'],
  ['mentionGuard', '🚫', 'Menções'],
  ['voiceHub', '🔊', 'Voice hub'],
  ['levels', '📢', 'Anúncio nível'],
  ['reactionRoles', '💎', 'Cargos VIP']
];

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.className = 'toast show';
  setTimeout(() => (t.className = 'toast'), 2500);
}

function show(id) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach((b) => b.classList.remove('on'));
  $(id)?.classList.add('on');
  const b = [...document.querySelectorAll('.nb')].find((x) => x.dataset.p === id);
  if (b) b.classList.add('on');
}

document.querySelectorAll('.nb').forEach((b) => {
  b.onclick = () => {
    if (!b.disabled) show(b.dataset.p);
  };
});

function fill(sel, items, ph) {
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${ph || '…'}</option>` +
    (items || []).map((i) => `<option value="${i.id}">${i.name}</option>`).join('');
}

function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function renderHub() {
  const html = SYS_HUB.map(
    ([id, ic, nm]) =>
      `<div class="sys" onclick="show('${id}')">${ic} <b>${nm}</b></div>`
  ).join('');
  if ($('sysHub')) $('sysHub').innerHTML = html;
  if ($('ovHub')) $('ovHub').innerHTML = html;
}

async function loadMe() {
  const r = await fetch('/api/me');
  if (r.status === 401) return (location.href = '/login');
  const j = await r.json();
  const u = j.user || j;
  if ($('uchip')) $('uchip').textContent = u.global_name || u.username || 'Conta';
}

async function loadGuilds() {
  const r = await fetch('/api/guilds');
  if (r.status === 401) return (location.href = '/login');
  const j = await r.json();
  const list = Array.isArray(j) ? j : j.guilds || [];
  if (!list.length) {
    $('gList').innerHTML =
      '<p class="hint">Nenhum servidor com o bot. Convide o Aeternus e recarregue.</p>';
    return;
  }
  $('gList').innerHTML = list
    .map(
      (g) =>
        `<div class="sys" onclick="sel('${g.id}')"><b>${g.name}</b><div class="hint">${
          g.memberCount ? g.memberCount + ' membros' : 'Bot online'
        }</div></div>`
    )
    .join('');
}

async function sel(id) {
  gid = id;
  const r = await fetch('/api/guild/' + id);
  data = await r.json();
  if (data.error) return toast(data.error);
  document.querySelectorAll('.nb').forEach((b) => {
    if (b.dataset.p !== 'servers' && b.dataset.p !== 'me') b.disabled = false;
  });
  const s = data.settings || {},
    ch = data.channels || [],
    roles = data.roles || [],
    cats = data.categories || [];
  document.querySelectorAll('select').forEach((sel) => {
    if (/Role|arRole|vfRole|tkRole|rrRole/.test(sel.id)) fill(sel, roles, 'Cargo');
    else if (sel.id === 'tkCat') fill(sel, cats, 'Categoria');
    else fill(sel, ch, 'Canal');
  });

  rrRoles = Array.isArray(data.reactionRoles?.roles) ? data.reactionRoles.roles.slice() : [];
  if ($('rrEnabled')) $('rrEnabled').checked = data.reactionRoles?.enabled !== false;
  if ($('rrMulti')) $('rrMulti').checked = !!data.reactionRoles?.allowMultiple;
  if ($('rrChannel')) {
    fill($('rrChannel'), ch, 'Canal');
    $('rrChannel').value = data.reactionRoles?.channelId || '';
  }
  if ($('rrRole')) fill($('rrRole'), roles, 'Cargo VIP');
  if ($('rrMsg'))
    $('rrMsg').value =
      data.reactionRoles?.message ||
      'Reaja com o emoji do VIP que deseja receber.';
  rrRenderList();
  rrPreview();

  if ($('dropChannel')) fill($('dropChannel'), ch, 'Canal padrão');
  if ($('dropVipRole')) fill($('dropVipRole'), roles, 'Cargo VIP');
  if ($('dropBlockedRole')) fill($('dropBlockedRole'), roles, 'Cargo bloqueado');
  dropLoadFromSettings(s);

  if ($('prefixInput')) $('prefixInput').value = s.prefix || 'O.';
  if ($('ovStats'))
    $('ovStats').innerHTML = `<div class="st"><span class="f">Prefixo</span><b>${
      s.prefix || 'O.'
    }</b></div><div class="st"><span class="f">Membros</span><b>${fmt(
      data.memberCount
    )}</b></div>`;
  renderHub();
  show('overview');
  toast('Servidor pronto');
}

async function save(patch) {
  if (!gid) return toast('Escolha servidor');
  const r = await fetch('/api/guild/' + gid + '/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  const j = await r.json();
  toast(j.ok ? 'Salvo!' : j.error || 'Erro');
}

function savePrefix() {
  save({ prefix: (val('prefixInput') || 'O.').slice(0, 8) });
}

function rrRenderList() {
  const el = $('rrList');
  if (!el) return;
  if (!rrRoles.length) {
    el.innerHTML = '<span class="hint">Nenhum VIP na lista</span>';
    return;
  }
  el.innerHTML = rrRoles
    .map(
      (r, i) =>
        `<div class="tg"><span>${r.emoji} <b>${r.label || 'VIP'}</b></span>` +
        `<button type="button" class="btn" style="margin:0;padding:.3rem .6rem" onclick="rrRemove(${i})">Remover</button></div>`
    )
    .join('');
}

function rrAdd() {
  const roleId = val('rrRole');
  const emoji = val('rrEmoji').trim();
  const label = val('rrLabel').trim() || 'VIP';
  if (!roleId || !emoji) return toast('Escolha cargo e emoji');
  rrRoles = rrRoles.filter((r) => r.roleId !== roleId && r.emoji !== emoji);
  rrRoles.push({ roleId, emoji, label });
  if ($('rrEmoji')) $('rrEmoji').value = '';
  if ($('rrLabel')) $('rrLabel').value = '';
  rrRenderList();
  rrPreview();
}

function rrRemove(i) {
  rrRoles.splice(i, 1);
  rrRenderList();
  rrPreview();
}

function rrPreview() {
  const body = $('rrPrevBody');
  const em = $('rrPrevEmojis');
  if (body) body.textContent = val('rrMsg') || 'Reaja para receber o VIP.';
  if (em)
    em.innerHTML = rrRoles.map((r) => `<span>${r.emoji} ${r.label || ''}</span>`).join('');
}

async function rrSave() {
  if (!gid) return toast('Escolha servidor');
  const body = {
    enabled: $('rrEnabled')?.checked !== false,
    allowMultiple: !!$('rrMulti')?.checked,
    channelId: val('rrChannel') || null,
    message: val('rrMsg') || '',
    roles: rrRoles
  };
  const r = await fetch('/api/guild/' + gid + '/reaction-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  toast(j.ok ? 'VIPs salvos' : j.error || 'Erro');
}

async function rrPublish() {
  if (!gid) return toast('Escolha servidor');
  await rrSave();
  const r = await fetch('/api/guild/' + gid + '/reaction-roles/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const j = await r.json().catch(() => ({}));
  if ($('rrHint')) $('rrHint').textContent = j.ok ? 'Publicado no Discord.' : j.error || 'Falha';
  toast(j.ok ? 'Publicado!' : j.error || 'Erro');
}

/* ===== Drops (painel) ===== */
let dropExtra = [];
let dropBlocked = [];

function dropRenderLists() {
  const vipEl = $('dropVipList');
  const blkEl = $('dropBlockedList');
  if (vipEl) {
    vipEl.innerHTML = dropExtra.length
      ? dropExtra
          .map((e, i) => {
            const rn = (data?.roles || []).find((r) => r.id === e.roleId)?.name || e.roleId;
            return `<div style="margin:.25rem 0">• <b>${e.label || rn}</b> (+${e.entries}) <a href="#" onclick="dropVipRm(${i});return false" style="color:#f87171">remover</a></div>`;
          })
          .join('')
      : 'Nenhum VIP com entrada extra';
  }
  if (blkEl) {
    blkEl.innerHTML = dropBlocked.length
      ? dropBlocked
          .map((id, i) => {
            const rn = (data?.roles || []).find((r) => r.id === id)?.name || id;
            return `<div style="margin:.25rem 0">• ${rn} <a href="#" onclick="dropBlockedRm(${i});return false" style="color:#f87171">remover</a></div>`;
          })
          .join('')
      : 'Nenhum bloqueado';
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
  if ($('dropHint')) $('dropHint').textContent = 'Configuração aplicada aos próximos drops.';
}

loadMe();
loadGuilds();
renderHub();
