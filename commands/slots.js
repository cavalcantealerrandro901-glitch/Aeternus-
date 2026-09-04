const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const ICONS = ['🍊', '🍋', '🍇', '🍓', '⭐', '🍎'];

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, amountRaw, reply) {
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(userId, bet.amount, { reason: 'slots' });
    const roll = [0, 0, 0].map(() => ICONS[Math.floor(Math.random() * ICONS.length)]);
    let mult = 0;
    if (roll[0] === roll[1] && roll[1] === roll[2]) mult = roll[0] === '⭐' ? 10 : 5;
    else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) mult = 2;
    const win = Math.floor(bet.amount * mult);
    if (win > 0) eter.add(userId, win, { reason: 'slots win' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(win > 0 ? 0x22c55e : 0xef4444)
                .setTitle('Caça-níqueis')
                .setDescription(
                    `${roll.join(' | ')}\n${win > 0 ? `✨ **+${fmt(win)}**` : `✨ **-${fmt(bet.amount)}**`}\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caca'],
    description: 'Caça-níqueis',
    data: new SlashCommandBuilder()
        .setName('caca-niqueis')
        .setDescription('Caca-niqueis')
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),

    async execute(message, args) {
        await run(message.author.id, args[0], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getString('valor', true), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
