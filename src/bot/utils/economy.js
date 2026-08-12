const db = require('../../database/db');

function economyConfig(guildId) {
    const cfg = db.getGuildConfig(guildId);
    const base = { ...db.DEFAULT_ECONOMY, ...(cfg.economy || {}) };
    // jogos podem estar em config.games ou economy.games
    base.games = {
        coinflip: true,
        slots: true,
        dice: true,
        roulette: true,
        ...(base.games || {}),
        ...(cfg.games || {})
    };
    if (cfg.branding?.currency) base.currency = cfg.branding.currency;
    if (cfg.branding?.symbol) base.symbol = cfg.branding.symbol;
    return base;
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

function todayKey(tz = 'America/Sao_Paulo') {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

function yesterdayKey(tz = 'America/Sao_Paulo') {
    const now = new Date();
    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(y);
    } catch {
        return y.toISOString().slice(0, 10);
    }
}

function msUntilNextMidnight(tz = 'America/Sao_Paulo') {
    const now = new Date();
    for (let h = 0; h < 48; h++) {
        const candidate = new Date(now.getTime() + h * 3600000);
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).formatToParts(candidate);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        if (hour === 0 && minute === 0) {
            return Math.max(1000, candidate.getTime() - now.getTime());
        }
    }
    return 3600000;
}

/**
 * Recompensa daily: base 5k-60k + bônus de streak
 * A cada 2 dias de sequência, +500 a +2k (acumulativo por par de dias)
 */
function calcDailyReward(streak) {
    const base = randomInt(5000, 60000);
    const pairs = Math.floor(Math.max(0, streak - 1) / 2);
    let bonus = 0;
    for (let i = 0; i < pairs; i++) {
        bonus += randomInt(500, 2000);
    }
    return { base, bonus, total: base + bonus };
}

module.exports = {
    economyConfig,
    formatAlmas,
    randomInt,
    cooldownLeft,
    formatTime,
    todayKey,
    yesterdayKey,
    msUntilNextMidnight,
    calcDailyReward
};
