/**
 * Garante que XP + atributos + histórico de ganhos vão para o MongoDB
 * (coleções aeternus_user_xp e aeternus_xp_gains).
 * O store já grava xp.json; isto cria documentos por usuário legíveis no Atlas.
 */
const xp = require('../utils/xp');

async function syncUserToMongo(userId, cur, meta = {}) {
    try {
        const { isConnected, UserXp, XpGain } = require('../utils/mongo');
        if (!isConnected() || !UserXp) return;
        const uid = String(userId);
        const amount = Number(meta.amount || 0);
        const update = {
            xp: Math.max(0, Math.floor(Number(cur.xp || 0))),
            level: Math.max(0, Math.floor(Number(cur.level || 0))),
            attrs: cur.attrs && typeof cur.attrs === 'object' ? { ...cur.attrs } : {},
            attrPoints: Math.max(0, Math.floor(Number(cur.attrPoints || 0))),
            updatedAt: new Date()
        };
        if (amount > 0) {
            update.lastGainAt = new Date();
            update.lastGainAmount = amount;
        }
        const op = { $set: update };
        if (amount > 0) op.$inc = { totalXpGained: amount };
        await UserXp.findByIdAndUpdate(uid, op, { upsert: true, setDefaultsOnInsert: true });

        if (amount !== 0 && meta.log !== false && XpGain) {
            await XpGain.create({
                userId: uid,
                amount,
                reason: meta.reason || 'xp',
                levelBefore: meta.levelBefore ?? update.level,
                levelAfter: update.level,
                attrs: update.attrs,
                attrGains: meta.attrGains || null
            });
        }
    } catch (e) {
        console.warn('[xpMongoSync]', e.message);
    }
}

function patch() {
    if (xp.__mongoSyncPatched) return;
    xp.__mongoSyncPatched = true;

    const origAdd = xp.addXp.bind(xp);
    xp.addXp = function addXpMongo(userId, amount) {
        const before = xp.get(userId);
        const result = origAdd(userId, amount);
        const cur = {
            xp: result.xp,
            level: result.level,
            attrs: result.attrs,
            attrPoints: xp.get(userId).attrPoints
        };
        syncUserToMongo(userId, cur, {
            amount: Number(amount || 0),
            reason: 'addXp',
            levelBefore: before.level,
            attrGains: result.attrGains
        }).catch(() => {});
        return result;
    };

    const origSet = xp.setXp.bind(xp);
    xp.setXp = function setXpMongo(userId, amount) {
        const result = origSet(userId, amount);
        syncUserToMongo(userId, {
            xp: result.xp,
            level: result.level,
            attrs: result.attrs,
            attrPoints: xp.get(userId).attrPoints
        }, { amount: 0, reason: 'setXp', log: false }).catch(() => {});
        return result;
    };

    const origSpend = xp.spendAttrPoints.bind(xp);
    xp.spendAttrPoints = function spendAttrPointsMongo(userId, key, amount) {
        const result = origSpend(userId, key, amount);
        if (result.ok) {
            const g = xp.get(userId);
            syncUserToMongo(userId, g, { amount: 0, reason: 'spendAttr', log: false }).catch(() => {});
        }
        return result;
    };

    const origRedist = xp.redistribuirAttrs.bind(xp);
    xp.redistribuirAttrs = function redistribuirAttrsMongo(userId) {
        const result = origRedist(userId);
        if (result.ok) {
            const g = xp.get(userId);
            syncUserToMongo(userId, g, { amount: 0, reason: 'redistribuir', log: false }).catch(() => {});
        }
        return result;
    };

    const origAddPts = xp.addAttrPoints.bind(xp);
    xp.addAttrPoints = function addAttrPointsMongo(userId, amount) {
        const result = origAddPts(userId, amount);
        const g = xp.get(userId);
        syncUserToMongo(userId, g, { amount: 0, reason: 'addAttrPoints', log: false }).catch(() => {});
        return result;
    };

    console.log('📦 [xpMongoSync] XP/atributos → aeternus_user_xp + aeternus_xp_gains');
}

module.exports = {
    setup() {
        patch();
    }
};
