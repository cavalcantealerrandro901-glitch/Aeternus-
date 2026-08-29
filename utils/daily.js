const store = require('./store');
const flocos = require('./flocos');
const xp = require('./xp');
const { getSettings } = require('./settings');

function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function yesterdayKey() {
    const y = new Date();
    // BRT approx via toLocale
    const today = todayKey();
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
}

function getInfo(userId) {
    const all = store.load('daily.json', {});
    return all[userId] || { last: null, streak: 0 };
}

function status(userId, guildId) {
    const info = getInfo(userId);
    const today = todayKey();
    const claimed = info.last === today;
    const eco = guildId ? getSettings(guildId).economy : { dailyMin: 5000, dailyMax: 50000 };
    const level = xp.get(userId).level || 0;
    const mult = xp.dailyMultiplier(level);
    return {
        claimed,
        last: info.last,
        streak: info.streak || 0,
        nextStreak: claimed ? info.streak || 0 : info.last === yesterdayKey() ? (info.streak || 0) + 1 : 1,
        dailyMin: eco.dailyMin ?? 5000,
        dailyMax: eco.dailyMax ?? 50000,
        multiplier: mult,
        level,
        balance: flocos.get(userId),
        timezone: 'America/Sao_Paulo'
    };
}

function claim(userId, guildId) {
    const all = store.load('daily.json', {});
    const today = todayKey();
    const info = all[userId] || { last: null, streak: 0 };
    if (info.last === today) {
        return { ok: false, error: 'Daily já coletado hoje. Volte após meia-noite BRT.' };
    }

    const streak = info.last === yesterdayKey() ? (info.streak || 0) + 1 : 1;
    const eco = guildId ? getSettings(guildId).economy : { dailyMin: 5000, dailyMax: 50000 };
    const min = eco.dailyMin ?? 5000;
    const max = eco.dailyMax ?? 50000;
    const base = min + Math.floor(Math.random() * (Math.max(max, min) - min + 1));
    const mult = xp.dailyMultiplier(xp.get(userId).level);
    const total = Math.floor(base * mult);

    flocos.add(userId, total);
    all[userId] = { last: today, streak };
    store.save('daily.json', all);

    return {
        ok: true,
        amount: total,
        base,
        multiplier: mult,
        streak,
        balance: flocos.get(userId)
    };
}

module.exports = { todayKey, status, claim, getInfo };
