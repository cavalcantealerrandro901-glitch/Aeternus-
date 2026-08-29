const store = require('./store');
const tx = require('./transactions');

function all() {
    return store.load('flocos.json', {});
}
function get(userId) {
    return Number(all()[userId] || 0);
}
function set(userId, amount) {
    const d = all();
    d[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('flocos.json', d);
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
                currency: 'flocos'
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
                currency: 'flocos'
            });
        } catch (_) {}
    }
    return bal;
}
function formatPlain(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}
function format(n) {
    return `❄️ **${formatPlain(n)}** flocos`;
}
module.exports = { get, set, add, remove, format, formatPlain, all };
