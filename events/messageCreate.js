const aeternusAI = require('../utils/aeternusAI');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const response = await aeternusAI.chat({
            userId: message.author.id,
            message: message.content,
            client: message.client,
            guild: message.guild,
            channel: message.channel,
            messageId: message.id
        });

        if (response?.ok && response.text) {
            await message.reply({
                content: response.text,
                allowedMentions: { repliedUser: true }
            });
        }
    }
};
