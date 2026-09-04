const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latencia'],
    description: 'Latência do bot',
    data: new SlashCommandBuilder().setName('latencia').setDescription('Latencia do bot'),

    async execute(message) {
        const sent = await message.reply('...');
        const round = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit({
            content: null,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Pong')
                    .setDescription(
                        `API: **${message.client.ws.ping}ms**\nRound: **${round}ms**`
                    )
            ]
        });
    },

    async executeSlash(i) {
        const t0 = Date.now();
        await i.reply({ content: '...' });
        const round = Date.now() - t0;
        await i.editReply({
            content: null,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Pong')
                    .setDescription(`API: **${i.client.ws.ping}ms**\nRound: **${round}ms**`)
            ]
        });
    }
};
