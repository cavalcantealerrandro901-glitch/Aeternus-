const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = baseEmbed()
            .setColor(0xf59e0b)
            .setTitle('✏️ Mensagem Editada')
            .addFields(
                {
                    name: 'Autor',
                    value: newMessage.author
                        ? `${newMessage.author.tag} (\`${newMessage.author.id}\`)`
                        : 'Desconhecido',
                    inline: true
                },
                { name: 'Canal', value: `${newMessage.channel}`, inline: true },
                {
                    name: 'Antes',
                    value: oldMessage.content?.slice(0, 900) || '*vazio / sem texto*'
                },
                {
                    name: 'Depois',
                    value: newMessage.content?.slice(0, 900) || '*vazio / sem texto*'
                }
            );

        if (newMessage.url) {
            embed.addFields({ name: 'Link', value: `[Ir para mensagem](${newMessage.url})` });
        }

        await sendLog(newMessage.guild, 'messageEdit', embed);
    }
};
