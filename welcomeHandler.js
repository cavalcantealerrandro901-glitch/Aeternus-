const { EmbedBuilder } = require('discord.js');

module.exports = (client, getSettings) => {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        const settings = await getSettings(member.guild.id);
        if (!settings) return;

        // Auto-Role
        if (settings.autoRoleEnabled && settings.autoRoleIds && Array.isArray(settings.autoRoleIds)) {
            try {
                const rolesToAssign = settings.autoRoleIds.filter(roleId => member.guild.roles.cache.has(roleId));
                if (rolesToAssign.length > 0) {
                    await member.roles.add(rolesToAssign).catch(err => console.error(`[AutoRole] ${err.message}`));
                }
            } catch (err) {
                console.error('[AutoRole Erro]', err);
            }
        }

        const replaceVars = (str) => {
            if (!str) return '';
            return str
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{username}/g, member.user.username)
                .replace(/{userTag}/g, member.user.tag || member.user.username)
                .replace(/{userId}/g, member.id)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());
        };

        // Mensagem DM no Privado
        if (settings.welcomeDmEnabled && settings.welcomeDmText) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`👋 Bem-vindo(a) ao ${member.guild.name}!`)
                    .setDescription(replaceVars(settings.welcomeDmText))
                    .setColor(settings.welcomeColor || '#5865F2')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                await member.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {
                console.error('[Welcome DM Erro]', e);
            }
        }

        // Mensagem no Canal de Boas-Vindas
        if (settings.welcomeEnabled && settings.welcomeChannel) {
            const channel = member.guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(replaceVars(settings.welcomeTitle || '👋 Seja muito bem-vindo(a)!'))
                .setDescription(replaceVars(settings.welcomeMessage || 'Olá {user}, seja bem-vindo(a) ao **{server}**!'))
                .setColor(settings.welcomeColor || '#5865F2')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: replaceVars(settings.welcomeFooter || 'Membro #{memberCount}'), iconURL: member.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            if (settings.welcomeImage) {
                embed.setImage(settings.welcomeImage);
            } else if (settings.welcomeCardEnabled) {
                const avatarUrl = encodeURIComponent(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
                const username = encodeURIComponent(member.user.username);
                const guildName = encodeURIComponent(member.guild.name);
                const memberCount = member.guild.memberCount;
                embed.setImage(`https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${username}&text2=Bem-vindo+ao+${guildName}&text3=Membro+%23${memberCount}&avatar=${avatarUrl}`);
            }

            channel.send({
                content: settings.welcomePing ? `${member}` : null,
                embeds: [embed]
            }).catch(err => console.error('[Welcome Channel Erro]', err));
        }
    });
};
