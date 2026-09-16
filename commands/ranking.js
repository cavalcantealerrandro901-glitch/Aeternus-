/** Atalho: ranking / top local → rank local (mesmo layout) */
const rank = require('./rank');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ranking',
    aliases: ['top', 'lb', 'leaderboard', 'topeter', 'top-eter'],
    description: 'Ranking de éter deste servidor',
    category: 'economia',
    data: new SlashCommandBuilder()
        .setName('ranking-servidor')
        .setDescription('Ranking de éter deste servidor'),

    async execute(message, args, client) {
        return rank.execute(message, ['local', ...(args || [])], client);
    },

    async executeSlash(i) {
        // reaproveita o rank local com a mesma interface e botões
        const payload = await rank.execute(
            {
                guild: i.guild,
                client: i.client,
                author: i.user,
                reply: (p) => i.reply(typeof p === 'string' ? { content: p } : p)
            },
            ['local'],
            i.client
        );
        // rank.execute já chama message.reply; para slash usamos sendRank via fake message
        // fallback direto:
        if (payload) return;
    },

    handleComponent: rank.handleComponent
};

// executeSlash correto — rank não exporta sendRank; implementamos via proxy message
module.exports.executeSlash = async function executeSlash(i) {
    const fakeMessage = {
        guild: i.guild,
        client: i.client,
        author: i.user,
        reply: async (payload) => {
            if (i.deferred || i.replied) return i.followUp(payload);
            return i.reply(payload);
        }
    };
    return rank.execute(fakeMessage, ['local']);
};
