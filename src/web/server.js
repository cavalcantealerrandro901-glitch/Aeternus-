const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('../database/db');

const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderGuild = require('./views/guild');

module.exports = (client) => {
    const app = express();
    const PORT = process.env.PORT || 10000;

    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    const sessions = {};

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI || 'https://aeternus-q7gt.onrender.com/auth/discord/callback';
    const SUPPORT_URL = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/seu-suporte';

    app.get('/', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        const inviteUrl = \`https://discord.com/oauth2/authorize?client_id=\${CLIENT_ID}&scope=bot%20applications.commands&permissions=8\`;
        res.send(renderHome(session?.user || null, client.user, inviteUrl, SUPPORT_URL));
    });

    app.get('/login', (req, res) => {
        if (!CLIENT_ID) return res.status(500).send('CLIENT_ID não configurado.');
        const encodedRedirect = encodeURIComponent(REDIRECT_URI);
        const url = \`https://discord.com/oauth2/authorize?client_id=\${CLIENT_ID}&redirect_uri=\${encodedRedirect}&response_type=code&scope=identify%20guilds\`;
        res.redirect(url);
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
                    code,
                    redirect_uri: REDIRECT_URI,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/');

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: \`\${tokenData.token_type} \${tokenData.access_token}\` },
            });
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { authorization: \`\${tokenData.token_type} \${tokenData.access_token}\` },
            });

            const user = await userRes.json();
            const guilds = await guildsRes.json();

            const sessionId = Math.random().toString(36).substring(2);
            sessions[sessionId] = { user, guilds };

            res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 });
            res.redirect('/dashboard');
        } catch (err) {
            console.error('Erro OAuth2:', err);
            res.redirect('/');
        }
    });

    app.get('/logout', (req, res) => {
        const sessionId = req.cookies?.sessionId;
        if (sessionId) delete sessions[sessionId];
        res.clearCookie('sessionId');
        res.redirect('/');
    });

    function getManageableGuilds(userGuilds) {
        if (!Array.isArray(userGuilds)) return [];
        const ADMIN = 0x8n;
        const MANAGE_GUILD = 0x20n;

        return userGuilds.filter(g => {
            const perms = BigInt(g.permissions || 0);
            const hasPerm = (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD || g.owner;
            const botInGuild = client.guilds.cache.has(g.id);
            return hasPerm && botInGuild;
        });
    }

    app.get('/dashboard', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);

        res.send(renderDashboard({
            user: session.user,
            manageableGuilds,
            botName: client.user.username,
            botAvatarUrl: client.user.displayAvatarURL(),
            userAvatarUrl: session.user.avatar
                ? \`https://cdn.discordapp.com/avatars/\${session.user.id}/\${session.user.avatar}.png\`
                : 'https://cdn.discordapp.com/embed/avatars/0.png'
        }));
    });

    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const guild = getManageableGuilds(session.guilds).find(g => g.id === req.params.guildId);
        if (!guild) return res.redirect('/dashboard');

        const userAvatarUrl = session.user.avatar
            ? \`https://cdn.discordapp.com/avatars/\${session.user.id}/\${session.user.avatar}.png\`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const config = db.getGuildConfig(guild.id);

        res.send(renderGuild(guild, session.user, userAvatarUrl, config));
    });

    // API: Salvar Prefixo
    app.post('/api/guilds/:guildId/prefix', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const prefix = (req.body.prefix || '').trim();
        if (!prefix || prefix.length > 5) {
            return res.status(400).json({ error: 'Prefixo inválido' });
        }

        await db.setGuildConfig(req.params.guildId, { prefix });
        res.json({ success: true });
    });

    app.listen(PORT, () => {
        console.log(\`🌐 Painel Web rodando na porta \${PORT}\`);
    });
};
