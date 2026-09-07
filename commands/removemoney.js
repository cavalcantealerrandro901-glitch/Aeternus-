const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(modMember, modUser, target, amountRaw, reply) {
    if (!modMember?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return reply({
            content: '❌ Apenas **administradores** podem remover éter.',
            flags: 64
        });
    }
    if (!target || target.bot) {
        return reply({ content: '❌ Informe um usuário válido (não bot).', flags: 64 });
    }
    if (!amountRaw) {
        return reply({
            content: '❌ Informe o valor. Exemplos: `500` · `10k` · `all`',
            flags: 64
        });
    }

    const before = eter.get(target.id);
    const bet = resolveBet(amountRaw, before, { label: '✨' });
    if (!bet.ok) return reply({ content: `❌ ${bet.error}`, flags: 64 });

    eter.remove(target.id, bet.amount, { reason: 'removemoney', by: modUser?.id });
    const after = eter.get(target.id);

    const emb = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('✨ Éter removido')
        .setDescription(
            [
                `**Usuário:** ${target} (\`${target.username}\`)`,
                `**Removido:** −✨ **${fmt(bet.amount)}**`,
                `**Antes:** ✨ ${fmt(before)}`,
                `**Agora:** ✨ **${fmt(after)}**`
            ].join('\n')
        )
        .setFooter({
            text: `Por ${modUser?.tag || modUser?.username || 'admin'} · Aeternus`
        })
        .setTimestamp();

    return reply({ embeds: [emb] });
}

module.exports = {
    name: 'removemoney',
    aliases: ['removeeter', 'takemoney', 'tirar-eter'],
    description: 'Remover éter de um usuário (admin)',
    data: new SlashCommandBuilder()
        .setName('remover-eter')
        .setDescription('Remover éter de um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem perde o éter').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Quantidade (ex: 500, 10k, all)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args) {
        const target = message.mentions.users.first();
        const amountRaw = args.find((a) => !a.startsWith('<@'));
        await run(message.member, message.author, target, amountRaw, (p) =>
            message.reply(p)
        );
    },

    async executeSlash(i) {
        await run(
            i.member,
            i.user,
            i.options.getUser('usuario', true),
            i.options.getString('valor', true),
            (p) => {
                if (typeof p === 'string') return i.reply({ content: p, flags: 64 });
                if (p.content && !p.embeds) return i.reply({ ...p, flags: p.flags ?? 64 });
                return i.reply(p);
            }
        );
    }
};
