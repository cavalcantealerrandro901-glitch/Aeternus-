const settings = require('../utils/settings');

function register(app, client) {
    /** Lista canais de voz do servidor (painel) */
    app.get('/api/guild/:guildId/voice-channels', async (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ error: 'Não autorizado' });
            }
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: 'Bot não está neste servidor', channels: [] });

            await guild.channels.fetch().catch(() => {});
            const channels = guild.channels.cache
                .filter((c) => c.type === 2) // GuildVoice
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map((c) => ({ id: c.id, name: c.name }));

            const cfg = settings.getGuild(guildId);
            res.json({
                channels,
                selected: cfg.musicVoiceChannel || cfg.musicChannel || null
            });
        } catch (e) {
            console.error('voice-channels', e);
            res.status(500).json({ error: e.message, channels: [] });
        }
    });
}

module.exports = register;
module.exports.register = register;
