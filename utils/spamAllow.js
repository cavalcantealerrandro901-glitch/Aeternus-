const store = require('./store');

function load() {
    return store.load('spam_allow.json', {});
}

function save(data) {
    store.save('spam_allow.json', data);
}

function list(guildId) {
    const all = load();
    return (all[guildId] || []).map(String);
}

function isAllowed(guildId, channelId) {
    return list(guildId).includes(String(channelId));
}

function add(guildId, channelId) {
    const all = load();
    const set = new Set(all[guildId] || []);
    set.add(String(channelId));
    all[guildId] = [...set];
    save(all);
    return true;
}

function remove(guildId, channelId) {
    const all = load();
    const set = new Set(all[guildId] || []);
    const had = set.delete(String(channelId));
    all[guildId] = [...set];
    save(all);
    return had;
}

function toggle(guildId, channelId) {
    if (isAllowed(guildId, channelId)) {
        remove(guildId, channelId);
        return false;
    }
    add(guildId, channelId);
    return true;
}

module.exports = { list, isAllowed, add, remove, toggle };
