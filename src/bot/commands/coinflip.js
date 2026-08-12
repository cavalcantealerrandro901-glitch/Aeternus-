const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Cara ou coroa apostando Almas')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Aposta').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('lado').setDescription('Escolha').setRequired(true)
            .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })),
    aliases: ['cf', 'moeda'],

    async run(userId, guildId, amount, side) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (!eco.games?.coinflip) return { error: 'Coinflip desativado neste servidor.' };

        const user = await db.getUser(userId, guildId);
        if (user.almas < amount) return { error: 'Saldo insuficiente.' };

        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === side;

        if (win) {
            user.almas += amount;
            user.wins = (user.wins || 0) + 1;
            user.totalWon = (user.totalWon || 0) + amount;
        } else {
            user.almas -= amount;
            user.losses = (user.losses || 0) + 1;
        }
        user.totalBet = (user.totalBet || 0) + amount;
        await user.save();

        return { result, win, amount, total: user.almas };
    },

    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');
        const side = interaction.options.getString('lado');
        const r = await this.run(interaction.user.id, interaction.guild.id, amount, side);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle(r.win ? '🪙 Você ganhou!' : '🪙 Você perdeu...')
            .setDescription(
                `Escolha: **${side}**\nResultado: **${r.result}**\n` +
                (r.win ? `Lucro: ${formatAlmas(r.amount, interaction.guild.id)}` : `Perdeu: ${formatAlmas(r.amount, interaction.guild.id)}`) +
                `\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const amount = parseInt(args[0], 10);
        const side = (args[1] || '').toLowerCase();
        if (!amount || !['cara', 'coroa'].includes(side)) {
            return message.reply('Uso: `coinflip <quantidade> <cara|coroa>`');
        }

        const r = await this.run(message.author.id, message.guild.id, amount, side);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle(r.win ? '🪙 Você ganhou!' : '🪙 Você perdeu...')
            .setDescription(
                `Escolha: **${side}** · Resultado: **${r.result}**\n` +
                (r.win ? `Lucro: ${formatAlmas(r.amount, message.guild.id)}` : `Perdeu: ${formatAlmas(r.amount, message.guild.id)}`) +
                `\nSaldo: ${formatAlmas(r.total, message.guild.id)}`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
