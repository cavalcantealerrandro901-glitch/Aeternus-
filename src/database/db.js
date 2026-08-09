const GuildConfig = require('./models/GuildConfig');

const cache = new Map();

module.exports = {
    async init() {
        try {
            const configs = await GuildConfig.find({});
            configs.forEach(cfg => {
                cache.set(cfg.guildId, {
                    logs: cfg.logs || {},
                    welcome: cfg.welcome || {},
                    updates: cfg.updates || {},
                    customCommands: cfg.customCommands || []
                });
            });
            console.log(`📦 ${configs.length} configurações de servidores carregadas do MongoDB!`);
        } catch (err) {
            console.error('❌ Erro ao carregar configurações do MongoDB:', err);
        }
    },

    getGuildConfig(guildId) {
        return cache.get(guildId) || { logs: {}, welcome: {}, updates: {}, customCommands: [] };
    },

    async setGuildConfig(guildId, partialConfig) {
        const current = this.getGuildConfig(guildId);
        
        const updated = {
            logs: partialConfig.logs !== undefined ? partialConfig.logs : current.logs,
            welcome: partialConfig.welcome !== undefined ? partialConfig.welcome : current.welcome,
            updates: partialConfig.updates !== undefined ? partialConfig.updates : current.updates,
            customCommands: partialConfig.customCommands !== undefined ? partialConfig.customCommands : current.customCommands
        };

        cache.set(guildId, updated);

        try {
            await GuildConfig.findOneAndUpdate(
                { guildId },
                { guildId, ...updated },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error(`❌ Erro ao salvar configurações no MongoDB para a guilda ${guildId}:`, err);
        }

        return updated;
    }
};
