/** 10 cargos de trabalho — XP e faixas de Almas */
const RANKS = [
    { id: 0, name: 'Iniciante',     emoji: '🌱', minXp: 0,     min: 5000,  max: 10000 },
    { id: 1, name: 'Aprendiz',      emoji: '📘', minXp: 100,   min: 8000,  max: 15000 },
    { id: 2, name: 'Operário',      emoji: '⚙️', minXp: 300,   min: 12000, max: 20000 },
    { id: 3, name: 'Especialista',  emoji: '🔧', minXp: 700,   min: 18000, max: 28000 },
    { id: 4, name: 'Veterano',      emoji: '⚔️', minXp: 1500,  min: 25000, max: 40000 },
    { id: 5, name: 'Mestre',        emoji: '🏅', minXp: 3000,  min: 35000, max: 55000 },
    { id: 6, name: 'Elite',         emoji: '💎', minXp: 5500,  min: 50000, max: 75000 },
    { id: 7, name: 'Lenda',         emoji: '👑', minXp: 9000,  min: 70000, max: 100000 },
    { id: 8, name: 'Abissal',       emoji: '🕳️', minXp: 14000, min: 90000, max: 140000 },
    { id: 9, name: 'Divindade',     emoji: '🌌', minXp: 22000, min: 120000, max: 200000 }
];

function getRankByXp(xp) {
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (xp >= r.minXp) rank = r;
    }
    return rank;
}

function getNextRank(xp) {
    const current = getRankByXp(xp);
    return RANKS.find(r => r.id === current.id + 1) || null;
}

function xpForWork(rankId) {
    // XP ganho por trabalho escala com o cargo
    return 15 + rankId * 8 + Math.floor(Math.random() * 10);
}

module.exports = { RANKS, getRankByXp, getNextRank, xpForWork };
