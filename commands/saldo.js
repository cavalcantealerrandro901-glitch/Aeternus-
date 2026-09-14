const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/** Rank global de éter (carteira) */
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

function buildText(viewerId, target) {
    const bal = eter.get(target.id);
    const rank = globalRank(target.id);
    const rankStr = rank != null ? String(rank) : '—';

    if (String(viewerId) === String(target.id)) {
        return [
            `Você possui ✨ **${fmt(bal)}** éter`,
            `e está em **#${rankStr}** global.`,
            '',
            'Comandos disponíveis: `/minas` e `/ver_saldo`.'
        ].join('\n');
    }

    return [
        `O ${target} possui ✨ **${fmt(bal)}** éter`,
        `e você sabia que ${target} está em **#${rankStr}** lugar do rank global?`
    ].join('\n');
}

async function run(viewerId, target, reply) {
    return reply({
        content: buildText(viewerId, target),
        allowedMentions: { users: [target.id] }
    });
}

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira', 'eter'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver_saldo')
        .setDescription('Ver saldo de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await run(message.author.id, user, (p) => message.reply(p));
    },

    async executeSlash(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        await run(interaction.user.id, user, (p) => interaction.reply(p));
    }
};
