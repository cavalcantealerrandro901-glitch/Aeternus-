const store = require('./store');

const TTL_MS = 10 * 24 * 60 * 60 * 1000; // 10 dias

function all() {
    return store.load('user_snapshots.json', {});
}

function purgeExpired(data) {
    const now = Date.now();
    let changed = false;
    for (const [uid, row] of Object.entries(data)) {
        if (!row?.expiresAt || row.expiresAt < now) {
            delete data[uid];
            changed = true;
        }
    }
    if (changed) store.save('user_snapshots.json', data);
    return data;
}

/**
 * Salva/atualiza snapshot do usuário por 10 dias (sobrevive redeploy se Mongo estiver ok).
 */
function saveSnapshot(userId, payload) {
    const data = purgeExpired(all());
    const prev = data[userId] || {};
    data[userId] = {
        ...prev,
        ...payload,
        userId: String(userId),
        updatedAt: Date.now(),
        expiresAt: Date.now() + TTL_MS
    };
    store.save('user_snapshots.json', data);
    return data[userId];
}

function getSnapshot(userId) {
    const data = purgeExpired(all());
    const row = data[userId];
    if (!row) return null;
    if (row.expiresAt < Date.now()) return null;
    return row;
}

/** Monta snapshot a partir dos utilitários ao vivo */
function captureFromLive(userId, extra = {}) {
    const flocos = require('./flocos');
    const cristais = require('./cristais');
    const bank = require('./bank');
    const xp = require('./xp');
    const shop = require('./shop');
    const profile = require('./profile');

    const inv = shop.getInv(userId);
    const dec = shop.getEquippedDecoration(userId);
    const x = xp.get(userId);
    const p = profile.get(userId);

    return saveSnapshot(userId, {
        username: extra.username || null,
        avatarURL: extra.avatarURL || null,
        discriminator: extra.discriminator || null,
        aboutMe: p.aboutMe || '',
        title: shop.getEquippedTitle(userId),
        decorationId: dec?.id || null,
        decorationName: dec?.name || null,
        decorationImage: dec?.image || null,
        level: x.level,
        xp: x.xp,
        flocos: flocos.get(userId),
        cristais: cristais.get(userId),
        bank: bank.get(userId),
        owned: inv.owned,
        equipped: inv.equipped,
        ...extra
    });
}

module.exports = {
    TTL_MS,
    saveSnapshot,
    getSnapshot,
    captureFromLive,
    purgeExpired
};
