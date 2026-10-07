document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const loading = $('loading-state');
  const content = $('admin-content');
  const errors = $('error-state');
  const id = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  let shopEnabled = true;

  async function api(url, options) {
    const r = await fetch(url, options);
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(b.error || 'Falha na solicitação.');
    return b;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  async function load() {
    try {
      const me = await api('/api/me');
      if (!me.authenticated) {
        location.href = '/login?returnTo=' + encodeURIComponent(location.pathname);
        return;
      }

      $('admin-user').textContent = '👤 ' + (me.user.global_name || me.user.username);
      const guild = await api('/api/guild/' + encodeURIComponent(id));

      $('selected-server-name').textContent = guild.name;
      $('selected-server-description').textContent = guild.description || 'Painel de administração do servidor selecionado.';
      $('server-members').textContent = guild.memberCount ?? '—';
      $('server-channels').textContent = guild.channelCount ?? '—';
      $('server-roles').textContent = guild.roleCount ?? '—';
      $('server-boost').textContent = guild.premiumTierLabel || 'Nenhum';
      $('detail-name').textContent = guild.name;
      $('detail-id').textContent = guild.id;
      $('detail-owner').textContent = guild.ownerTag || guild.ownerId || '—';
      $('detail-created').textContent = formatDate(guild.createdAt);
      $('detail-prefix').textContent = guild.prefix || 'O.';
      $('detail-locale').textContent = guild.preferredLocale || '—';

      if (guild.icon) {
        $('server-icon').src = guild.icon;
        $('server-icon').classList.remove('hidden');
      }

      const daily = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/daily');
      $('daily-min').value = daily.dailyMin;
      $('daily-max').value = daily.dailyMax;

      const drops = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/drops').catch(() => null);
      if (drops) { dropData = drops; }

      const shop = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/shop');
      shopEnabled = shop.enabled;
      $('shop-status').textContent = shopEnabled ? '🟢 Loja ativa' : '🔴 Loja desativada';
      $('shop-vips').textContent = shop.vipCount + ' VIP(s) cadastrados';
      $('toggle-shop').textContent = shopEnabled ? 'Desativar loja' : 'Ativar loja';
      $('open-shop-panel').href = '/itens?guild=' + encodeURIComponent(id);
      await loadDrops();

      loading.classList.add('hidden');
      content.classList.remove('hidden');
    } catch (e) {
      loading.classList.add('hidden');
      $('error-message').textContent = e.message;
      errors.classList.remove('hidden');
    }
  }

  $('save-daily').addEventListener('click', async () => {
    try {
      const r = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyMin: Number($('daily-min').value), dailyMax: Number($('daily-max').value) })
      });
      $('daily-min').value = r.dailyMin;
      $('daily-max').value = r.dailyMax;
      $('daily-status').textContent = '✓ Alterações salvas';
      setTimeout(() => $('daily-status').textContent = '', 2500);
    } catch (e) {
      $('daily-status').textContent = '✕ ' + e.message;
    }
  });

  $('toggle-shop').addEventListener('click', async () => {
    try {
      const r = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !shopEnabled })
      });
      shopEnabled = r.enabled;
      $('shop-status').textContent = shopEnabled ? '🟢 Loja ativa' : '🔴 Loja desativada';
      $('toggle-shop').textContent = shopEnabled ? 'Desativar loja' : 'Ativar loja';
      $('shop-feedback').textContent = '✓ Alterações salvas';
      setTimeout(() => $('shop-feedback').textContent = '', 2500);
    } catch (e) {
      $('shop-feedback').textContent = '✕ ' + e.message;
    }
  });

  let dropData = null;

  function fillMultiSelect(id, roles, selected) {
    const el = $(id);
    el.innerHTML = '';
    const set = new Set((selected || []).map(String));
    roles.forEach((role) => {
      const opt = document.createElement('option');
      opt.value = role.id;
      opt.textContent = '@' + role.name;
      opt.selected = set.has(String(role.id));
      el.appendChild(opt);
    });
  }

  function selectedValues(id) {
    return Array.from($(id).selectedOptions).map((o) => o.value);
  }

  function renderExtraEntries(items) {
    const wrap = $('drop-extra-entries');
    wrap.innerHTML = '';
    $('drop-entry-empty').style.display = items.length ? 'none' : 'block';
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'repeat-row';
      row.innerHTML = '<select class="entry-role"></select><input class="entry-count" type="number" min="1" max="100" value="' + Math.max(1, Number(item.entries) || 1) + '" aria-label="Quantidade de entradas"><input class="entry-label" maxlength="60" placeholder="Nome opcional" value="' + String(item.label || '').replace(/"/g, '&quot;') + '"><button type="button" class="btn btn-danger entry-remove">Remover</button>';
      const select = row.querySelector('.entry-role');
      (dropData.roles || []).forEach((role) => {
        const opt = document.createElement('option');
        opt.value = role.id;
        opt.textContent = '@' + role.name;
        opt.selected = String(role.id) === String(item.roleId);
        select.appendChild(opt);
      });
      row.querySelector('.entry-remove').addEventListener('click', () => {
        row.remove();
        if (!wrap.children.length) $('drop-entry-empty').style.display = 'block';
      });
      wrap.appendChild(row);
    });
  }

  function renderTemplates(items) {
    const wrap = $('drop-templates');
    wrap.innerHTML = '';
    items.forEach((template, index) => {
      const card = document.createElement('div');
      card.className = 'template-editor';
      card.dataset.id = template.id;
      card.innerHTML = '<div class="template-editor-top"><input class="template-name" maxlength="60" value="' + String(template.name || '').replace(/"/g, '&quot;') + '"><button type="button" class="btn btn-danger template-remove">Excluir</button></div>' +
        '<div class="form-grid"><label>Título<input class="template-title" maxlength="256" value="' + String(template.title || '').replace(/"/g, '&quot;') + '"></label>' +
        '<label>Cor<input class="template-color" type="color" value="' + (/^#[0-9a-fA-F]{6}$/.test(template.color || '') ? template.color : '#8B5CF6') + '"></label></div>' +
        '<label>Descrição<textarea class="template-description" rows="4" maxlength="4000">' + String(template.description || '') + '</textarea></label>' +
        '<label>Rodapé<input class="template-footer" maxlength="2048" value="' + String(template.footer || '').replace(/"/g, '&quot;') + '"></label>';
      card.querySelector('.template-remove').addEventListener('click', () => {
        if (wrap.children.length <= 1) return;
        card.remove();
        syncTemplateSelector();
      });
      wrap.appendChild(card);
    });
    syncTemplateSelector();
  }

  function collectTemplates() {
    return Array.from(document.querySelectorAll('.template-editor')).map((card, i) => ({
      id: card.dataset.id || 'template-' + (i + 1),
      name: card.querySelector('.template-name').value.trim() || 'Modelo ' + (i + 1),
      title: card.querySelector('.template-title').value,
      description: card.querySelector('.template-description').value,
      footer: card.querySelector('.template-footer').value,
      color: card.querySelector('.template-color').value
    }));
  }

  function syncTemplateSelector() {
    const selector = $('drop-template');
    const current = selector.value || (dropData && dropData.templateId);
    selector.innerHTML = '';
    Array.from(document.querySelectorAll('.template-editor')).forEach((card) => {
      const opt = document.createElement('option');
      opt.value = card.dataset.id;
      opt.textContent = card.querySelector('.template-name').value || 'Modelo';
      selector.appendChild(opt);
    });
    if (current && Array.from(selector.options).some((o) => o.value === current)) selector.value = current;
  }

  async function loadDrops() {
    const d = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/drops');
    dropData = d;
    $('drop-enabled').checked = d.enabled !== false;
    $('drop-prefix').value = d.activationPrefix || 'O.';
    $('drop-channel').innerHTML = '<option value="">Usar o canal onde o comando foi executado</option>' + (d.channels || []).map(ch => '<option value="' + ch.id + '">' + ch.name.replace(/</g, '&lt;') + '</option>').join('');
    $('drop-channel').value = d.channelId || '';
    $('drop-color').value = /^#[0-9a-fA-F]{6}$/.test(d.embedColor || '') ? d.embedColor : '#8B5CF6';
    const r = d.requirements || {};
    $('drop-min-day').value = r.minMessagesDay || 0;
    $('drop-min-week').value = r.minMessagesWeek || 0;
    $('drop-min-month').value = r.minMessagesMonth || 0;
    $('drop-min-level').value = r.minLevel || 0;
    $('drop-account-age').value = r.accountAgeDays || 0;
    $('drop-min-invites').value = r.minInvites || 0;
    $('drop-min-flocos').value = r.minFlocos || 0;
    $('drop-min-cristais').value = r.minCristais || 0;
    fillMultiSelect('drop-required-roles', d.roles, r.requiredRoleIds);
    fillMultiSelect('drop-bypass-roles', d.roles, r.bypassRoleIds);
    fillMultiSelect('drop-blocked-roles', d.roles, r.blockedRoleIds);
    renderExtraEntries(d.extraEntries || []);
    renderTemplates(d.templates || []);
    $('drop-template').value = d.templateId || 'default';
    $('drop-winner-title').value = d.winnerTitle || '';
    $('drop-winner-result-color').value = /^#[0-9a-fA-F]{6}$/.test(d.winnerResultColor || '') ? d.winnerResultColor : (d.embedColor || '#8B5CF6');
    $('drop-winner-image').value = d.winnerImage || '';
    $('drop-winner-banner').value = d.winnerBanner || '';
    $('drop-winner-message').value = d.winnerMessage || '';
    $('drop-winner-mention').checked = d.winnerMention !== false;
    $('drop-winner-dm').checked = d.winnerDm !== false;
    $('drop-result-separate').checked = d.resultSeparate !== false;
    $('drop-reroll-enabled').checked = d.rerollEnabled !== false;
    $('drop-max-rerolls').value = Number.isFinite(Number(d.maxRerolls)) ? Math.max(0, Number(d.maxRerolls)) : 3;
    $('drop-delivery-failure').value = d.deliveryFailureMessage || '';
  }

  $('add-drop-entry').addEventListener('click', () => {
    $('drop-entry-empty').style.display = 'none';
    const wrap = $('drop-extra-entries');
    const row = document.createElement('div');
    row.className = 'repeat-row';
    row.innerHTML = '<select class="entry-role"></select><input class="entry-count" type="number" min="1" max="100" value="1" aria-label="Quantidade de entradas"><input class="entry-label" maxlength="60" placeholder="Nome opcional"><button type="button" class="btn btn-danger entry-remove">Remover</button>';
    (dropData.roles || []).forEach(role => {
      const opt = document.createElement('option');
      opt.value = role.id;
      opt.textContent = '@' + role.name;
      row.querySelector('.entry-role').appendChild(opt);
    });
    row.querySelector('.entry-remove').addEventListener('click', () => { row.remove(); if (!wrap.children.length) $('drop-entry-empty').style.display = 'block'; });
    wrap.appendChild(row);
  });

  $('add-drop-template').addEventListener('click', () => {
    const templates = collectTemplates();
    const idNew = 'template-' + Date.now();
    templates.push({ id: idNew, name: 'Novo modelo', title: '🎁 DROP EM ANDAMENTO', description: '**Prêmio:** {prize}\\n**Vencedores:** {winners_count}\\n**Termina:** {ends}\\n\\nClique em **Participar** para entrar.', footer: 'Aeternus · {participants} participante(s)', color: $('drop-color').value });
    renderTemplates(templates);
    $('drop-template').value = idNew;
  });

  $('save-drops').addEventListener('click', async () => {
    try {
      const templates = collectTemplates();
      const payload = {
        enabled: $('drop-enabled').checked,
        activationPrefix: $('drop-prefix').value,
        channelId: $('drop-channel').value || null,
        embedColor: $('drop-color').value,
        templateId: $('drop-template').value,
        templates,
        winnerTitle: $('drop-winner-title').value,
        winnerResultColor: $('drop-winner-result-color').value,
        winnerImage: $('drop-winner-image').value.trim(),
        winnerBanner: $('drop-winner-banner').value.trim(),
        winnerMessage: $('drop-winner-message').value,
        winnerMention: $('drop-winner-mention').checked,
        winnerDm: $('drop-winner-dm').checked,
        resultSeparate: $('drop-result-separate').checked,
        rerollEnabled: $('drop-reroll-enabled').checked,
        maxRerolls: Number($('drop-max-rerolls').value) || 0,
        deliveryFailureMessage: $('drop-delivery-failure').value,
        requirements: {
          minMessagesDay: Number($('drop-min-day').value) || 0,
          minMessagesWeek: Number($('drop-min-week').value) || 0,
          minMessagesMonth: Number($('drop-min-month').value) || 0,
          minLevel: Number($('drop-min-level').value) || 0,
          accountAgeDays: Number($('drop-account-age').value) || 0,
          minInvites: Number($('drop-min-invites').value) || 0,
          minFlocos: Number($('drop-min-flocos').value) || 0,
          minCristais: Number($('drop-min-cristais').value) || 0,
          requiredRoleIds: selectedValues('drop-required-roles'),
          bypassRoleIds: selectedValues('drop-bypass-roles'),
          blockedRoleIds: selectedValues('drop-blocked-roles')
        },
        extraEntries: Array.from(document.querySelectorAll('.repeat-row')).map(row => ({
          roleId: row.querySelector('.entry-role').value,
          entries: Number(row.querySelector('.entry-count').value) || 0,
          label: row.querySelector('.entry-label').value.trim()
        })).filter(x => x.roleId && x.entries > 0)
      };
      const result = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/drops', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      });
      dropData = {...dropData, ...result.drops};
      $('drop-prefix').value = result.prefix || payload.activationPrefix;
      $('drop-status').textContent = '✓ Configurações de Drops salvas com sucesso';
      setTimeout(() => $('drop-status').textContent = '', 3000);
    } catch (e) {
      $('drop-status').textContent = '✕ ' + e.message;
    }
  });

  document.querySelectorAll('.admin-category-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.admin-category-menu a').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  load();
});