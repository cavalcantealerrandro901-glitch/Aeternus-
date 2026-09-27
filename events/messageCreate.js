const aeternusAI = require('../utils/aeternusAI');
const { PermissionFlagsBits } = require('discord.js');

// Defina o prefixo padrão do seu bot (ajuste se necessário)
const DEFAULT_PREFIX = '!';

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

        // 1. Se a mensagem começa com o prefixo (comandos tradicionais)
        if (message.content.startsWith(DEFAULT_PREFIX)) {
            // Aqui o seu gerenciador de comandos por prefixo (se houver) pode agir, 
            // ou se o seu projeto usa um handler separado para prefixos, certifique-se de chamá-lo aqui.
            return; 
        }

        // 2. Verifica se o bot foi mencionado na mensagem
        const isMentioned = message.mentions.has(message.client.user);

        // Se NÃO foi mencionado e não é comando, apenas aprende com o texto enviado
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

        // Se foi mencionado, limpa a menção do texto para processar a inteligência artificial
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
