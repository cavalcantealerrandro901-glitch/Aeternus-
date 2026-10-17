const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const afk = require('../utils/afk');

const AETERNUS_PURPLE = 0x8B5CF6;
const SAFE_MENTIONS = { parse: [], repliedUser: false };

function fmtSince(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    if (totalSeconds < 60) return 'menos de 1 min';

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
    return `${totalMinutes} min`;
}

// Neutraliza menções em massa no motivo e limita a interpretação de menções pelo Discord.
function sanitizeReason(value) {
    return String(value || '')
        .replace(/@everyone/gi, '@\u200beveryone')
        .replace(/@here/gi, '@\u200bhere')
        .replace(/<@!?\d+>/g, '@usuário')
        .replace(/<@&\d+>/g, '@cargo')
        .replace(/<#\d+>/g, '#canal')
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180) || 'Não informado';
}

function createAfkMessage(user, reason) {
<<<<<<< HEAD
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
=======
    return new EmbedBuilder()
        .setColor(AETERNUS_PURPLE)
        .setAuthor({
            name: 'AETERNUS • CENTRAL DE PRESENÇA',
            iconURL: user.displayAvatarURL?.({ size: 64 }) || undefined
        })
        .setTitle('💤 Modo ausente ativado')
        .setDescription('Seu status de ausência está ativo. Quem mencionar você receberá um aviso temporário.')
        .addFields(
            { name: '👤 Usuário', value: `${user}`, inline: true },
            { name: '🌙 Status', value: **'Ausente'**, inline: true },
            { name: '📝 Motivo da ausência', value: **sanitizeReason(reason)** }
        )
        .setFooter({ text: 'AETERNUS • AFK' })
        .setTimestamp();
>>>>>>> 11167d330b1c4b5934d4b3e25c332672864090d9
}

function createWelcomeBackMessage(user, previous) {
    const duration = previous?.at ? fmtSince(Date.now() - previous.at) : 'Não disponível';
    return new EmbedBuilder()
        .setColor(0xA78BFA)
        .setAuthor({
            name: 'AETERNUS • CENTRAL DE PRESENÇA',
            iconURL: user.displayAvatarURL?.({ size: 64 }) || undefined
        })
        .setTitle('✅ Você está de volta!')
        .setDescription(`${user}, seu status AFK foi removido e você voltou a receber menções normalmente.`)
        .addFields(
            { name: '🟣 Status', value: 'Online', inline: true },
            { name: '⏱️ Tempo de ausência', value: duration, inline: true }
        )
        .setFooter({ text: 'AETERNUS • AFK' })
        .setTimestamp();
}

function getReason(args) {
    return sanitizeReason(Array.isArray(args) ? args.join(' ') : '');
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
            if (!afk.clear(message.author.id)) {
                return message.reply({
                    content: 'Não foi possível atualizar seu status AFK. Tente novamente.',
                    allowedMentions: SAFE_MENTIONS
                });
            }
            return message.reply({
                embeds: [createWelcomeBackMessage(message.author, previous)],
                allowedMentions: SAFE_MENTIONS
            });
        }

        const reason = getReason(args);
        if (!afk.set(message.author.id, reason)) {
            return message.reply({
                content: 'Não foi possível ativar seu status AFK. Tente novamente.',
                allowedMentions: SAFE_MENTIONS
            });
        }
        return message.reply({
            embeds: [createAfkMessage(message.author, reason)],
            allowedMentions: SAFE_MENTIONS
        });
    },

    async executeSlash(interaction) {
        if (afk.has(interaction.user.id)) {
            const previous = afk.get(interaction.user.id);
            if (!afk.clear(interaction.user.id)) {
                return interaction.reply({
                    content: 'Não foi possível atualizar seu status AFK. Tente novamente.',
                    allowedMentions: SAFE_MENTIONS
                });
            }
            return interaction.reply({
                embeds: [createWelcomeBackMessage(interaction.user, previous)],
                allowedMentions: SAFE_MENTIONS
            });
        }

        const reason = getReason([interaction.options.getString('motivo') || '']);
        if (!afk.set(interaction.user.id, reason)) {
            return interaction.reply({
                content: 'Não foi possível ativar seu status AFK. Tente novamente.',
                allowedMentions: SAFE_MENTIONS
            });
        }
        return interaction.reply({
            embeds: [createAfkMessage(interaction.user, reason)],
            allowedMentions: SAFE_MENTIONS
        });
    }
};
