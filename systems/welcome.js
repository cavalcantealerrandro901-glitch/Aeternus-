const { EmbedBuilder } = require('discord.js');

module.exports = (client, getSettings) => {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        const settings = await getSettings(member.guild.id);
        if (!settings) return;

        if (settings.autoRoleEnabled && Array.isArray(settings.autoRoleIds)) {
            const roles = settings.autoRoleIds.filter((id) => member.guild.roles.cache.has(id));
            if (roles.length) await member.roles.add(roles).catch(() => {});
        }

        const replaceVars = (str) =>
            String(str || '')
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{username}/g, member.user.username)
                .replace(/{userTag}/g, member.user.tag || member.user.username)
                .replace(/{userId}/g, member.id)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, String(member.guild.memberCount));

        if (settings.welcomeDmEnabled && settings.welcomeDmText) {
            await member
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Bem-vindo ao ${member.guild.name}`)
                            .setDescription(replaceVars(settings.welcomeDmText))
                            .setColor(settings.welcomeColor || '#5865F2')
                    ]
                })
                .catch(() => {});
        }

        const on =
            !!settings.welcomeChannel &&
            (settings.welcomeEnabled === true ||
                settings.welcomeEnabled === 'true' ||
                settings.welcomeEnabled === undefined);

        if (!on) return;

        const channel =
            member.guild.channels.cache.get(settings.welcomeChannel) ||
            (await member.guild.channels.fetch(settings.welcomeChannel).catch(() => null));
        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle(replaceVars(settings.welcomeTitle || '👋 Bem-vindo(a)!'))
            .setDescription(
                replaceVars(
                    settings.welcomeMessage ||
                        'Olá {user}, bem-vindo ao **{server}**! Somos **{memberCount}** membros.'
                )
            )
            .setColor(settings.welcomeColor || '#5865F2')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: replaceVars(settings.welcomeFooter || 'Membro #{memberCount}') })
            .setTimestamp();

        if (settings.welcomeImage) embed.setImage(settings.welcomeImage);

        const ping =
            settings.welcomePing === true || settings.welcomePing === 'true'
                ? `${member}`
                : undefined;

        await channel.send({ content: ping, embeds: [embed] }).catch(() => {});
    });
};
