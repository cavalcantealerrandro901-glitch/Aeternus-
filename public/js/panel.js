/**
 * Aeternus Panel — lógica unificada do dashboard
 */
(function () {
  const params = new URLSearchParams(location.search);
  const guildId = params.get('guild') || params.get('server');
  let settings = {};
  let textChannels = [];
  let voiceChannels = [];

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

  function fillSelect(select, channels, selected, placeholder) {
    if (!select) return;
    const opts = [`<option value="">${placeholder || '— Selecionar —'}</option>`]
      .concat(
        channels.map(
          (c) =>
            `<option value="${c.id}" ${String(selected) === String(c.id) ? 'selected' : ''}>#${escapeHtml(c.name)}</option>`
        )
      );
    select.innerHTML = opts.join('');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
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
      $('gName').textContent = 'Nenhum servidor';
      return;
    }

    // detalhes
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
    } else {
      $('gName').textContent = 'Bot não está neste servidor';
    }

    if (det.bot) {
      if (det.bot.avatar) $('botAvatar').src = det.bot.avatar;
      $('botName').textContent = det.bot.name || det.bot.username || 'Bot';
      $('botMeta').textContent =
        (det.bot.tag ? '@' + det.bot.tag + ' · ' : '') +
        `Ping ${det.bot.ping ?? '—'}ms · Uptime ${det.bot.uptime || '—'}`;
    }

    // canais de texto (guild-data se existir)
    try {
      const gd = await fetch('/api/guild-data/' + encodeURIComponent(guildId), {
        credentials: 'same-origin'
      }).then((r) => r.json());
      if (Array.isArray(gd.allChannels)) {
        textChannels = gd.allChannels.filter((c) => c.type === 0 || c.type === 5 || c.typeLabel?.includes('Text'));
        if (!textChannels.length) textChannels = gd.allChannels;
      }
    } catch (_) {}

    // voz
    try {
      const vc = await fetch('/api/guild/' + encodeURIComponent(guildId) + '/voice-channels', {
        credentials: 'same-origin'
      }).then((r) => r.json());
      voiceChannels = vc.channels || [];
    } catch (_) {}

    // se não veio lista de texto, tenta voice endpoint only — selects ficam vazios ok

    fillSelect($('welcomeChannel'), textChannels, settings.welcomeChannel, 'Canal de boas-vindas');
    fillSelect($('msgLogChannel'), textChannels, settings.msgLogChannel, 'Canal de logs');
    fillSelect($('modLogChannel'), textChannels, settings.modLogChannel, 'Canal de moderação');
    fillSelect($('memberLogChannel'), textChannels, settings.memberLogChannel, 'Canal de membros');
    fillSelect($('musicVoiceChannel'), voiceChannels, settings.musicVoiceChannel, 'Canal de voz');

    applySettings();
    if (!$('prefix').value) $('prefix').value = settings.prefix || 'O.';
    if (!$('musicMaxQueue').value) $('musicMaxQueue').value = settings.musicMaxQueue || 50;
  }

  // nav
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
  $('saveMusic')?.addEventListener('click', () => saveKeys(['musicVoiceChannel', 'musicMaxQueue']));

  load().catch((e) => {
    console.error(e);
    $('gName').textContent = 'Erro ao carregar';
  });
})();
