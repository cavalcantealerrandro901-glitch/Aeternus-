const store = require('./store');

/**
 * Estrutura:
 * {
 *   [guildId]: {
 *     [userId]: {
 *       days: { 'YYYY-MM-DD': number },
 *       total: number
 *     }
 *   }
 * }
 */
function all() {
    return store.load('msgstats.json', {});
}

function save(data) {
    store.save('msgstats.json', data);
}

function dayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function ensure(guildId, userId) {
    const data = all();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) data[guildId][userId] = { days: {}, total: 0 };
    return data;
}

function add(guildId, userId, n = 1) {
    const data = ensure(guildId, userId);
    const key = dayKey();
    const u = data[guildId][userId];
    u.days[key] = (u.days[key] || 0) + n;
    u.total = (u.total || 0) + n;

    // limpa dias com mais de 40 dias
    const cutoff = Date.now() - 40 * 864e5;
    for (const k of Object.keys(u.days)) {
        const [yy, mm, dd] = k.split('-').map(Number);
        if (new Date(yy, mm - 1, dd).getTime() < cutoff) delete u.days[k];
    }
    save(data);
    return u;
}

function sumDays(daysObj, fromDate) {
    let sum = 0;
    const from = fromDate.getTime();
    for (const [k, v] of Object.entries(daysObj || {})) {
        const [yy, mm, dd] = k.split('-').map(Number);
        const t = new Date(yy, mm - 1, dd).getTime();
        if (t >= from) sum += Number(v) || 0;
    }
    return sum;
}

function getUser(guildId, userId) {
    const data = all();
    const u = data[guildId]?.[userId] || { days: {}, total: 0 };
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startToday.getTime() - 6 * 864e5);
    const startMonth = new Date(startToday.getTime() - 29 * 864e5);
    return {
        today: Number(u.days[dayKey()] || 0),
        week: sumDays(u.days, startWeek),
        month: sumDays(u.days, startMonth),
        total: Number(u.total || 0)
    };
}

function leaderboard(guildId, period = 'today', limit = 15) {
    const data = all()[guildId] || {};
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek = new Date(startToday.getTime() - 6 * 864e5);
    const startMonth = new Date(startToday.getTime() - 29 * 864e5);

    const rows = Object.entries(data).map(([userId, u]) => {
        let count = 0;
        if (period === 'today') count = Number(u.days?.[dayKey()] || 0);
        else if (period === 'week') count = sumDays(u.days, startWeek);
        else if (period === 'month') count = sumDays(u.days, startMonth);
        else count = Number(u.total || 0);
        return { userId, count };
    });

    return rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, limit);
}

module.exports = { add, getUser, leaderboard, dayKey };
