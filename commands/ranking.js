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
    },

    handleComponent: rank.handleComponent
};
