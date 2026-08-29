const store = require('./store');
const flocos = require('./flocos');
const cristais = require('./cristais');

function all() {
    return store.load('drops.json', {});
}

function save(data) {
    store.save('drops.json', data);
}

/** Parse 30s | 5m | 1h | 2d | 10min */
function parseDuration(str) {
    if (!str) return null;
    const m = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|dia|dias)?$/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (!n || n < 1) return null;
    const u = (m[2] || 'm').toLowerCase();
    if (u.startsWith('s')) return Math.min(n, 86400) * 1000;
    if (u.startsWith('h')) return Math.min(n, 168) * 3600 * 1000;
    if (u.startsWith('d')) return Math.min(n, 14) * 86400 * 1000;
    return Math.min(n, 10080) * 60 * 1000; // minutos
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

/** Detecta prêmio automático: "5000 flocos" | "100 cristais" | texto livre */
function parsePrize(text) {
    const t = String(text || '').trim();
    const m = t.match(/^(\d+(?:[.,]\d+)?[km]?)\s*(flocos?|cristais?|❄️|💠)?$/i);
    if (m) {
        const { parseAmount } = require('./parseAmount');
        const amount = parseAmount(m[1]);
        const coinRaw = (m[2] || 'flocos').toLowerCase();
        const coin = coinRaw.includes('cristal') || coinRaw === '💠' ? 'cristais' : 'flocos';
        if (amount > 0) return { type: coin, amount, label: t };
    }
    return { type: 'text', amount: 0, label: t || 'Prêmio misterioso' };
}

function createDrop(entry) {
    const data = all();
    data[entry.id] = entry;
    save(data);
    return entry;
}

function getDrop(id) {
    return all()[id] || null;
}

function removeDrop(id) {
    const data = all();
    delete data[id];
    save(data);
}

function listActive() {
    return Object.values(all()).filter((d) => d && !d.ended);
}

function payPrize(userId, prize) {
    if (!prize || prize.type === 'text') return false;
    if (prize.type === 'cristais') {
        cristais.add(userId, prize.amount);
        return true;
    }
    flocos.add(userId, prize.amount);
    return true;
}

module.exports = {
    parseDuration,
    formatDuration,
    parsePrize,
    createDrop,
    getDrop,
    removeDrop,
    listActive,
    payPrize,
    all,
    save
};
