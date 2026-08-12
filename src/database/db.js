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

const editorSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true },
    github: {
        owner: String,
        repo: String,
        branch: { type: String, default: 'main' },
        tokenEnc: String
    },
    secrets: [{
        name: String,
        valueEnc: String,
        updatedAt: Number
    }],
    /** IDs Discord autorizados a usar o Editor (além do OWNER_ID) */
    allowedEditors: { type: [String], default: [] },
    chatHistory: [{
        role: String,
        content: String,
        at: Number
    }]
});

const GuildConfig = mongoose.model('GuildConfig', guildSchema);
const UserEconomy = mongoose.model('UserEconomy', userSchema);
const EditorConfig = mongoose.model('EditorConfig', editorSchema);
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
    EditorConfig,

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

    getEditorConfig: async () => {
        let doc = await EditorConfig.findOne({ key: 'global' });
        if (!doc) {
            doc = await EditorConfig.create({
                key: 'global',
                github: { branch: 'main' },
                secrets: [],
                allowedEditors: [],
                chatHistory: []
            });
        }
        return doc;
    },

    saveEditorConfig: async (data) => {
        const updated = await EditorConfig.findOneAndUpdate(
            { key: 'global' },
            { $set: data },
            { new: true, upsert: true }
        );
        return updated;
    },

    /** true se for OWNER_ID ou estiver em allowedEditors */
    canAccessEditor: async (userId) => {
        const owner = process.env.OWNER_ID || '';
        if (owner && String(userId) === String(owner)) return true;
        const doc = await module.exports.getEditorConfig();
        const list = doc.allowedEditors || [];
        return list.map(String).includes(String(userId));
    },

    addEditorPermission: async (userId) => {
        const doc = await module.exports.getEditorConfig();
        const list = new Set((doc.allowedEditors || []).map(String));
        list.add(String(userId));
        const arr = [...list];
        await module.exports.saveEditorConfig({ allowedEditors: arr });
        return arr;
    },

    removeEditorPermission: async (userId) => {
        const doc = await module.exports.getEditorConfig();
        const arr = (doc.allowedEditors || []).filter(id => String(id) !== String(userId));
        await module.exports.saveEditorConfig({ allowedEditors: arr });
        return arr;
    },

    listEditorPermissions: async () => {
        const doc = await module.exports.getEditorConfig();
        return doc.allowedEditors || [];
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
