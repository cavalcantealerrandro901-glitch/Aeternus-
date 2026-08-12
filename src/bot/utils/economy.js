const db = require('../../database/db');

function economyConfig(guildId) {
    const cfg = db.getGuildConfig(guildId);
    return { ...db.DEFAULT_ECONOMY, ...(cfg.economy || {}) };
}

function formatAlmas(amount, guildId) {
    const eco = economyConfig(guildId);
    const n = Math.floor(Number(amount) || 0);
    return `${eco.symbol || '💀'} **${n.toLocaleString('pt-BR')}** ${eco.currency || 'Almas'}`;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cooldownLeft(last, ms) {
    const left = (last || 0) + ms - Date.now();
    return left > 0 ? left : 0;
}

function formatTime(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
}

module.exports = {
    economyConfig,
    formatAlmas,
    randomInt,
    cooldownLeft,
    formatTime
};
