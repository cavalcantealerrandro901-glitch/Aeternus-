const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(guess, amount, userId) {
    eter.remove(userId, amount, { reason: 'dado' });
    const roll = 1 + Math.floor(Math.random() * 6);
    const win = roll === guess;
    if (win) eter.add(userId, amount * 6, { reason: 'dado win' });
    return { roll, win, payout: amount * 6 };
}

function payload(r, guess, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? 'Dado · Vitória' : 'Dado · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: eter.get(userId),
                user,
                extra: `Aposta **${guess}** · Saiu **${r.roll}**`
            })
        ],
        components: [againRow(`dado:again:${guess}:${amount}:${userId}`)]
    };
}

async function run(userId, user, guess, amountRaw, reply) {
    guess = parseInt(guess, 10);
    if (!guess || guess < 1 || guess > 6) return reply('❌ Número de 1 a 6.');
    const bet = resolveBet(amountRaw, eter.get(userId), { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const r = play(guess, bet.amount, userId);
    return reply(payload(r, guess, bet.amount, user, userId));
}

module.exports = {
    name: 'dado',
    aliases: ['dice', 'roll'],
    description: 'Aposta no dado 1–6',
    data: new SlashCommandBuilder()
        .setName('dado')
        .setDescription('Aposta no dado 1–6')
        .addIntegerOption((o) =>
            o.setName('numero').setDescription('1 a 6').setRequired(true).setMinValue(1).setMaxValue(6)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor, all ou half').setRequired(true)
        ),
    async execute(message, args) {
        await run(message.author.id, message.author, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            i.user,
            i.options.getInteger('numero'),
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    },
    async handleComponent(interaction) {
        const [, , guessStr, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(parseInt(guessStr, 10), bet.amount, owner);
        await interaction.update(payload(r, parseInt(guessStr, 10), bet.amount, interaction.user, owner));
    }
};
