const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const OPTS = ['pedra', 'papel', 'tesoura'];
const BEATS = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

function play(choice, amount, userId) {
    flocos.remove(userId, amount, { reason: 'ppt' });
    const bot = OPTS[Math.floor(Math.random() * 3)];
    let state = 'lose';
    let payout = 0;
    if (choice === bot) {
        state = 'draw';
        payout = amount;
        flocos.add(userId, amount, { reason: 'ppt draw' });
    } else if (BEATS[choice] === bot) {
        state = 'win';
        payout = amount * 2;
        flocos.add(userId, payout, { reason: 'ppt win' });
    }
    return { bot, state, payout };
}

function payload(r, choice, amount, user, userId) {
    const win = r.state === 'win' ? true : r.state === 'draw' ? 'draw' : false;
    return {
        embeds: [
            crystalResult({
                title:
                    r.state === 'win'
                        ? '✊  PPT · Vitória'
                        : r.state === 'draw'
                          ? '✊  PPT · Empate'
                          : '✊  PPT · Derrota',
                win,
                amount,
                payout: r.payout,
                balance: flocos.get(userId),
                user,
                extra: `Você **${choice}** · Bot **${r.bot}**`
            })
        ],
        components: [againRow(`ppt:again:${choice}:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra papel tesoura (flocos)',
    async execute(message, args) {
        const choice = (args[0] || '').toLowerCase();
        if (!OPTS.includes(choice))
            return message.reply('Uso: `O.ppt <pedra|papel|tesoura> <valor|all|half>`');
        const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);
        const r = play(choice, bet.amount, message.author.id);
        await message.reply(payload(r, choice, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , choice, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(choice, bet.amount, owner);
        await interaction.update(payload(r, choice, bet.amount, interaction.user, owner));
    }
};
