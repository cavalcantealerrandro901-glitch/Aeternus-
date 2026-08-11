const { Events, EmbedBuilder } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');
const db = require('../../database/db');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // ===== LOG DE ENTRADA =====
        const logEmbed = baseEmbed()
            .setColor(0x22c55e)
            .setTitle('📥 Membro Entrou')
            .setDescription(`**Usuário:** ${member.user.tag} (\`${member.user.id}\`)`)
            .addFields({ name: 'Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` })
            .setThumbnail(member.user.displayAvatarURL());

        await sendLog(member.guild, 'member', logEmbed);

        // ===== MENSAGEM DE BOAS-VINDAS =====
        try {
            const config = db.getGuildConfig(member.guild.id);
            const welcome = config.welcome || {};

            if (!welcome.enabled || !welcome.channel) return;

            const channel = member.guild.channels.cache.get(welcome.channel);
            if (!channel || !channel.isTextBased()) return;

            let message = welcome.message || 'Bem-vindo(a) {user} ao **{server}**!';

            message = message
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{username}/g, member.user.username)
                .replace(/{tag}/g, member.user.tag)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());

            if (welcome.useEmbed) {
                const embed = new EmbedBuilder()
                    .setColor(welcome.color ? parseInt(welcome.color.replace('#', ''), 16) : 0x7c3aed)
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                    .setTimestamp();

                if (welcome.title) {
                    embed.setTitle(
                        welcome.title
                            .replace(/{username}/g, member.user.username)
                            .replace(/{server}/g, member.guild.name)
                    );
                }

                await channel.send({ content: welcome.mentionUser ? `<@${member.id}>` : null, embeds: [embed] });
            } else {
                await channel.send({ content: message });
            }
        } catch (err) {
            console.error('Erro ao enviar boas-vindas:', err.message);
        }
    }
};
