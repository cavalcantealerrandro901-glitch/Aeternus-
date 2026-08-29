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

        cristais.remove(message.author.id, bet.amount);
        const n = Math.floor(Math.random() * 37);
        const color = n === 0 ? 'verde' : RED.has(n) ? 'vermelho' : 'preto';
        const win = choice === color;
        const mult = color === 'verde' && win ? 14 : win ? 2 : 0;
        const payout = bet.amount * (mult || 0);
        if (payout) cristais.add(message.author.id, payout);

        const emoji = color === 'verde' ? '🟢' : color === 'vermelho' ? '🔴' : '⚫';
        await message.reply({
            embeds: [
                crystalResult({
                    title: '🎡  Roleta',
                    win,
                    amount: bet.amount,
                    payout,
                    balance: cristais.get(message.author.id),
                    user: message.author,
                    extra: `${emoji} Número **${n}** (${color})\nSua cor: **${choice}**${win ? ` · ×${mult}` : ''}`
                })
            ],
            components: [againRow(`roleta:again:${choice}:${bet.amount}:${message.author.id}`)]
        });
    },
    async handleComponent(interaction) {
        const [, , choice, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        cristais.remove(owner, bet.amount);
        const n = Math.floor(Math.random() * 37);
        const color = n === 0 ? 'verde' : RED.has(n) ? 'vermelho' : 'preto';
        const win = choice === color;
        const mult = color === 'verde' && win ? 14 : win ? 2 : 0;
        const payout = bet.amount * (mult || 0);
        if (payout) cristais.add(owner, payout);
        const emoji = color === 'verde' ? '🟢' : color === 'vermelho' ? '🔴' : '⚫';
        await interaction.update({
            embeds: [
                crystalResult({
                    title: '🎡  Roleta',
                    win,
                    amount: bet.amount,
                    payout,
                    balance: cristais.get(owner),
                    user: interaction.user,
                    extra: `${emoji} **${n}** (${color}) · você: **${choice}**`
                })
            ],
            components: [againRow(`roleta:again:${choice}:${bet.amount}:${owner}`)]
        });
    }
};
