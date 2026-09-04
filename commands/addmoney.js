const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(modMember, targets, amountRaw, reply) {
    if (!modMember?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return reply('❌ Só administradores.');
    }
    if (!targets.length) return reply('❌ Informe o usuário.');
    if (!amountRaw) return reply('❌ Informe o valor.');
    const bet = resolveBet(amountRaw, Number.MAX_SAFE_INTEGER, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const lines = [];
    for (const u of targets) {
        if (u.bot) continue;
        eter.add(u.id, bet.amount, { reason: 'addmoney' });
        lines.push(`**${u.username}** · ✨ **+${fmt(bet.amount)}**`);
    }
    if (!lines.length) return reply('❌ Nenhum usuário válido.');
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('Éter adicionado')
                .setDescription(lines.join('\n'))
        ]
    });
}

module.exports = {
    name: 'addmoney',
    aliases: ['addeter', 'givemoney'],
    description: 'Adicionar éter (admin)',
    data: new SlashCommandBuilder()
        .setName('adicionar-eter')
        .setDescription('Adicionar éter')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(message, args) {
        const targets = [...message.mentions.users.values()];
        const amountRaw = args.find((a) => !a.startsWith('<@'));
        await run(message.member, targets, amountRaw, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.member, [i.options.getUser('usuario', true)], i.options.getString('valor'), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
