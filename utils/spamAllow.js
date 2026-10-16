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

/** true se o canal (ou o servidor inteiro via '*') está liberado para spam */
function isAllowed(guildId, channelId) {
    const allowed = list(guildId);
    if (allowed.includes('*')) return true;
    return allowed.includes(String(channelId));
}

/** true se o servidor inteiro está liberado */
function isServerWide(guildId) {
    return list(guildId).includes('*');
}

function add(guildId, channelId) {
    const all = load();
    const set = new Set(all[guildId] || []);
    set.add(String(channelId));
    all[guildId] = [...set];
    save(all);
    return true;
}

/** Libera o servidor inteiro (remove canais individuais e coloca '*') */
function addServerWide(guildId) {
    const all = load();
    all[guildId] = ['*'];
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

/** Desliga a liberação do servidor inteiro */
function removeServerWide(guildId) {
    const all = load();
    const set = new Set(all[guildId] || []);
    const had = set.delete('*');
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

module.exports = {
    list,
    isAllowed,
    isServerWide,
    add,
    addServerWide,
    remove,
    removeServerWide,
    toggle
};
