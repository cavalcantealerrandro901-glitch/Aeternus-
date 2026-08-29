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
 * @param {{ to:'flocos'|'cristais'|'bank_flocos'|'bank_cristais', amount:number, source:string }}
 */
function addPending(userId, entry) {
    const data = all();
    if (!data[userId]) data[userId] = [];
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    data[userId].push({
        id,
        to: entry.to,
        amount: Math.floor(Number(entry.amount) || 0),
        source: entry.source || '',
        createdAt: Date.now(),
        releaseAt: Date.now() + DAY,
        done: false
    });
    save(data);
    return data[userId][data[userId].length - 1];
}

/** Libera pendências vencidas → banco (flocos) ou cristais na carteira */
function releaseDue(userId) {
    const data = all();
    const list = data[userId] || [];
    if (!list.length) return [];

    const now = Date.now();
    const released = [];

    for (const p of list) {
        if (p.done || p.releaseAt > now) continue;
        p.done = true;
        if (p.to === 'flocos' || p.to === 'bank_flocos') {
            bank.add(userId, p.amount);
            released.push({ ...p, deposited: 'banco ❄️' });
        } else if (p.to === 'cristais' || p.to === 'bank_cristais') {
            // cristais vão para o "cofre" via saldo de cristais (não há bank de cristais)
            cristais.add(userId, p.amount);
            released.push({ ...p, deposited: 'carteira 💠' });
        }
    }

    data[userId] = list.filter((p) => !p.done || now - p.releaseAt < DAY * 2);
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
