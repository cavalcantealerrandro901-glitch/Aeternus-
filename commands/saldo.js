const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function mention(user) {
    return '<@' + String(user.id) + '>';
}

function globalRank(userId) {
    const data = eter.all() || {};
    const list = Object.entries(data)
        .map(([id, v]) => ({ id, value: Number(v || 0) }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);
    const idx = list.findIndex((e) => e.id === String(userId));
    return idx < 0 ? null : idx + 1;
}

function buildText(target) {
    const bal = eter.get(target.id);
    const rank = bal > 0 ? globalRank(target.id) : null;
    const lines = [
        '╭────────────────────────────╮',
        '│ ✦ AETERNUS • CARTEIRA',
        '├────────────────────────────┤',
        '│ 👤 ' + mention(target),
        '│',
        '│ ✨ **' + fmt(bal) + ' ÉTER**',
        '├────────────────────────────┤'
    ];
    if (rank != null) {
        lines.push('│ 🏆 RANKING GLOBAL', '│ #**' + rank + '**');
    }
    lines.push('╰────────────────────────────╯');
    return lines.join('\n');
}

async function run(target, reply) {
    return reply(buildText(target));
}

module.exports = {
    name: 'saldo',
    aliases: ['balance', 'money', 'éter', 'eter', 'bal', 'atm'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver-saldo')
        .setDescription('Ver saldo de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await run(target, (t) =>
            message.reply({
                content: t,
                allowedMentions: { parse: [], users: [target.id] }
            })
        );
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await run(target, (t) =>
            i.reply({
                content: t,
                allowedMentions: { parse: [], users: [target.id] }
            })
        );
    }
};
