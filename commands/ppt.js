const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const MOVES = ['pedra', 'papel', 'tesoura'];
const WIN = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

function play(choice, amount, userId) {
    eter.remove(userId, amount, { reason: 'ppt' });
    const bot = MOVES[Math.floor(Math.random() * 3)];
    let result = 'empate';
    if (choice === bot) result = 'empate';
    else if (WIN[choice] === bot) result = 'win';
    else result = 'lose';
    let payout = 0;
    if (result === 'win') {
        payout = amount * 2;
        eter.add(userId, payout, { reason: 'ppt win' });
    } else if (result === 'empate') {
        payout = amount;
        eter.add(userId, amount, { reason: 'ppt draw' });
    }
    return { bot, result, payout };
}

function payload(r, choice, amount, user, userId) {
    const title =
        r.result === 'win' ? 'PPT · Vitória' : r.result === 'empate' ? 'PPT · Empate' : 'PPT · Derrota';
    return {
        embeds: [
            crystalResult({
                title,
                win: r.result === 'win',
                amount,
                payout: r.payout,
                balance: eter.get(userId),
                user,
                extra: `Você: **${choice}** · Bot: **${r.bot}**`
            })
        ],
        components: [againRow(`ppt:again:${choice}:${amount}:${userId}`)]
    };
}

async function run(userId, user, choice, amountRaw, reply) {
    choice = String(choice || '').toLowerCase();
    if (!MOVES.includes(choice)) return reply('❌ Use pedra, papel ou tesoura.');
    const bet = resolveBet(amountRaw, eter.get(userId), { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const r = play(choice, bet.amount, userId);
    return reply(payload(r, choice, bet.amount, user, userId));
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra, papel ou tesoura',
    data: new SlashCommandBuilder()
        .setName('ppt')
        .setDescription('Pedra, papel ou tesoura')
        .addStringOption((o) =>
            o
                .setName('jogada')
                .setDescription('Sua jogada')
                .setRequired(true)
                .addChoices(
                    { name: 'Pedra', value: 'pedra' },
                    { name: 'Papel', value: 'papel' },
                    { name: 'Tesoura', value: 'tesoura' }
                )
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor, all ou half').setRequired(true)
        ),
    async execute(message, args) {
        await run(message.author.id, message.author, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            i.user,
            i.options.getString('jogada'),
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    },
    async handleComponent(interaction) {
        const [, , choice, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(choice, bet.amount, owner);
        await interaction.update(payload(r, choice, bet.amount, interaction.user, owner));
    }
};
