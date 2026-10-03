const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'aeternus',
    aliases: ['ia', 'ai', 'assistente', 'ask', 'consciencia', 'consciência'],
    description: 'Assistente (desativado)',
    data: new SlashCommandBuilder()
        .setName('aeternus')
        .setDescription('Assistente do Aeternus (desativado)')
        .addStringOption((o) =>
            o.setName('mensagem').setDescription('Mensagem').setRequired(false)
        ),

    async execute(message) {
        return message.reply('🤖 O assistente/IA do Aeternus foi **desativado**.');
    },

    async executeSlash(interaction) {
        const reply = (p) =>
            interaction.replied || interaction.deferred ? interaction.editReply(p) : interaction.reply(p);
        return reply({ content: '🤖 O assistente/IA do Aeternus foi **desativado**.', ephemeral: true });
    }
};
