const { generatePhrase } = require('../utils/phrases');

module.exports = {
    name: 'frase',
    async execute(message, args) {
        let repliedText = null;

        // Verifica se o usuário respondeu (marcou) a uma mensagem
        if (message.reference) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (repliedMessage) {
                    repliedText = repliedMessage.content;
                }
            } catch (error) {
                console.error("Erro ao buscar mensagem respondida:", error);
            }
        } 
        // Se não respondeu, mas passou argumentos por texto
        else if (args.length > 0) {
            repliedText = args.join(' ');
        }

        const fraseFinal = generatePhrase(repliedText);

        await message.reply(`📜 **Frase gerada:**\n> ${fraseFinal}`);
    }
};
