const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(modMember, target, amountRaw, reply) {
    if (!modMember?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return reply('❌ Só administradores.');
    }
    if (!target) return reply('❌ Informe o usuário.');
    if (!amountRaw) return reply('❌ Informe o valor.');
    const bal = eter.get(target.id);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(target.id, bet.amount, { reason: 'removemoney' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Éter removido')
                .setDescription(`**${target.username}** · ✨ **-${fmt(bet.amount)}**`)
        ]
    });
}

module.exports = {
    name: 'removemoney',
    aliases: ['removeeter', 'takemoney'],
    description: 'Remover éter (admin)',
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remover éter (admin)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(message, args) {
        const target = message.mentions.users.first();
        const amountRaw = args.find((a) => !a.startsWith('<@'));
        await run(message.member, target, amountRaw, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.member,
            i.options.getUser('usuario', true),
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
