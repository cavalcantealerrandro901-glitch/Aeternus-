const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(modMember, modUser, targets, amountRaw, reply) {
    if (!modMember?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return reply({
            content: '❌ Apenas **administradores** podem adicionar éter.',
            flags: 64
        });
    }
    if (!targets?.length) {
        return reply({ content: '❌ Mencione pelo menos um usuário.', flags: 64 });
    }
    if (!amountRaw) {
        return reply({
            content: '❌ Informe o valor. Exemplos: `1000` · `10k` · `1m`',
            flags: 64
        });
    }

    const bet = resolveBet(amountRaw, Number.MAX_SAFE_INTEGER, { label: '✨' });
    if (!bet.ok) return reply({ content: `❌ ${bet.error}`, flags: 64 });

    const lines = [];
    const skipped = [];
    for (const u of targets) {
        if (!u || u.bot) {
            if (u?.bot) skipped.push(u.username);
            continue;
        }
        eter.add(u.id, bet.amount, { reason: 'addmoney', by: modUser?.id });
        const bal = eter.get(u.id);
        lines.push(
            `• **${u.username}** → +✨ **${fmt(bet.amount)}** · saldo **${fmt(bal)}**`
        );
    }

    if (!lines.length) {
        return reply({
            content: '❌ Nenhum usuário válido (bots são ignorados).',
            flags: 64
        });
    }

    const emb = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✨ Éter adicionado')
        .setDescription(lines.join('\n'))
        .setFooter({
            text: `Por ${modUser?.tag || modUser?.username || 'admin'} · Aeternus`
        })
        .setTimestamp();

    if (skipped.length) {
        emb.addFields({
            name: 'Ignorados',
            value: skipped.map((n) => `• ${n}`).join('\n'),
            inline: false
        });
    }

    return reply({ embeds: [emb] });
}

module.exports = {
    name: 'addmoney',
    aliases: ['addeter', 'givemoney', 'dar-eter'],
    description: 'Adicionar éter a um ou mais usuários (admin)',
    data: new SlashCommandBuilder()
        .setName('adicionar-eter')
        .setDescription('Adicionar éter a um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem recebe o éter').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Quantidade (ex: 1000, 10k, 1m)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args) {
        const targets = [...message.mentions.users.values()];
        const amountRaw = args.find((a) => !a.startsWith('<@'));
        await run(message.member, message.author, targets, amountRaw, (p) =>
            message.reply(p)
        );
    },

    async executeSlash(i) {
        await run(
            i.member,
            i.user,
            [i.options.getUser('usuario', true)],
            i.options.getString('valor', true),
            (p) => {
                if (typeof p === 'string') return i.reply({ content: p, flags: 64 });
                if (p.content && !p.embeds) return i.reply({ ...p, flags: p.flags ?? 64 });
                return i.reply(p);
            }
        );
    }
};
