const db = require('./database');

const EMOJI = '⭐';
const NAME = 'XP';

/** XP necessário para ir do nível L para L+1 */
function xpForLevel(level) {
    const l = Math.max(1, Math.floor(level));
    return 100 * l * l;
}

/** Converte XP total → nível (começa no 1) */
function levelFromXp(totalXp) {
    let xp = Math.max(0, Math.floor(totalXp || 0));
    let level = 1;
    while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level += 1;
        if (level > 500) break;
    }
    return level;
}

/** XP dentro do nível atual e quanto falta pro próximo */
function progress(totalXp) {
    let remaining = Math.max(0, Math.floor(totalXp || 0));
    let level = 1;
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level += 1;
        if (level > 500) break;
    }
    const need = xpForLevel(level);
    return {
        level,
        xpInLevel: remaining,
        xpNeed: need,
        total: Math.max(0, Math.floor(totalXp || 0))
    };
}

function format(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} **${n.toLocaleString('pt-BR')}** ${NAME}`;
}

function formatPlain(amount) {
    const n = Math.floor(Number(amount) || 0);
    return `${EMOJI} ${n.toLocaleString('pt-BR')} ${NAME}`;
}

function get(userId) {
    return db.getXp(String(userId)) || 0;
}

/**
 * Adiciona XP. Retorna { total, levelBefore, levelAfter, leveledUp }
 */
function add(userId, amount) {
    const before = get(userId);
    const levelBefore = levelFromXp(before);
    const total = db.addXp(String(userId), Math.floor(Number(amount) || 0));
    const levelAfter = levelFromXp(total);
    return {
        total,
        levelBefore,
        levelAfter,
        leveledUp: levelAfter > levelBefore,
        progress: progress(total)
    };
}

module.exports = {
    EMOJI,
    NAME,
    xpForLevel,
    levelFromXp,
    progress,
    format,
    formatPlain,
    get,
    add
};
