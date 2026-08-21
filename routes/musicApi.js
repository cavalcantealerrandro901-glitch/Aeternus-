const settings = require('../utils/settings');
const { ChannelType } = require('discord.js');

function register(app, client) {
    /** Categorias do servidor (para salas de música) */
    app.get('/api/guild/:guildId/categories', async (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: 'Bot não está neste servidor', categories: [] });

            await guild.channels.fetch().catch(() => {});
            const categories = guild.channels.cache
                .filter((c) => c.type === ChannelType.GuildCategory || c.type === 4)
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map((c) => ({ id: c.id, name: c.name }));

            const cfg = settings.getGuild(guildId);
            res.json({
                categories,
                selected: cfg.musicCategory || null
            });
        } catch (e) {
            console.error('categories', e);
            res.status(500).json({ error: e.message, categories: [] });
        }
    });

    /** legado: canais de voz (ainda útil) */
    app.get('/api/guild/:guildId/voice-channels', async (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: 'Servidor não encontrado', channels: [] });

            await guild.channels.fetch().catch(() => {});
            const channels = guild.channels.cache
                .filter((c) => c.type === 2)
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map((c) => ({ id: c.id, name: c.name }));

            const cfg = settings.getGuild(guildId);
            res.json({
                channels,
                selected: cfg.musicVoiceChannel || null
            });
        } catch (e) {
            res.status(500).json({ error: e.message, channels: [] });
        }
    });
}

module.exports = register;
module.exports.register = register;
