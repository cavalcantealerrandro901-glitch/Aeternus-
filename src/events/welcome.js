const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const resolveColor = require('../utils/colorHelper');

function buildWelcomePayload(guild, memberUser, config) {
    const rawColor = config.embedColor || '#38bdf8';
    const embedColor = resolveColor(rawColor);

    let title = config.embedTitle || '👋 Seja bem-vindo(a)!';
    let message = config.embedMessage || 'Olá {user}, seja bem-vindo ao {server}!';

    // Substituir variáveis
    message = message
        .replace(/{user}/g, `<@${memberUser.id}>`)
        .replace(/{username}/g, memberUser.username)
        .replace(/{server}/g, guild.name)
        .replace(/{memberCount}/g, guild.memberCount.toString());

    title = title
        .replace(/{username}/g, memberUser.username)
        .replace(/{server}/g, guild.name);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(embedColor)
        .setThumbnail(memberUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

    const payload = { embeds: [embed], components: [] };

    // Adicionar botão com link caso configurado
    if (config.buttonText && config.buttonUrl && /^https?:\/\//i.test(config.buttonUrl)) {
        const button = new ButtonBuilder()
            .setLabel(config.buttonText)
            .setStyle(ButtonStyle.Link)
            .setURL(config.buttonUrl);

        const row = new ActionRowBuilder().addComponents(button);
        payload.components = [row];
    }

    return payload;
}

module.exports = (client) => {
    // Evento real quando membro entra
    client.on('guildMemberAdd', async (member) => {
        const guildConfig = db.getGuildConfig(member.guild.id);
        const welcomeConfig = guildConfig.welcome;

        if (!welcomeConfig || !welcomeConfig.welcomeChannel) return;

        const channel = member.guild.channels.cache.get(welcomeConfig.welcomeChannel);
        if (!channel) return;

        const payload = buildWelcomePayload(member.guild, member.user, welcomeConfig);
        channel.send(payload).catch(console.error);
    });
};

module.exports.sendTest = async (guild, channelId, config) => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) throw new Error('Canal de boas-vindas não encontrado no bot.');

    const payload = buildWelcomePayload(guild, guild.client.user, config);
    return await channel.send(payload);
};
