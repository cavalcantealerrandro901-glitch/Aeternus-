const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function normalize(c) {
    c = (c || '').toLowerCase();
    if (['red', 'r', 'vermelho', 'verm'].includes(c)) return 'vermelho';
    if (['black', 'b', 'preto', 'pret'].includes(c)) return 'preto';
    if (['green', 'g', 'verde', '0'].includes(c)) return 'verde';
    return null;
}

function play(choice, amount, userId) {
    cristais.remove(userId, amount);
    const n = Math.floor(Math.random() * 37);
    const color = n === 0 ? 'verde' : RED.has(n) ? 'vermelho' : 'preto';
    const win = choice === color;
    const mult = win ? (color === 'verde' ? 14 : 2) : 0;
    const payout = amount * mult;
    if (payout > 0) cristais.add(userId, payout);
    return { n, color, win, mult, payout };
}

function payload(r, choice, amount, user, userId) {
    const emoji = r.color === 'verde' ? '🟢' : r.color === 'vermelho' ? '🔴' : '⚫';
    return {
        embeds: [
            crystalResult({
                title: '🎡  Roleta',
                win: r.win,
                amount,
                payout: r.payout,
                balance: cristais.get(userId),
                user,
                extra: `${emoji} Número **${r.n}** (${r.color})\nSua cor: **${choice}**${r.win ? ` · ×${r.mult}` : ''}`
            })
        ],
        components: [againRow(`roleta:again:${choice}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    description: 'Roleta europeia',
    async execute(message, args) {
        const choice = normalize(args[0]);
        if (!choice)
            return message.reply('Uso: `O.roleta <vermelho|preto|verde> <valor|all|half>`');
        const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(choice, bet.amount, message.author.id);
        await message.reply(payload(r, choice, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , choice, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        if (!normalize(choice))
            return interaction.reply({ content: 'Dados inválidos.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(choice, bet.amount, owner);
        await interaction.update(payload(r, choice, bet.amount, interaction.user, owner));
    }
};
