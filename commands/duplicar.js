const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(amount, userId) {
    flocos.remove(userId, amount, { reason: 'duplicar' });
    const win = Math.random() < 0.48;
    if (win) flocos.add(userId, amount * 2, { reason: 'duplicar win' });
    return { win, payout: amount * 2 };
}

function payload(r, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? '✨  Duplicar · Vitória' : '✨  Duplicar · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: flocos.get(userId),
                user,
                extra: r.win ? 'Seu valor foi **duplicado**!' : 'A sorte não veio desta vez.'
            })
        ],
        components: [againRow(`duplicar:again:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'duplicar',
    aliases: ['double', 'x2'],
    description: 'Duplica ou perde (flocos)',
    async execute(message, args) {
        const bet = resolveBet(args[0], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.duplicar <valor|all|half>\``);
        const r = play(bet.amount, message.author.id);
        await message.reply(payload(r, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(bet.amount, owner);
        await interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
