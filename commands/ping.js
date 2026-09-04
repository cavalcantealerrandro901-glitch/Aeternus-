const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency'],
    description: 'Latência',
    data: new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
    async execute(message) {
        const s = await message.reply('…');
        await s.edit({
            content: null,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22d3ee)
                    .setTitle('Pong')
                    .setDescription(
                        `API **${message.client.ws.ping}ms**\nRT **${s.createdTimestamp - message.createdTimestamp}ms**`
                    )
            ]
        });
    },
    async executeSlash(i) {
        const t = Date.now();
        await i.reply('…');
        await i.editReply({
            content: null,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22d3ee)
                    .setTitle('Pong')
                    .setDescription(`API **${i.client.ws.ping}ms**\nRT **${Date.now() - t}ms**`)
            ]
        });
    }
};
