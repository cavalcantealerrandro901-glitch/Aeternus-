/** Aeternus Panel */
(function () {
  const params = new URLSearchParams(location.search);
  const guildId = params.get('guild') || params.get('server');
  let settings = {};
  let textChannels = [];
  let roles = [];
  let categories = [];

  const $ = (id) => document.getElementById(id);

  function showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg || 'Salvo';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function fillSelect(select, items, selected, placeholder, labelFn) {
    if (!select) return;
    const lab = labelFn || ((c) => c.name);
    select.innerHTML = [`<option value="">${placeholder || '— Selecionar —'}</option>`]
      .concat(
        items.map(
          (c) =>
            `<option value="${c.id}" ${String(selected) === String(c.id) ? 'selected' : ''}>${escapeHtml(lab(c))}</option>`
        )
      )
      .join('');
  }

  function applySettings() {
    document.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.getAttribute('data-key');
      const val = settings[key];
      if (el.type === 'checkbox') el.checked = val === true || val === 'true';
      else if (val !== undefined && val !== null) el.value = val;
    });
  }

  async function saveKeys(keys) {
    if (!guildId) return alert('Servidor não selecionado');
    for (const key of keys) {
      const el = document.querySelector(`[data-key="${key}"]`);
      if (!el) continue;
      const value = el.type === 'checkbox' ? el.checked : el.value;
      await fetch('/api/set-setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ guildId, key, value })
      });
      settings[key] = value;
    }
    toast('💾 Salvo com sucesso');
  }

  async function load() {
    if (!guildId) {
      if ($('gName')) $('gName').textContent = 'Nenhum servidor';
      return;
    }

    const det = await fetch('/api/guild-details/' + encodeURIComponent(guildId), {
      credentials: 'same-origin'
    }).then((r) => r.json());

    if (det.settings) settings = { ...det.settings };

    if (det.guild) {
      const g = det.guild;
      if (g.icon) $('gIcon').src = g.icon;
      $('gName').textContent = g.name || 'Servidor';
      $('gId').textContent = 'ID: ' + g.id;
      $('gMembers').textContent = g.memberCount ?? '—';
      $('gRoles').textContent = g.rolesCount ?? '—';
      $('gChannels').textContent = g.channelsCount ?? '—';
      $('gJoined').textContent = g.joinedAt || '—';
      if (g.prefix) settings.prefix = g.prefix;
    }

    if (det.bot) {
      if (det.bot.avatar) $('botAvatar').src = det.bot.avatar;
      $('botName').textContent = det.bot.name || det.bot.username || 'Bot';
      $('botMeta').textContent =
        (det.bot.tag ? '@' + det.bot.tag + ' · ' : '') +
        `Ping ${det.bot.ping ?? '—'}ms`;
    }

    try {
      const gd = await fetch('/api/guild-data/' + encodeURIComponent(guildId), {
        credentials: 'same-origin'
      }).then((r) => r.json());
      if (Array.isArray(gd.allChannels)) {
        textChannels = gd.allChannels.filter(
          (c) => c.type === 0 || c.type === 5 || String(c.typeLabel || '').includes('Text')
        );
        if (!textChannels.length) textChannels = gd.allChannels;
      }
      if (Array.isArray(gd.roles)) roles = gd.roles;
    } catch (_) {}

    try {
      const cat = await fetch('/api/guild/' + encodeURIComponent(guildId) + '/categories', {
        credentials: 'same-origin'
      }).then((r) => r.json());
      categories = cat.categories || [];
    } catch (_) {}

    // roles fallback via guild-details if needed
    try {
      const rr = await fetch('/api/guild/' + encodeURIComponent(guildId) + '/roles', {
        credentials: 'same-origin'
      }).then((r) => r.json());
      if (Array.isArray(rr.roles)) roles = rr.roles;
    } catch (_) {}

    const chSel = (id, key, ph) => fillSelect($(id), textChannels, settings[key], ph);
    chSel('welcomeChannel', 'welcomeChannel', 'Canal de boas-vindas');
    chSel('msgLogChannel', 'msgLogChannel', 'Canal de logs');
    chSel('modLogChannel', 'modLogChannel', 'Canal moderação');
    chSel('memberLogChannel', 'memberLogChannel', 'Canal membros');
    chSel('sgChannel', 'sgChannel', 'Canal do portal GATE');
    chSel('sgLogChannel', 'sgLogChannel', 'Canal de logs GATE');

    fillSelect($('sgVisitorRole'), roles, settings.sgVisitorRole, 'Cargo visitante', (r) => r.name);
    fillSelect($('sgVerifiedRole'), roles, settings.sgVerifiedRole, 'Cargo verificado', (r) => r.name);
    fillSelect($('musicCategory'), categories, settings.musicCategory, 'Categoria música', (c) => '📁 ' + c.name);

    applySettings();
    if ($('prefix') && !$('prefix').value) $('prefix').value = settings.prefix || 'O.';
  }

  document.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.getAttribute('data-open')));
  });
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => showView('home'));
  });

  $('saveGeral')?.addEventListener('click', () => saveKeys(['prefix']));
  $('saveWelcome')?.addEventListener('click', () =>
    saveKeys(['welcomeEnabled', 'welcomeChannel', 'welcomeTitle', 'welcomeMessage'])
  );
  $('saveLogs')?.addEventListener('click', () =>
    saveKeys([
      'msgLogEnabled',
      'msgLogChannel',
      'modLogEnabled',
      'modLogChannel',
      'memberLogEnabled',
      'memberLogChannel'
    ])
  );
  $('saveMusic')?.addEventListener('click', () => saveKeys(['musicCategory', 'musicMaxQueue']));
  $('saveGate')?.addEventListener('click', () =>
    saveKeys([
      'sgEnabled',
      'sgChannel',
      'sgLogChannel',
      'sgVisitorRole',
      'sgVerifiedRole',
      'sgTitle',
      'sgMessage',
      'sgRulesText',
      'sgColor',
      'sgInterestRoles',
      'sgNotifyRoles'
    ])
  );

  load().catch((e) => {
    console.error(e);
    if ($('gName')) $('gName').textContent = 'Erro ao carregar';
  });
})();
