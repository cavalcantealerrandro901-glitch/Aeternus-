const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('Ranking de Almas do servidor'),
    aliases: ['lb', 'rank', 'top', 'ranking'],

    async execute(interaction) {
        await interaction.deferReply();
        const list = await db.getLeaderboard(interaction.guild.id, 10);
        const eco = economyConfig(interaction.guild.id);

        if (!list.length) return interaction.editReply('Ninguém no ranking ainda.');

        const lines = await Promise.all(list.map(async (u, i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
            let name = u.userId;
            try {
                const user = await interaction.client.users.fetch(u.userId);
                name = user.username;
            } catch {}
            return `${medal} **${name}** — ${eco.symbol} ${u.almas.toLocaleString('pt-BR')}`;
        }));

        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle(`${eco.symbol} Ranking de ${eco.currency}`)
            .setDescription(lines.join('\n'))
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const list = await db.getLeaderboard(message.guild.id, 10);
        const eco = economyConfig(message.guild.id);
        if (!list.length) return message.reply('Ninguém no ranking ainda.');

        const lines = await Promise.all(list.map(async (u, i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
            let name = u.userId;
            try {
                const user = await message.client.users.fetch(u.userId);
                name = user.username;
            } catch {}
            return `${medal} **${name}** — ${eco.symbol} ${u.almas.toLocaleString('pt-BR')}`;
        }));

        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle(`${eco.symbol} Ranking de ${eco.currency}`)
            .setDescription(lines.join('\n'))
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
