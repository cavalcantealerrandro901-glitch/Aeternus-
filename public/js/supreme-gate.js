(function () {
  const params = new URLSearchParams(location.search);
  const guildId = params.get('guild') || params.get('server');
  let cfg = null;
  let channels = [];
  let roles = [];

  const $ = (id) => document.getElementById(id);
  const toast = (m) => {
    const t = $('toast');
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  };

  if (!guildId) {
    $('guildLabel').textContent = 'Abra pelo painel de um servidor (?guild=ID)';
    return;
  }

  $('backDash').href = '/dashboard?guild=' + encodeURIComponent(guildId);

  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'preview') refreshPreview();
    });
  });

  function fillSelect(sel, items, selected, ph) {
    sel.innerHTML =
      `<option value="">${ph || '—'}</option>` +
      items
        .map(
          (c) =>
            `<option value="${c.id}" ${String(selected) === String(c.id) ? 'selected' : ''}>&nbsp;${c.name}</option>`
        )
        .join('');
  }

  function linesToRoles(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split('|').map((x) => x.trim());
        return { label: p[0] || 'Cargo', roleId: p[1] || '', emoji: p[2] || undefined };
      });
  }

  function rolesToLines(arr) {
    return (arr || [])
      .map((r) => [r.label, r.roleId, r.emoji || ''].filter((x, i) => i < 2 || x).join('|'))
      .join('\n');
  }

  function linesToRules(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split('|').map((x) => x.trim());
        if (p.length >= 3) return { emoji: p[0], title: p[1], text: p.slice(2).join('|') };
        return { emoji: '✦', title: p[0] || 'Regra', text: p[1] || '' };
      });
  }

  function rulesToLines(items) {
    return (items || []).map((r) => `${r.emoji || '✦'}|${r.title || ''}|${r.text || ''}`).join('\n');
  }

  function linesToButtons(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split('|').map((x) => x.trim());
        return {
          label: p[0] || 'Botão',
          style: p[1] || 'secondary',
          action: p[2] || 'rules',
          url: p[3] || ''
        };
      });
  }

  function buttonsToLines(btns) {
    return (btns || [])
      .map((b) => {
        const parts = [b.label, b.style || 'secondary', b.action || 'rules'];
        if (b.action === 'url' && b.url) parts.push(b.url);
        return parts.join('|');
      })
      .join('\n');
  }

  function applyToForm() {
    if (!cfg) return;
    $('enabled').checked = !!cfg.enabled;
    $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';

    const w = cfg.welcome || {};
    $('wEnabled').checked = w.enabled !== false;
    fillSelect($('wChannel'), channels, w.channelId, 'Canal boas-vindas');
    $('wTitle').value = w.title || '';
    $('wDesc').value = w.description || '';
    $('wColor').value = w.color || '#7c3aed';
    $('wFooter').value = w.footer || '';
    $('wImage').value = w.image || '';
    $('wPing').checked = w.ping !== false;
    $('wButtons').value = buttonsToLines(w.buttons);

    const l = cfg.leave || {};
    $('lEnabled').checked = l.enabled !== false;
    fillSelect($('lChannel'), channels, l.channelId, 'Canal saída');
    $('lTitle').value = l.title || '';
    $('lDesc').value = l.description || '';
    $('lColor').value = l.color || '#64748b';
    $('lFooter').value = l.footer || '';

    const r = cfg.rules || {};
    $('rTitle').value = r.title || '';
    $('rColor').value = r.color || '#38bdf8';
    $('rDm').checked = r.acceptDm !== false;
    $('rItems').value = rulesToLines(r.items);

    const rolesCfg = cfg.roles || {};
    fillSelect($('roleVisitor'), roles, rolesCfg.visitorId, 'Visitante');
    fillSelect($('roleVerified'), roles, rolesCfg.verifiedId, 'Verificado');
    $('roleInterests').value = rolesToLines(rolesCfg.interests);
    $('roleNotifs').value = rolesToLines(rolesCfg.notifications);

    const logs = cfg.logs || {};
    fillSelect($('logChannel'), channels, logs.channelId, 'Canal logs');
    $('logJoin').checked = logs.join !== false;
    $('logLeave').checked = logs.leave !== false;
    $('logVerify').checked = logs.verify !== false;
    $('logRoles').checked = logs.roles !== false;

    refreshPreview();
  }

  function collectConfig() {
    return {
      enabled: $('enabled').checked,
      theme: (cfg && cfg.theme) || 'arcano',
      welcome: {
        enabled: $('wEnabled').checked,
        channelId: $('wChannel').value || null,
        title: $('wTitle').value,
        description: $('wDesc').value,
        color: $('wColor').value || '#7c3aed',
        footer: $('wFooter').value,
        image: $('wImage').value,
        thumbnail: 'avatar',
        ping: $('wPing').checked,
        buttons: linesToButtons($('wButtons').value)
      },
      leave: {
        enabled: $('lEnabled').checked,
        channelId: $('lChannel').value || null,
        title: $('lTitle').value,
        description: $('lDesc').value,
        color: $('lColor').value || '#64748b',
        footer: $('lFooter').value
      },
      rules: {
        title: $('rTitle').value,
        color: $('rColor').value || '#38bdf8',
        acceptDm: $('rDm').checked,
        items: linesToRules($('rItems').value),
        acceptLabel: '✅ ACEITAR REGRAS'
      },
      roles: {
        visitorId: $('roleVisitor').value || null,
        verifiedId: $('roleVerified').value || null,
        interests: linesToRoles($('roleInterests').value),
        notifications: linesToRoles($('roleNotifs').value),
        interestMin: 0,
        interestMax: 6,
        notifyMin: 0,
        notifyMax: 6
      },
      logs: {
        channelId: $('logChannel').value || null,
        join: $('logJoin').checked,
        leave: $('logLeave').checked,
        rules: true,
        roles: $('logRoles').checked,
        verify: $('logVerify').checked,
        errors: true
      }
    };
  }

  function refreshPreview() {
    $('pTitle').textContent = $('wTitle').value || '—';
    $('pDesc').textContent = ($('wDesc').value || '—')
      .replace(/{user}/g, '@Você')
      .replace(/{username}/g, 'Você')
      .replace(/{displayName}/g, 'Você')
      .replace(/{server}/g, 'Servidor')
      .replace(/{memberCount}/g, '100');
    $('pFoot').textContent = $('wFooter').value || '';
    const btns = linesToButtons($('wButtons').value);
    $('pBtns').innerHTML = btns.map((b) => `<span>${b.label}</span>`).join('');
    $('previewBox').style.borderLeft = '4px solid ' + ($('wColor').value || '#7c3aed');
  }

  async function load() {
    const [gate, data] = await Promise.all([
      fetch('/api/gate/' + guildId, { credentials: 'same-origin' }).then((r) => r.json()),
      fetch('/api/guild-data/' + guildId, { credentials: 'same-origin' }).then((r) => r.json())
    ]);

    cfg = gate.config || {};
    if (gate.stats) {
      $('stJoins').textContent = gate.stats.joins || 0;
      $('stLeaves').textContent = gate.stats.leaves || 0;
      $('stVerified').textContent = gate.stats.verified || 0;
    }

    $('guildLabel').textContent = (data.name || 'Servidor') + ' · ' + guildId;

    channels = (data.allChannels || []).filter(
      (c) => c.type === 0 || c.type === 5 || String(c.typeLabel || '').includes('Text')
    );
    if (!channels.length) channels = data.allChannels || [];
    roles = data.roles || [];

    applyToForm();
  }

  $('btnSave').onclick = async () => {
    const config = collectConfig();
    const res = await fetch('/api/gate/' + guildId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ config })
    }).then((r) => r.json());
    if (res.success) {
      cfg = res.config;
      $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';
      toast('💾 SUPREME GATE salvo');
    } else toast(res.error || 'Erro');
  };

  $('btnTest').onclick = async () => {
    await $('btnSave').onclick();
    const res = await fetch('/api/gate/' + guildId + '/test', {
      method: 'POST',
      credentials: 'same-origin'
    }).then((r) => r.json());
    if (res.success) toast('🧪 Mensagem de teste enviada');
    else toast(res.error || 'Falha no teste');
  };

  $('btnRefreshPreview').onclick = refreshPreview;

  load().catch((e) => {
    console.error(e);
    $('guildLabel').textContent = 'Erro ao carregar — faça login no painel';
  });
})();
