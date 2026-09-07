const store = require('./store');

function loadAll() {
    return store.load('reaction_roles.json', {});
}

function saveAll(data) {
    store.save('reaction_roles.json', data);
}

function get(guildId) {
    const all = loadAll();
    if (!all[guildId]) {
        all[guildId] = {
            enabled: true,
            channelId: null,
            messageId: null,
            allowMultiple: false,
            message: 'Reaja com o emoji do VIP que deseja receber.',
            roles: []
        };
    }
    if (!all[guildId].message) {
        all[guildId].message = 'Reaja com o emoji do VIP que deseja receber.';
    }
    return all[guildId];
}

function save(guildId, cfg) {
    const all = loadAll();
    all[guildId] = cfg;
    saveAll(all);
    return cfg;
}

function findByEmoji(cfg, emoji) {
    if (!emoji || !cfg?.roles?.length) return null;
    const name = emoji.name || '';
    const id = emoji.id || null;
    const str = typeof emoji.toString === 'function' ? emoji.toString() : name;

    return (
        cfg.roles.find((r) => {
            if (id && r.emoji.includes(id)) return true;
            if (r.emoji === str) return true;
            if (r.emoji === name) return true;
            if (r.emoji === `:${name}:`) return true;
            return false;
        }) || null
    );
}

function addRole(guildId, { roleId, emoji, label }) {
    const cfg = get(guildId);
    cfg.roles = cfg.roles.filter((r) => r.roleId !== roleId && r.emoji !== emoji);
    cfg.roles.push({
        roleId: String(roleId),
        emoji: String(emoji).slice(0, 80),
        label: String(label || 'VIP').slice(0, 40)
    });
    return save(guildId, cfg);
}

function removeRole(guildId, key) {
    const cfg = get(guildId);
    const k = String(key).toLowerCase();
    cfg.roles = cfg.roles.filter(
        (r) =>
            r.roleId !== key &&
            r.emoji !== key &&
            r.emoji.toLowerCase() !== k &&
            (r.label || '').toLowerCase() !== k
    );
    return save(guildId, cfg);
}

module.exports = {
    get,
    save,
    findByEmoji,
    addRole,
    removeRole,
    loadAll
};
