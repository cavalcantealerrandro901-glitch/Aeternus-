const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    logs: { type: Object, default: {} },
    welcome: { type: Object, default: {} },
    automod: { type: Object, default: {} },
    tickets: { type: Object, default: {} },
    economy: { type: Object, default: {} },
    rewards: { type: Object, default: {} },
    games: { type: Object, default: {} },
    autorole: { type: Object, default: {} },
    announcements: { type: Object, default: {} },
    giveaways: { type: Object, default: {} },
    branding: { type: Object, default: {} },
    updates: { type: Object, default: {} },
    customCommands: { type: Array, default: [] },
    flirt: { type: Object, default: {} }
});

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    almas: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 },
    lastDailyDate: { type: String, default: '' },
    dailyStreak: { type: Number, default: 0 },
    dailyNotifiedDate: { type: String, default: '' },
    lastWork: { type: Number, default: 0 },
    workXp: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalBet: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 }
});
userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

const GuildConfig = mongoose.model('GuildConfig', guildSchema);
const UserEconomy = mongoose.model('UserEconomy', userSchema);
const cache = new Map();

const DEFAULT_ECONOMY = {
    enabled: true,
    currency: 'Almas',
    symbol: '💀',
    startingBalance: 1000,
    workCooldownMs: 3600000,
    games: {
        coinflip: true,
        slots: true,
        dice: true,
        roulette: true
    }
};

module.exports = {
    DEFAULT_ECONOMY,

    connect: async () => {
        if (!process.env.MONGO_URI) {
            console.warn('⚠️ MONGO_URI não configurado!');
            return;
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Conectado ao MongoDB com sucesso!');

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
                tickets: {},
                economy: { ...DEFAULT_ECONOMY },
                rewards: {},
                games: {},
                autorole: {},
                announcements: {},
                giveaways: {},
                branding: {},
                updates: {},
                customCommands: [],
                flirt: {}
            };
        }
        const cfg = cache.get(guildId);
        if (!cfg.economy || Object.keys(cfg.economy).length === 0) {
            cfg.economy = { ...DEFAULT_ECONOMY };
        }
        return cfg;
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
    },

    getUser: async (userId, guildId) => {
        let user = await UserEconomy.findOne({ userId, guildId });
        if (!user) {
            const cfg = module.exports.getGuildConfig(guildId);
            const start = cfg.economy?.startingBalance ?? 1000;
            user = await UserEconomy.create({ userId, guildId, almas: start });
        }
        return user;
    },

    saveUser: async (user) => {
        await user.save();
        return user;
    },

    addAlmas: async (userId, guildId, amount) => {
        const user = await module.exports.getUser(userId, guildId);
        user.almas = Math.max(0, (user.almas || 0) + amount);
        await user.save();
        return user;
    },

    getLeaderboard: async (guildId, limit = 10) => {
        return UserEconomy.find({ guildId }).sort({ almas: -1 }).limit(limit).lean();
    },

    /** Usuários que ainda não coletararam o daily hoje e podem receber DM */
    getUsersForDailyNotify: async (dateKey) => {
        return UserEconomy.find({
            $or: [
                { lastDailyDate: { $ne: dateKey } },
                { lastDailyDate: { $exists: false } }
            ],
            dailyNotifiedDate: { $ne: dateKey }
        }).limit(200).lean();
    },

    UserEconomy
};
