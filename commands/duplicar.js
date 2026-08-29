const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(amount, userId) {
    cristais.remove(userId, amount);
    const win = Math.random() < 0.48;
    if (win) cristais.add(userId, amount * 2);
    return { win, payout: amount * 2 };
}

module.exports = {
    name: 'duplicar',
    aliases: ['double', 'dobrar'],
    description: 'Dobre ou perca',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.duplicar <valor|all|half>\``);

        const r = play(bet.amount, message.author.id);
        await message.reply({
            embeds: [
                crystalResult({
                    title: r.win ? '✨  Duplicou!' : '💥  Quebrou',
                    win: r.win,
                    amount: bet.amount,
                    payout: r.payout,
                    balance: cristais.get(message.author.id),
                    user: message.author,
                    extra: r.win ? 'A sorte sorriu · ×2' : 'A casa levou tudo desta rodada'
                })
            ],
            components: [againRow(`duplicar:again:${bet.amount}:${message.author.id}`)]
        });
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(bet.amount, owner);
        await interaction.update({
            embeds: [
                crystalResult({
                    title: r.win ? '✨  Duplicou!' : '💥  Quebrou',
                    win: r.win,
                    amount: bet.amount,
                    payout: r.payout,
                    balance: cristais.get(owner),
                    user: interaction.user,
                    extra: r.win ? '×2' : 'Sem sorte'
                })
            ],
            components: [againRow(`duplicar:again:${bet.amount}:${owner}`)]
        });
    }
};
