const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const ICONS = ['🍒', '🍋', '🔔', '⭐', '💎', '㟾️'];

function play(amount, userId) {
    eter.remove(userId, amount, { reason: 'slots' });
    const a = ICONS[Math.floor(Math.random() * ICONS.length)];
    const b = ICONS[Math.floor(Math.random() * ICONS.length)];
    const c = ICONS[Math.floor(Math.random() * ICONS.length)];
    let mult = 0;
    if (a === b && b === c) mult = a === '㟾️' ? 10 : a === '💎' ? 7 : 5;
    else if (a === b || b === c || a === c) mult = 2;
    const payout = amount * mult;
    if (payout > 0) eter.add(userId, payout, { reason: 'slots win' });
    return { reels: `${a} ${b} ${c}`, mult, payout, win: mult > 0 };
}

function payload(r, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? 'Slots · Vitória' : 'Slots · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: eter.get(userId),
                user,
                extra: r.reels
            })
        ],
        components: [againRow(`slots:again:${amount}:${userId}`)]
    };
}

async function run(userId, user, amountRaw, reply) {
    const bet = resolveBet(amountRaw, eter.get(userId), { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const r = play(bet.amount, userId);
    return reply(payload(r, bet.amount, user, userId));
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caca', 'cacaniqueis'],
    description: 'Caça-níqueis',
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Caça-níqueis')
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor, all ou half').setRequired(true)
        ),
    async execute(message, args) {
        await run(message.author.id, message.author, args[0], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.user, i.options.getString('valor'), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner) {
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        }
        const bet = resolveBet(amountStr, eter.get(owner), { label: '✨' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = play(bet.amount, owner);
        await interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
