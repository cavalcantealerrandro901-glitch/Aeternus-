/**
 * Única moeda do Aeternus: Éter ✨
 * (XP continua separado em utils/xp.js)
 */
const store = require('./store');
const tx = require('./transactions');

function all() {
    // migra saldo antigo de flocos se existir e eter estiver vazio
    const eter = store.load('eter.json', null);
    if (eter && typeof eter === 'object') return eter;
    const legacy = store.load('flocos.json', {});
    if (legacy && Object.keys(legacy).length) {
        store.save('eter.json', legacy);
        return legacy;
    }
    return store.load('eter.json', {});
}

function get(userId) {
    return Number(all()[userId] || 0);
}

function set(userId, amount) {
    const d = all();
    d[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('eter.json', d);
    return d[userId];
}

function add(userId, amount, meta) {
    const n = Math.floor(Number(amount) || 0);
    const bal = set(userId, get(userId) + n);
    if (n > 0 && meta !== false) {
        try {
            tx.log(userId, {
                type: 'in',
                amount: n,
                reason: (meta && meta.reason) || 'entrada',
                from: meta?.from,
                to: meta?.to,
                currency: 'eter'
            });
        } catch (_) {}
    }
    return bal;
}

function remove(userId, amount, meta) {
    const n = Math.floor(Number(amount) || 0);
    const bal = set(userId, get(userId) - n);
    if (n > 0 && meta !== false) {
        try {
            tx.log(userId, {
                type: 'out',
                amount: n,
                reason: (meta && meta.reason) || 'saída',
                from: meta?.from,
                to: meta?.to,
                currency: 'eter'
            });
        } catch (_) {}
    }
    return bal;
}

function formatPlain(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function format(n) {
    return `✨ **${formatPlain(n)}** éter`;
}

module.exports = { get, set, add, remove, format, formatPlain, all };
