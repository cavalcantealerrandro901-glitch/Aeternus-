document.addEventListener('DOMContentLoaded', async () => {
    const loading = document.getElementById('loading-state');
    const login = document.getElementById('login-state');
    const servers = document.getElementById('server-state');
    const errors = document.getElementById('error-state');
    const grid = document.getElementById('server-grid');
    const empty = document.getElementById('empty-state');
    const userEl = document.getElementById('admin-user');

    function show(el) { [loading, login, servers, errors].forEach(x => x.classList.add('hidden')); el.classList.remove('hidden'); }

    async function load() {
        show(loading);
        try {
            const me = await fetch('/api/me').then(r => r.json());
            if (!me.authenticated) { show(login); return; }

            userEl.textContent = '👤 ' + (me.user.global_name || me.user.username);
            const data = await fetch('/api/dashboard/guilds').then(async r => {
                const body = await r.json();
                if (!r.ok) throw new Error(body.error || 'Falha ao carregar servidores.');
                return body;
            });

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

                    card.innerHTML = `
                        <div class="server-card-body">
                            <div style="display:flex;align-items:center;gap:15px">
                                <img class="server-icon" src="${icon}" alt="" onerror="this.style.display='none'">
                                <div class="server-info">
                                    <div class="server-name" title="${guild.name}">${guild.name}</div>
                                    <div class="server-meta">Aeternus conectado • ID ${guild.id}</div>
                                </div>
                            </div>
                            <button class="server-open">⚙️ Administrar servidor</button>
                        </div>`;
                    card.querySelector('.server-open').addEventListener('click', () => {
                        window.location.href = '/admin/${encodeURIComponent(guild.id)}';
                    });
                    grid.appendChild(card);
                });
            }
            show(servers);
        } catch (e) {
            document.getElementById('error-message').textContent = e.message;
            show(errors);
        }
    }

    document.getElementById('refresh-servers').addEventListener('click', load);
    document.getElementById('retry').addEventListener('click', load);
    load();
});