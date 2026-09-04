const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(fromId, targets, amountRaw, reply) {
    if (!targets.length) return reply('❌ Mencione alguém.');
    const bal = eter.get(fromId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const total = bet.amount * targets.length;
    if (total > bal) return reply('❌ Saldo insuficiente para todos.');
    const lines = [];
    for (const u of targets) {
        eter.remove(fromId, bet.amount, { reason: 'pay' });
        eter.add(u.id, bet.amount, { reason: 'pay' });
        lines.push(`✨ **${fmt(bet.amount)}** → **${u.username}**`);
    }
    return reply({
        embeds: [
            new EmbedBuilder().setColor(0x22c55e).setTitle('Transferência').setDescription(lines.join('\n'))
        ]
    });
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Transferir éter',
    data: new SlashCommandBuilder()
        .setName('pagar')
        .setDescription('Transferir eter')
        .addUserOption((o) => o.setName('usuario').setDescription('Destino').setRequired(true))
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),

    async execute(message, args) {
        const targets = [...message.mentions.users.values()].filter((u) => !u.bot && u.id !== message.author.id);
        const amountRaw = args.filter((a) => !a.startsWith('<@')).pop();
        await run(message.author.id, targets, amountRaw, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            [i.options.getUser('usuario', true)],
            i.options.getString('valor', true),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
