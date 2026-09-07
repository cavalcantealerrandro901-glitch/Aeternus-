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
  const j = await r.json();
  $('gList').innerHTML =
    (j.guilds || [])
      .map(
        (g) =>
          `<div class="sys" onclick="sel('${g.id}')"><b>${g.name}</b><div class="hint">${g.memberCount || ''} membros</div></div>`
      )
      .join('') || '<p class="hint">Nenhum servidor</p>';
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
  toast('Adicionado à lista — clique Salvar');
}

function rrRemove(i) {
  rrRoles.splice(i, 1);
  rrRenderList();
  rrPreview();
}

async function rrSave() {
  if (!gid) return toast('Escolha servidor');
  const body = {
    enabled: $('rrEnabled')?.checked !== false,
    channelId: val('rrChannel') || null,
    allowMultiple: !!$('rrMulti')?.checked,
    message: (val('rrMsg') || '').trim() || 'Reaja com o emoji do VIP que deseja receber.',
    roles: rrRoles
  };
  const r = await fetch('/api/guild/' + gid + '/reaction-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (j.ok) {
    if (j.config?.roles) rrRoles = j.config.roles;
    rrRenderList();
    rrPreview();
    toast('Salvo!');
  } else toast(j.error || 'Erro ao salvar');
}

async function rrPublish() {
  if (!gid) return toast('Escolha servidor');
  await rrSave();
  const r = await fetch('/api/guild/' + gid + '/reaction-roles/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const j = await r.json();
  if (j.ok) {
    toast('Painel publicado!');
    if ($('rrHint'))
      $('rrHint').textContent =
        'Mensagem no canal. Membros já podem reagir para receber o cargo.';
  } else toast(j.error || 'Erro ao publicar');
}

function rrPreview() {
  const body = $('rrPrevBody');
  const emos = $('rrPrevEmojis');
  if (!body) return;
  const msg =
    (val('rrMsg') || '').trim() ||
    'Reaja com o emoji do VIP que deseja receber.';
  const multi = !!$('rrMulti')?.checked;
  let text = msg + '\n';
  if (rrRoles.length) {
    text += '\n';
    for (const r of rrRoles) {
      text += r.emoji + ' → ' + (r.label || 'VIP') + '\n';
    }
  } else {
    text += '\n(Nenhum VIP na lista ainda)';
  }
  text += multi
    ? '\nVocê pode escolher mais de um VIP.'
    : '\nApenas um VIP por vez. Ao escolher outro, o anterior é removido.';
  body.textContent = text.trim();
  if (emos) {
    emos.innerHTML = rrRoles.length
      ? rrRoles.map((r) => '<span>' + r.emoji + '</span>').join('')
      : '';
  }
}

renderHub();
loadMe();
loadGuilds();
