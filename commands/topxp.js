/** Atalho: top xp → rank xp (mesmo layout) */
const rank = require('./rank');

module.exports = {
    name: 'topxp',
    aliases: ['top-xp', 'rankxp', 'rank-xp', 'topnivel', 'top-nivel'],
    description: 'Ranking de XP do servidor',
    category: 'utilidade',
    slash: false,
    noSlash: true,

    async execute(message, args, client) {
        return rank.execute(message, ['xp', ...(args || [])], client);
    },

    handleComponent: rank.handleComponent
};
