const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

const settingsPath = path.join(__dirname, '..', 'settings.json');

function getSettingsData() {
    if (!fs.existsSync(settingsPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function replaceVars(str, user, guild) {
    if (!str) return '';
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

router.post('/api/test-welcome', async (req, res) => {
    try {
        const { guildId } = req.body;
        const client = req.client;
        if (!guildId) return res.status(400).json({ error: 'guildId é obrigatório.' });

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado no bot.' });

        const settings = getSettingsData()[guildId] || {};
        if (!settings.welcomeChannel) {
            return res.status(400).json({ error: 'Selecione e salve um canal de boas-vindas primeiro.' });
        }

        const channel = guild.channels.cache.get(settings.welcomeChannel);
        if (!channel) return res.status(404).json({ error: 'Canal configurado não existe no servidor.' });

        const testUser = client.user;

        const embed = new EmbedBuilder()
            .setTitle(replaceVars(settings.welcomeTitle || '👋 Seja muito bem-vindo(a)!', testUser, guild) + ' 🧪 [TESTE]')
            .setDescription(replaceVars(settings.welcomeMessage || 'Olá {user}, seja bem-vindo ao **{server}**!', testUser, guild))
            .setColor(settings.welcomeColor || '#5865F2')
            .setThumbnail(testUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: replaceVars(settings.welcomeFooter || 'Membro #{memberCount}', testUser, guild) + ' • Teste' })
            .setTimestamp();

        if (settings.welcomeImage) {
            embed.setImage(replaceVars(settings.welcomeImage, testUser, guild));
        } else if (settings.welcomeCardEnabled) {
            const avatarUrl = encodeURIComponent(testUser.displayAvatarURL({ extension: 'png', size: 512 }));
            embed.setImage(`https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${encodeURIComponent(testUser.username)}&text2=Bem-vindo+ao+${encodeURIComponent(guild.name)}&text3=Membro+%23${guild.memberCount}&avatar=${avatarUrl}`);
        }

        await channel.send({
            content: settings.welcomePing ? `🧪 **[TESTE DE BOAS-VINDAS]** ${testUser}` : '🧪 **[TESTE DE BOAS-VINDAS]**',
            embeds: [embed]
        });

        res.json({ success: true, message: 'Mensagem de teste enviada com sucesso no canal!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
