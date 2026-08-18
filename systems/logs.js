const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = (client, getSettings) => {
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;
        const settings = await getSettings(message.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;
        const ch =
            message.guild.channels.cache.get(settings.msgLogChannel) ||
            (await message.guild.channels.fetch(settings.msgLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Apagada')
            .setColor('#ef4444')
            .addFields(
                {
                    name: 'Autor',
                    value: message.author ? `${message.author.tag}` : '?',
                    inline: true
                },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Conteúdo', value: (message.content || '*vazio*').slice(0, 1000) }
            )
            .setTimestamp();
        ch.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('messageUpdate', async (oldMsg, newMsg) => {
        if (!oldMsg.guild || oldMsg.author?.bot) return;
        if (oldMsg.content === newMsg.content) return;
        const settings = await getSettings(oldMsg.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;
        const ch =
            oldMsg.guild.channels.cache.get(settings.msgLogChannel) ||
            (await oldMsg.guild.channels.fetch(settings.msgLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensagem Editada')
            .setColor('#f59e0b')
            .addFields(
                { name: 'Autor', value: oldMsg.author?.tag || '?', inline: true },
                { name: 'Antes', value: (oldMsg.content || '—').slice(0, 500) },
                { name: 'Depois', value: (newMsg.content || '—').slice(0, 500) }
            )
            .setTimestamp();
        ch.send({ embeds: [embed] }).catch(() => {});
    });

    client.on('guildMemberAdd', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;
        const ch =
            member.guild.channels.cache.get(settings.memberLogChannel) ||
            (await member.guild.channels.fetch(settings.memberLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📥 Membro Entrou')
                    .setColor('#10b981')
                    .setDescription(`${member.user.tag} entrou.`)
                    .setTimestamp()
            ]
        }).catch(() => {});
    });

    client.on('guildMemberRemove', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;
        const ch =
            member.guild.channels.cache.get(settings.memberLogChannel) ||
            (await member.guild.channels.fetch(settings.memberLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📤 Membro Saiu')
                    .setColor('#6b7280')
                    .setDescription(`${member.user?.tag || member.id} saiu.`)
                    .setTimestamp()
            ]
        }).catch(() => {});
    });

    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        const settings = await getSettings(guild.id);
        if (!settings?.voiceLogEnabled || !settings?.voiceLogChannel) return;
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;
        const ch =
            guild.channels.cache.get(settings.voiceLogChannel) ||
            (await guild.channels.fetch(settings.voiceLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        let text = null;
        if (!oldState.channelId && newState.channelId)
            text = `${member.user.tag} entrou em **${newState.channel.name}**`;
        else if (oldState.channelId && !newState.channelId)
            text = `${member.user.tag} saiu de **${oldState.channel.name}**`;
        else if (oldState.channelId !== newState.channelId)
            text = `${member.user.tag}: **${oldState.channel?.name}** → **${newState.channel?.name}**`;
        if (!text) return;
        ch.send({
            embeds: [new EmbedBuilder().setTitle('🔊 Voz').setDescription(text).setColor('#38bdf8').setTimestamp()]
        }).catch(() => {});
    });

    client.on('guildBanAdd', async (ban) => {
        const settings = await getSettings(ban.guild.id);
        if (!settings?.modLogEnabled || !settings?.modLogChannel) return;
        const ch =
            ban.guild.channels.cache.get(settings.modLogChannel) ||
            (await ban.guild.channels.fetch(settings.modLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        let executor = '?';
        try {
            const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
            const e = logs.entries.first();
            if (e?.target?.id === ban.user.id) executor = e.executor?.tag || '?';
        } catch (_) {}
        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🔨 Ban')
                    .setColor('#ef4444')
                    .setDescription(`${ban.user.tag} banido por ${executor}`)
                    .setTimestamp()
            ]
        }).catch(() => {});
    });

    client.on('guildBanRemove', async (ban) => {
        const settings = await getSettings(ban.guild.id);
        if (!settings?.modLogEnabled || !settings?.modLogChannel) return;
        const ch =
            ban.guild.channels.cache.get(settings.modLogChannel) ||
            (await ban.guild.channels.fetch(settings.modLogChannel).catch(() => null));
        if (!ch?.isTextBased()) return;
        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('♻️ Unban')
                    .setColor('#10b981')
                    .setDescription(`${ban.user.tag} desbanido`)
                    .setTimestamp()
            ]
        }).catch(() => {});
    });
};
