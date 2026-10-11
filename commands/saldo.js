const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(value) {
    const amount = Number(value || 0);
    return (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR');
}

function globalRank(userId) {
    const data = eter.all() || {};
    const list = Object.entries(data)
        .map(([id, value]) => ({ id, value: Number(value || 0) }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
        .sort((a, b) => b.value - a.value);
    const index = list.findIndex((entry) => entry.id === String(userId));
    return index < 0 ? null : index + 1;
}

function buildMessage(target) {
    const balance = Number(eter.get(target.id) || 0);
    const rank = balance > 0 ? globalRank(target.id) : null;
    const lines = [
        '✦ **AETERNUS • SALDO**',
        `👤 Titular: <@${target.id}>`,
        `✨ Saldo disponível: **${fmt(balance)} Éter**`
    ];

    // Contas sem saldo positivo não entram no ranking.
    if (rank) lines.push(`🏆 Posição global: **#${rank}**`);
    return lines.join('\n');
}

module.exports = {
    name: 'saldo',
    aliases: ['balance', 'money', 'éter', 'eter', 'bal', 'atm'],
    description: 'Ver saldo de Éter',
    data: new SlashCommandBuilder()
        .setName('ver-saldo')
        .setDescription('Mostra o saldo de Éter em texto simples')
        .addUserOption((option) =>
            option.setName('usuario').setDescription('Usuário para consultar').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({
            content: buildMessage(target),
            allowedMentions: { parse: [], users: [target.id] }
        });
    },

    async executeSlash(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        return interaction.reply({
            content: buildMessage(target),
            allowedMentions: { parse: [], users: [target.id] }
        });
    }
};
