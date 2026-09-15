/** Atalho: top tapa → rank tapa */
const rank = require('./rank');
module.exports = {
    name: 'toptapa',
    aliases: ['top-tapa', 'topslap'],
    description: 'Ranking de tapas do servidor',
    category: 'utilidade',
    slash: false,
    noSlash: true,
    async execute(message, args, client) {
        return rank.execute(message, ['tapa', ...args], client);
    },
    handleComponent: rank.handleComponent
};
