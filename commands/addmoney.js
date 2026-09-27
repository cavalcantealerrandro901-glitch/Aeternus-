const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { parseAmount, looksLikeAmount } = require('../utils/parseAmount');

/** Cargo autorizado a adicionar éter */
const ALLOWED_ROLE_ID = '1553858768708706404';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function pickAmount(args) {
    const raw = args.find((a) => !a.startsWith('<@') && looksLikeAmount(a));
    return raw || null;
}

function hasAllowedRole(member) {
    if (!member) return false;
    if (member.roles?.cache?.has(ALLOWED_ROLE_ID)) return true;
    // fallback se roles vier como array de IDs (slash em alguns contextos)
    const roles = member.roles?.cache || member._roles || [];
    if (Array.isArray(roles)) return roles.map(String).includes(ALLOWED_ROLE_ID);
    return false;
}

async function run(modMember, targets, amountRaw, reply) {
    if (!hasAllowedRole(modMember)) {
        return reply('❌ Você não tem permissão para usar este comando.');
    }
    if (!targets.length) return reply('❌ Informe o usuário. Ex.: `O.addmoney @user 10k`');
    if (!amountRaw) {
        return reply(
            '❌ Informe o valor.\n' +
                'Exemplos: `1000` · `1k` · `2.5k` · `1m` · `1b` · `50000`'
        );
    }

    // Admin: não depende do saldo do alvo (all/half não fazem sentido aqui)
    const s = String(amountRaw).trim().toLowerCase();
    if (['all', 'tudo', 'max', 'full', 'half', 'metade', 'meio'].includes(s) || /%$/.test(s)) {
        return reply('❌ Em **addmoney** use valor fixo (`1k`, `5m`…). `all`/`half`/`%` são para apostas.');
    }

    const amount = parseAmount(amountRaw, null);
    if (!Number.isFinite(amount) || amount <= 0) {
        return reply('❌ Valor inválido. Use `1000`, `1k`, `2.5k`, `1m`, `1b`…');
    }

    const lines = [];
    for (const u of targets) {
        if (u.bot) continue;
        eter.add(u.id, amount, { reason: 'addmoney' });
        const bal = eter.get(u.id);
        lines.push(`**${u.tag || u.username}** · ✨ **+${fmt(amount)}** → saldo **${fmt(bal)}**`);
    }
    if (!lines.length) return reply('❌ Nenhum usuário válido.');

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('Éter adicionado')
                .setDescription(lines.join('\n'))
                .setFooter({ text: `Mod: ${modMember.user?.tag || modMember.displayName || 'staff'}` })
                .setTimestamp()
        ]
    });
}

module.exports = {
    name: 'addmoney',
    aliases: ['addeter', 'givemoney', 'addéter', 'dar-eter'],
    description: 'Adicionar éter (cargo autorizado) — 1k, 1m, 1b…',
    data: new SlashCommandBuilder()
        .setName('adicionar-eter')
        .setDescription('Adicionar éter a um usuário')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor: 1000, 1k, 2.5k, 1m, 1b…')
                .setRequired(true)
        ),

    async execute(message, args) {
        const targets = [...message.mentions.users.values()];
        const amountRaw = pickAmount(args);
        await run(message.member, targets, amountRaw, (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(
            i.member,
            [i.options.getUser('usuario', true)],
            i.options.getString('valor'),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
