const express = require('express');
const path = require('path');
const { getPrefix, setPrefix } = require('../utils/prefixManager');
const { getUserData, claimDaily } = require('../utils/economyManager');

module.exports = function(app, client) {
    app.get('/dashboard', (req, res) => {
        if (!req.session || !req.session.accessToken) return res.redirect('/auth/discord');
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.get('/api/guild-details/:id', async (req, res) => {
        if (!req.session || !req.session.accessToken) return res.status(401).json({ error: 'Não autenticado' });

        const guildId = req.params.id;
        const guild = client.guilds.cache.get(guildId);

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        const currentPrefix = getPrefix(guildId);

        res.json({
            bot: {
                name: client.user.username,
                tag: client.user.tag,
                avatar: client.user.displayAvatarURL({ extension: 'png', size: 256 }),
                ping: Math.round(client.ws.ping),
                uptime: `${days}d ${hours}h ${minutes}m`,
                totalGuilds: client.guilds.cache.size
            },
            guild: guild ? {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
                memberCount: guild.memberCount,
                channelsCount: guild.channels.cache.size,
                rolesCount: guild.roles.cache.size,
                joinedAt: guild.joinedAt ? new Date(guild.joinedAt).toLocaleDateString('pt-BR') : 'N/A',
                prefix: currentPrefix
            } : null
        });
    });

    app.post('/api/guild-prefix/:id', express.json(), (req, res) => {
        if (!req.session || !req.session.accessToken) return res.status(401).json({ error: 'Não autenticado' });

        const guildId = req.params.id;
        const { prefix } = req.body;

        if (!prefix || prefix.length > 5) {
            return res.status(400).json({ error: 'Prefixo inválido (máx 5 caracteres).' });
        }

        setPrefix(guildId, prefix);
        res.json({ success: true, prefix });
    });

    // 🟢 ROTA DAILY: Obter status do usuário no painel
    app.get('/api/user/daily', (req, res) => {
        if (!req.session || !req.session.user) return res.status(401).json({ error: 'Não autenticado' });
        const userData = getUserData(req.session.user.id);
        
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        const remaining = Math.max(0, cooldown - (now - (userData.lastDaily || 0)));

        res.json({
            balance: userData.balance || 0,
            canClaim: remaining === 0,
            remainingMs: remaining
        });
    });

    // 🟢 ROTA DAILY: Resgatar recompensa pelo painel
    app.post('/api/user/daily/claim', (req, res) => {
        if (!req.session || !req.session.user) return res.status(401).json({ error: 'Não autenticado' });
        const result = claimDaily(req.session.user.id);
        res.json(result);
    });
};
