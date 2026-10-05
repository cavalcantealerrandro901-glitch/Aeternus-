document.addEventListener('DOMContentLoaded', async () => {
    const loading = document.getElementById('loading-state');
    const login = document.getElementById('login-state');
    const servers = document.getElementById('server-state');
    const errors = document.getElementById('error-state');
    const grid = document.getElementById('server-grid');
    const empty = document.getElementById('empty-state');
    const userEl = document.getElementById('admin-user');
    const selected = document.getElementById('selected-server');

    let selectedGuild = null;
    let shopEnabled = true;

    function show(el) {
        [loading, login, servers, errors].forEach(x => x.classList.add('hidden'));
        el.classList.remove('hidden');
    }

    async function api(url, options) {
        const r = await fetch(url, options);
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Falha na solicitação.');
        return body;
    }

    async function loadSelected(guild) {
        selectedGuild = guild;
        document.getElementById('selected-server-name').textContent = guild.name;
        document.getElementById('selected-server-id').textContent = 'ID: ' + guild.id;
        document.getElementById('open-server-panel').href = '/admin/' + encodeURIComponent(guild.id);

        const daily = await api('/api/dashboard/guild/' + encodeURIComponent(guild.id) + '/daily');
        document.getElementById('daily-min').value = daily.dailyMin;
        document.getElementById('daily-max').value = daily.dailyMax;

        const shop = await api('/api/dashboard/guild/' + encodeURIComponent(guild.id) + '/shop');
        shopEnabled = shop.enabled;
        document.getElementById('shop-status').textContent = shopEnabled ? '🟢 Loja ativa' : '🔴 Loja desativada';
        document.getElementById('shop-vips').textContent = shop.vipCount + ' VIP(s) cadastrados';
        document.getElementById('toggle-shop').textContent = shopEnabled ? 'Desativar loja' : 'Ativar loja';

        selected.classList.remove('hidden');
        window.history.replaceState({}, '', '/admin/' + encodeURIComponent(guild.id));
        window.scrollTo({ top: selected.offsetTop - 30, behavior: 'smooth' });
    }

    async function load() {
        show(loading);
        selected.classList.add('hidden');
        try {
            const me = await api('/api/me');
            if (!me.authenticated) { show(login); return; }

            userEl.textContent = '👤 ' + (me.user.global_name || me.user.username);
            const data = await api('/api/dashboard/guilds');

            grid.innerHTML = '';
            if (!data.guilds.length) {
                empty.classList.remove('hidden');
            } else {
                empty.classList.add('hidden');
                data.guilds.forEach(guild => {
                    const card = document.createElement('article');
                    card.className = 'server-card';
                    const icon = guild.icon
                        ? 'https://cdn.discordapp.com/icons/' + encodeURIComponent(guild.id) + '/' + encodeURIComponent(guild.icon) + '.png?size=128'
                        : '';

                    card.innerHTML = '<div class="server-card-body">' +
                        '<div style="display:flex;align-items:center;gap:15px">' +
                        '<img class="server-icon" src="' + icon + '" alt="" onerror="this.style.display=\'none\'">' +
                        '<div class="server-info">' +
                        '<div class="server-name" title="' + guild.name.replace(/"/g, '&quot;') + '">' + guild.name + '</div>' +
                        '<div class="server-meta">Aeternus conectado • ID ' + guild.id + '</div>' +
                        '</div></div>' +
                        '<button class="server-open">⚙️ Administrar servidor</button></div>';

                    card.querySelector('.server-open').addEventListener('click', () => {
                        loadSelected(guild).catch(e => {
                            document.getElementById('error-message').textContent = e.message;
                            show(errors);
                        });
                    });
                    grid.appendChild(card);
                });
            }

            const pathMatch = window.location.pathname.match(/^\/admin\/([^/]+)$/);
            if (pathMatch) {
                const wanted = decodeURIComponent(pathMatch[1]);
                const guild = data.guilds.find(g => g.id === wanted);
                if (guild) await loadSelected(guild);
            }

            show(servers);
            if (pathMatch && !data.guilds.some(g => g.id === decodeURIComponent(pathMatch[1]))) {
                throw new Error('Você não possui acesso de administração a este servidor.');
            }
        } catch (e) {
            document.getElementById('error-message').textContent = e.message;
            show(errors);
        }
    }

    document.getElementById('save-daily').addEventListener('click', async () => {
        if (!selectedGuild) return;
        const status = document.getElementById('daily-status');
        try {
            const body = {
                dailyMin: Number(document.getElementById('daily-min').value),
                dailyMax: Number(document.getElementById('daily-max').value)
            };
            const result = await api('/api/dashboard/guild/' + encodeURIComponent(selectedGuild.id) + '/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            status.textContent = '✓ Salvo';
            document.getElementById('daily-min').value = result.dailyMin;
            document.getElementById('daily-max').value = result.dailyMax;
            setTimeout(() => { status.textContent = ''; }, 2500);
        } catch (e) {
            status.textContent = '✕ ' + e.message;
        }
    });

    document.getElementById('toggle-shop').addEventListener('click', async () => {
        if (!selectedGuild) return;
        const feedback = document.getElementById('shop-feedback');
        try {
            const result = await api('/api/dashboard/guild/' + encodeURIComponent(selectedGuild.id) + '/shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !shopEnabled })
            });
            shopEnabled = result.enabled;
            document.getElementById('shop-status').textContent = shopEnabled ? '🟢 Loja ativa' : '🔴 Loja desativada';
            document.getElementById('toggle-shop').textContent = shopEnabled ? 'Desativar loja' : 'Ativar loja';
            feedback.textContent = '✓ Salvo';
            setTimeout(() => { feedback.textContent = ''; }, 2500);
        } catch (e) {
            feedback.textContent = '✕ ' + e.message;
        }
    });

    document.getElementById('refresh-servers').addEventListener('click', load);
    document.getElementById('retry').addEventListener('click', load);
    load();
});
