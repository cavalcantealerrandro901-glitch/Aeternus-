const store = require('./store');

const KEY = 'action_stats.json';

function load() {
    return store.load(KEY, { global: {}, guilds: {} });
}

function save(data) {
    store.save(KEY, data);
}

/** Incrementa uso de uma ação (ex.: tapa) */
function add(action, userId, guildId) {
    if (!action || !userId) return;
    const data = load();
    const a = String(action).toLowerCase();
    const uid = String(userId);

    data.global = data.global || {};
    data.global[a] = data.global[a] || {};
    data.global[a][uid] = (Number(data.global[a][uid]) || 0) + 1;

    if (guildId) {
        const gid = String(guildId);
        data.guilds = data.guilds || {};
        data.guilds[gid] = data.guilds[gid] || {};
        data.guilds[gid][a] = data.guilds[gid][a] || {};
        data.guilds[gid][a][uid] = (Number(data.guilds[gid][a][uid]) || 0) + 1;
    }
    save(data);
    return data;
}

function all(action, guildId) {
    const data = load();
    const a = String(action).toLowerCase();
    if (guildId) {
        return (data.guilds && data.guilds[String(guildId)] && data.guilds[String(guildId)][a]) || {};
    }
    return (data.global && data.global[a]) || {};
}

module.exports = { add, all, load };
