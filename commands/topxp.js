/** Atalho: top xp → rank xp */
const rank = require('./rank');
module.exports = {
    name: 'topxp',
    aliases: ['top-xp', 'rankxp'],
    description: 'Ranking de XP do servidor',
    category: 'utilidade',
    slash: false,
    noSlash: true,
    async execute(message, args, client) {
        return rank.execute(message, ['xp', ...args], client);
    },
    handleComponent: rank.handleComponent
};
