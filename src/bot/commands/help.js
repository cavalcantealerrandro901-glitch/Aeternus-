const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder().setName('help').setDescription('Lista de comandos do Aeternus'),
    aliases: ['ajuda', 'comandos'],

    async execute(interaction) {
        const prefix = db.getGuildConfig(interaction.guild.id).prefix || '!';
        const embed = build(prefix);
        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const prefix = db.getGuildConfig(message.guild.id).prefix || '!';
        await message.reply({ embeds: [build(prefix)] });
    }
};

function build(prefix) {
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('📖 Aeternus — Comandos')
        .setDescription(`Prefixo atual: \`${prefix}\` · Também funciona em slash`)
        .addFields(
            {
                name: '💀 Economia',
                value: '`balance` `daily` `work` `pay` `leaderboard`'
            },
            {
                name: '🎮 Jogos',
                value: '`coinflip` `slots` `dice` `roulette`'
            },
            {
                name: '🎫 Tickets',
                value: '`ticket fechar` `ticket reivindicar`'
            },
            {
                name: '🛡️ Moderação',
                value: '`ban` `kick` `timeout` `warn`'
            },
            {
                name: '🔧 Utilidades',
                value: '`help` `ping` `serverinfo` `userinfo`'
            }
        )
        .setFooter({ text: 'Aeternus · Almas eternas' })
        .setTimestamp();
}
