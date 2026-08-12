const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas, randomInt } = require('../utils/economy');
const { aiGameResult } = require('../utils/phrases');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Aposte no dado (1-6)')
        .addIntegerOption((o) =>
            o.setName('quantidade').setDescription('Aposta').setRequired(true).setMinValue(1)
        )
        .addIntegerOption((o) =>
            o
                .setName('numero')
                .setDescription('Número de 1 a 6')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)
        ),
    aliases: ['dado'],

    async run(userId, guildId, amount, pick) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (!eco.games?.dice) return { error: 'Dice desativado neste servidor.' };

        const user = await db.getUser(userId, guildId);
        if (user.almas < amount) return { error: 'Saldo insuficiente.' };

        const roll = randomInt(1, 6);
        const win = roll === pick;
        const prize = win ? amount * 5 : 0;

        if (win) {
            user.almas += prize - amount;
            user.wins = (user.wins || 0) + 1;
            user.totalWon = (user.totalWon || 0) + prize;
        } else {
            user.almas -= amount;
            user.losses = (user.losses || 0) + 1;
        }
        user.totalBet = (user.totalBet || 0) + amount;
        await user.save();

        const note = await aiGameResult(win, 'dice', win ? prize : amount);
        return { roll, pick, win, prize, amount, total: user.almas, note };
    },

    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');
        const pick = interaction.options.getInteger('numero');
        const r = await this.run(interaction.user.id, interaction.guild.id, amount, pick);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('Dice')
            .setDescription(
                `${r.note || ''}\n\nVocê escolheu **${r.pick}** · Saiu **${r.roll}**\n` +
                    (r.win
                        ? `Ganhou ${formatAlmas(r.prize, interaction.guild.id)}`
                        : `Perdeu ${formatAlmas(r.amount, interaction.guild.id)}`) +
                    `\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const amount = parseInt(args[0], 10);
        const pick = parseInt(args[1], 10);
        if (!amount || !pick || pick < 1 || pick > 6) {
            return message.reply('Uso: `dice <quantidade> <1-6>`');
        }
        const r = await this.run(message.author.id, message.guild.id, amount, pick);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('Dice')
            .setDescription(
                `${r.note || ''}\n\nEscolha **${r.pick}** · Saiu **${r.roll}**\n` +
                    (r.win
                        ? `Ganhou ${formatAlmas(r.prize, message.guild.id)}`
                        : `Perdeu ${formatAlmas(r.amount, message.guild.id)}`) +
                    `\nSaldo: ${formatAlmas(r.total, message.guild.id)}`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
