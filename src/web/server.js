const express = require('express');
const cookieParser = require('cookie-parser');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

        const guildRoles = botGuild ? botGuild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name })) : [];

        const savedConfig = db.getGuildConfig(guild.id);

        const serverData = {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: botGuild ? botGuild.memberCount : 'N/A',
            channelCount: botGuild ? botGuild.channels.cache.size : 'N/A',
            roleCount: botGuild ? botGuild.roles.cache.size : 'N/A',
            textChannels: textChannels,
            roles: guildRoles,
            logsConfig: savedConfig.logs || {},
            welcomeConfig: savedConfig.welcome || {},
            updatesConfig: savedConfig.updates || {},
            customCommandsConfig: savedConfig.customCommands || [],
            ticketsConfig: savedConfig.tickets || {}
        };

        res.send(renderPortal(serverData, manageableGuilds, session.user, client.user));
    });

    // API: Salvar Config de Tickets
    app.post('/api/guilds/:guildId/tickets', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const current = db.getGuildConfig(req.params.guildId).tickets || {};
        const updated = {
            ...current,
            ...req.body,
            enabled: req.body.enabled === true || req.body.enabled === 'true'
        };

        db.setGuildConfig(req.params.guildId, { tickets: updated });
        res.json({ success: true });
    });

    // API: Desativar Sistema de Tickets
    app.post('/api/guilds/:guildId/tickets/disable', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const current = db.getGuildConfig(req.params.guildId).tickets || {};
        db.setGuildConfig(req.params.guildId, { tickets: { ...current, enabled: false } });
        res.json({ success: true });
    });

    // API: Enviar Painel de Tickets no Discord
    app.post('/api/guilds/:guildId/tickets/send-panel', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.status(401).json({ error: 'Não autorizado' });

        const config = db.getGuildConfig(req.params.guildId).tickets;
        if (!config || !config.ticketChannel) {
            return res.status(400).json({ error: 'Configure o canal de tickets primeiro.' });
        }

        if (config.enabled === false) {
            return res.status(400).json({ error: 'Ative o sistema de tickets antes de enviar o painel.' });
        }

        const botGuild = client.guilds.cache.get(req.params.guildId);
        const channel = botGuild?.channels.cache.get(config.ticketChannel);

        if (!channel) {
            return res.status(404).json({ error: 'Canal de tickets não encontrado no servidor.' });
        }

        try {
            const embed = new EmbedBuilder()
                .setTitle(config.embedTitle || '🎫 Central de Atendimento')
                .setDescription(config.embedDescription || 'Clique no botão abaixo para abrir um ticket.')
                .setColor('#38bdf8')
                .setFooter({ text: botGuild.name, iconURL: botGuild.iconURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_open_ticket')
                    .setLabel(config.buttonText || 'Abrir Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            await channel.send({ embeds: [embed], components: [row] });
            res.json({ success: true });
        } catch (err) {
            console.error('Erro ao enviar painel de tickets:', err);
            res.status(500).json({ error: 'Falha ao enviar painel para o canal.' });
        }
    });

    // Outras rotas da API
    app.post('/api/guilds/:guildId/custom-commands', (req, res) => {
        const { cmdName, cmdResponse, isEmbed, oldCmdName } = req.body;
        const cleanName = cmdName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const currentConfig = db.getGuildConfig(req.params.guildId);
        let commands = currentConfig.customCommands || [];

        if (oldCmdName && oldCmdName !== cleanName) {
            commands = commands.filter(c => c.name !== oldCmdName.toLowerCase());
        }

        const existingIndex = commands.findIndex(c => c.name === cleanName);
        const updatedCmd = { name: cleanName, response: cmdResponse, isEmbed: isEmbed === 'true' };

        if (existingIndex >= 0) commands[existingIndex] = updatedCmd;
        else commands.push(updatedCmd);

        db.setGuildConfig(req.params.guildId, { customCommands: commands });
        res.json({ success: true });
    });

    app.delete('/api/guilds/:guildId/custom-commands/:cmdName', (req, res) => {
        const cmdName = req.params.cmdName.toLowerCase();
        const currentConfig = db.getGuildConfig(req.params.guildId);
        let commands = (currentConfig.customCommands || []).filter(c => c.name !== cmdName);

        db.setGuildConfig(req.params.guildId, { customCommands: commands });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/logs', (req, res) => {
        db.setGuildConfig(req.params.guildId, { logs: req.body });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/welcome', (req, res) => {
        db.setGuildConfig(req.params.guildId, { welcome: req.body });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/updates', (req, res) => {
        db.setGuildConfig(req.params.guildId, { updates: req.body });
        res.json({ success: true });
    });

    app.listen(PORT, () => console.log(`🌐 Painel Web rodando na porta ${PORT}`));
};
