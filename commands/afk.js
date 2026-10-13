const { SlashCommandBuilder } = require('discord.js');
const afk = require('../utils/afk');

function fmtSince(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    if (totalSeconds < 60) return 'menos de 1 min';

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
    return `${totalMinutes} min`;
}

function createAfkMessage(user, reason) {
    return [
        '✦ **AETERNUS • CENTRAL DE PRESENÇA**',
        '',
        '💤 **MODO AUSENTE ATIVADO**',
        `▸ **Usuário:** ${user}`,
        `▸ **Motivo:** **${String(reason** || **'Não informado'**).slice(0, 180)}`,
        '',
        'Quem mencionar este usuário será avisado de que ele está ausente.',
        '✧ *Aeternus • Sistema de utilidades*'
    ].join('\n');
}

function createWelcomeBackMessage(user, previous) {
    const duration = previous?.at ? fmtSince(Date.now() - previous.at) : 'Não disponível';
    return [
        '✦ **AETERNUS • CENTRAL DE PRESENÇA**',
        '',
        '✅ **MODO AUSENTE DESATIVADO**',
        `👋 ${user}, você está de volta e seu status AFK foi removido.`,
        `▸ **Tempo de ausência:** ${duration}`,
        '',
        '**Tudo certo!** Você voltará a receber as menções normalmente.',
        '✧ *Aeternus • Sistema de utilidades*'
    ].join('\n');
}

function getReason(args) {
    return String(Array.isArray(args) ? args.join(' ') : '')
        .trim()
        .slice(0, 180) || 'Não informado';
}

module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Ativa ou desativa seu status de ausência.',
    data: new SlashCommandBuilder()
        .setName('ausente')
        .setDescription('Ativa ou desativa seu status de ausência.')
        .addStringOption((option) =>
            option
                .setName('motivo')
                .setDescription('Explique brevemente sua ausência (opcional).')
                .setRequired(false)
                .setMaxLength(180)
        ),

    async execute(message, args) {
        if (afk.has(message.author.id)) {
            const previous = afk.get(message.author.id);
            afk.clear(message.author.id);
            return message.reply(createWelcomeBackMessage(message.author, previous));
        }

        const reason = getReason(args);
        afk.set(message.author.id, reason);
        return message.reply(createAfkMessage(message.author, reason));
    },

    async executeSlash(interaction) {
        if (afk.has(interaction.user.id)) {
            const previous = afk.get(interaction.user.id);
            afk.clear(interaction.user.id);
            return interaction.reply(createWelcomeBackMessage(interaction.user, previous));
        }

        const reason = getReason([interaction.options.getString('motivo') || '']);
        afk.set(interaction.user.id, reason);
        return interaction.reply(createAfkMessage(interaction.user, reason));
    }
};
