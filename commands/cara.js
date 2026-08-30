const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(side, amount, userId) {
    flocos.remove(userId, amount, { reason: 'cara' });
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === side;
    if (win) flocos.add(userId, amount * 2, { reason: 'cara win' });
    return { result, win, payout: amount * 2 };
}

function payload(r, side, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? '🪙  Cara ou Coroa · Vitória' : '🪙  Cara ou Coroa · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: flocos.get(userId),
                user,
                extra: `Sua escolha **${side}** · Caiu **${r.result}**`
            })
        ],
        components: [againRow(`cara:again:${side}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf'],
    description: 'Cara ou coroa (flocos)',
    async execute(message, args) {
        const side = (args[0] || '').toLowerCase();
        if (!['cara', 'coroa'].includes(side))
            return message.reply('Uso: `O.cara <cara|coroa> <valor|all|half>`');
        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(side, bet.amount, message.author.id);
        await message.reply(payload(r, side, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , side, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        if (!['cara', 'coroa'].includes(side))
            return interaction.reply({ content: 'Dados inválidos.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(side, bet.amount, owner);
        await interaction.update(payload(r, side, bet.amount, interaction.user, owner));
    }
};
