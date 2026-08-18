const path = require('path');
const fs = require('fs');
const { ChannelType } = require('discord.js');

/**
 * Rotas do painel web (configurações e dados do servidor)
 */
function registerPanelRoutes(app, client) {
    app.get(['/dashboard', '/dashboard/*splat'], (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.post('/api/set-setting', (req, res) => {
        try {
            const { guildId, key, value } = req.body;
            if (!guildId || !key) {
                return res.status(400).json({ error: 'guildId e key são obrigatórios.' });
            }

            const filePath = path.join(__dirname, '..', 'settings.json');
            let allSettings = {};

            if (fs.existsSync(filePath)) {
                try {
                    allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
                } catch (e) {
                    allSettings = {};
                }
            }

            if (!allSettings[guildId]) allSettings[guildId] = {};
            allSettings[guildId][key] = value;

            fs.writeFileSync(filePath, JSON.stringify(allSettings, null, 2), 'utf8');
            return res.json({ success: true, settings: allSettings[guildId] });
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return res.status(500).json({ error: 'Erro ao salvar configurações.' });
        }
    });

    app.get('/api/settings/:guildId', (req, res) => {
        try {
            const { guildId } = req.params;
            const filePath = path.join(__dirname, '..', 'settings.json');
            if (!fs.existsSync(filePath)) return res.json({});

            const allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
            return res.json(allSettings[guildId] || {});
        } catch (error) {
            console.error('Erro ao ler configurações:', error);
            return res.status(500).json({ error: 'Erro ao ler configurações.' });
        }
    });

    app.get('/api/guild-data/:guildId', async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor não encontrado no bot.' });
            }

            await Promise.all([
                guild.channels.fetch().catch(() => {}),
                guild.roles.fetch().catch(() => {}),
                guild.emojis.fetch().catch(() => {})
            ]);

            const categoriesMap = new Map();
            categoriesMap.set('uncategorized', { id: null, name: 'Sem categoria', channels: [] });

            guild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position)
                .forEach(cat => {
                    categoriesMap.set(cat.id, { id: cat.id, name: cat.name, channels: [] });
                });

            const allChannels = [];

            guild.channels.cache.forEach(ch => {
                if (ch.type === ChannelType.GuildCategory) return;

                const channelInfo = {
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    typeLabel: ChannelType[ch.type] || 'Outro',
                    parentId: ch.parentId || null,
                    position: ch.position
                };

                allChannels.push(channelInfo);

                const parentId = ch.parentId || 'uncategorized';
                if (categoriesMap.has(parentId)) {
                    categoriesMap.get(parentId).channels.push(channelInfo);
                } else {
                    categoriesMap.get('uncategorized').channels.push(channelInfo);
                }
            });

            const roles = guild.roles.cache
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.hexColor,
                    position: r.position,
                    hoist: r.hoist,
                    managed: r.managed
                }))
                .sort((a, b) => b.position - a.position);

            const emojis = guild.emojis.cache.map(e => ({ id: e.id, name: e.name, animated: e.animated }));
            const stickers = guild.stickers.cache.map(s => ({ id: s.id, name: s.name }));

            res.json({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ dynamic: true, size: 512 }),
                banner: guild.bannerURL({ size: 1024 }),
                splash: guild.splashURL({ size: 1024 }),
                description: guild.description || 'Sem descrição',
                ownerId: guild.ownerId,
                createdAt: guild.createdAt,
                memberCount: guild.memberCount,
                roleCount: guild.roles.cache.size,
                channelCount: guild.channels.cache.size,
                boostCount: guild.premiumSubscriptionCount || 0,
                boostTier: guild.premiumTier,
                features: guild.features,
                categories: Array.from(categoriesMap.values()).filter(cat => cat.channels.length > 0),
                allChannels,
                roles,
                emojis,
                stickers
            });
        } catch (error) {
            console.error('Erro ao coletar dados do servidor:', error);
            res.status(500).json({ error: 'Erro ao consultar a API do Discord.' });
        }
    });
}

module.exports = { registerPanelRoutes };
