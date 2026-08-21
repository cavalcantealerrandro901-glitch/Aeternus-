const path = require('path');
const { ChannelType } = require('discord.js');
const settings = require('../utils/settings');
const { getPrefix, setPrefix, DEFAULT_PREFIX } = require('../utils/prefixManager');

function requireAuth(req, res, next) {
    if (req.session?.isAuthenticated && req.session?.accessToken) return next();
    if ((req.headers.accept || '').includes('application/json') || String(req.path || '').startsWith('/api')) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    return res.redirect('/auth/discord');
}

function register(app, client) {
    app.get(['/dashboard', '/dashboard/*splat'], requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.get('/servers', requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'servers.html'));
    });

    app.post('/api/set-setting', requireAuth, (req, res) => {
        const { guildId, key, value } = req.body || {};
        if (!guildId || !key) return res.status(400).json({ error: 'Dados incompletos' });

        if (key === 'prefix') {
            const prefix = setPrefix(guildId, value);
            return res.json({ success: true, settings: settings.getGuild(guildId), prefix });
        }

        const updated = settings.setKey(guildId, key, value);
        res.json({ success: true, settings: updated });
    });

    app.get('/api/settings/:guildId', requireAuth, (req, res) => {
        const g = settings.getGuild(req.params.guildId);
        res.json({
            ...g,
            prefix: g.prefix || getPrefix(req.params.guildId) || DEFAULT_PREFIX
        });
    });

    app.get('/api/guild-data/:guildId', requireAuth, async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });

        await Promise.all([
            guild.channels.fetch().catch(() => {}),
            guild.roles.fetch().catch(() => {}),
            guild.fetch().catch(() => {})
        ]);

        const joinedAt = guild.members.me?.joinedAt || guild.joinedAt || null;

        const allChannels = [];
        guild.channels.cache.forEach((ch) => {
            if (ch.type === ChannelType.GuildCategory) return;
            allChannels.push({
                id: ch.id,
                name: ch.name,
                type: ch.type,
                typeLabel: ChannelType[ch.type] || 'Outro',
                parentId: ch.parentId || null
            });
        });
        allChannels.sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 512 }),
            description: guild.description || 'Sem descrição',
            memberCount: guild.memberCount,
            roleCount: guild.roles.cache.size,
            channelCount: guild.channels.cache.size,
            joinedAt: joinedAt
                ? new Date(joinedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                : '—',
            prefix: getPrefix(guild.id),
            allChannels
        });
    });
}

module.exports = register;
module.exports.register = register;
