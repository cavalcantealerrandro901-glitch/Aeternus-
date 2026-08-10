const { EmbedBuilder } = require('discord.js');

/**
 * Substitui marcadores dinâmicos no texto pelo valor do contexto
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
 * Envia mensagens (Texto ou Embed) tratando erros e permissões do canal
 */
async function sendMessage(channel, options = {}) {
    if (!channel || typeof channel.send !== 'function') {
        throw new Error('Canal de envio inválido ou sem permissão para enviar mensagens.');
    }

    const {
        content = '',
        embed = null,
        guild = channel.guild,
        user = null,
        mention = ''
    } = options;

    const parsedContent = parseVariables(content, { guild, user, channel });
    const payload = {};

    let finalContent = mention ? `${mention}\n${parsedContent}`.trim() : parsedContent;
    if (finalContent) payload.content = finalContent;

    if (embed) {
        const embedBuilder = new EmbedBuilder();

        if (embed.title) embedBuilder.setTitle(parseVariables(embed.title, { guild, user, channel }));
        if (embed.description) embedBuilder.setDescription(parseVariables(embed.description, { guild, user, channel }));
        embedBuilder.setColor(embed.color || '#38bdf8');
        
        if (embed.thumbnail) {
            const thumbUrl = (embed.thumbnail === 'user' && user?.displayAvatarURL) 
                ? user.displayAvatarURL() 
                : embed.thumbnail;
            embedBuilder.setThumbnail(thumbUrl);
        }

        if (Array.isArray(embed.fields) && embed.fields.length > 0) {
            embedBuilder.addFields(embed.fields.map(f => ({
                name: parseVariables(f.name, { guild, user, channel }),
                value: parseVariables(f.value, { guild, user, channel }),
                inline: Boolean(f.inline)
            })));
        }

        embedBuilder.setTimestamp();
        payload.embeds = [embedBuilder];
    }

    // Se não tiver conteúdo nem embed, não faz nada
    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
        return;
    }

    return await channel.send(payload);
}

module.exports = { parseVariables, sendMessage };
