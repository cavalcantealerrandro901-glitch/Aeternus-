const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const OPTS = ['pedra', 'papel', 'tesoura'];
const ICON = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const WIN = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra, papel ou tesoura',
    async execute(message, args) {
        let choice = (args[0] || '').toLowerCase();
        if (choice === 'rock') choice = 'pedra';
        if (choice === 'paper') choice = 'papel';
        if (choice === 'scissors') choice = 'tesoura';
        if (!OPTS.includes(choice))
            return message.reply('Uso: `O.ppt <pedra|papel|tesoura> <valor|all|half>`');
        const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        cristais.remove(message.author.id, bet.amount);
        const bot = OPTS[Math.floor(Math.random() * 3)];
        let state = 'lose';
        if (choice === bot) state = 'draw';
        else if (WIN[choice] === bot) state = 'win';

        let payout = 0;
        if (state === 'win') {
            payout = bet.amount * 2;
            cristais.add(message.author.id, payout);
        } else if (state === 'draw') {
            payout = bet.amount;
            cristais.add(message.author.id, payout);
        }

        await message.reply({
            embeds: [
                crystalResult({
                    title:
                        state === 'win'
                            ? '✊  PPT · Vitória'
                            : state === 'draw'
                              ? '✊  PPT · Empate'
                              : '✊  PPT · Derrota',
                    win: state === 'win' ? true : state === 'draw' ? null : false,
                    amount: bet.amount,
                    payout,
                    balance: cristais.get(message.author.id),
                    user: message.author,
                    extra: `${ICON[choice]} Você **${choice}**  ×  ${ICON[bot]} Bot **${bot}**`
                })
            ],
            components: [againRow(`ppt:again:${choice}:${bet.amount}:${message.author.id}`)]
        });
    },
    async handleComponent(interaction) {
        const [, , choice, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const bet = resolveBet(amountStr, cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        cristais.remove(owner, bet.amount);
        const bot = OPTS[Math.floor(Math.random() * 3)];
        let state = 'lose';
        if (choice === bot) state = 'draw';
        else if (WIN[choice] === bot) state = 'win';
        let payout = 0;
        if (state === 'win') {
            payout = bet.amount * 2;
            cristais.add(owner, payout);
        } else if (state === 'draw') {
            payout = bet.amount;
            cristais.add(owner, payout);
        }
        await interaction.update({
            embeds: [
                crystalResult({
                    title: state === 'win' ? '✊  Vitória' : state === 'draw' ? '✊  Empate' : '✊  Derrota',
                    win: state === 'win' ? true : state === 'draw' ? null : false,
                    amount: bet.amount,
                    payout,
                    balance: cristais.get(owner),
                    user: interaction.user,
                    extra: `${ICON[choice]} **${choice}** × ${ICON[bot]} **${bot}**`
                })
            ],
            components: [againRow(`ppt:again:${choice}:${bet.amount}:${owner}`)]
        });
    }
};
