const store = require('./store');

const DEFAULT = {
    prefix: 'O.',
    logs: { enabled: false, channelId: null, events: {} },
    welcome: { enabled: false, channelId: null, message: 'Bem-vindo {user} ao **{server}**!', embed: true },
    leave: { enabled: false, channelId: null, message: '{user} saiu de **{server}**.' },
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
    tickets: {
        enabled: false,
        categoryId: null,
        supportRoleId: null,
        logChannelId: null,
        maxOpen: 3
    },
    music: { enabled: true, categoryId: null },
    economy: { dailyMin: 5000, dailyMax: 50000, robEnabled: true, workEnabled: true },
    xp: { enabled: true, min: 30, max: 77, cooldownSec: 45 },
    suggestions: { enabled: false, channelId: null, upvoteEmoji: '👍', downvoteEmoji: '👎' },
    reports: { enabled: false, channelId: null, anon: true },
    levels: { announceChannelId: null, enabled: true },
    starboard: { enabled: false, channelId: null, minStars: 3, emoji: '⭐' },
    autorole: { enabled: false, roleId: null, delaySec: 0 },
    verification: {
        enabled: false,
        roleId: null,
        channelId: null,
        buttonLabel: 'Verificar',
        message: 'Clique para se verificar e acessar o servidor.'
    },
    antinuke: {
        enabled: false,
        maxBans: 3,
        maxKicks: 5,
        maxChannels: 3,
        windowSec: 30
    },
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
    shop: { enabled: true, vips: [] },
    birthday: {
        enabled: false,
        channelId: null,
        message: '🎂 Feliz aniversário, {user}!',
        roleId: null
    },
    counting: {
        enabled: false,
        channelId: null,
        current: 0,
        allowSameUser: false
    },
    sticky: {
        enabled: false,
        channelId: null,
        content: '',
        every: 8
    },
    autoPublish: {
        enabled: false,
        channelIds: []
    },
    memberCounter: {
        enabled: false,
        channelId: null,
        format: '👥 Membros: {count}'
    },
    autoReact: {
        enabled: false,
        channelId: null,
        emojis: ['👍', '❤️']
    },
    autoThread: {
        enabled: false,
        channelId: null,
        nameFormat: 'Discussão · {user}'
    },
    dmWelcome: {
        enabled: false,
        message: 'Olá {user}! Bem-vindo ao **{server}**.'
    },
    mentionGuard: {
        enabled: false,
        maxMentions: 5,
        punish: 'delete'
    },
    voiceHub: {
        enabled: false,
        channelId: null,
        createTemp: false
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

const MERGE_KEYS = [
    'logs', 'welcome', 'leave', 'automod', 'tickets', 'music', 'economy', 'xp',
    'suggestions', 'reports', 'levels', 'starboard', 'autorole', 'verification',
    'antinuke', 'shop', 'birthday', 'counting', 'sticky', 'autoPublish',
    'memberCounter', 'autoReact', 'autoThread', 'dmWelcome', 'mentionGuard', 'voiceHub'
];

function getSettings(guildId) {
    const all = store.load('guilds.json', {});
    const g = all[guildId] || {};
    const out = { ...structuredClone(DEFAULT), ...g };
    for (const k of MERGE_KEYS) {
        out[k] = { ...DEFAULT[k], ...(g[k] || {}) };
    }
    out.drops = {
        ...DEFAULT.drops,
        ...(g.drops || {}),
        requirements: {
            ...DEFAULT.drops.requirements,
            ...((g.drops && g.drops.requirements) || {})
        },
        extraEntries: Array.isArray(g.drops?.extraEntries)
            ? g.drops.extraEntries
            : DEFAULT.drops.extraEntries
    };
    out.shop = {
        ...DEFAULT.shop,
        ...(g.shop || {}),
        vips: Array.isArray(g.shop?.vips) ? g.shop.vips : DEFAULT.shop.vips
    };
    out.autoPublish = {
        ...DEFAULT.autoPublish,
        ...(g.autoPublish || {}),
        channelIds: Array.isArray(g.autoPublish?.channelIds)
            ? g.autoPublish.channelIds
            : DEFAULT.autoPublish.channelIds
    };
    out.autoReact = {
        ...DEFAULT.autoReact,
        ...(g.autoReact || {}),
        emojis: Array.isArray(g.autoReact?.emojis)
            ? g.autoReact.emojis
            : DEFAULT.autoReact.emojis
    };
    return out;
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
        all[guildId].drops.requirements.requiredRoleIds =
            patch.drops.requirements.requiredRoleIds;
    }
    if (patch.shop?.vips) {
        all[guildId].shop = all[guildId].shop || {};
        all[guildId].shop.vips = patch.shop.vips;
    }
    if (patch.autoPublish?.channelIds) {
        all[guildId].autoPublish = all[guildId].autoPublish || {};
        all[guildId].autoPublish.channelIds = patch.autoPublish.channelIds;
    }
    if (patch.autoReact?.emojis) {
        all[guildId].autoReact = all[guildId].autoReact || {};
        all[guildId].autoReact.emojis = patch.autoReact.emojis;
    }
    store.save('guilds.json', all);
    return getSettings(guildId);
}

function getPrefix(guildId) {
    return getSettings(guildId).prefix || 'O.';
}

module.exports = { getSettings, setSettings, getPrefix, DEFAULT };
