const GuildConfig = require('./models/GuildConfig');

// Cache em memória para leitura rápida e síncrona nos eventos do bot
const cache = new Map();

module.exports = {
    // Carrega todas as configurações do MongoDB para o cache quando o bot liga
    async init() {
        try {
            const configs = await GuildConfig.find({});
            configs.forEach(cfg => {
                cache.set(cfg.guildId, {
                    logs: cfg.logs || {},
                    welcome: cfg.welcome || {}
                });
            });
            console.log(`📦 ${configs.length} configurações de servidores carregadas do MongoDB!`);
        } catch (err) {
            console.error('❌ Erro ao carregar configurações do MongoDB:', err);
        }
    },

    // Obtém as configurações diretamente do cache
    getGuildConfig(guildId) {
        return cache.get(guildId) || { logs: {}, welcome: {} };
    },

    // Atualiza o cache e salva permanentemente no MongoDB
    async setGuildConfig(guildId, partialConfig) {
        const current = this.getGuildConfig(guildId);
        
        const updated = {
            logs: partialConfig.logs !== undefined ? partialConfig.logs : current.logs,
            welcome: partialConfig.welcome !== undefined ? partialConfig.welcome : current.welcome
        };

        // Atualiza no cache instantaneamente
        cache.set(guildId, updated);

        // Salva/Atualiza no MongoDB em segundo plano
        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { guildId, logs: updated.logs, welcome: updated.welcome },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error(`❌ Erro ao salvar configurações no MongoDB para a guilda ${guildId}:`, err);
        }

        return updated;
    }
};
