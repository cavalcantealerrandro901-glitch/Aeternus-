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
    if ($('guildLabel')) $('guildLabel').textContent = 'Abra pelo painel (?guild=ID)';
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

  /** Páginas de cargos: --- TÍTULO --- e linhas nome|id|emoji */
  function pagesToText(pages) {
    if (!pages || !pages.length) return '';
    return pages
      .map((p) => {
        const head = `--- ${p.title || 'PÁGINA'} ---`;
        const lines = (p.items || [])
          .map((i) => [i.label, i.roleId, i.emoji || ''].filter((x, idx) => idx < 2 || x).join('|'))
          .join('\n');
        return head + '\n' + lines;
      })
      .join('\n\n');
  }

  function textToPages(text) {
    const pages = [];
    let cur = null;
    for (const raw of String(text || '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^---+\s*(.+)\s*---+$/);
      if (m) {
        cur = { title: m[1].trim(), items: [] };
        pages.push(cur);
        continue;
      }
      if (!cur) {
        cur = { title: 'CARGOS', items: [] };
        pages.push(cur);
      }
      const p = line.split('|').map((x) => x.trim());
      cur.items.push({ label: p[0] || 'Cargo', roleId: p[1] || '', emoji: p[2] || undefined });
    }
    return pages;
  }

  function rulesToText(items) {
    return (items || []).map((r) => `${r.title || 'Regra'}|${r.text || ''}`).join('\n');
  }

  function textToRules(text) {
    return String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split('|').map((x) => x.trim());
        return { title: p[0] || 'Regra', text: p.slice(1).join('|') || '' };
      });
  }

  function applyToForm() {
    if (!cfg) return;
    $('enabled').checked = !!cfg.enabled;
    $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';

    fillSelect($('wChannel'), channels, cfg.welcome?.channelId, 'Canal do portal');
    if ($('wColor')) $('wColor').value = cfg.welcome?.color || '#7c3aed';
    if ($('wPing')) $('wPing').checked = cfg.welcome?.ping !== false;

    fillSelect($('lChannel'), channels, cfg.leave?.channelId, 'Canal saída');
    if ($('lTitle')) $('lTitle').value = cfg.leave?.title || '';
    if ($('lDesc')) $('lDesc').value = cfg.leave?.description || '';
    if ($('lColor')) $('lColor').value = cfg.leave?.color || '#64748b';

    if ($('rolePages')) $('rolePages').value = pagesToText(cfg.roles?.pages);
    if ($('roleMax')) $('roleMax').value = cfg.roles?.maxSelect || 15;
    fillSelect($('roleVisitor'), roles, cfg.roles?.visitorId, 'Visitante');
    fillSelect($('roleVerified'), roles, cfg.roles?.verifiedId, 'Verificado');

    if ($('rItems')) $('rItems').value = rulesToText(cfg.rules?.items);
    if ($('rColor')) $('rColor').value = cfg.rules?.color || '#38bdf8';

    fillSelect($('logChannel'), channels, cfg.logs?.channelId, 'Canal logs');
  }

  function collectConfig() {
    return {
      enabled: $('enabled').checked,
      welcome: {
        enabled: true,
        channelId: $('wChannel')?.value || null,
        color: $('wColor')?.value || '#7c3aed',
        ping: $('wPing') ? $('wPing').checked : true
      },
      leave: {
        enabled: true,
        channelId: $('lChannel')?.value || null,
        title: $('lTitle')?.value || '🌙 UMA JORNADA CHEGOU AO FIM',
        description: $('lDesc')?.value || '**{username}** deixou **{server}**.',
        color: $('lColor')?.value || '#64748b',
        footer: 'SUPREME GATE'
      },
      roles: {
        visitorId: $('roleVisitor')?.value || null,
        verifiedId: $('roleVerified')?.value || null,
        maxSelect: parseInt($('roleMax')?.value || '15', 10) || 15,
        pages: textToPages($('rolePages')?.value || '')
      },
      rules: {
        color: $('rColor')?.value || '#38bdf8',
        items: textToRules($('rItems')?.value || '')
      },
      logs: {
        channelId: $('logChannel')?.value || null,
        join: true,
        leave: true,
        rules: true,
        roles: true,
        verify: true
      }
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
    applyToForm();
  }

  if ($('btnSave')) {
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
        if ($('stStatus')) $('stStatus').textContent = cfg.enabled ? 'ON' : 'OFF';
        toast('💾 Salvo');
      } else toast(res.error || 'Erro');
    };
  }

  if ($('btnTest')) {
    $('btnTest').onclick = async () => {
      if ($('btnSave')) await $('btnSave').onclick();
      const res = await fetch('/api/gate/' + guildId + '/test', {
        method: 'POST',
        credentials: 'same-origin'
      }).then((r) => r.json());
      toast(res.success ? '🧪 Fluxo de teste iniciado' : res.error || 'Falha');
    };
  }

  load().catch((e) => {
    console.error(e);
    if ($('guildLabel')) $('guildLabel').textContent = 'Erro — faça login no painel';
  });
})();
