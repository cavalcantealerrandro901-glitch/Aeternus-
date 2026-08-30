const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function colorOf(n) {
    if (n === 0) return 'verde';
    const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    return red.has(n) ? 'vermelho' : 'preto';
}

function play(choice, amount, userId) {
    flocos.remove(userId, amount, { reason: 'roleta' });
    const n = Math.floor(Math.random() * 37);
    const color = colorOf(n);
    let mult = 0;
    let win = false;
    if (choice === 'verde' && n === 0) {
        win = true;
        mult = 14;
    } else if (choice === color) {
        win = true;
        mult = 2;
    } else if (/^\d+$/.test(choice) && parseInt(choice, 10) === n) {
        win = true;
        mult = 36;
    }
    const payout = amount * mult;
    if (payout > 0) flocos.add(userId, payout, { reason: 'roleta win' });
    return { n, color, win, mult, payout };
}

function payload(r, choice, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? '🎡  Roleta · Vitória' : '🎡  Roleta · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: flocos.get(userId),
                user,
                extra: `Aposta **${choice}** · Saiu **${r.n}** (${r.color})`
            })
        ],
        components: [againRow(`roleta:again:${choice}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    description: 'Roleta (flocos)',
    async execute(message, args) {
        const choice = (args[0] || '').toLowerCase();
        if (!choice || !args[1])
            return message.reply(
                'Uso: `O.roleta <vermelho|preto|verde|0-36> <valor|all|half>`'
            );
        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(choice, bet.amount, message.author.id);
        await message.reply(payload(r, choice, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const choice = parts[2];
        const amountStr = parts[3];
        const owner = parts[4];
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(choice, bet.amount, owner);
        await interaction.update(payload(r, choice, bet.amount, interaction.user, owner));
    }
};
