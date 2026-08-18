const path = require('path');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

function getSettings(guildId) {
    const settingsPath = path.join(__dirname, '..', 'settings.json');
    if (!fs.existsSync(settingsPath)) return {};
    try {
        const allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
        return allSettings[guildId] || {};
    } catch {
        return {};
    }
}

// Helper para cálculo ordinal (1st, 2nd, 3rd, 4th...)
function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Função Avançada de Substituição de Variáveis
function replaceVars(str, member, guild) {
    if (!str) return '';
    const user = member.user || member;
    const count = guild.memberCount || 0;
    const createdTimestamp = Math.floor(user.createdTimestamp / 1000);

    return str
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{username}/g, user.username)
        .replace(/{userTag}/g, user.tag || user.username)
        .replace(/{userId}/g, user.id)
        .replace(/{userAvatar}/g, user.displayAvatarURL({ dynamic: true, size: 512 }))
        .replace(/{userCreated}/g, `<t:${createdTimestamp}:F>`)
        .replace(/{userCreatedRelative}/g, `<t:${createdTimestamp}:R>`)
        .replace(/{server}/g, guild.name)
        .replace(/{serverId}/g, guild.id)
        .replace(/{serverIcon}/g, guild.iconURL({ dynamic: true, size: 512 }) || '')
        .replace(/{memberCount}/g, count.toString())
        .replace(/{memberOrdinal}/g, getOrdinal(count))
        .replace(/{owner}/g, `<@${guild.ownerId}>`)
        .replace(/{ownerId}/g, guild.ownerId);
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        if (member.user.bot) return;

        const settings = getSettings(member.guild.id);
        if (!settings) return;

        // Auto-Role
        if (settings.autoRoleEnabled && Array.isArray(settings.autoRoleIds)) {
            try {
                const rolesToAssign = settings.autoRoleIds.filter(id => member.guild.roles.cache.has(id));
                if (rolesToAssign.length > 0) {
                    await member.roles.add(rolesToAssign).catch(err => console.error(`[AutoRole] ${err.message}`));
                }
            } catch (err) {
                console.error('[AutoRole Erro]', err);
            }
        }

        // Mensagem no Privado (DM)
        if (settings.welcomeDmEnabled && settings.welcomeDmText) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`👋 Bem-vindo(a) ao ${member.guild.name}!`)
                    .setDescription(replaceVars(settings.welcomeDmText, member, member.guild))
                    .setColor(settings.welcomeColor || '#5865F2')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                await member.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {
                console.error('[Welcome DM Erro]', e);
            }
        }

        // Mensagem no Canal
        if (settings.welcomeChannel) {
            const channel = member.guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(replaceVars(settings.welcomeTitle || '👋 Seja muito bem-vindo(a)!', member, member.guild))
                .setDescription(replaceVars(settings.welcomeMessage || 'Olá {user}, seja bem-vindo(a) ao **{server}**!', member, member.guild))
                .setColor(settings.welcomeColor || '#5865F2')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ 
                    text: replaceVars(settings.welcomeFooter || 'Membro #{memberCount}', member, member.guild), 
                    iconURL: member.guild.iconURL({ dynamic: true }) 
                })
                .setTimestamp();

            if (settings.welcomeImage) {
                embed.setImage(replaceVars(settings.welcomeImage, member, member.guild));
            } else if (settings.welcomeCardEnabled) {
                const avatarUrl = encodeURIComponent(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
                const username = encodeURIComponent(member.user.username);
                const guildName = encodeURIComponent(member.guild.name);
                const memberCount = member.guild.memberCount;
                embed.setImage(`https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${username}&text2=Bem-vindo+ao+${guildName}&text3=Membro+%23${memberCount}&avatar=${avatarUrl}`);
            }

            await channel.send({
                content: settings.welcomePing ? `${member}` : null,
                embeds: [embed]
            }).catch(err => console.error('[Welcome Channel Erro]', err));
        }
    }
};
