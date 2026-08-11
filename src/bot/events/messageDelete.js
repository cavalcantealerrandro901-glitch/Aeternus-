const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;

        const embed = baseEmbed()
            .setColor(0xef4444)
            .setTitle('🗑️ Mensagem Apagada')
            .addFields(
                {
                    name: 'Autor',
                    value: message.author
                        ? `${message.author.tag} (\`${message.author.id}\`)`
                        : 'Desconhecido',
                    inline: true
                },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                {
                    name: 'Conteúdo',
                    value: message.content?.slice(0, 1000) || '*sem texto / apenas anexo*'
                }
            );

        await sendLog(message.guild, 'message', embed);
    }
};
