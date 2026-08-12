const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Latência do bot'),
    aliases: ['latency'],

    async execute(interaction) {
        const sent = await interaction.reply({ content: '🏓 ...', fetchReply: true });
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! **${ping}ms** · API **${Math.round(interaction.client.ws.ping)}ms**`);
    },

    async executePrefix(message) {
        const sent = await message.reply('🏓 ...');
        const ping = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong! **${ping}ms** · API **${Math.round(message.client.ws.ping)}ms**`);
    }
};
