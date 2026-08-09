const express = require('express');
const path = require('path');
const config = require(path.join(__dirname, '../../../config.json'));

module.exports = (client) => {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../views/index.html'));
    });

    router.get('/api/status', (req, res) => {
        res.json({
            status: client.user ? 'Online' : 'Offline',
            botName: client.user ? client.user.username : 'Aeternus',
            guildsCount: client.guilds?.cache.size || 0,
            usersCount: client.users?.cache.size || 0,
            ping: client.ws?.ping || 0
        });
    });

    // Iniciar Login com Discord
    router.get('/auth/discord', (req, res) => {
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=identify%20guilds`;
        res.redirect(authUrl);
    });

    // Callback do Discord OAuth2
    router.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/?error=no_code');

        try {
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: config.redirectUri,
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/?error=auth_failed');

            req.session.accessToken = tokenData.access_token;

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { authorization: `Bearer ${tokenData.access_token}` },
            });
            req.session.user = await userRes.json();

            res.redirect('/');
        } catch (err) {
            console.error('Erro OAuth2:', err);
            res.redirect('/?error=server_error');
        }
    });

    // API para retornar o usuário logado e seus servidores (Admin + Bot Presente)
    router.get('/api/user/guilds', async (req, res) => {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        try {
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { authorization: `Bearer ${req.session.accessToken}` },
            });
            const userGuilds = await guildsRes.json();

            if (!Array.isArray(userGuilds)) {
                return res.status(400).json({ error: 'Erro ao buscar servidores' });
            }

            // Filtra servidores onde o usuário é Administrador (permissão 0x8) ou Dono
            const adminGuilds = userGuilds.filter(guild => {
                const permissions = BigInt(guild.permissions);
                return (permissions & 8n) === 8n || guild.owner;
            });

            // Mapeia adicionando se o bot está ou não no servidor
            const formattedGuilds = adminGuilds.map(guild => {
                const botInGuild = client.guilds.cache.has(guild.id);
                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png',
                    botInGuild: botInGuild
                };
            });

            res.json({
                user: req.session.user,
                guilds: formattedGuilds
            });
        } catch (err) {
            console.error('Erro ao buscar guilds:', err);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // Rota de Logout
    router.get('/logout', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    });

    return router;
};
