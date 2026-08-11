const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    logs: { type: Object, default: {} },
    welcome: { type: Object, default: {} },
    automod: { type: Object, default: {} },
    updates: { type: Object, default: {} },
    customCommands: { type: Array, default: [] },
    tickets: { type: Object, default: {} },
    flirt: { type: Object, default: {} }
});

const GuildConfig = mongoose.model('GuildConfig', guildSchema);
const cache = new Map();

module.exports = {
    connect: async () => {
        if (!process.env.MONGO_URI) {
            console.warn("⚠️ MONGO_URI não configurado!");
            return;
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Conectado ao MongoDB com sucesso!");

        const configs = await GuildConfig.find();
        configs.forEach(c => cache.set(c.guildId, c.toObject()));
        console.log(`✅ Cache carregado com ${cache.size} servidores.`);
    },

    getGuildConfig: (guildId) => {
        if (!cache.has(guildId)) {
            return {
                prefix: '!',
                logs: {},
                welcome: {},
                automod: {},
                updates: {},
                customCommands: [],
                tickets: {},
                flirt: {}
            };
        }
        return cache.get(guildId);
    },

    setGuildConfig: async (guildId, data) => {
        try {
            const updated = await GuildConfig.findOneAndUpdate(
                { guildId },
                { $set: data },
                { new: true, upsert: true }
            );
            cache.set(guildId, updated.toObject());
            return true;
        } catch (err) {
            console.error(`Erro ao salvar config do servidor ${guildId}:`, err);
            return false;
        }
    }
};
