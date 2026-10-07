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

      const shop = await api('/api/dashboard/guild/' + encodeURIComponent(id) + '/shop');
      shopEnabled = shop.enabled;
      $('shop-status').textContent = shopEnabled ? '🟢 Loja ativa' : '🔴 Loja desativada';
      $('shop-vips').textContent = shop.vipCount + ' VIP(s) cadastrados';
      $('toggle-shop').textContent = shopEnabled ? 'Desativar loja' : 'Ativar loja';
      $('open-shop-panel').href = '/itens?guild=' + encodeURIComponent(id);

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

  document.querySelectorAll('.admin-category-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.admin-category-menu a').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  load();
});