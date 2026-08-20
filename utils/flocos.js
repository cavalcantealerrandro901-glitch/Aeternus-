const db = require('./database');

/** Moeda oficial do bot */
const EMOJI = '❄️';
const NAME = 'flocos';
const NAME_SINGULAR = 'floco';

function format(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} **${n.toLocaleString('pt-BR')}** ${n === 1 ? NAME_SINGULAR : NAME}`;
}

function formatPlain(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} ${n.toLocaleString('pt-BR')} ${n === 1 ? NAME_SINGULAR : NAME}`;
}

function get(userId) {
    return db.getBal(String(userId)) || 0;
}

function add(userId, amount) {
    return db.addBal(String(userId), Math.floor(Number(amount) || 0));
}

/**
 * Interpreta aposta: número, 1k, 2.5m, all, half
 */
function parseBet(input, balance) {
    if (input == null || input === '') return null;
    const str = String(input).toLowerCase().trim().replace(/,/g, '.');

    if (str === 'all' || str === 'tudo' || str === 'max') return Math.max(0, Math.floor(balance));
    if (str === 'half' || str === 'metade') return Math.max(0, Math.floor(balance / 2));

    const m = str.match(/^(\d+(?:\.\d+)?)([kmbt])?$/i);
    if (!m) return null;

    let val = parseFloat(m[1]);
    const u = (m[2] || '').toLowerCase();
    if (u === 'k') val *= 1e3;
    else if (u === 'm') val *= 1e6;
    else if (u === 'b') val *= 1e9;
    else if (u === 't') val *= 1e12;

    val = Math.floor(val);
    if (!Number.isFinite(val) || val <= 0) return null;
    return val;
}

function canBet(userId, amount) {
    const bal = get(userId);
    if (amount == null || amount <= 0) return { ok: false, error: 'Valor de aposta inválido.' };
    if (amount > bal) return { ok: false, error: `Saldo insuficiente. Você tem ${formatPlain(bal)}.` };
    return { ok: true, bal };
}

module.exports = {
    EMOJI,
    NAME,
    format,
    formatPlain,
    get,
    add,
    parseBet,
    canBet
};
