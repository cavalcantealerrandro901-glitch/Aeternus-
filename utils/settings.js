const store = require('./store');

const DEFAULT = {
    prefix: 'O.',
    logs: { enabled: false, channelId: null, events: {} },
    welcome: { enabled: false, channelId: null, message: '', embed: true },
    leave: { enabled: false, channelId: null, message: '' },
    automod: {
        enabled: true,
        antiSpam: true,
        antiLink: false,
        antiInvite: true,
        maxMessages: 6,
        windowMs: 5000,
        maxDuplicates: 3,
        minLength: 0,
        punish: 'delete'
    },
    tickets: { enabled: false, categoryId: null, supportRoleId: null },
    music: { categoryId: null },
    economy: { dailyMin: 5000, dailyMax: 50000, robEnabled: true, workEnabled: true },
    xp: { enabled: true, min: 30, max: 77, cooldownSec: 45 },
    suggestions: { enabled: false, channelId: null },
    reports: { enabled: false, channelId: null },
    levels: { announceChannelId: null },
    starboard: { enabled: false, channelId: null, minStars: 3 },
    autorole: { enabled: false, roleId: null },
    verification: { enabled: false, roleId: null, channelId: null },
    antinuke: { enabled: false },
    drops: {
        enabled: true,
        channelId: null,
        requirements: {
            minMessagesDay: 0,
            minMessagesWeek: 0,
            minMessagesMonth: 0,
            requiredRoleIds: [],
            minLevel: 0,
            minInvites: 0,
            minFlocos: 0,
            minCristais: 0
        },
        extraEntries: []
    },
    /** Loja — VIPs configuráveis no painel */
    shop: {
        enabled: true,
        vips: [
            // exemplo:
            // { id: 'vip1', name: 'VIP Prata', desc: 'Cargo VIP', price: 5000, currency: 'cristais', roleId: '123', durationDays: 0 }
        ]
    }
};

function deepMerge(a, b) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b || {})) {
        if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepMerge(a[k] || {}, v);
        else out[k] = v;
    }
    return out;
}

function getSettings(guildId) {
    const all = store.load('guilds.json', {});
    const g = all[guildId] || {};
    return {
        ...structuredClone(DEFAULT),
        ...g,
        logs: { ...DEFAULT.logs, ...(g.logs || {}) },
        welcome: { ...DEFAULT.welcome, ...(g.welcome || {}) },
        leave: { ...DEFAULT.leave, ...(g.leave || {}) },
        automod: { ...DEFAULT.automod, ...(g.automod || {}) },
        tickets: { ...DEFAULT.tickets, ...(g.tickets || {}) },
        music: { ...DEFAULT.music, ...(g.music || {}) },
        economy: { ...DEFAULT.economy, ...(g.economy || {}) },
        xp: { ...DEFAULT.xp, ...(g.xp || {}) },
        suggestions: { ...DEFAULT.suggestions, ...(g.suggestions || {}) },
        reports: { ...DEFAULT.reports, ...(g.reports || {}) },
        levels: { ...DEFAULT.levels, ...(g.levels || {}) },
        starboard: { ...DEFAULT.starboard, ...(g.starboard || {}) },
        autorole: { ...DEFAULT.autorole, ...(g.autorole || {}) },
        verification: { ...DEFAULT.verification, ...(g.verification || {}) },
        antinuke: { ...DEFAULT.antinuke, ...(g.antinuke || {}) },
        drops: {
            ...DEFAULT.drops,
            ...(g.drops || {}),
            requirements: {
                ...DEFAULT.drops.requirements,
                ...((g.drops && g.drops.requirements) || {})
            },
            extraEntries: Array.isArray(g.drops?.extraEntries)
                ? g.drops.extraEntries
                : DEFAULT.drops.extraEntries
        },
        shop: {
            ...DEFAULT.shop,
            ...(g.shop || {}),
            vips: Array.isArray(g.shop?.vips) ? g.shop.vips : DEFAULT.shop.vips
        }
    };
}

function setSettings(guildId, patch) {
    const all = store.load('guilds.json', {});
    all[guildId] = deepMerge(all[guildId] || {}, patch);
    if (patch.drops?.extraEntries) {
        all[guildId].drops = all[guildId].drops || {};
        all[guildId].drops.extraEntries = patch.drops.extraEntries;
    }
    if (patch.drops?.requirements?.requiredRoleIds) {
        all[guildId].drops = all[guildId].drops || {};
        all[guildId].drops.requirements = all[guildId].drops.requirements || {};
        all[guildId].drops.requirements.requiredRoleIds = patch.drops.requirements.requiredRoleIds;
    }
    // VIPs: substitui lista inteira quando enviada
    if (patch.shop?.vips) {
        all[guildId].shop = all[guildId].shop || {};
        all[guildId].shop.vips = patch.shop.vips;
    }
    store.save('guilds.json', all);
    return getSettings(guildId);
}

function getPrefix(guildId) {
    return getSettings(guildId).prefix || 'O.';
}

module.exports = { getSettings, setSettings, getPrefix, DEFAULT };
