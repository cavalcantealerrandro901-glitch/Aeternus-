const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas, randomInt } = require('../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Roleta: vermelho, preto ou verde')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Aposta').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('cor').setDescription('Cor').setRequired(true)
            .addChoices(
                { name: 'Vermelho (2x)', value: 'vermelho' },
                { name: 'Preto (2x)', value: 'preto' },
                { name: 'Verde (14x)', value: 'verde' }
            )),
    aliases: ['roleta'],

    async run(userId, guildId, amount, color) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (!eco.games?.roulette) return { error: 'Roleta desativada neste servidor.' };

        const user = await db.getUser(userId, guildId);
        if (user.almas < amount) return { error: 'Saldo insuficiente.' };

        // 0 verde, 1-7 vermelho, 8-14 preto
        const n = randomInt(0, 14);
        const result = n === 0 ? 'verde' : n <= 7 ? 'vermelho' : 'preto';
        const mult = color === 'verde' ? 14 : 2;
        const win = result === color;
        const prize = win ? amount * mult : 0;

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

        return { result, color, win, prize, amount, total: user.almas, mult, n };
    },

    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');
        const color = interaction.options.getString('cor');
        const r = await this.run(interaction.user.id, interaction.guild.id, amount, color);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const emoji = r.result === 'verde' ? '🟢' : r.result === 'vermelho' ? '🔴' : '⚫';
        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('🎡 Roleta')
            .setDescription(`${emoji} Saiu **${r.result}** (${r.n})\nSua aposta: **${r.color}**\n` +
                (r.win
                    ? `Ganhou ${formatAlmas(r.prize, interaction.guild.id)} (x${r.mult})!`
                    : `Perdeu ${formatAlmas(r.amount, interaction.guild.id)}.`) +
                `\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const amount = parseInt(args[0], 10);
        const color = (args[1] || '').toLowerCase();
        if (!amount || !['vermelho', 'preto', 'verde'].includes(color)) {
            return message.reply('Uso: `roulette <quantidade> <vermelho|preto|verde>`');
        }

        const r = await this.run(message.author.id, message.guild.id, amount, color);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const emoji = r.result === 'verde' ? '🟢' : r.result === 'vermelho' ? '🔴' : '⚫';
        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('🎡 Roleta')
            .setDescription(`${emoji} Saiu **${r.result}** (${r.n})\nSua aposta: **${r.color}**\n` +
                (r.win
                    ? `Ganhou ${formatAlmas(r.prize, message.guild.id)} (x${r.mult})!`
                    : `Perdeu ${formatAlmas(r.amount, message.guild.id)}.`) +
                `\nSaldo: ${formatAlmas(r.total, message.guild.id)}`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
