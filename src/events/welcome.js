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
        .replace(/{user}/g, `<@${memberUser.id}>`)
        .replace(/{username}/g, memberUser.username)
        .replace(/{server}/g, guild.name);

    const avatarUrl = typeof memberUser.displayAvatarURL === 'function'
        ? memberUser.displayAvatarURL({ dynamic: true, size: 256 })
        : memberUser.avatar
            ? `https://cdn.discordapp.com/avatars/${memberUser.id}/${memberUser.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(embedColor)
        .setThumbnail(avatarUrl)
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

// Teste acionado via Painel Web
module.exports.sendTest = async (guild, channelId, config, testerUser) => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) throw new Error('Canal de boas-vindas não encontrado no bot.');

    const targetUser = testerUser || guild.client.user;
    const payload = buildWelcomePayload(guild, targetUser, config);
    return await channel.send(payload);
};
