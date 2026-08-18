const { EmbedBuilder } = require('discord.js');

module.exports = (client, getSettings) => {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        const settings = await getSettings(member.guild.id);
        if (!settings) return;

        // Auto-role
        if (
            settings.autoRoleEnabled &&
            Array.isArray(settings.autoRoleIds) &&
            settings.autoRoleIds.length > 0
        ) {
            try {
                const rolesToAssign = settings.autoRoleIds.filter((roleId) =>
                    member.guild.roles.cache.has(roleId)
                );
                if (rolesToAssign.length) {
                    await member.roles.add(rolesToAssign).catch((err) => {
                        console.error(`[AutoRole] ${err.message}`);
                    });
                }
            } catch (err) {
                console.error('[AutoRole]', err);
            }
        }

        const replaceVars = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{username}/g, member.user.username)
                .replace(/{userTag}/g, member.user.tag || member.user.username)
                .replace(/{userId}/g, member.id)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, String(member.guild.memberCount));
        };

        // DM de boas-vindas
        if (settings.welcomeDmEnabled && settings.welcomeDmText) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`👋 Bem-vindo(a) ao ${member.guild.name}!`)
                    .setDescription(replaceVars(settings.welcomeDmText))
                    .setColor(settings.welcomeColor || '#5865F2')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({
                        text: member.guild.name,
                        iconURL: member.guild.iconURL({ dynamic: true }) || undefined
                    })
                    .setTimestamp();
                await member.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {
                console.error('[Welcome DM]', e.message);
            }
        }

        // Canal de boas-vindas
        // Ativo se tiver canal salvo (painel) OU flag welcomeEnabled
        const welcomeOn =
            !!settings.welcomeChannel &&
            (settings.welcomeEnabled === true ||
                settings.welcomeEnabled === 'true' ||
                settings.welcomeEnabled === undefined ||
                settings.welcomeEnabled === '');

        if (!welcomeOn) return;

        const channel =
            member.guild.channels.cache.get(settings.welcomeChannel) ||
            (await member.guild.channels.fetch(settings.welcomeChannel).catch(() => null));

        if (!channel || !channel.isTextBased()) return;

        const title = replaceVars(settings.welcomeTitle || '👋 Seja muito bem-vindo(a)!');
        const description = replaceVars(
            settings.welcomeMessage ||
                'Olá {user}, seja bem-vindo(a) ao **{server}**!\nAtualmente somos **{memberCount}** membros.'
        );
        const color = settings.welcomeColor || '#5865F2';
        const footerText = replaceVars(settings.welcomeFooter || 'Membro #{memberCount}');

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({
                text: footerText,
                iconURL: member.guild.iconURL({ dynamic: true }) || undefined
            })
            .setTimestamp();

        if (settings.welcomeImage) {
            embed.setImage(settings.welcomeImage);
        } else if (settings.welcomeCardEnabled === true || settings.welcomeCardEnabled === 'true') {
            const avatarUrl = encodeURIComponent(
                member.user.displayAvatarURL({ extension: 'png', size: 512 })
            );
            const username = encodeURIComponent(member.user.username);
            const guildName = encodeURIComponent(member.guild.name);
            const memberCount = member.guild.memberCount;
            embed.setImage(
                `https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${username}&text2=Bem-vindo+ao+${guildName}&text3=Membro+%23${memberCount}&avatar=${avatarUrl}`
            );
        }

        const ping =
            settings.welcomePing === true || settings.welcomePing === 'true'
                ? `${member}`
                : null;

        await channel
            .send({ content: ping || undefined, embeds: [embed] })
            .catch((err) => console.error('[Welcome Channel]', err.message));
    });
};
