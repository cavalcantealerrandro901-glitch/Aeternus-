const { Events, EmbedBuilder } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');
const db = require('../../database/db');

function buildWelcomePayload(member, welcome) {
    let message = welcome.message || 'Bem-vindo(a) {user} ao **{server}**!';

    message = message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{tag}/g, member.user.tag)
        .replace(/{id}/g, member.user.id)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, String(member.guild.memberCount))
        .replace(/{createdAt}/g, `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`);

    if (welcome.useEmbed) {
        const embed = new EmbedBuilder()
            .setColor(welcome.color ? parseInt(String(welcome.color).replace('#', ''), 16) || 0x7c3aed : 0x7c3aed)
            .setDescription(message)
            .setTimestamp();

        if (welcome.title) {
            embed.setTitle(
                welcome.title
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, String(member.guild.memberCount))
            );
        }

        if (welcome.author) {
            embed.setAuthor({
                name: welcome.author
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name),
                iconURL: welcome.authorIcon || member.user.displayAvatarURL({ size: 64 })
            });
        }

        if (welcome.thumbnail !== false) {
            embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
        }

        if (welcome.image) {
            embed.setImage(welcome.image);
        }

        if (welcome.footer) {
            embed.setFooter({ text: welcome.footer.replace(/{server}/g, member.guild.name) });
        }

        return {
            content: welcome.mentionUser ? `<@${member.id}>` : null,
            embeds: [embed]
        };
    }

    return { content: message };
}

module.exports = {
    name: Events.GuildMemberAdd,
    buildWelcomePayload,

    async execute(member) {
        // Log de entrada
        const logEmbed = baseEmbed()
            .setColor(0x22c55e)
            .setTitle('📥 Membro Entrou')
            .setDescription(`**Usuário:** ${member.user.tag} (\`${member.user.id}\`)`)
            .addFields({ name: 'Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` })
            .setThumbnail(member.user.displayAvatarURL());

        await sendLog(member.guild, 'member', logEmbed);

        // Boas-vindas
        try {
            const config = db.getGuildConfig(member.guild.id);
            const welcome = config.welcome || {};
            if (!welcome.enabled || !welcome.channel) return;

            const channel = member.guild.channels.cache.get(welcome.channel);
            if (!channel || !channel.isTextBased()) return;

            const payload = buildWelcomePayload(member, welcome);
            await channel.send(payload);
        } catch (err) {
            console.error('Erro ao enviar boas-vindas:', err.message);
        }
    }
};
