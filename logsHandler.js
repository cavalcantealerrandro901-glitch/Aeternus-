const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = (client, getSettings) => {
    // Mensagem apagada
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;

        const settings = await getSettings(message.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;

        const logChannel =
            message.guild.channels.cache.get(settings.msgLogChannel) ||
            (await message.guild.channels.fetch(settings.msgLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Apagada')
            .setColor('#ef4444')
            .addFields(
                {
                    name: 'Autor',
                    value: message.author
                        ? `${message.author.tag} (${message.author.id})`
                        : 'Desconhecido',
                    inline: true
                },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                {
                    name: 'Conteúdo',
                    value: (message.content || '*[Sem conteúdo de texto]*').slice(0, 1000)
                }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Mensagem editada
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const settings = await getSettings(oldMessage.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;

        const logChannel =
            oldMessage.guild.channels.cache.get(settings.msgLogChannel) ||
            (await oldMessage.guild.channels.fetch(settings.msgLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensagem Editada')
            .setColor('#f59e0b')
            .addFields(
                {
                    name: 'Autor',
                    value: oldMessage.author ? oldMessage.author.tag : '?',
                    inline: true
                },
                { name: 'Canal', value: `${oldMessage.channel}`, inline: true },
                { name: 'Antes', value: (oldMessage.content || '*[Vazio]*').slice(0, 500) },
                { name: 'Depois', value: (newMessage.content || '*[Vazio]*').slice(0, 500) }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Entrada
    client.on('guildMemberAdd', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;

        const logChannel =
            member.guild.channels.cache.get(settings.memberLogChannel) ||
            (await member.guild.channels.fetch(settings.memberLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('📥 Membro Entrou')
            .setColor('#10b981')
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member.user.tag} entrou no servidor.`)
            .addFields({ name: 'ID do Usuário', value: member.id })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Saída
    client.on('guildMemberRemove', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;

        const logChannel =
            member.guild.channels.cache.get(settings.memberLogChannel) ||
            (await member.guild.channels.fetch(settings.memberLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('📤 Membro Saiu')
            .setColor('#6b7280')
            .setThumbnail(member.user?.displayAvatarURL?.() || null)
            .setDescription(`${member.user?.tag || member.id} saiu do servidor.`)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Voz
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        const settings = await getSettings(guild.id);
        if (!settings?.voiceLogEnabled || !settings?.voiceLogChannel) return;

        const logChannel =
            guild.channels.cache.get(settings.voiceLogChannel) ||
            (await guild.channels.fetch(settings.voiceLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const embed = new EmbedBuilder().setTimestamp();

        if (!oldState.channelId && newState.channelId) {
            embed
                .setTitle('🔊 Entrou no Canal de Voz')
                .setColor('#10b981')
                .setDescription(
                    `${member.user.tag} entrou em **${newState.channel.name}**.`
                );
        } else if (oldState.channelId && !newState.channelId) {
            embed
                .setTitle('🔇 Saiu do Canal de Voz')
                .setColor('#ef4444')
                .setDescription(
                    `${member.user.tag} saiu de **${oldState.channel.name}**.`
                );
        } else if (oldState.channelId !== newState.channelId) {
            embed
                .setTitle('🔄 Trocou de Canal de Voz')
                .setColor('#38bdf8')
                .setDescription(
                    `${member.user.tag} de **${oldState.channel?.name}** → **${newState.channel?.name}**.`
                );
        } else {
            return;
        }

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Ban
    client.on('guildBanAdd', async (ban) => {
        const settings = await getSettings(ban.guild.id);
        if (!settings?.modLogEnabled || !settings?.modLogChannel) return;

        const logChannel =
            ban.guild.channels.cache.get(settings.modLogChannel) ||
            (await ban.guild.channels.fetch(settings.modLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        let executor = 'Desconhecido';
        let reason = ban.reason || 'Sem motivo';
        try {
            const logs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1
            });
            const entry = logs.entries.first();
            if (entry && entry.target?.id === ban.user.id) {
                executor = entry.executor?.tag || executor;
                reason = entry.reason || reason;
            }
        } catch (_) {}

        const embed = new EmbedBuilder()
            .setTitle('🔨 Membro Banido')
            .setColor('#ef4444')
            .setThumbnail(ban.user.displayAvatarURL())
            .addFields(
                { name: 'Usuário', value: `${ban.user.tag} (${ban.user.id})` },
                { name: 'Por', value: executor },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Unban
    client.on('guildBanRemove', async (ban) => {
        const settings = await getSettings(ban.guild.id);
        if (!settings?.modLogEnabled || !settings?.modLogChannel) return;

        const logChannel =
            ban.guild.channels.cache.get(settings.modLogChannel) ||
            (await ban.guild.channels.fetch(settings.modLogChannel).catch(() => null));
        if (!logChannel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('♻️ Membro Desbanido')
            .setColor('#10b981')
            .setThumbnail(ban.user.displayAvatarURL())
            .setDescription(`${ban.user.tag} (${ban.user.id}) foi desbanido.`)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
