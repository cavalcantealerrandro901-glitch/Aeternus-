const store = require('./store');
const bank = require('./bank');
const cristais = require('./cristais');

const DAY = 24 * 60 * 60 * 1000;

function all() {
    return store.load('converter_pending.json', {});
}

function save(data) {
    store.save('converter_pending.json', data);
}

function list(userId) {
    return (all()[userId] || []).filter((p) => p && !p.done);
}

/**
 * @param {string} userId
 * @param {{ to: 'bank_flocos' | 'bank_cristais', amount: number, source?: string }}
 */
function addPending(userId, entry) {
    const data = all();
    if (!Array.isArray(data[userId])) data[userId] = [];

    const amount = Math.max(0, Math.floor(Number(entry.amount) || 0));
    if (!amount) return null;

    const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        to: entry.to === 'bank_cristais' ? 'bank_cristais' : 'bank_flocos',
        amount,
        source: entry.source || '',
        createdAt: Date.now(),
        releaseAt: Date.now() + DAY,
        done: false
    };

    data[userId].push(item);
    save(data);
    return item;
}

/** Libera pendências vencidas */
function releaseDue(userId) {
    const data = all();
    const list = Array.isArray(data[userId]) ? data[userId] : [];
    if (!list.length) return [];

    const now = Date.now();
    const released = [];

    for (const p of list) {
        if (!p || p.done || !p.releaseAt || p.releaseAt > now) continue;

        p.done = true;
        const amount = Math.max(0, Math.floor(Number(p.amount) || 0));
        if (!amount) continue;

        if (p.to === 'bank_flocos') {
            bank.add(userId, amount);
            released.push({ ...p, deposited: 'banco ❄️' });
        } else if (p.to === 'bank_cristais') {
            cristais.add(userId, amount);
            released.push({ ...p, deposited: 'carteira 💠' });
        }
    }

    // mantém só pendentes + concluídos recentes (2 dias)
    data[userId] = list.filter((p) => {
        if (!p) return false;
        if (!p.done) return true;
        return now - (p.releaseAt || 0) < DAY * 2;
    });

    if (!data[userId].length) delete data[userId];
    save(data);
    return released;
}

function releaseAllDue() {
    const data = all();
    const out = {};
    for (const uid of Object.keys(data)) {
        const r = releaseDue(uid);
        if (r.length) out[uid] = r;
    }
    return out;
}

module.exports = { addPending, list, releaseDue, releaseAllDue, DAY };
