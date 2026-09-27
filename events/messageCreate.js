const aeternusAI = require('../utils/aeternusAI');
const { PermissionFlagsBits } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Verifica permissões básicas do bot no canal
        const botMember = message.guild.members.cache.get(message.client.user.id) || await message.guild.members.fetch(message.client.user.id).catch(() => null);
        if (botMember && message.channel) {
            const permissions = message.channel.permissionsFor(botMember);
            if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
                return;
            }
        }

        // Obtém o prefixo personalizado do servidor (ou usa 'O.' como padrão global)
        let prefix = message.client.prefixDefault || 'O.';
        try {
            if (store && typeof store.get === 'function') {
                const guildConfig = await store.get(`guild_config_${message.guild.id}`);
                if (guildConfig && guildConfig.prefix) {
                    prefix = guildConfig.prefix;
                }
            }
        } catch (_) {}

        // 1. Se a mensagem começa com o prefixo do servidor, processa o comando
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = message.client.commands?.get(commandName) || 
                            message.client.commands?.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (command) {
                try {
                    await command.execute(message, args, message.client);
                } catch (err) {
                    console.error(`Erro ao executar o comando ${commandName}:`, err);
                }
            }
            return;
        }

        // 2. Verifica se o bot foi mencionado na mensagem para conversar com a IA
        const isMentioned = message.mentions.has(message.client.user);

        if (!isMentioned) {
            try {
                await aeternusAI.chat({
                    userId: message.author.id,
                    message: message.content,
                    client: message.client,
                    guild: message.guild,
                    channel: message.channel,
                    messageId: null,
                    author: message.author,
                    learnOnly: true
                });
            } catch (_) {}
            return;
        }

        // Ativa o indicador de "digitando..." no canal enquanto a IA processa
        try {
            await message.channel.sendTyping();
        } catch (_) {}

        // Limpa a menção para processar a IA
        const cleanContent = message.content
            .replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '')
            .trim();

        const response = await aeternusAI.chat({
            userId: message.author.id,
            message: cleanContent,
            client: message.client,
            guild: message.guild,
            channel: message.channel,
            messageId: message.id,
            author: message.author
        });

        if (response?.ok && response.text) {
            try {
                await message.reply({
                    content: response.text,
                    allowedMentions: { repliedUser: true }
                });
            } catch (err) {
                if (err.code !== 50013 && err.code !== 10008) {
                    console.error('Erro ao responder menção:', err);
                }
            }
        }
    }
};
