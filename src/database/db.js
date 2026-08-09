const mongoose = require('mongoose');

// Definindo o Schema para as configurações da Guilda no MongoDB
const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    flirt: {
        chance: { type: Number, default: 10 },
        mode: { type: String, default: 'emoji' }
    },
    customCommands: { type: Array, default: [] }
});

const GuildConfig = mongoose.model('GuildConfig', guildConfigSchema);

// Cache em memória para acesso rápido
const cache = new Map();

module.exports = {
    // 📌 Função init exigida pelo index.js
    async init() {
        try {
            console.log('📦 Inicializando banco de dados e carregando cache...');
            const allConfigs = await GuildConfig.find({});
            cache.clear();
            for (const cfg of allConfigs) {
                cache.set(cfg.guildId, cfg.toObject());
            }
            console.log(`✅ Cache carregado com ${cache.size} servidores.`);
        } catch (err) {
            console.error('❌ Erro ao inicializar o banco de dados:', err);
        }
    },

    async getGuildConfig(guildId) {
        if (cache.has(guildId)) {
            return cache.get(guildId);
        }

        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
            config = new GuildConfig({ guildId, prefix: '!' });
            await config.save();
        }

        const configObj = config.toObject();
        cache.set(guildId, configObj);
        return configObj;
    },

    async setGuildConfig(guildId, newConfig) {
        try {
            let config = await GuildConfig.findOne({ guildId });
            
            if (!config) {
                config = new GuildConfig({ guildId, ...newConfig });
            } else {
                if (newConfig.prefix !== undefined) config.prefix = newConfig.prefix;
                if (newConfig.flirt !== undefined) config.flirt = { ...config.flirt, ...newConfig.flirt };
                if (newConfig.customCommands !== undefined) config.customCommands = newConfig.customCommands;
            }

            await config.save();
            const configObj = config.toObject();
            cache.set(guildId, configObj);
            return configObj;
        } catch (err) {
            console.error('Erro ao salvar configuração no MongoDB:', err);
            throw err;
        }
    }
};
