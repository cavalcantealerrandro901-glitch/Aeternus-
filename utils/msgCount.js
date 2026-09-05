/** Compat: commands/msg.js espera msgCount */
const msgStats = require('./msgStats');

function get(userId, guildId) {
    if (guildId) return msgStats.getUser(guildId, userId);
    return { today: 0, week: 0, month: 0, total: 0 };
}

function stats(userId, guildId) {
    return get(userId, guildId);
}

module.exports = {
    get,
    stats,
    add: msgStats.add,
    getUser: msgStats.getUser,
    leaderboard: msgStats.leaderboard
};
