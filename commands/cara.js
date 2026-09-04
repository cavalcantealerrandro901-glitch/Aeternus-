const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, side, amountRaw, reply) {
    const s = String(side || '').toLowerCase();
    if (!['cara', 'coroa'].includes(s)) return reply('Uso: `cara|coroa <valor>`');
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(userId, bet.amount, { reason: 'cara' });
    const result = Math.random() < 0.5 ? 'cara' : 'coroa';
    const win = result === s;
    if (win) eter.add(userId, bet.amount * 2, { reason: 'cara win' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(win ? 0x22c55e : 0xef4444)
                .setTitle(win ? 'Ganhou' : 'Perdeu')
                .setDescription(
                    `Resultado: **${result}**\n${win ? '✨ **+' + fmt(bet.amount) + '**' : '✨ **-' + fmt(bet.amount) + '**'}\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'cara',
    aliases: ['coinflip', 'cf'],
    description: 'Cara ou coroa',
    data: new SlashCommandBuilder()
        .setName('cara-coroa')
        .setDescription('Cara ou coroa')
        .addStringOption((o) =>
            o
                .setName('lado')
                .setDescription('cara ou coroa')
                .setRequired(true)
                .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })
        )
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),

    async execute(message, args) {
        await run(message.author.id, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getString('lado', true), i.options.getString('valor', true), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
