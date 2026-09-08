const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
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

/** Recibo visual no estilo caixa (mensagem fora de embed) */
function receiptBox(targetTag, amount, balance, modTag) {
    const q = fmt(amount);
    const b = fmt(balance);
    const when = nowBr();
    const pad = (s, n = 48) => {
        const t = String(s);
        if (t.length >= n) return t.slice(0, n);
        return t + ' '.repeat(n - t.length);
    };

    const lines = [
        '┌──────────────────────────────────────────────────',
        `│ ${pad('🔮 AETERNUS ECONOMIA', 48)} │`,
        '├─────────────────────────────────────────────────┤',
        `│ ${pad('', 48)} │`,
        `│ ${pad('✨ Éter Adicionado com Sucesso!', 48)} │`,
        `│ ${pad('', 48)} │`,
        `│ ${pad(`👤 Usuário: ${targetTag}`, 48)} │`,
        `│ ${pad(`💰 Quantia: + ${q} Éter`, 48)} │`,
        `│ ${pad(`👮 Autorizado por: ${modTag}`, 48)} │`,
        `│ ${pad('', 48)} │`,
        `│ ${pad(`🏦 Novo Saldo Total: ${b} Éter`, 48)} │`,
        `│ ${pad('', 48)} │`,
        `│ ${pad(`───────────── ${when} ──────────────`, 48)} │`,
        '└─────────────────────────────────────────────────┘'
    ];
    return '```\n' + lines.join('\n') + '\n```';
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

    const modTag = modUser?.username ? `@${modUser.username}` : '@Staff';
    const blocks = [];
    const skipped = [];

    for (const u of targets) {
        if (!u || u.bot) {
            if (u?.bot) skipped.push(u.username);
            continue;
        }
        eter.add(u.id, bet.amount, { reason: 'addmoney', by: modUser?.id });
        const bal = eter.get(u.id);
        const tag = u.username ? `@${u.username}` : `<@${u.id}>`;
        blocks.push(receiptBox(tag, bet.amount, bal, modTag));
    }

    if (!blocks.length) {
        return reply({
            content: '❌ Nenhum usuário válido (bots são ignorados).',
            flags: 64
        });
    }

    let content = blocks.join('\n');
    if (skipped.length) {
        content += `\n_Ignorados (bots): ${skipped.join(', ')}_`;
    }

    if (content.length > 1900) {
        content =
            blocks.slice(0, 2).join('\n') +
            `\n_… e mais ${blocks.length - 2} usuário(s) receberam ✨ **${fmt(bet.amount)}**._`;
    }

    return reply({ content });
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
                if (p.content && !p.embeds) {
                    const flags = p.flags;
                    return i.reply(flags != null ? p : { ...p });
                }
                return i.reply(p);
            }
        );
    }
};
