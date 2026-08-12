const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas } = require('../utils/economy');
const { aiGameResult } = require('../utils/phrases');

const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '⭐'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Caça-níqueis de Almas')
        .addIntegerOption((o) =>
            o.setName('quantidade').setDescription('Aposta').setRequired(true).setMinValue(1)
        ),
    aliases: ['slot', 'caca'],

    async run(userId, guildId, amount) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (!eco.games?.slots) return { error: 'Slots desativado neste servidor.' };

        const user = await db.getUser(userId, guildId);
        if (user.almas < amount) return { error: 'Saldo insuficiente.' };

        const roll = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const a = roll();
        const b = roll();
        const c = roll();

        let mult = 0;
        if (a === b && b === c) mult = a === '⭐' ? 10 : a === '7️⃣' ? 7 : a === '💎' ? 5 : 3;
        else if (a === b || b === c || a === c) mult = 1.5;

        const win = mult > 0;
        const prize = win ? Math.floor(amount * mult) : 0;

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

        const note = await aiGameResult(win, 'slots', win ? prize : amount);
        return { slots: [a, b, c], win, prize, amount, total: user.almas, mult, note };
    },

    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');
        const r = await this.run(interaction.user.id, interaction.guild.id, amount);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('Slots')
            .setDescription(
                `${r.note || ''}\n\n**[ ${r.slots.join(' | ')} ]**\n` +
                    (r.win
                        ? `Ganhou ${formatAlmas(r.prize, interaction.guild.id)} (x${r.mult})`
                        : `Perdeu ${formatAlmas(r.amount, interaction.guild.id)}`) +
                    `\nSaldo: ${formatAlmas(r.total, interaction.guild.id)}`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const amount = parseInt(args[0], 10);
        if (!amount) return message.reply('Uso: `slots <quantidade>`');

        const r = await this.run(message.author.id, message.guild.id, amount);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(r.win ? 0x22c55e : 0xef4444)
            .setTitle('Slots')
            .setDescription(
                `${r.note || ''}\n\n**[ ${r.slots.join(' | ')} ]**\n` +
                    (r.win
                        ? `Ganhou ${formatAlmas(r.prize, message.guild.id)} (x${r.mult})`
                        : `Perdeu ${formatAlmas(r.amount, message.guild.id)}`) +
                    `\nSaldo: ${formatAlmas(r.total, message.guild.id)}`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
