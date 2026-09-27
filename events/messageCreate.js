const aeternusAI = require('../utils/aeternusAI');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // Verifica se o bot foi mencionado na mensagem
        const isMentioned = message.mentions.has(message.client.user);
        
        // Se NÃO foi mencionado, apenas aprende com o texto enviado (sem responder)
        if (!isMentioned) {
            // Apenas alimenta a base de aprendizado e sentimentos silenciosamente
            await aeternusAI.chat({
                userId: message.author.id,
                message: message.content,
                client: message.client,
                guild: message.guild,
                channel: message.channel,
                messageId: null, // Sem resposta/reply
                author: message.author,
                learnOnly: true // Flag interna para não gerar resposta
            });
            return;
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
            await message.reply({
                content: response.text,
                allowedMentions: { repliedUser: true }
            });
        }
    }
};
