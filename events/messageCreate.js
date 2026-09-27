const aeternusAI = require('../utils/aeternusAI');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // Verifica se o bot foi mencionado na mensagem
        const isMentioned = message.mentions.has(message.client.user);

        // Se NÃO foi mencionado, apenas aprende com o texto enviado (sem responder)
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

        // Verifica se o canal existe e se o bot tem permissão de enviar mensagens e ver o canal
        if (message.channel && message.guild) {
            const botMember = message.guild.members.cache.get(message.client.user.id) || await message.guild.members.fetch(message.client.user.id).catch(() => null);
            if (botMember) {
                const permissions = message.channel.permissionsFor(botMember);
                if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
                    return; // Sem permissão, encerra silenciosamente para evitar crash/erro na API
                }
            }
        }

        // Se foi mencionado, limpa a menção do texto para processar a intenção limpa
        const cleanContent = message.content
            .replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '')
            .trim();

        // Processa a resposta normalmente com a menção/reply
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
                // Silencia erros de permissão ou mensagens deletadas para não poluir os logs
                if (err.code !== 50013 && err.code !== 10008) {
                    console.error('Erro ao responder menção:', err);
                }
            }
        }
    }
};
