const { EmbedBuilder } = require('discord.js');

/**
 * Substitui marcadores dinâmicos pelo valor real do contexto
 */
function parseVariables(text, { guild, user, channel } = {}) {
    if (!text) return '';

    return text
        .replace(/{user}/g, user ? `<@${user.id}>` : '@membro')
        .replace(/{username}/g, user ? (user.username || user.tag) : 'Membro')
        .replace(/{server}/g, guild ? guild.name : 'Servidor')
        .replace(/{members}/g, guild ? (guild.memberCount || '0') : '0')
        .replace(/{channel}/g, channel ? `<#${channel.id}>` : '#canal');
}

/**
 * Envia uma mensagem (Texto puro ou Embed) para um canal específico
 */
async function sendMessage(channel, options = {}) {
    if (!channel) throw new Error('Canal inválido fornecido ao sendMessage.');

    const {
        content = '',
        embed = null,
        guild = channel.guild,
        user = null,
        mention = ''
    } = options;

    const parsedContent = parseVariables(content, { guild, user, channel });
    const payload = {};

    // Adiciona menção (@here, @everyone, <@&roleId>) se fornecida
    let finalContent = mention ? `${mention}\n${parsedContent}`.trim() : parsedContent;
    if (finalContent) payload.content = finalContent;

    // Constrói o Embed caso seja solicitado
    if (embed) {
        const embedBuilder = new EmbedBuilder();

        if (embed.title) embedBuilder.setTitle(parseVariables(embed.title, { guild, user, channel }));
        if (embed.description) embedBuilder.setDescription(parseVariables(embed.description, { guild, user, channel }));
        if (embed.color) embedBuilder.setColor(embed.color); else embedBuilder.setColor('#38bdf8');
        
        if (embed.thumbnail) {
            embedBuilder.setThumbnail(embed.thumbnail === 'user' && user?.displayAvatarURL ? user.displayAvatarURL() : embed.thumbnail);
        }

        if (embed.fields && Array.isArray(embed.fields)) {
            embedBuilder.addFields(embed.fields.map(f => ({
                name: parseVariables(f.name, { guild, user, channel }),
                value: parseVariables(f.value, { guild, user, channel }),
                inline: Boolean(f.inline)
            })));
        }

        embedBuilder.setTimestamp();
        payload.embeds = [embedBuilder];
    }

    return await channel.send(payload);
}

module.exports = { parseVariables, sendMessage };
