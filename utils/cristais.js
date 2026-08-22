const db = require('./database');

/** Moeda de apostas */
const EMOJI = '💠';
const NAME = 'cristais';
const NAME_SINGULAR = 'cristal';

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

function normalizeNumberString(raw) {
    let s = String(raw)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace(/cristais?|💠|💎/g, '');

    let suffix = '';
    const suf = s.match(/^(.+?)([kmbt])$/i);
    if (suf) {
        s = suf[1];
        suffix = suf[2].toLowerCase();
    }

    const hasDot = s.includes('.');
    const hasComma = s.includes(',');

    if (hasDot && hasComma) {
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
    } else if (hasComma) {
        const parts = s.split(',');
        if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
            s = parts[0].replace(/\./g, '') + '.' + parts[1];
        } else s = s.replace(/,/g, '');
    } else if (hasDot) {
        const parts = s.split('.');
        if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
            s = parts[0] + '.' + parts[1];
        } else if (parts.length > 2) s = s.replace(/\./g, '');
        else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
            s = parts[0] + parts[1];
        }
    }

    return { numStr: s, suffix };
}

function parseBet(input, balance = 0) {
    if (input == null || input === '') return null;
    const raw = String(input).toLowerCase().trim();

    if (['all', 'tudo', 'max', 'full'].includes(raw)) {
        return Math.max(0, Math.floor(Number(balance) || 0));
    }
    if (['half', 'metade', 'meio'].includes(raw)) {
        return Math.max(0, Math.floor((Number(balance) || 0) / 2));
    }

    const { numStr, suffix } = normalizeNumberString(raw);
    if (!numStr || !/^[\d.]+$/.test(numStr)) return null;

    let val = parseFloat(numStr);
    if (!Number.isFinite(val) || val <= 0) return null;

    if (suffix === 'k') val *= 1e3;
    else if (suffix === 'm') val *= 1e6;
    else if (suffix === 'b') val *= 1e9;
    else if (suffix === 't') val *= 1e12;

    val = Math.floor(val);
    if (!Number.isFinite(val) || val <= 0) return null;
    return val;
}

function canBet(userId, amount) {
    const bal = get(userId);
    if (amount == null || amount <= 0) {
        return {
            ok: false,
            error: 'Valor inválido. Use `100`, `1,5k`, `2.5m`, `half` ou `all` (💠 cristais).'
        };
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
    canBet
};
