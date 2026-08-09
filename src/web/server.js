const express = require('express');
const cookieParser = require('cookie-parser');
const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderPortal = require('./views/portal');

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

    // Rota Principal
    app.get('/', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands&permissions=8`;
        res.send(renderHome(session?.user || null, client.user, inviteUrl));
    });

    // Rota de Login (OAuth2)
    app.get('/login', (req, res) => {
        if (!CLIENT_ID) {
            return res.status(500).send('CLIENT_ID não configurado nas variáveis de ambiente.');
        }
        const encodedRedirect = encodeURIComponent(REDIRECT_URI);
        const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirect}&response_type=code&scope=identify%20guilds`;
        res.redirect(discordAuthUrl);
    });

    // Callback de Autenticação
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

    // Função para filtrar servidores gerenciáveis onde o bot também está
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

    // Dashboard Principal
    app.get('/dashboard', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);
        res.send(renderDashboard(session.user, manageableGuilds, client.user));
    });

    // Portal de Servidor Específico
    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);

        if (!guild) return res.redirect('/dashboard');

        res.send(renderPortal(guild, manageableGuilds, session.user, client.user));
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
