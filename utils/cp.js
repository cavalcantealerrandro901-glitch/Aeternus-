/**
 * CP (Cristais de Proeza) — moeda de combate (PvP / Masmorra).
 */
const store = require('./store');

function all() {
    return store.load('cp.json', {});
}

function get(userId) {
    return Math.max(0, Math.floor(Number(all()[userId] || 0)));
}

function set(userId, amount) {
    const data = all();
    data[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('cp.json', data);
    return data[userId];
}

function add(userId, amount, meta = {}) {
    const n = Math.floor(Number(amount) || 0);
    if (!n) return get(userId);
    const next = get(userId) + n;
    set(userId, next);
    return next;
}

function take(userId, amount) {
    const need = Math.max(0, Math.floor(Number(amount) || 0));
    const cur = get(userId);
    if (cur < need) return { ok: false, error: 'CP insuficiente.', balance: cur };
    set(userId, cur - need);
    return { ok: true, balance: cur - need };
}

module.exports = { get, set, add, take, all };
