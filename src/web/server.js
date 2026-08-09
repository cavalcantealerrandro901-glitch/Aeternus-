const express = require('express');
const cookieParser = require('cookie-parser');
const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderPortal = require('./views/portal');

module.exports = (client, config) => {
    const app = express();
    const PORT = process.env.PORT || 3000;
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));

    const sessions = {};

    app.get('/', (req, res) => {
        const user = sessions[req.cookies.sessionId];
        res.send(renderHome(user));
    });

    app.get('/login', (req, res) => {
        const clientId = config.clientId || process.env.CLIENT_ID;
        const redirectUri = `${req.protocol}://${req.get('host')}/auth/discord/callback`;
        res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/');
        try {
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: config.clientId || process.env.CLIENT_ID,
                    client_secret: config.clientSecret || process.env.CLIENT_SECRET,
                    grant_type: 'authorization_code', code: code,
                    redirect_uri: `${req.protocol}://${req.get('host')}/auth/discord/callback`,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/');

            const userRes = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` } });
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', { headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` } });
            
            const sessionId = Math.random().toString(36).substring(2);
            sessions[sessionId] = { user: await userRes.json(), guilds: await guildsRes.json() };
            res.cookie('sessionId', sessionId, { httpOnly: true });
            res.redirect('/dashboard');
        } catch (error) { console.error('Erro no OAuth2:', error); res.redirect('/'); }
    });

    app.get('/dashboard', (req, res) => {
        const session = sessions[req.cookies.sessionId];
        if (!session) return res.redirect('/');
        const manageableGuilds = session.guilds.filter(g => ((BigInt(g.permissions) & 0x8n) === 0x8n || g.owner) && client.guilds.cache.has(g.id));
        res.send(renderDashboard(session.user, manageableGuilds));
    });

    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies.sessionId];
        if (!session) return res.redirect('/');
        const manageableGuilds = session.guilds.filter(g => ((BigInt(g.permissions) & 0x8n) === 0x8n || g.owner) && client.guilds.cache.has(g.id));
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);
        if (!guild) return res.redirect('/dashboard');
        res.send(renderPortal(guild, manageableGuilds));
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
