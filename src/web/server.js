const express = require('express');
const cookieParser = require('cookie-parser');
const { EmbedBuilder } = require('discord.js');
const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderPortal = require('./views/portal');
const db = require('../database/db');
const { sendTest } = require('../events/welcome');

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

        const savedConfig = db.getGuildConfig(guild.id);

        const serverData = {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: botGuild ? botGuild.memberCount : 'N/A',
            channelCount: botGuild ? botGuild.channels.cache.size : 'N/A',
            roleCount: botGuild ? botGuild.roles.cache.size : 'N/A',
            textChannels: textChannels,
            logsConfig: savedConfig.logs || {},
            welcomeConfig: savedConfig.welcome || {},
            updatesConfig: savedConfig.updates || {}
        };

        res.send(renderPortal(serverData, manageableGuilds, session.user, client.user));
    });

    // Salvar Logs
    app.post('/api/guilds/:guildId/logs', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);
        if (!guild) return res.status(403).json({ error: 'Sem permissão' });

        db.setGuildConfig(req.params.guildId, { logs: req.body });
        res.json({ success: true });
    });

    // Salvar Boas-Vindas
    app.post('/api/guilds/:guildId/welcome', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);
        if (!guild) return res.status(403).json({ error: 'Sem permissão' });

        db.setGuildConfig(req.params.guildId, { welcome: req.body });
        res.json({ success: true });
    });

    // Salvar Atualizações do Bot
    app.post('/api/guilds/:guildId/updates', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const manageableGuilds = getManageableGuilds(session.guilds);
        const guild = manageableGuilds.find(g => g.id === req.params.guildId);
        if (!guild) return res.status(403).json({ error: 'Sem permissão' });

        db.setGuildConfig(req.params.guildId, { updates: req.body });
        res.json({ success: true });
    });

    // Testar Notificação de Atualização
    app.post('/api/guilds/:guildId/updates/test', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const guildConfig = db.getGuildConfig(req.params.guildId);
        const updatesConfig = guildConfig.updates;

        if (!updatesConfig || !updatesConfig.updatesChannel) {
            return res.status(400).json({ error: 'Selecione e salve um canal de atualizações antes de testar!' });
        }

        const botGuild = client.guilds.cache.get(req.params.guildId);
        if (!botGuild) return res.status(404).json({ error: 'Servidor não encontrado' });

        const channel = botGuild.channels.cache.get(updatesConfig.updatesChannel);
        if (!channel) return res.status(404).json({ error: 'Canal de atualizações não encontrado' });

        try {
            let mentionContent = '';
            if (updatesConfig.mentionType === 'here') mentionContent = '@here';
            if (updatesConfig.mentionType === 'everyone') mentionContent = '@everyone';

            const embed = new EmbedBuilder()
                .setTitle('🚀 [TESTE] Nova Atualização do Bot Aeternus!')
                .setDescription('Esta é uma mensagem de teste do sistema de Notificações de Atualizações.')
                .addFields(
                    { name: '✨ Novos Sistemas', value: '• Adicionada categoria de Notificações de Atualização\n• Correção e suporte a menções diretas em Boas-Vindas' },
                    { name: '🌐 Painel Web', value: '• Sistema de abas dinâmicas sem rolamento de tela no mobile' },
                    { name: '📌 Versão', value: '`v2.0.0-teste`', inline: true }
                )
                .setColor('#38bdf8')
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Aeternus Updates', iconURL: client.user.displayAvatarURL() });

            await channel.send({ content: mentionContent || undefined, embeds: [embed] });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message || 'Erro ao enviar anúncio no Discord' });
        }
    });

    // Rota para Testar Boas-Vindas
    app.post('/api/guilds/:guildId/welcome/test', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const guildConfig = db.getGuildConfig(req.params.guildId);
        const welcomeConfig = guildConfig.welcome;

        if (!welcomeConfig || !welcomeConfig.welcomeChannel) {
            return res.status(400).json({ error: 'Selecione e salve um canal de boas-vindas antes de testar!' });
        }

        const botGuild = client.guilds.cache.get(req.params.guildId);
        if (!botGuild) return res.status(404).json({ error: 'Servidor não encontrado' });

        try {
            await sendTest(botGuild, welcomeConfig.welcomeChannel, welcomeConfig, session.user);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message || 'Erro ao enviar mensagem no Discord' });
        }
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
