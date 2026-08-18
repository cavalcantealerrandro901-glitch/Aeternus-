const { EmbedBuilder } = require('discord.js');

module.exports = (client, getSettings) => {

    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;

        const settings = await getSettings(member.guild.id);
        if (!settings) return;

        // --- 1. AUTO-ROLE (CARGO AUTOMÁTICO) ---
        if (settings.autoRoleEnabled && settings.autoRoleIds && Array.isArray(settings.autoRoleIds) && settings.autoRoleIds.length > 0) {
            try {
                const rolesToAssign = settings.autoRoleIds.filter(roleId => member.guild.roles.cache.has(roleId));
                if (rolesToAssign.length > 0) {
                    await member.roles.add(rolesToAssign).catch(err => {
                        console.error(`[AutoRole] Erro ao adicionar cargos: ${err.message}`);
                    });
                }
            } catch (err) {
                console.error('[AutoRole Erro]', err);
            }
        }

        // Helper para substituir variáveis no texto
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

        // --- 2. MENSAGEM NO PRIVADO (DM) ---
        if (settings.welcomeDmEnabled && settings.welcomeDmText) {
            try {
                const dmText = replaceVars(settings.welcomeDmText);
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`👋 Bem-vindo(a) ao ${member.guild.name}!`)
                    .setDescription(dmText)
                    .setColor(settings.welcomeColor || '#5865F2')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                await member.send({ embeds: [dmEmbed] }).catch(() => {
                    // Ignora se as DMs do usuário estiverem fechadas
                });
            } catch (e) {
                console.error('[Welcome DM Erro]', e);
            }
        }

        // --- 3. MENSAGEM NO CANAL DE BOAS-VINDAS ---
        if (settings.welcomeEnabled && settings.welcomeChannel) {
            const channel = member.guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) return;

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
                    iconURL: member.guild.iconURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Imagem / Card Visual
            if (settings.welcomeImage) {
                // Banner/Imagem URL customizada configurada no painel
                embed.setImage(settings.welcomeImage);
            } else if (settings.welcomeCardEnabled) {
                // Gerador automático de Card visual dinâmico
                const avatarUrl = encodeURIComponent(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
                const username = encodeURIComponent(member.user.username);
                const guildName = encodeURIComponent(member.guild.name);
                const memberCount = member.guild.memberCount;
                const cardUrl = `https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${username}&text2=Bem-vindo+ao+${guildName}&text3=Membro+%23${memberCount}&avatar=${avatarUrl}`;
                
                embed.setImage(cardUrl);
            }

            channel.send({ 
                content: settings.welcomePing ? `${member}` : null,
                embeds: [embed] 
            }).catch(err => console.error('[Welcome Channel Erro]', err));
        }
    });
};
