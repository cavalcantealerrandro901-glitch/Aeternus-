/**
 * Preenche dados do servidor na home do dashboard
 */
(async function loadGuildHome() {
    const params = new URLSearchParams(window.location.search);
    const guildId = params.get('guild') || params.get('server');
    if (!guildId) return;

    try {
        const res = await fetch('/api/guild-details/' + encodeURIComponent(guildId), {
            credentials: 'same-origin'
        });
        const data = await res.json();

        if (data.settings) {
            window.originalSettings = { ...data.settings };
        }

        const g = data.guild;
        if (!g) {
            const nameEl = document.getElementById('guild-name');
            if (nameEl) nameEl.textContent = 'Bot não está neste servidor';
            return;
        }

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        const setSrc = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.src = val;
        };

        setSrc('guild-avatar', g.icon);
        setSrc('serverIcon', g.icon);
        set('guild-name', g.name);
        set('serverName', g.name);
        set('guild-id', 'ID: ' + g.id);
        set('serverId', 'ID: ' + g.id);
        set('guild-members', String(g.memberCount ?? '—'));
        set('serverMembers', String(g.memberCount ?? '—'));
        set('guild-roles', String(g.rolesCount ?? '—'));
        set('serverRoles', String(g.rolesCount ?? '—'));
        set('guild-channels', String(g.channelsCount ?? '—'));
        set('serverChannels', String(g.channelsCount ?? '—'));
        set('guild-desc', g.description || 'Sem descrição.');
        set('serverJoined', g.joinedAt || '—');

        if (data.bot) {
            setSrc('botAvatar', data.bot.avatar);
            set('botName', data.bot.name || data.bot.username);
            set('botTag', data.bot.tag ? '@' + data.bot.tag : '');
            set('botPing', (data.bot.ping ?? '—') + ' ms');
            set('botUptime', data.bot.uptime || '—');
        }

        const prefixInput = document.getElementById('prefix');
        if (prefixInput && g.prefix) prefixInput.value = g.prefix;
        const prefixInput2 = document.getElementById('prefixInput');
        if (prefixInput2 && g.prefix) prefixInput2.value = g.prefix;
    } catch (e) {
        console.error('loadGuildHome', e);
    }
})();
