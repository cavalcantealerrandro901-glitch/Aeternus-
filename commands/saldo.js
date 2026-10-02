const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function globalRank(userId) {
    const data = eter.all() || {};
    const list = Object.entries(data)
        .map(([id, v]) => ({ id, value: Number(v || 0) }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);
    const idx = list.findIndex((e) => e.id === String(userId));
    if (idx < 0) return null;
    return idx + 1;
}

function buildText(viewer, target) {
    const bal = eter.get(target.id);
    const rank = globalRank(target.id);
    const rankStr = rank != null ? String(rank) : '—';

    if (String(viewer.id) === String(target.id)) {
        return [
            target + ' Você possui ✨ **' + fmt(bal) + '** éter',
            'e está em **#' + rankStr + '** global.',
            '',
            'Comandos disponíveis: `/minas` e `/ver-saldo`.'
        ].join('\n');
    }

    return [
        viewer + ' O ' + target + ' possui ✨ **' + fmt(bal) + '** éter',
        'e você sabia que ' + target + ' está em **#' + rankStr + '** lugar do rank global?'
    ].join('\n');
}

async function run(viewer, target, reply) {
    return reply(buildText(viewer, target));
}

module.exports = {
    name: 'saldo',
    aliases: ['balance', 'money', 'éter', 'eter'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver-saldo')
        .setDescription('Ver saldo de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await run(message.author, target, (t) => message.reply({ content: t, allowedMentions: { users: [target.id] } }));
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await run(i.user, target, (t) => i.reply({ content: t, allowedMentions: { users: [target.id] } }));
    }
};
