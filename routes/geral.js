const express = require('express');
const router = express.Router();
const path = require('path');
const { ChannelType } = require('discord.js');

// Rota para servir a página de gerenciamento do servidor
router.get('/server/:guildId', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/server.html'));
});

// Rota do Dashboard
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Retorna os dados do usuário autenticado e seus servidores
router.get('/api/user', (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    const userGuilds = req.user.guilds || [];
    const adminGuilds = userGuilds.filter(g => g.owner || (parseInt(g.permissions) & 0x8) === 0x8);

    const guildsWithBot = adminGuilds.map(g => {
        const botInGuild = req.client ? req.client.guilds.cache.has(g.id) : false;
        return {
            id: g.id,
            name: g.name,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
            botInGuild
        };
    });

    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            avatar: req.user.avatar ? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png` : null
        },
        guilds: guildsWithBot
    });
});

// Retorna dados públicos do bot
router.get('/api/bot-info', (req, res) => {
    if (!req.client || !req.client.user) {
        return res.status(503).json({ error: 'Bot ainda está inicializando.' });
    }

    res.json({
        id: req.client.user.id,
        username: req.client.user.username,
        avatar: req.client.user.displayAvatarURL({ dynamic: true, size: 512 }),
        guildsCount: req.client.guilds.cache.size,
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${req.client.user.id}&permissions=8&scope=bot%20applications.commands`
    });
});

// Retorna a lista de comandos registrados
router.get('/api/commands', (req, res) => {
    if (!req.client) {
        return res.status(503).json({ error: 'Bot indisponível.' });
    }

    const commandsList = [];

    if (req.client.slashCommands && req.client.slashCommands.size > 0) {
        req.client.slashCommands.forEach(cmd => {
            commandsList.push({
                name: cmd.data?.name || cmd.name || 'comando',
                description: cmd.data?.description || cmd.description || 'Sem descrição.'
            });
        });
    } else if (req.client.commands) {
        req.client.commands.forEach(cmd => {
            commandsList.push({
                name: cmd.name || 'comando',
                description: cmd.description || 'Sem descrição.'
            });
        });
    }

    res.json(commandsList);
});

// Retorna dados de canais e informações de um servidor
router.get('/api/guild-data/:guildId', async (req, res) => {
    try {
        const guild = req.client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado no bot.' });

        await Promise.all([
            guild.channels.fetch().catch(() => {}),
            guild.roles.fetch().catch(() => {})
        ]);

        const allChannels = guild.channels.cache
            .filter(ch => ch.type !== ChannelType.GuildCategory)
            .map(ch => {
                const parent = ch.parentId ? guild.channels.cache.get(ch.parentId) : null;
                const categoryName = parent ? parent.name : 'Outros';

                const isVoice = ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice;
                const isText = ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement || ch.type === ChannelType.GuildForum;

                return {
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    isVoice,
                    isText,
                    category: categoryName,
                    position: ch.rawPosition || 0
                };
            })
            .sort((a, b) => a.position - b.position);

        res.json({
            id: guild.id,
            name: guild.name,
            description: guild.description || 'Nenhuma descrição informada.',
            icon: guild.iconURL({ dynamic: true, size: 512 }),
            memberCount: guild.memberCount,
            channelCount: allChannels.length,
            allChannels
        });
    } catch (err) {
        console.error('Erro na API:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do servidor.' });
    }
});

module.exports = router;
