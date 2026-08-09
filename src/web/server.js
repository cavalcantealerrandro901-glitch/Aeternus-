const express = require('express');
const cookieParser = require('cookie-parser');
const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderPortal = require('./views/portal');
const db = require('../database/db');

module.exports = (client, config) => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const sessions = {};

    const CLIENT_ID = config?.clientId || process.env.CLIENT_ID;
    const CLIENT_SECRET = config?.clientSecret || process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI || 'https://aeternus-q7gt.onrender.com/auth/discord/callback';
    const SUPPORT_URL = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/seu-suporte';

    app.get('/', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands&permissions=8`;
        res.send(renderHome(session?.user || null, client.user, inviteUrl, SUPPORT_URL));
    });

    app.get('/login', (req, res) => {
        if (!CLIENT_ID) return res.status(500).send('CLIENT_ID não configurado.');
        const encodedRedirect = encodeURIComponent(REDIRECT_URI);
        const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirect}&response_type=code&scope=identify%20guilds`;
        res.redirect(discordAuthUrl);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/');

        try {
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/');

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
            });
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
            });

            const user = await userRes.json();
            const guilds = await guildsRes.json();

            const sessionId = Math.random().toString(36).substring(2);
            sessions[sessionId] = { user, guilds };

            res.cookie('sessionId', sessionId, { httpOnly: true });
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Erro no OAuth2:', error);
            res.redirect('/');
        }
    });

    function getManageableGuilds(userGuilds) {
        if (!Array.isArray(userGuilds)) return [];

        const ADMIN_PERMISSION = 0x8n;
        const MANAGE_GUILD_PERMISSION = 0x20n;

        return userGuilds.filter(g => {
            const perms = BigInt(g.permissions || 0);
            const isAdmin = (perms & ADMIN_PERMISSION) === ADMIN_PERMISSION;
            const canManage = (perms & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
            const isOwner = Boolean(g.owner);

            const hasPermission = isAdmin || canManage || isOwner;
            const isBotInGuild = client.guilds.cache.has(g.id);

            return hasPermission && isBotInGuild;
        });
    }

    app.get('/dashboard', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);
        res.send(renderDashboard(session.user, manageableGuilds, client.user));
    });

    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);

        if (!guild) return res.redirect('/dashboard');

        const botGuild = client.guilds.cache.get(guild.id);
        
        const textChannels = botGuild ? botGuild.channels.cache
            .filter(c => c.type === 0 || c.type === 5)
            .map(c => ({ id: c.id, name: c.name })) : [];

        // Carregar logs já configurados para este servidor
        const savedConfig = db.getGuildConfig(guild.id);

        const serverData = {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: botGuild ? botGuild.memberCount : 'N/A',
            channelCount: botGuild ? botGuild.channels.cache.size : 'N/A',
            roleCount: botGuild ? botGuild.roles.cache.size : 'N/A',
            textChannels: textChannels,
            logsConfig: savedConfig.logs || {}
        };

        res.send(renderPortal(serverData, manageableGuilds, session.user, client.user));
    });

    // Rota API para salvar configurações de Logs
    app.post('/api/guilds/:guildId/logs', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);

        if (!guild) return res.status(403).json({ error: 'Sem permissão neste servidor' });

        const logsConfig = req.body;
        db.setGuildConfig(req.params.guildId, { logs: logsConfig });

        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
