const phrases = require('../utils/phrases');
const settings = require('../utils/settings');

/**
 * API geral do bot (público + user servers + guild details)
 */
function register(app, client) {
    function botPayload() {
        const phrase = phrases.getRandomPhrase
            ? phrases.getRandomPhrase()
            : 'Bot online.';
        const flirt = phrases.getFlirt ? phrases.getFlirt() : '';
        const emoji = phrases.getRandomEmoji ? phrases.getRandomEmoji() : '✨';

        return {
            name: client.user?.username || 'Aeternus',
            username: client.user?.username || 'Aeternus',
            tag: client.user?.tag || null,
            avatar:
                client.user?.displayAvatarURL({ dynamic: true, size: 512 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png',
            online: client.isReady(),
            guilds: client.guilds.cache.size,
            phrase: `${emoji} ${phrase}`,
            subtitle: flirt,
            bannerText: phrase,
            inviteUrl: process.env.CLIENT_ID
                ? `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8`
                : null
        };
    }

    function formatUptime(ms) {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${sec}s`;
        return `${sec}s`;
    }

    function iconUrl(guildOrId, iconHash) {
        if (!iconHash) return null;
        const id = typeof guildOrId === 'object' ? guildOrId.id : guildOrId;
        const ext = String(iconHash).startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/icons/${id}/${iconHash}.${ext}?size=128`;
    }

    async function listUserAdminGuilds(req) {
        if (!req.session?.accessToken) return { error: 'auth', status: 401, list: [] };

        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${req.session.accessToken}` }
        });

        if (!response.ok) {
            return { error: 'token', status: 401, list: [] };
        }

        const guilds = await response.json();
        if (!Array.isArray(guilds)) {
            return { error: 'format', status: 500, list: [] };
        }

        const admin = guilds.filter(
            (g) => g.owner || (BigInt(g.permissions || '0') & 8n) === 8n
        );

        const list = admin
            .filter((g) => client.guilds.cache.has(g.id))
            .map((g) => ({
                id: g.id,
                name: g.name,
                icon: g.icon || null, // hash (a página monta a URL)
                iconUrl: iconUrl(g.id, g.icon),
                owner: !!g.owner
            }));

        return { list, status: 200 };
    }

    app.get('/api/bot', (req, res) => res.json(botPayload()));
    app.get('/api/bot-info', (req, res) => res.json(botPayload()));

    app.get('/api/commands', (req, res) => {
        const list = [];
        if (client.slashCommands) {
            for (const cmd of client.slashCommands.values()) {
                list.push({
                    name: cmd.data?.name || cmd.name,
                    description: cmd.data?.description || cmd.description || '',
                    type: 'slash'
                });
            }
        }
        if (client.commands) {
            for (const cmd of client.commands.values()) {
                list.push({
                    name: cmd.name,
                    description: cmd.description || '',
                    type: 'prefix'
                });
            }
        }
        res.json(list);
    });

    app.get('/api/me', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ authenticated: false });
        }
        res.json({ authenticated: true, user: req.session.user });
    });

    // Aliases usados pelo painel / servers.html
    async function serversHandler(req, res) {
        try {
            const result = await listUserAdminGuilds(req);
            if (result.error === 'auth' || result.error === 'token') {
                return res.status(401).json({ error: 'Não autenticado', servers: [] });
            }
            // Array puro (compatível com servers.html)
            res.json(result.list);
        } catch (e) {
            console.error('servers:', e);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    app.get('/api/servers', serversHandler);
    app.get('/api/user/servers', serversHandler);

    /** Detalhes do servidor para o dashboard */
    app.get('/api/guild-details/:guildId', async (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ error: 'Não autenticado' });
            }

            const guildId = req.params.guildId;
            let guild = client.guilds.cache.get(guildId);

            if (!guild) {
                return res.json({
                    bot: botPayload(),
                    guild: null,
                    error: 'Bot não está neste servidor'
                });
            }

            // Atualiza contagens quando possível
            try {
                guild = await guild.fetch();
            } catch (_) {}

            await Promise.all([
                guild.channels.fetch().catch(() => {}),
                guild.roles.fetch().catch(() => {}),
                guild.members.fetch().catch(() => {}) // pode falhar sem intent; usa cache
            ]);

            const cfg = settings.getGuild(guildId);
            const joinedAt = guild.members.me?.joinedAt || guild.joinedAt || null;

            const iconHash = guild.icon;
            const icon =
                iconUrl(guild.id, iconHash) ||
                'https://cdn.discordapp.com/embed/avatars/0.png';

            res.json({
                bot: {
                    ...botPayload(),
                    ping: client.ws.ping,
                    uptime: formatUptime(client.uptime || 0)
                },
                guild: {
                    id: guild.id,
                    name: guild.name,
                    icon,
                    iconHash,
                    memberCount: guild.memberCount || guild.members.cache.size || 0,
                    channelsCount: guild.channels.cache.size,
                    rolesCount: guild.roles.cache.size,
                    joinedAt: joinedAt
                        ? new Date(joinedAt).toLocaleString('pt-BR', {
                              timeZone: 'America/Sao_Paulo',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                          })
                        : '—',
                    joinedAtRaw: joinedAt ? new Date(joinedAt).toISOString() : null,
                    description: guild.description || 'Sem descrição.',
                    prefix: cfg.prefix || 'O.',
                    ownerId: guild.ownerId || null
                },
                settings: cfg
            });
        } catch (e) {
            console.error('guild-details:', e);
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/languages', (req, res) => {
        res.json([
            { code: 'pt', name: 'Português', native: 'Português', flag: '🇧🇷' },
            { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' }
        ]);
    });

    app.post('/api/set-setting', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        const { guildId, key, value } = req.body || {};
        if (!guildId || !key) return res.status(400).json({ error: 'Dados inválidos' });
        settings.setKey(guildId, key, value);
        res.json({ success: true });
    });
}

module.exports = register;
module.exports.register = register;
