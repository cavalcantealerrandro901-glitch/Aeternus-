const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(amount, userId) {
    cristais.remove(userId, amount);
    const win = Math.random() < 0.48;
    if (win) cristais.add(userId, amount * 2);
    return { win, payout: amount * 2 };
}

function payload(r, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? '✨  Duplicou!' : '💥  Quebrou',
                win: r.win,
                amount,
                payout: r.payout,
                balance: cristais.get(userId),
                user,
                extra: r.win ? 'A sorte sorriu · ×2' : 'A casa levou tudo desta rodada'
            })
        ],
        components: [againRow(`duplicar:again:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'duplicar',
    aliases: ['double', 'dobrar'],
    description: 'Dobre ou perca',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.duplicar <valor|all|half>\``);
        const r = play(bet.amount, message.author.id);
        await message.reply(payload(r, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(bet.amount, owner);
        await interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
