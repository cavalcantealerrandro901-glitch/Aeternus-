const store = require('./store');

const MAX = 50;

function all() {
    return store.load('transactions.json', {});
}

function list(userId, limit = 15) {
    const arr = all()[userId] || [];
    return arr.slice(0, limit);
}

/**
 * @param {string} userId
 * @param {{ type:'in'|'out', amount:number, reason?:string, from?:string, to?:string, currency?:string }}
 */
function log(userId, entry) {
    if (!userId || !entry?.amount) return;
    const data = all();
    if (!data[userId]) data[userId] = [];
    data[userId].unshift({
        type: entry.type === 'in' ? 'in' : 'out',
        amount: Math.floor(Number(entry.amount) || 0),
        reason: entry.reason || 'movimento',
        from: entry.from || null,
        to: entry.to || null,
        currency: entry.currency || 'flocos',
        at: Date.now()
    });
    data[userId] = data[userId].slice(0, MAX);
    store.save('transactions.json', data);
}

function logTransfer(fromId, toId, amount) {
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return;
    log(fromId, {
        type: 'out',
        amount: n,
        reason: 'transferência enviada',
        to: toId,
        currency: 'flocos'
    });
    log(toId, {
        type: 'in',
        amount: n,
        reason: 'transferência recebida',
        from: fromId,
        currency: 'flocos'
    });
}

module.exports = { list, log, logTransfer };
