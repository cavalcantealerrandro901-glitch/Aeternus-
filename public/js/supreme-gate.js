(function () {
  const params = new URLSearchParams(location.search);
  const guildId = params.get('guild') || params.get('server');
  let cfg = null;
  let channels = [];
  let roles = [];

  const $ = (id) => document.getElementById(id);
  const toast = (m) => {
    const t = $('toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  };

  if (!guildId) {
    if ($('guildLabel')) $('guildLabel').textContent = 'Abra com ?guild=ID';
    return;
  }

  if ($('backDash')) $('backDash').href = '/dashboard?guild=' + encodeURIComponent(guildId);

  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = $('tab-' + btn.dataset.tab);
      if (tab) tab.classList.add('active');
    });
  });

  function fillSelect(sel, items, selected, ph) {
    if (!sel) return;
    sel.innerHTML =
      `<option value="">${ph || '—'}</option>` +
      items
        .map(
          (c) =>
            `<option value="${c.id}" ${String(selected) === String(c.id) ? 'selected' : ''}>${c.name}</option>`
        )
        .join('');
  }

  /** Páginas: título em linha #TITULO e cargos label|id|emoji */
  function pagesToText(pages) {
    return (pages || [])
      .map((p) => {
        const head = '#' + (p.title || 'Página');
        const lines = (p.roles || []).map((r) =>
          [r.label, r.roleId, r.emoji || ''].filter((x, i) => i < 2 || x).join('|')
        );
        return [head, ...lines].join('\n');
      })
      .join('\n\n');
  }

  function textToPages(text) {
    const pages = [];
    let cur = null;
    for (const raw of String(text || '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#')) {
        cur = { title: line.slice(1).trim() || 'Página', roles: [] };
        pages.push(cur);
        continue;
      }
      if (!cur) {
        cur = { title: 'Página 1', roles: [] };
        pages.push(cur);
      }
      const p = line.split('|').map((x) => x.trim());
      cur.roles.push({ label: p[0] || 'Cargo', roleId: p[1] || '', emoji: p[2] || undefined });
    }
    return pages.length ? pages : [];
  }

  function rulesToText(rules) {
    return (rules || []).map((r) => `${r.title}|${r.text}`).join('\n');
  }

  function textToRules(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf('|');
        if (i === -1) return { title: l, text: '' };
        return { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
      });
  }

  function applyForm() {
    if (!cfg) return;
    $('enabled').checked = !!cfg.enabled;
    $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';
    fillSelect($('wChannel'), channels, cfg.channelId, 'Canal do portal');
    fillSelect($('logChannel'), channels, cfg.logChannelId, 'Canal de logs');
    fillSelect($('roleVisitor'), roles, cfg.visitorRoleId, 'Visitante');
    fillSelect($('roleVerified'), roles, cfg.verifiedRoleId, 'Verificado');
    fillSelect($('exploreChannel'), channels, cfg.exploreChannelId, 'Canal explorar');
    if ($('sgColor')) $('sgColor').value = cfg.color || '#7c3aed';
    if ($('maxRoles')) $('maxRoles').value = cfg.maxRoles || 10;
    if ($('rolePages')) $('rolePages').value = pagesToText(cfg.rolePages);
    if ($('rulesText')) $('rulesText').value = rulesToText(cfg.rules);
  }

  function collect() {
    return {
      enabled: $('enabled').checked,
      channelId: $('wChannel').value || null,
      logChannelId: $('logChannel').value || null,
      visitorRoleId: $('roleVisitor').value || null,
      verifiedRoleId: $('roleVerified').value || null,
      exploreChannelId: $('exploreChannel')?.value || null,
      color: $('sgColor')?.value || '#7c3aed',
      maxRoles: parseInt($('maxRoles')?.value || '10', 10) || 10,
      rolePages: textToPages($('rolePages')?.value),
      rules: textToRules($('rulesText')?.value)
    };
  }

  async function load() {
    const [gate, data] = await Promise.all([
      fetch('/api/gate/' + guildId, { credentials: 'same-origin' }).then((r) => r.json()),
      fetch('/api/guild-data/' + guildId, { credentials: 'same-origin' }).then((r) => r.json())
    ]);
    cfg = gate.config || {};
    if (gate.stats) {
      if ($('stJoins')) $('stJoins').textContent = gate.stats.joins || 0;
      if ($('stLeaves')) $('stLeaves').textContent = gate.stats.leaves || 0;
      if ($('stVerified')) $('stVerified').textContent = gate.stats.verified || 0;
    }
    if ($('guildLabel')) $('guildLabel').textContent = (data.name || 'Servidor') + ' · ' + guildId;
    channels = (data.allChannels || []).filter(
      (c) => c.type === 0 || c.type === 5 || String(c.typeLabel || '').includes('Text')
    );
    if (!channels.length) channels = data.allChannels || [];
    roles = data.roles || [];
    applyForm();
  }

  $('btnSave')?.addEventListener('click', async () => {
    const config = collect();
    const res = await fetch('/api/gate/' + guildId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ config })
    }).then((r) => r.json());
    if (res.success) {
      cfg = res.config;
      $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';
      toast('💾 Jornada salva');
    } else toast(res.error || 'Erro');
  });

  $('btnTest')?.addEventListener('click', async () => {
    await fetch('/api/gate/' + guildId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ config: collect() })
    });
    const res = await fetch('/api/gate/' + guildId + '/test', {
      method: 'POST',
      credentials: 'same-origin'
    }).then((r) => r.json());
    toast(res.success ? '🧪 Teste enviado (aguarde 3s)' : res.error || 'Falha');
  });

  load().catch((e) => {
    console.error(e);
    if ($('guildLabel')) $('guildLabel').textContent = 'Erro — faça login no painel';
  });
})();
