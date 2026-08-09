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
        res.send(renderHome(session?.user || null));
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

    // Callback de Autenticação do Discord
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

    // Dashboard Principal
    app.get('/dashboard', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = Array.isArray(session.guilds)
            ? session.guilds.filter(g => ((BigInt(g.permissions) & 0x8n) === 0x8n || g.owner) && client.guilds.cache.has(g.id))
            : [];

        res.send(renderDashboard(session.user, manageableGuilds));
    });

    // Portal de Servidor Específico
    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = Array.isArray(session.guilds)
            ? session.guilds.filter(g => ((BigInt(g.permissions) & 0x8n) === 0x8n || g.owner) && client.guilds.cache.has(g.id))
            : [];

        const guild = manageableGuilds.find(g => g.id === req.params.guildId);
        if (!guild) return res.redirect('/dashboard');

        res.send(renderPortal(guild, manageableGuilds));
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
