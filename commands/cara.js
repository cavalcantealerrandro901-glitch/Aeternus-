const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

function play(side, amount, userId) {
    eter.remove(userId, amount, { reason: 'cara' });
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === side;
    if (win) eter.add(userId, amount * 2, { reason: 'cara win' });
    return { result, win, payout: amount * 2 };
}

function payload(r, side, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? 'Cara ou coroa · Vitória' : 'Cara ou coroa · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: eter.get(userId),
                user,
                extra: `Você: **${side}** · Saiu: **${r.result}**`
            })
        ],
        components: [againRow(`cara:again:${side}:${amount}:${userId}`)]
    };
}

async function run(userId, user, side, amountRaw, reply) {
    side = String(side || '').toLowerCase();
    if (side !== 'cara' && side !== 'coroa') return reply('❌ Use `cara` ou `coroa`.');
    const bet = resolveBet(amountRaw, eter.get(userId), { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const r = play(side, bet.amount, userId);
    return reply(payload(r, side, bet.amount, user, userId));
}

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf'],
    description: 'Cara ou coroa',
    data: new SlashCommandBuilder()
        .setName('cara')
        .setDescription('Cara ou coroa')
        .addStringOption((o) =>
            o
                .setName('lado')
                .setDescription('cara ou coroa')
                .setRequired(true)
                .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })
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
            i.options.getString('lado'),
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    },
    async handleComponent(interaction) {
        const [, , side, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(side, bet.amount, owner);
        await interaction.update(payload(r, side, bet.amount, interaction.user, owner));
    }
};
