const { EmbedBuilder } = require('discord.js');

module.exports = (client, getSettings) => {

    // --- 1. MENSAGEM APAGADA ---
    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;

        const settings = await getSettings(message.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;

        const logChannel = message.guild.channels.cache.get(settings.msgLogChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Apagada')
            .setColor('#ef4444')
            .addFields(
                { name: 'Autor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Conteúdo', value: message.content || '*[Sem conteúdo de texto]*' }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // --- 2. MENSAGEM EDITADA ---
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const settings = await getSettings(oldMessage.guild.id);
        if (!settings?.msgLogEnabled || !settings?.msgLogChannel) return;

        const logChannel = oldMessage.guild.channels.cache.get(settings.msgLogChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensagem Editada')
            .setColor('#f59e0b')
            .addFields(
                { name: 'Autor', value: `${oldMessage.author.tag}`, inline: true },
                { name: 'Canal', value: `${oldMessage.channel}`, inline: true },
                { name: 'Antes', value: oldMessage.content || '*[Vazio]*' },
                { name: 'Depois', value: newMessage.content || '*[Vazio]*' }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // --- 3. ENTRADA DE MEMBRO ---
    client.on('guildMemberAdd', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;

        const logChannel = member.guild.channels.cache.get(settings.memberLogChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📥 Membro Entrou')
            .setColor('#10b981')
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member.user.tag} entrou no servidor.`)
            .addFields({ name: 'ID do Usuário', value: member.id })
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // --- 4. SAÍDA DE MEMBRO ---
    client.on('guildMemberRemove', async (member) => {
        const settings = await getSettings(member.guild.id);
        if (!settings?.memberLogEnabled || !settings?.memberLogChannel) return;

        const logChannel = member.guild.channels.cache.get(settings.memberLogChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📤 Membro Saiu')
            .setColor('#6b7280')
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`${member.user.tag} saiu do servidor.`)
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // --- 5. LOGS DE VOZ ---
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        const settings = await getSettings(guild.id);
        if (!settings?.voiceLogEnabled || !settings?.voiceLogChannel) return;

        const logChannel = guild.channels.cache.get(settings.voiceLogChannel);
        if (!logChannel) return;

        const member = newState.member || oldState.member;
        const embed = new EmbedBuilder().setTimestamp();

        if (!oldState.channelId && newState.channelId) {
            embed.setTitle('🔊 Entrou no Canal de Voz')
                 .setColor('#10b981')
                 .setDescription(`${member.user.tag} entrou no canal **${newState.channel.name}**.`);
        } else if (oldState.channelId && !newState.channelId) {
            embed.setTitle('🔇 Saiu do Canal de Voz')
                 .setColor('#ef4444')
                 .setDescription(`${member.user.tag} saiu do canal **${oldState.channel.name}**.`);
        } else if (oldState.channelId !== newState.channelId) {
            embed.setTitle('🔄 Trocou de Canal de Voz')
                 .setColor('#38bdf8')
                 .setDescription(`${member.user.tag} mudou de **${oldState.channel.name}** para **${newState.channel.name}**.`);
        } else {
            return;
        }

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
