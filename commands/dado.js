const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function play(guess, amount, userId) {
    cristais.remove(userId, amount);
    const roll = 1 + Math.floor(Math.random() * 6);
    const win = roll === guess;
    if (win) cristais.add(userId, amount * 6);
    return { roll, win, payout: amount * 6 };
}

function payload(r, guess, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: '🎲  Dado',
                win: r.win,
                amount,
                payout: r.payout,
                balance: cristais.get(userId),
                user,
                extra: `${FACES[r.roll - 1]}  Você: **${guess}** · Resultado: **${r.roll}**${r.win ? ' · ×6' : ''}`
            })
        ],
        components: [againRow(`dado:again:${guess}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    description: 'Aposte em um número do dado',
    async execute(message, args) {
        const guess = parseInt(args[0], 10);
        if (!(guess >= 1 && guess <= 6))
            return message.reply('Uso: `O.dado <1-6> <valor|all|half>`');
        const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(guess, bet.amount, message.author.id);
        await message.reply(payload(r, guess, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , guessStr, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const guess = parseInt(guessStr, 10);
        if (!(guess >= 1 && guess <= 6))
            return interaction.reply({ content: 'Dados inválidos.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(guess, bet.amount, owner);
        await interaction.update(payload(r, guess, bet.amount, interaction.user, owner));
    }
};
