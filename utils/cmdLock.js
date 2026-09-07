const store = require('./store');

function load() {
    return store.load('cmd_lock.json', {});
}

function save(data) {
    store.save('cmd_lock.json', data);
}

function getGuild(guildId) {
    const all = load();
    const raw = all[guildId];
    if (Array.isArray(raw)) {
        return { locked: raw.map(String), commandsChannelId: null };
    }
    if (raw && typeof raw === 'object') {
        return {
            locked: (raw.locked || []).map(String),
            commandsChannelId: raw.commandsChannelId || null
        };
    }
    return { locked: [], commandsChannelId: null };
}

function saveGuild(guildId, cfg) {
    const all = load();
    all[guildId] = {
        locked: (cfg.locked || []).map(String),
        commandsChannelId: cfg.commandsChannelId || null
    };
    save(all);
}

function isLocked(guildId, channelId) {
    return getGuild(guildId).locked.includes(String(channelId));
}

function toggle(guildId, channelId) {
    const cfg = getGuild(guildId);
    const id = String(channelId);
    const set = new Set(cfg.locked);
    let locked;
    if (set.has(id)) {
        set.delete(id);
        locked = false;
    } else {
        set.add(id);
        locked = true;
    }
    cfg.locked = [...set];
    saveGuild(guildId, cfg);
    return locked;
}

function setCommandsChannel(guildId, channelId) {
    const cfg = getGuild(guildId);
    cfg.commandsChannelId = channelId ? String(channelId) : null;
    saveGuild(guildId, cfg);
    return cfg.commandsChannelId;
}

function getCommandsChannel(guildId) {
    return getGuild(guildId).commandsChannelId;
}

function listChannels(guildId) {
    return getGuild(guildId).locked;
}

function looksLikeCommand(content, guildPrefix) {
    const t = String(content || '').trim();
    if (!t) return false;
    if (/^\/[a-z0-9_\-]{1,32}/i.test(t)) return true;
    if (/^[!$%.?=>+\-;][\p{L}\p{N}]/u.test(t)) return true;
    if (guildPrefix && t.toLowerCase().startsWith(String(guildPrefix).toLowerCase())) {
        return true;
    }
    if (/^<@!?\d+>\s*[\p{L}]/u.test(t)) return true;
    return false;
}

function isAeternusCommand(content, guildPrefix, clientUserId) {
    const t = String(content || '').trim();
    if (!t) return false;
    if (guildPrefix && t.toLowerCase().startsWith(String(guildPrefix).toLowerCase())) {
        return true;
    }
    if (clientUserId && new RegExp(`^<@!?${clientUserId}>\\s*\\S+`).test(t)) {
        return true;
    }
    return false;
}

function redirectHint(guildId) {
    const ch = getCommandsChannel(guildId);
    if (ch) return `Vá para <#${ch}> e utilize os comandos lá. 😊`;
    return 'Vá para o canal **#comandos** e utilize os comandos lá. 😊';
}

module.exports = {
    isLocked,
    toggle,
    setCommandsChannel,
    getCommandsChannel,
    listChannels,
    looksLikeCommand,
    isAeternusCommand,
    redirectHint,
    getGuild
};
