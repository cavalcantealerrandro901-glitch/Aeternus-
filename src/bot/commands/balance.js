const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { formatAlmas, economyConfig } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Veja seu saldo de Almas')
        .addUserOption(o => o.setName('usuario').setDescription('Ver saldo de outro usuário')),
    aliases: ['bal', 'atm', 'saldo', 'almas'],

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const user = await db.getUser(target.id, interaction.guild.id);
        const eco = economyConfig(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
            .setTitle(`${eco.symbol} Carteira de Almas`)
            .addFields(
                { name: 'Carteira', value: formatAlmas(user.almas, interaction.guild.id), inline: true },
                { name: 'Banco', value: formatAlmas(user.bank, interaction.guild.id), inline: true },
                { name: 'Vitórias / Derrotas', value: `${user.wins || 0} / ${user.losses || 0}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first() || message.author;
        const user = await db.getUser(target.id, message.guild.id);
        const eco = economyConfig(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
            .setTitle(`${eco.symbol} Carteira de Almas`)
            .addFields(
                { name: 'Carteira', value: formatAlmas(user.almas, message.guild.id), inline: true },
                { name: 'Banco', value: formatAlmas(user.bank, message.guild.id), inline: true },
                { name: 'Vitórias / Derrotas', value: `${user.wins || 0} / ${user.losses || 0}`, inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
