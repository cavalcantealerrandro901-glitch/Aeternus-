const db = require('./database');
const flocos = require('./flocos');

const EMOJI = '⭐';
const NAME = 'XP';

/** XP para ir do nível L → L+1 */
function xpForLevel(level) {
    const l = Math.max(1, Math.floor(level));
    return 100 * l * l;
}

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

function progress(totalXp) {
    let remaining = Math.max(0, Math.floor(totalXp || 0));
    let level = 1;
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level += 1;
        if (level > 500) break;
    }
    return {
        level,
        xpInLevel: remaining,
        xpNeed: xpForLevel(level),
        total: Math.max(0, Math.floor(totalXp || 0))
    };
}

/** Multiplicador do daily pelo nível de XP: 1.00 + 0.03 por nível acima de 1 */
function dailyMultiplier(userId) {
    const level = levelFromXp(get(userId));
    return Math.round((1 + (level - 1) * 0.03) * 100) / 100;
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
 * Adiciona XP. Em level-up: 300–5000 flocos e registra níveis subidos.
 */
function add(userId, amount) {
    const before = get(userId);
    const levelBefore = levelFromXp(before);
    const total = db.addXp(String(userId), Math.floor(Number(amount) || 0));
    const levelAfter = levelFromXp(total);
    const leveledUp = levelAfter > levelBefore;

    let flocosGained = 0;
    if (leveledUp) {
        for (let lv = levelBefore + 1; lv <= levelAfter; lv++) {
            const reward = 300 + Math.floor(Math.random() * (5000 - 300 + 1));
            flocosGained += reward;
        }
        if (flocosGained > 0) flocos.add(userId, flocosGained);
    }

    return {
        total,
        levelBefore,
        levelAfter,
        leveledUp,
        flocosGained,
        progress: progress(total),
        dailyMultiplier: dailyMultiplier(userId)
    };
}

module.exports = {
    EMOJI,
    NAME,
    xpForLevel,
    levelFromXp,
    progress,
    dailyMultiplier,
    format,
    formatPlain,
    get,
    add
};
