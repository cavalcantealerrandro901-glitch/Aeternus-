const db = require('./database');
const { parseBet: parseAmount } = require('./flocos');

/** Cristais de gelo — mesma lógica de saldo que os flocos */
const EMOJI = '🧊';
const NAME = 'cristais de gelo';
const NAME_SINGULAR = 'cristal de gelo';

function format(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} **${n.toLocaleString('pt-BR')}** ${n === 1 ? NAME_SINGULAR : NAME}`;
}

function formatPlain(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} ${n.toLocaleString('pt-BR')} ${n === 1 ? NAME_SINGULAR : NAME}`;
}

function get(userId) {
    return db.getCristais(String(userId)) || 0;
}

function add(userId, amount) {
    return db.addCristais(String(userId), Math.floor(Number(amount) || 0));
}

function parseBet(input, balance) {
    return parseAmount(input, balance);
}

function canSpend(userId, amount) {
    const bal = get(userId);
    if (amount == null || amount <= 0) {
        return { ok: false, error: 'Valor inválido.' };
    }
    if (amount > bal) {
        return { ok: false, error: `Saldo insuficiente. Você tem ${formatPlain(bal)}.` };
    }
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
    canSpend
};
