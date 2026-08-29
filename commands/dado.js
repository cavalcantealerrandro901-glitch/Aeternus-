const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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

        cristais.remove(message.author.id, bet.amount);
        const roll = 1 + Math.floor(Math.random() * 6);
        const win = roll === guess;
        if (win) cristais.add(message.author.id, bet.amount * 6);

        await message.reply({
            embeds: [
                crystalResult({
                    title: '🎲  Dado',
                    win,
                    amount: bet.amount,
                    payout: bet.amount * 6,
                    balance: cristais.get(message.author.id),
                    user: message.author,
                    extra: `${FACES[roll - 1]}  Você: **${guess}** · Resultado: **${roll}**${win ? ' · ×6' : ''}`
                })
            ],
            components: [againRow(`dado:again:${guess}:${bet.amount}:${message.author.id}`)]
        });
    },
    async handleComponent(interaction) {
        const [, , guessStr, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const guess = parseInt(guessStr, 10);
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        cristais.remove(owner, bet.amount);
        const roll = 1 + Math.floor(Math.random() * 6);
        const win = roll === guess;
        if (win) cristais.add(owner, bet.amount * 6);
        await interaction.update({
            embeds: [
                crystalResult({
                    title: '🎲  Dado',
                    win,
                    amount: bet.amount,
                    payout: bet.amount * 6,
                    balance: cristais.get(owner),
                    user: interaction.user,
                    extra: `${FACES[roll - 1]}  **${guess}** → **${roll}**`
                })
            ],
            components: [againRow(`dado:again:${guess}:${bet.amount}:${owner}`)]
        });
    }
};
