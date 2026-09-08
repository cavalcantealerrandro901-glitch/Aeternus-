const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function nowBr() {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}`;
}

function receiptEmbed(target, amount, balance, modUser) {
    const targetTag = target.username ? `@${target.username}` : `<@${target.id}>`;
    const modTag = modUser?.username ? `@${modUser.username}` : '@Staff';

    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setAuthor({
            name: '🔮 AETERNUS ECONOMIA',
            iconURL: modUser?.displayAvatarURL?.({ size: 64 }) || undefined
        })
        .setTitle('✨ Éter Adicionado com Sucesso!')
        .setDescription(
            [
                `👤 **Usuário:** ${targetTag}`,
                `💰 **Quantia:** + ${fmt(amount)} Éter`,
                `👮 **Autorizado por:** ${modTag}`,
                '',
                `🏦 **Novo Saldo Total:** ${fmt(balance)} Éter`
            ].join('\n')
        )
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .setFooter({ text: nowBr() })
        .setTimestamp();
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

    const embeds = [];
    const skipped = [];

    for (const u of targets) {
        if (!u || u.bot) {
            if (u?.bot) skipped.push(u.username);
            continue;
        }
        eter.add(u.id, bet.amount, { reason: 'addmoney', by: modUser?.id });
        const bal = eter.get(u.id);
        embeds.push(receiptEmbed(u, bet.amount, bal, modUser));
    }

    if (!embeds.length) {
        return reply({
            content: '❌ Nenhum usuário válido (bots são ignorados).',
            flags: 64
        });
    }

    const payload = { embeds: embeds.slice(0, 10) };
    if (skipped.length) {
        payload.content = `_Ignorados (bots): ${skipped.join(', ')}_`;
    }
    if (embeds.length > 10) {
        payload.content =
            (payload.content ? payload.content + '\n' : '') +
            `_… e mais ${embeds.length - 10} usuário(s)._`;
    }

    return reply(payload);
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
