const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const OPTS = ['pedra', 'papel', 'tesoura'];
const ICON = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const WIN = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

function normalize(c) {
    c = (c || '').toLowerCase();
    if (['rock', 'pedra', 'stone'].includes(c)) return 'pedra';
    if (['paper', 'papel'].includes(c)) return 'papel';
    if (['scissors', 'tesoura', 'tesoura'].includes(c)) return 'tesoura';
    return null;
}

function play(choice, amount, userId) {
    cristais.remove(userId, amount);
    const bot = OPTS[Math.floor(Math.random() * 3)];
    let state = 'lose';
    if (choice === bot) state = 'draw';
    else if (WIN[choice] === bot) state = 'win';

    let payout = 0;
    if (state === 'win') {
        payout = amount * 2;
        cristais.add(userId, payout);
    } else if (state === 'draw') {
        payout = amount;
        cristais.add(userId, amount);
    }
    return { bot, state, payout };
}

function payload(r, choice, amount, user, userId) {
    const winFlag = r.state === 'win' ? true : r.state === 'draw' ? 'draw' : false;
    const title =
        r.state === 'win' ? '✊  PPT · Vitória' : r.state === 'draw' ? '✊  PPT · Empate' : '✊  PPT · Derrota';
    return {
        embeds: [
            crystalResult({
                title,
                win: winFlag,
                amount,
                payout: r.payout,
                balance: cristais.get(userId),
                user,
                extra: `${ICON[choice]} Você **${choice}**  ×  ${ICON[r.bot]} Bot **${r.bot}**`
            })
        ],
        components: [againRow(`ppt:again:${choice}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra, papel ou tesoura',
    async execute(message, args) {
        const choice = normalize(args[0]);
        if (!choice) return message.reply('Uso: `O.ppt <pedra|papel|tesoura> <valor|all|half>`');
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
