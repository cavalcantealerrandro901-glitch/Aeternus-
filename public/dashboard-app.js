let gid = null, data = null;
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
  ['levels', '📢', 'Anúncio nível']
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
  if (id === 'me') loadDaily();
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
  const u = j.user;
  $('uchip').textContent =
    (u.global_name || u.username) + ' · ✨ ' + fmt(j.economy?.eter);
  $('meStats').innerHTML = `<div class="st"><span class="f">Éter</span><b>${fmt(
    j.economy?.eter
  )}</b></div><div class="st"><span class="f">Nível</span><b>${
    j.economy?.xp?.level || 0
  }</b></div><div class="st"><span class="f">XP</span><b>${fmt(
    j.economy?.xp?.xp
  )}</b></div>`;
  const p = j.economy?.progress;
  if (p)
    $('meXpLabel').textContent = `${fmt(p.current)}/${fmt(p.need)} XP (${p.pct}%)`;
}

async function loadDaily() {
  const r = await fetch('/api/daily' + (gid ? '?guildId=' + gid : ''));
  const j = await r.json();
  $('dailyStats').innerHTML = `<div class="st"><span class="f">Streak</span><b>${
    j.streak || 0
  }</b></div><div class="st"><span class="f">Faixa</span><b>${fmt(j.dailyMin)}–${fmt(
    j.dailyMax
  )}</b></div><div class="st"><span class="f">Mult</span><b>×${(
    j.multiplier || 1
  ).toFixed(2)}</b></div>`;
  if (j.available === false) {
    $('dailyHint').textContent = j.leftText || 'Já coletado';
    $('dailyBtn').disabled = true;
    $('dailyBtn').textContent = 'Já coletado';
  } else {
    $('dailyHint').textContent = 'Disponível · seq. ' + (j.nextStreak || 1);
    $('dailyBtn').disabled = false;
    $('dailyBtn').textContent = 'Coletar daily ✨';
  }
}

async function claimDaily() {
  $('dailyBtn').disabled = true;
  const r = await fetch('/api/daily/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId: gid })
  });
  const j = await r.json();
  if (!j.ok) {
    toast(j.error || 'Erro');
    $('dailyBtn').disabled = false;
    return;
  }
  toast('+' + fmt(j.amount) + ' éter');
  loadMe();
  loadDaily();
}

async function loadGuilds() {
  const r = await fetch('/api/guilds');
  const j = await r.json();
  $('gList').innerHTML =
    (j.guilds || [])
      .map(
        (g) =>
          `<div class="sys" onclick="sel('${g.id}')"><b>${g.name}</b><div class="hint">${g.memberCount} membros</div></div>`
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
  const s = data.settings,
    ch = data.channels || [],
    roles = data.roles || [],
    cats = data.categories || [];
  document.querySelectorAll('select').forEach((sel) => {
    if (/Role|arRole|vfRole|tkRole/.test(sel.id)) fill(sel, roles, 'Cargo');
    else if (sel.id === 'tkCat') fill(sel, cats, 'Categoria');
    else fill(sel, ch, 'Canal');
  });
  const on = (id, v) => {
    if ($(id)) $(id).checked = !!v;
  };
  on('wEnabled', s.welcome?.enabled);
  on('lvEnabled', s.leave?.enabled);
  on('arEnabled', s.autorole?.enabled);
  on('vfEnabled', s.verification?.enabled);
  on('sbEnabled', s.starboard?.enabled);
  on('sgEnabled', s.suggestions?.enabled);
  on('rpEnabled', s.reports?.enabled);
  on('tkEnabled', s.tickets?.enabled);
  on('anEnabled', s.antinuke?.enabled);
  on('bdEnabled', s.birthday?.enabled);
  on('ctEnabled', s.counting?.enabled);
  on('stEnabled', s.sticky?.enabled);
  on('mcEnabled', s.memberCounter?.enabled);
  on('rxEnabled', s.autoReact?.enabled);
  on('atEnabled', s.autoThread?.enabled);
  on('dmEnabled', s.dmWelcome?.enabled);
  on('mgEnabled', s.mentionGuard?.enabled);
  on('vhEnabled', s.voiceHub?.enabled);
  on('lv2Enabled', s.levels?.enabled !== false);
  const set = (id, v) => {
    if ($(id)) $(id).value = v ?? '';
  };
  set('wChannel', s.welcome?.channelId);
  set('wMsg', s.welcome?.message);
  set('lvChannel', s.leave?.channelId);
  set('lvMsg', s.leave?.message);
  set('arRole', s.autorole?.roleId);
  set('vfChannel', s.verification?.channelId);
  set('vfRole', s.verification?.roleId);
  set('sbChannel', s.starboard?.channelId);
  set('sbMin', s.starboard?.minStars || 3);
  set('sgChannel', s.suggestions?.channelId);
  set('rpChannel', s.reports?.channelId);
  set('tkCat', s.tickets?.categoryId);
  set('tkRole', s.tickets?.supportRoleId);
  set('anBans', s.antinuke?.maxBans || 3);
  set('bdChannel', s.birthday?.channelId);
  set('bdMsg', s.birthday?.message);
  set('ctChannel', s.counting?.channelId);
  set('stChannel', s.sticky?.channelId);
  set('stContent', s.sticky?.content);
  set('mcChannel', s.memberCounter?.channelId);
  set('rxChannel', s.autoReact?.channelId);
  set('atChannel', s.autoThread?.channelId);
  set('dmMsg', s.dmWelcome?.message);
  set('mgMax', s.mentionGuard?.maxMentions || 5);
  set('vhChannel', s.voiceHub?.channelId);
  set('lv2Channel', s.levels?.announceChannelId);
  set('prefixInput', s.prefix || 'O.');
  $('ovStats').innerHTML = `<div class="st"><span class="f">Prefixo</span><b>${
    s.prefix || 'O.'
  }</b></div><div class="st"><span class="f">Membros</span><b>${fmt(
    data.memberCount
  )}</b></div><div class="st"><span class="f">Sistemas</span><b>19</b></div>`;
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

function saveSys(id) {
  const P = {
    welcome: () => ({
      welcome: {
        enabled: $('wEnabled').checked,
        channelId: val('wChannel') || null,
        message: val('wMsg'),
        embed: true
      }
    }),
    leave: () => ({
      leave: {
        enabled: $('lvEnabled').checked,
        channelId: val('lvChannel') || null,
        message: val('lvMsg')
      }
    }),
    autorole: () => ({
      autorole: { enabled: $('arEnabled').checked, roleId: val('arRole') || null }
    }),
    verification: () => ({
      verification: {
        enabled: $('vfEnabled').checked,
        channelId: val('vfChannel') || null,
        roleId: val('vfRole') || null
      }
    }),
    starboard: () => ({
      starboard: {
        enabled: $('sbEnabled').checked,
        channelId: val('sbChannel') || null,
        minStars: +val('sbMin') || 3
      }
    }),
    suggestions: () => ({
      suggestions: {
        enabled: $('sgEnabled').checked,
        channelId: val('sgChannel') || null
      }
    }),
    reports: () => ({
      reports: {
        enabled: $('rpEnabled').checked,
        channelId: val('rpChannel') || null,
        anon: true
      }
    }),
    tickets: () => ({
      tickets: {
        enabled: $('tkEnabled').checked,
        categoryId: val('tkCat') || null,
        supportRoleId: val('tkRole') || null
      }
    }),
    antinuke: () => ({
      antinuke: { enabled: $('anEnabled').checked, maxBans: +val('anBans') || 3 }
    }),
    birthday: () => ({
      birthday: {
        enabled: $('bdEnabled').checked,
        channelId: val('bdChannel') || null,
        message: val('bdMsg')
      }
    }),
    counting: () => ({
      counting: {
        enabled: $('ctEnabled').checked,
        channelId: val('ctChannel') || null
      }
    }),
    sticky: () => ({
      sticky: {
        enabled: $('stEnabled').checked,
        channelId: val('stChannel') || null,
        content: val('stContent')
      }
    }),
    memberCounter: () => ({
      memberCounter: {
        enabled: $('mcEnabled').checked,
        channelId: val('mcChannel') || null
      }
    }),
    autoReact: () => ({
      autoReact: {
        enabled: $('rxEnabled').checked,
        channelId: val('rxChannel') || null
      }
    }),
    autoThread: () => ({
      autoThread: {
        enabled: $('atEnabled').checked,
        channelId: val('atChannel') || null
      }
    }),
    dmWelcome: () => ({
      dmWelcome: { enabled: $('dmEnabled').checked, message: val('dmMsg') }
    }),
    mentionGuard: () => ({
      mentionGuard: {
        enabled: $('mgEnabled').checked,
        maxMentions: +val('mgMax') || 5
      }
    }),
    voiceHub: () => ({
      voiceHub: {
        enabled: $('vhEnabled').checked,
        channelId: val('vhChannel') || null
      }
    }),
    levels: () => ({
      levels: {
        enabled: $('lv2Enabled').checked,
        announceChannelId: val('lv2Channel') || null
      }
    })
  };
  if (P[id]) save(P[id]());
}

renderHub();
loadMe();
loadGuilds();
