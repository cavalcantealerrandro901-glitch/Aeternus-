const db = require('./database');

/**
 * Cristais de gelo 🧊 — progresso tipo XP.
 * Cada nível aumenta o multiplicador do daily.
 */
const EMOJI = '🧊';
const NAME = 'cristais de gelo';
const NAME_SINGULAR = 'cristal de gelo';

/** Cristais necessários para subir do nível L → L+1 */
function cristaisForLevel(level) {
    const l = Math.max(1, Math.floor(level));
    return 50 * l * l;
}

function levelFromTotal(total) {
    let left = Math.max(0, Math.floor(total || 0));
    let level = 1;
    while (left >= cristaisForLevel(level)) {
        left -= cristaisForLevel(level);
        level += 1;
        if (level > 200) break;
    }
    return level;
}

function progress(total) {
    let remaining = Math.max(0, Math.floor(total || 0));
    let level = 1;
    while (remaining >= cristaisForLevel(level)) {
        remaining -= cristaisForLevel(level);
        level += 1;
        if (level > 200) break;
    }
    const need = cristaisForLevel(level);
    return {
        level,
        inLevel: remaining,
        need,
        total: Math.max(0, Math.floor(total || 0))
    };
}

/** Multiplicador do daily: nível 1 = 1.00x; +0.05 por nível */
function dailyMultiplier(userId) {
    const level = levelFromTotal(get(userId));
    return Math.round((1 + (level - 1) * 0.05) * 100) / 100;
}

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
    const before = get(userId);
    const levelBefore = levelFromTotal(before);
    const total = db.addCristais(String(userId), Math.floor(Number(amount) || 0));
    const levelAfter = levelFromTotal(total);
    return {
        total,
        levelBefore,
        levelAfter,
        leveledUp: levelAfter > levelBefore,
        progress: progress(total),
        dailyMultiplier: Math.round((1 + (levelAfter - 1) * 0.05) * 100) / 100
    };
}

module.exports = {
    EMOJI,
    NAME,
    cristaisForLevel,
    levelFromTotal,
    progress,
    dailyMultiplier,
    format,
    formatPlain,
    get,
    add
};
