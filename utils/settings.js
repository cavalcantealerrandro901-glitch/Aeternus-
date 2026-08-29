const store = require('./store');

const DEFAULT = {
    prefix: 'O.',
    logs: { enabled: false, channelId: null, events: {} },
    welcome: { enabled: false, channelId: null, message: '', embed: true },
    leave: { enabled: false, channelId: null, message: '' },
    automod: { enabled: false, antiSpam: true, antiLink: false, antiInvite: false, punish: 'warn' },
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
    drops: { enabled: true, channelId: null, emoji: '🎉' }
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
        drops: { ...DEFAULT.drops, ...(g.drops || {}) }
    };
}

function setSettings(guildId, patch) {
    const all = store.load('guilds.json', {});
    all[guildId] = deepMerge(all[guildId] || {}, patch);
    store.save('guilds.json', all);
    return getSettings(guildId);
}

function getPrefix(guildId) {
    return getSettings(guildId).prefix || 'O.';
}

module.exports = { getSettings, setSettings, getPrefix, DEFAULT };
