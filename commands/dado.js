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
                title: r.win ? '🎲  Dado · Vitória' : '🎲  Dado · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: eter.get(userId),
                user,
                extra: `Você apostou no **${guess}** · Saiu **${r.roll}**`
            })
        ],
        components: [againRow(`dado:again:${guess}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'dado',
    aliases: ['dice', 'roll'],
    description: 'Aposta no dado 1-6 (éter)',
    async execute(message, args) {
        const guess = parseInt(args[0], 10);
        if (!guess || guess < 1 || guess > 6)
            return message.reply('Uso: `O.dado <1-6> <valor|all|half>`');
        const bet = resolveBet(args[1], eter.get(message.author.id), { label: '✨' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(guess, bet.amount, message.author.id);
        await message.reply(payload(r, guess, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , guessStr, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const guess = parseInt(guessStr, 10);
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(guess, bet.amount, owner);
        await interaction.update(payload(r, guess, bet.amount, interaction.user, owner));
    }
};
