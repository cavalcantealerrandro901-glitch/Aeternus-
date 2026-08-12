const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType
} = require('discord.js');
const db = require('../database/db');

const renderHome = require('./views/home');
const renderDashboard = require('./views/dashboard');
const renderGuild = require('./views/guild');
const renderEditor = require('./views/editor');
const registerEditorRoutes = require('./editorRoutes');
const { registerWebhooks } = require('./webhooks');

module.exports = (client) => {
    const app = express();
    const PORT = process.env.PORT || 10000;

    app.use(cookieParser());

    registerWebhooks(app);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    const sessions = {};

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI = process.env.REDIRECT_URI || 'https://aeternus-q7gt.onrender.com/auth/discord/callback';
    const SUPPORT_URL = process.env.SUPPORT_SERVER_URL || 'https://discord.gg/seu-suporte';
    const OWNER_ID = process.env.OWNER_ID || '';

    function isOwner(user) {
        return !!(OWNER_ID && user && String(user.id) === String(OWNER_ID));
    }

    app.get('/', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands&permissions=8`;
        const botAvatarUrl = client.user ? client.user.displayAvatarURL({ size: 256, extension: 'png' }) : '';
        res.send(renderHome(session?.user || null, client.user, inviteUrl, SUPPORT_URL, botAvatarUrl));
    });

    app.get('/login', (req, res) => {
        if (!CLIENT_ID) return res.status(500).send('CLIENT_ID não configurado.');
        const encodedRedirect = encodeURIComponent(REDIRECT_URI);
        const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirect}&response_type=code&scope=identify%20guilds`;
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
                headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
            });
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
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

    function requireSession(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session) {
            res.status(401).json({ error: 'Não autorizado' });
            return null;
        }
        return session;
    }

    app.get('/dashboard', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const manageableGuilds = getManageableGuilds(session.guilds);
        const userAvatarUrl = session.user.avatar
            ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const botAvatarUrl = client.user.displayAvatarURL({ size: 256, extension: 'png' });
        const canEditor = await db.canAccessEditor(session.user.id);
        res.send(renderDashboard({
            user: session.user,
            manageableGuilds,
            botName: client.user.username,
            botAvatarUrl,
            userAvatarUrl,
            isOwner: isOwner(session.user),
            canEditor
        }));
    });

    registerEditorRoutes(app, { sessions, isOwner, client });

    app.get('/dashboard/:guildId', (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const guild = getManageableGuilds(session.guilds).find(g => g.id === req.params.guildId);
        if (!guild) return res.redirect('/dashboard');

        const botGuild = client.guilds.cache.get(guild.id);
        const channels = botGuild
            ? botGuild.channels.cache
                .filter(c => c.type === 0 || c.type === 5)
                .map(c => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];

        const categories = botGuild
            ? botGuild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .map(c => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];

        const roles = botGuild
            ? botGuild.roles.cache
                .filter(r => r.name !== '@everyone' && !r.managed)
                .map(r => ({ id: r.id, name: r.name }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];

        const userAvatarUrl = session.user.avatar
            ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const config = db.getGuildConfig(guild.id);
        res.send(renderGuild(guild, session.user, userAvatarUrl, config, channels, categories, roles));
    });

    app.post('/api/guilds/:guildId/prefix', async (req, res) => {
        if (!requireSession(req, res)) return;
        const prefix = (req.body.prefix || '').trim();
        if (!prefix || prefix.length > 5) return res.status(400).json({ error: 'Prefixo inválido' });
        await db.setGuildConfig(req.params.guildId, { prefix });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/logs', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { logs: req.body.logs || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/welcome', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { welcome: req.body.welcome || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/automod', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { automod: req.body.automod || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/economy', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { economy: req.body.economy || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/rewards', async (req, res) => {
        if (!requireSession(req, res)) return;
        const guildId = req.params.guildId;
        const current = db.getGuildConfig(guildId);
        const economy = { ...(current.economy || {}), ...(req.body.economy || {}) };
        const rewards = req.body.rewards || {};
        await db.setGuildConfig(guildId, { economy, rewards });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/games', async (req, res) => {
        if (!requireSession(req, res)) return;
        const guildId = req.params.guildId;
        const games = req.body.games || {};
        const current = db.getGuildConfig(guildId);
        const economy = { ...(current.economy || {}), games };
        await db.setGuildConfig(guildId, { games, economy });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/autorole', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { autorole: req.body.autorole || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/announcements', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { announcements: req.body.announcements || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/giveaways', async (req, res) => {
        if (!requireSession(req, res)) return;
        await db.setGuildConfig(req.params.guildId, { giveaways: req.body.giveaways || {} });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/branding', async (req, res) => {
        if (!requireSession(req, res)) return;
        const guildId = req.params.guildId;
        const branding = req.body.branding || {};
        const current = db.getGuildConfig(guildId);
        const economy = {
            ...(current.economy || {}),
            ...(req.body.economy || {}),
            currency: branding.currency || current.economy?.currency || 'Almas',
            symbol: branding.symbol || current.economy?.symbol || '💀'
        };
        await db.setGuildConfig(guildId, { branding, economy });
        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/tickets', async (req, res) => {
        if (!requireSession(req, res)) return;

        const guildId = req.params.guildId;
        const tickets = req.body.tickets || {};
        const sendPanel = !!req.body.sendPanel;

        if (Array.isArray(tickets.options)) {
            tickets.options = tickets.options
                .filter(o => o && o.label)
                .map((o, i) => ({
                    id: o.id || String(i + 1),
                    label: String(o.label).slice(0, 80),
                    emoji: o.emoji || '🎫',
                    description: o.description ? String(o.description).slice(0, 100) : ''
                }));
        } else {
            tickets.options = [{ id: '1', label: tickets.buttonLabel || 'Abrir Ticket', emoji: '🎫', description: '' }];
        }

        if (!tickets.displayMode) tickets.displayMode = 'buttons';

        await db.setGuildConfig(guildId, { tickets });

        if (sendPanel) {
            const botGuild = client.guilds.cache.get(guildId);
            if (!botGuild) return res.status(404).json({ error: 'Servidor não encontrado' });
            if (!tickets.panelChannel) return res.status(400).json({ error: 'Selecione o canal do painel' });

            const channel = botGuild.channels.cache.get(tickets.panelChannel);
            if (!channel || !channel.isTextBased()) {
                return res.status(400).json({ error: 'Canal do painel inválido' });
            }

            try {
                const embed = new EmbedBuilder()
                    .setColor(tickets.embedColor ? parseInt(String(tickets.embedColor).replace('#', ''), 16) || 0x7c3aed : 0x7c3aed)
                    .setTitle(tickets.embedTitle || '🎫 Central de Suporte')
                    .setDescription(tickets.embedDescription || 'Escolha uma opção abaixo para abrir um ticket.')
                    .setTimestamp();

                if (tickets.embedImage) embed.setImage(tickets.embedImage);

                const options = tickets.options.length
                    ? tickets.options
                    : [{ id: '1', label: 'Abrir Ticket', emoji: '🎫', description: '' }];

                let components;

                if (tickets.displayMode === 'select') {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('aeternus_ticket_select')
                        .setPlaceholder('Selecione o tipo de ticket...')
                        .addOptions(
                            options.slice(0, 25).map(o => {
                                const opt = new StringSelectMenuOptionBuilder()
                                    .setLabel(o.label)
                                    .setValue(o.id);
                                if (o.description) opt.setDescription(o.description);
                                if (o.emoji) {
                                    try { opt.setEmoji(o.emoji); } catch {}
                                }
                                return opt;
                            })
                        );
                    components = [new ActionRowBuilder().addComponents(menu)];
                } else {
                    const rows = [];
                    let current = new ActionRowBuilder();
                    let count = 0;

                    for (const o of options.slice(0, 25)) {
                        if (count === 5) {
                            rows.push(current);
                            current = new ActionRowBuilder();
                            count = 0;
                        }
                        const btn = new ButtonBuilder()
                            .setCustomId(`aeternus_open_ticket:${o.id}`)
                            .setLabel(o.label.slice(0, 80))
                            .setStyle(ButtonStyle.Primary);
                        if (o.emoji) {
                            try { btn.setEmoji(o.emoji); } catch {}
                        }
                        current.addComponents(btn);
                        count++;
                    }
                    if (count > 0) rows.push(current);
                    components = rows;
                }

                await channel.send({ embeds: [embed], components });
            } catch (err) {
                console.error('Erro ao enviar painel de tickets:', err);
                return res.status(500).json({ error: 'Config salvo, mas falhou ao enviar o painel: ' + err.message });
            }
        }

        res.json({ success: true });
    });

    app.post('/api/guilds/:guildId/welcome/test', async (req, res) => {
        const session = requireSession(req, res);
        if (!session) return;

        const guildId = req.params.guildId;
        const botGuild = client.guilds.cache.get(guildId);
        if (!botGuild) return res.status(404).json({ error: 'Servidor não encontrado' });

        const welcome = req.body.welcome || db.getGuildConfig(guildId).welcome || {};
        if (!welcome.channel) return res.status(400).json({ error: 'Selecione um canal primeiro' });

        const channel = botGuild.channels.cache.get(welcome.channel);
        if (!channel || !channel.isTextBased()) {
            return res.status(400).json({ error: 'Canal inválido' });
        }

        try {
            const fakeMember = {
                id: session.user.id,
                user: {
                    id: session.user.id,
                    username: session.user.username,
                    tag: session.user.username,
                    createdTimestamp: Date.now() - 86400000 * 30,
                    displayAvatarURL: (opts) => session.user.avatar
                        ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=${opts?.size || 128}`
                        : 'https://cdn.discordapp.com/embed/avatars/0.png'
                },
                guild: botGuild
            };

            const { buildWelcomePayload } = require('../bot/events/guildMemberAdd');
            await channel.send(buildWelcomePayload(fakeMember, welcome));
            res.json({ success: true });
        } catch (err) {
            console.error('Erro no teste de boas-vindas:', err);
            res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
        }
    });

    app.listen(PORT, () => {
        console.log(`🌐 Painel Web rodando na porta ${PORT}`);
    });
};
