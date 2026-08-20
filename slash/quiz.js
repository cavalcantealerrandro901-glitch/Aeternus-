const { SlashCommandBuilder } = require('discord.js');
const prefixQuiz = require('../commands/quiz');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Quiz multiplayer com ranking no canal'),
    async execute(interaction) {
        await interaction.reply({ content: '🧠 Iniciando quiz multiplayer…', ephemeral: true });
        const fakeMessage = {
            id: interaction.id,
            author: interaction.user,
            member: interaction.member,
            channel: interaction.channel,
            guild: interaction.guild,
            client: interaction.client,
            reply: (p) => interaction.channel.send(p)
        };
        await prefixQuiz.execute(fakeMessage, []);
    }
};
