const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const afk = require('../utils/afk');

const AETERNUS_BLUE = 0x5865F2;

function fmtSince(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    if (totalSeconds < 60) return 'menos de 1 min';

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
    return `${totalMinutes} min`;
}

function createAfkEmbed(user, reason) {
    return new EmbedBuilder()
        .setColor(AETERNUS_BLUE)
        .setAuthor({ name: 'AETERNUS • CENTRAL DE PRESENÇA', iconURL: user.displayAvatarURL() })
        .setTitle('💤 Modo ausente ativado')
        .setDescription(`${user} agora está marcado como ausente.\n\nEnquanto o AFK estiver ativo, quem mencionar você poderá ver o motivo informado.`)
        .addFields({ name: '📝 Motivo da ausência', value: String(reason || 'Não informado').slice(0, 180) })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Aeternus • Sistema de utilidades' })
        .setTimestamp();
}

function createWelcomeBackEmbed(user, previous) {
    const duration = previous?.at ? fmtSince(Date.now() - previous.at) : null;
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: 'AETERNUS • CENTRAL DE PRESENÇA', iconURL: user.displayAvatarURL() })
        .setTitle('👋 Você está de volta!')
        .setDescription(`${user}, seu modo ausente foi desativado com sucesso.`)
        .addFields({ name: '⏱️ Tempo ausente', value: duration || 'Não disponível', inline: true })
        .setFooter({ text: 'Aeternus • Sistema de utilidades' })
        .setTimestamp();
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
            return message.reply({ embeds: [createWelcomeBackEmbed(message.author, previous)] });
        }

        const reason = getReason(args);
        afk.set(message.author.id, reason);
        return message.reply({ embeds: [createAfkEmbed(message.author, reason)] });
    },

    async executeSlash(interaction) {
        if (afk.has(interaction.user.id)) {
            const previous = afk.get(interaction.user.id);
            afk.clear(interaction.user.id);
            return interaction.reply({ embeds: [createWelcomeBackEmbed(interaction.user, previous)] });
        }

        const reason = getReason([interaction.options.getString('motivo') || '']);
        afk.set(interaction.user.id, reason);
        return interaction.reply({ embeds: [createAfkEmbed(interaction.user, reason)] });
    }
};
