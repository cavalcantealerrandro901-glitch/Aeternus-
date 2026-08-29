const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(side, amount, userId) {
    cristais.remove(userId, amount);
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === side;
    if (win) cristais.add(userId, amount * 2);
    return { result, win, payout: amount * 2 };
}

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf'],
    description: 'Cara ou coroa',
    async execute(message, args) {
        const side = (args[0] || '').toLowerCase();
        if (!['cara', 'coroa'].includes(side))
            return message.reply('Uso: `O.cara <cara|coroa> <valor|all|half>`');
        const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        const r = play(side, bet.amount, message.author.id);
        await message.reply({
            embeds: [
                crystalResult({
                    title: r.win ? '🪙  Cara ou Coroa · Vitória' : '🪙  Cara ou Coroa · Derrota',
                    win: r.win,
                    amount: bet.amount,
                    payout: r.payout,
                    balance: cristais.get(message.author.id),
                    user: message.author,
                    extra: `Sua escolha **${side}** · Caiu **${r.result}**`
                })
            ],
            components: [againRow(`cara:again:${side}:${bet.amount}:${message.author.id}`)]
        });
    },
    async handleComponent(interaction) {
        const [, , side, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(side, bet.amount, owner);
        await interaction.update({
            embeds: [
                crystalResult({
                    title: r.win ? '🪙  Vitória' : '🪙  Derrota',
                    win: r.win,
                    amount: bet.amount,
                    payout: r.payout,
                    balance: cristais.get(owner),
                    user: interaction.user,
                    extra: `**${side}** × **${r.result}**`
                })
            ],
            components: [againRow(`cara:again:${side}:${bet.amount}:${owner}`)]
        });
    }
};
