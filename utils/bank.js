const store = require('./store');

function all() {
    return store.load('bank.json', {});
}

function get(userId) {
    return Math.max(0, Math.floor(Number(all()[userId] || 0)));
}

function set(userId, amount) {
    const d = all();
    d[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('bank.json', d);
    return d[userId];
}

function add(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    return set(userId, get(userId) + n);
}

function remove(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    const cur = get(userId);
    if (n > cur) return null; // insuficiente
    return set(userId, cur - n);
}

/**
 * Move da carteira (eter) para o cofre.
 * @returns {{ ok:true, amount, wallet, bank } | { ok:false, error }}
 */
function deposit(userId, amount, eter) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Valor inválido.' };
    const wallet = eter.get(userId);
    if (wallet < n) return { ok: false, error: 'Carteira insuficiente.' };
    eter.remove(userId, n, { reason: 'deposit' });
    const bankBal = add(userId, n);
    return { ok: true, amount: n, wallet: eter.get(userId), bank: bankBal };
}

/**
 * Move do cofre para a carteira.
 */
function withdraw(userId, amount, eter) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Valor inválido.' };
    const saved = get(userId);
    if (saved < n) return { ok: false, error: 'Cofre insuficiente.' };
    const after = remove(userId, n);
    if (after === null) return { ok: false, error: 'Cofre insuficiente.' };
    eter.add(userId, n, { reason: 'withdraw' });
    return { ok: true, amount: n, wallet: eter.get(userId), bank: after };
}

module.exports = { get, set, add, remove, all, deposit, withdraw };
