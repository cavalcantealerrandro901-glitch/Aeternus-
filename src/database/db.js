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

const transferSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    fromId: { type: String, required: true, index: true },
    toId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    at: { type: Number, default: () => Date.now() }
});
transferSchema.index({ guildId: 1, at: -1 });

const aiMemorySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        at: { type: Number, default: () => Date.now() }
    }]
});
aiMemorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

/** Link OAuth GitHub por usuário Discord autorizado no Editor */
const editorGithubSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    githubId: String,
    login: String,
    tokenEnc: String,
    scope: String,
    linkedAt: Number,
    selected: {
        owner: String,
        repo: String,
        branch: { type: String, default: 'main' }
    }
});

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
    allowedEditors: { type: [String], default: [] },
    chatHistory: [{
        role: String,
        content: String,
        at: Number
    }]
});

const GuildConfig = mongoose.model('GuildConfig', guildSchema);
const UserEconomy = mongoose.model('UserEconomy', userSchema);
const TransferLog = mongoose.model('TransferLog', transferSchema);
const AiMemory = mongoose.model('AiMemory', aiMemorySchema);
const EditorGithubLink = mongoose.model('EditorGithubLink', editorGithubSchema);
const EditorConfig = mongoose.model('EditorConfig', editorSchema);
const cache = new Map();

const DEFAULT_ECONOMY = {
    enabled: true,
    currency: 'Almas',
    symbol: '💀',
    startingBalance: 1000,
    workCooldownMs: 3600000,
    games: { coinflip: true, slots: true, dice: true, roulette: true }
};

module.exports = {
    DEFAULT_ECONOMY,
    EditorConfig,
    UserEconomy,
    TransferLog,
    AiMemory,
    EditorGithubLink,

    connect: async () => {
        if (!process.env.MONGO_URI) {
            console.warn('⚠️ MONGO_URI não configurado!');
            return;
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📦 Conectado ao MongoDB com sucesso!');
        const configs = await GuildConfig.find();
        configs.forEach((c) => cache.set(c.guildId, c.toObject()));
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
        return EditorConfig.findOneAndUpdate(
            { key: 'global' },
            { $set: data },
            { new: true, upsert: true }
        );
    },

    canAccessEditor: async (userId) => {
        const owner = process.env.OWNER_ID || '';
        if (owner && String(userId) === String(owner)) return true;
        const doc = await module.exports.getEditorConfig();
        return (doc.allowedEditors || []).map(String).includes(String(userId));
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
        const arr = (doc.allowedEditors || []).filter((id) => String(id) !== String(userId));
        await module.exports.saveEditorConfig({ allowedEditors: arr });
        return arr;
    },

    listEditorPermissions: async () => {
        const doc = await module.exports.getEditorConfig();
        return doc.allowedEditors || [];
    },

    getEditorGithubLink: async (discordId) => {
        return EditorGithubLink.findOne({ discordId: String(discordId) }).lean();
    },

    saveEditorGithubLink: async (discordId, data) => {
        return EditorGithubLink.findOneAndUpdate(
            { discordId: String(discordId) },
            { $set: { discordId: String(discordId), ...data } },
            { upsert: true, new: true }
        );
    },

    setEditorSelectedRepo: async (discordId, selected) => {
        return EditorGithubLink.findOneAndUpdate(
            { discordId: String(discordId) },
            { $set: { selected } },
            { upsert: true, new: true }
        );
    },

    clearEditorGithubLink: async (discordId) => {
        await EditorGithubLink.deleteOne({ discordId: String(discordId) });
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

    logTransfer: async ({ guildId, fromId, toId, amount }) => {
        return TransferLog.create({
            guildId: String(guildId),
            fromId: String(fromId),
            toId: String(toId),
            amount: Math.floor(Number(amount) || 0),
            at: Date.now()
        });
    },

    getTransfers: async (guildId, { userId = null, limit = 10 } = {}) => {
        const q = { guildId: String(guildId) };
        if (userId) q.$or = [{ fromId: String(userId) }, { toId: String(userId) }];
        return TransferLog.find(q).sort({ at: -1 }).limit(limit).lean();
    },

    getAiMemory: async (userId, guildId) => {
        const doc = await AiMemory.findOne({
            userId: String(userId),
            guildId: String(guildId || 'dm')
        }).lean();
        return doc?.messages || [];
    },

    appendAiMemory: async (userId, guildId, userText, assistantText) => {
        const gid = String(guildId || 'dm');
        const uid = String(userId);
        let doc = await AiMemory.findOne({ userId: uid, guildId: gid });
        if (!doc) doc = new AiMemory({ userId: uid, guildId: gid, messages: [] });
        const now = Date.now();
        doc.messages.push(
            { role: 'user', content: String(userText).slice(0, 500), at: now },
            { role: 'assistant', content: String(assistantText).slice(0, 500), at: now }
        );
        while (doc.messages.filter((m) => m.role === 'user').length > 10) doc.messages.shift();
        if (doc.messages.length > 20) doc.messages = doc.messages.slice(-20);
        await doc.save();
        return doc.messages;
    },

    clearAiMemory: async (userId, guildId) => {
        await AiMemory.deleteOne({
            userId: String(userId),
            guildId: String(guildId || 'dm')
        });
    },

    getUsersForDailyNotify: async (dateKey) => {
        return UserEconomy.find({
            $or: [
                { lastDailyDate: { $ne: dateKey } },
                { lastDailyDate: { $exists: false } }
            ],
            dailyNotifiedDate: { $ne: dateKey }
        }).limit(200).lean();
    }
};
