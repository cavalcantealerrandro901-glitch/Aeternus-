const store = require('./store');

function load() {
    return store.load('cmd_lock.json', {});
}

function save(data) {
    store.save('cmd_lock.json', data);
}

function isLocked(guildId, channelId) {
    const all = load();
    const list = all[guildId] || [];
    return list.includes(String(channelId));
}

function toggle(guildId, channelId) {
    const all = load();
    const id = String(channelId);
    const list = new Set(all[guildId] || []);
    let locked;
    if (list.has(id)) {
        list.delete(id);
        locked = false;
    } else {
        list.add(id);
        locked = true;
    }
    all[guildId] = [...list];
    save(all);
    return locked;
}

function listChannels(guildId) {
    return load()[guildId] || [];
}

function looksLikeCommand(content, guildPrefix) {
    const t = String(content || '').trim();
    if (!t) return false;
    if (/^\/[a-z0-9_-]{1,32}/i.test(t)) return true;
    if (/^[!$%.?=>+\-;][a-zA-Z]/.test(t)) return true;
    if (guildPrefix && t.toLowerCase().startsWith(String(guildPrefix).toLowerCase())) {
        return true;
    }
    if (/^<@!?\d+>\s*[a-z]/i.test(t)) return true;
    return false;
}

module.exports = { isLocked, toggle, listChannels, looksLikeCommand };
