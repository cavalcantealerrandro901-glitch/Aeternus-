const path = require('path');
const fs = require('fs');
const { ChannelType } = require('discord.js');

function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated && req.session.accessToken) {
        return next();
    }
    // API → 401 JSON; página → login
    if (String(req.path || '').startsWith('/api') || req.xhr || (req.headers.accept || '').includes('application/json')) {
        return res.status(401).json({ error: 'Não autenticado. Faça login.' });
    }
    return res.redirect('/auth/discord');
}

function settingsPath() {
    return path.join(__dirname, '..', 'settings.json');
}

function readAllSettings() {
    const filePath = settingsPath();
    if (!fs.existsSync(filePath)) return {};
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function writeAllSettings(data) {
    fs.writeFileSync(settingsPath(), JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Rotas do painel web (dashboard + configurações + dados do servidor)
 */
function registerPanelRoutes(app, client) {
    // Página do dashboard (exige login)
    app.get(['/dashboard', '/dashboard/*splat'], requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    // Página de servidores (exige login)
    app.get('/servers', requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'servers.html'));
    });

    app.post('/api/set-setting', requireAuth, (req, res) => {
        try {
            const { guildId, key, value } = req.body;
            if (!guildId || !key) {
                return res.status(400).json({ error: 'guildId e key são obrigatórios.' });
            }

            const allSettings = readAllSettings();
            if (!allSettings[guildId]) allSettings[guildId] = {};
            allSettings[guildId][key] = value;
            writeAllSettings(allSettings);

            return res.json({ success: true, settings: allSettings[guildId] });
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return res.status(500).json({ error: 'Erro ao salvar configurações.' });
        }
    });

    app.get('/api/settings/:guildId', requireAuth, (req, res) => {
        try {
            const allSettings = readAllSettings();
            return res.json(allSettings[req.params.guildId] || {});
        } catch (error) {
            console.error('Erro ao ler configurações:', error);
            return res.status(500).json({ error: 'Erro ao ler configurações.' });
        }
    });

    app.get('/api/guild-data/:guildId', requireAuth, async (req, res) => {
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
                .filter((c) => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position)
                .forEach((cat) => {
                    categoriesMap.set(cat.id, { id: cat.id, name: cat.name, channels: [] });
                });

            const allChannels = [];

            guild.channels.cache.forEach((ch) => {
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
                .map((r) => ({
                    id: r.id,
                    name: r.name,
                    color: r.hexColor,
                    position: r.position,
                    hoist: r.hoist,
                    managed: r.managed
                }))
                .sort((a, b) => b.position - a.position);

            const emojis = guild.emojis.cache.map((e) => ({
                id: e.id,
                name: e.name,
                animated: e.animated
            }));
            const stickers = guild.stickers.cache.map((s) => ({ id: s.id, name: s.name }));

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
                categories: Array.from(categoriesMap.values()).filter((cat) => cat.channels.length > 0),
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
