const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = (client) => {
    // Log de Mensagem Deletada
    client.on('messageDelete', async (message) => {
        // Tenta buscar a mensagem se for parcial
        if (message.partial) {
            try { await message.fetch(); } catch (e) { return; }
        }
        
        if (!message.guild || message.author?.bot) return;

        const config = db.getGuildConfig(message.guild.id);
        const channelId = config.logs?.logDeleted;
        if (!channelId) return;

        const logChannel = message.guild.channels.cache.get(channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensagem Apagada')
            .setColor('#ef4444')
            .addFields(
                { name: 'Autor', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Conteúdo', value: message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : '*[Sem texto/Imagem]*' }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Log de Mensagem Editada
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        // Tenta buscar mensagens parciais caso não estejam em cache
        if (oldMessage.partial) {
            try { await oldMessage.fetch(); } catch (e) { return; }
        }
        if (newMessage.partial) {
            try { await newMessage.fetch(); } catch (e) { return; }
        }

        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const config = db.getGuildConfig(oldMessage.guild.id);
        const channelId = config.logs?.logEdited;
        if (!channelId) return;

        const logChannel = oldMessage.guild.channels.cache.get(channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensagem Editada')
            .setColor('#f59e0b')
            .addFields(
                { name: 'Autor', value: `${oldMessage.author} (\`${oldMessage.author.id}\`)`, inline: true },
                { name: 'Canal', value: `${oldMessage.channel}`, inline: true },
                { name: 'Antes', value: oldMessage.content ? `\`\`\`${oldMessage.content.slice(0, 500)}\`\`\`` : '*[Conteúdo antigo não estava em cache]*' },
                { name: 'Depois', value: newMessage.content ? `\`\`\`${newMessage.content.slice(0, 500)}\`\`\`` : '*[Sem conteúdo]*' }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Log de Entradas
    client.on('guildMemberAdd', async (member) => {
        const config = db.getGuildConfig(member.guild.id);
        const channelId = config.logs?.logMembers;
        if (!channelId) return;

        const logChannel = member.guild.channels.cache.get(channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📥 Novo Membro Entrou')
            .setColor('#22c55e')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Usuário', value: `${member.user} (\`${member.user.tag}\`)`, inline: true },
                { name: 'ID', value: `\`${member.id}\``, inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });

    // Log de Saídas
    client.on('guildMemberRemove', async (member) => {
        const config = db.getGuildConfig(member.guild.id);
        const channelId = config.logs?.logMembers;
        if (!channelId) return;

        const logChannel = member.guild.channels.cache.get(channelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📤 Membro Saiu')
            .setColor('#6b7280')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'Usuário', value: `${member.user} (\`${member.user.tag}\`)`, inline: true },
                { name: 'ID', value: `\`${member.id}\``, inline: true }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
