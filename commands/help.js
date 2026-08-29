const { EmbedBuilder } = require('discord.js');
const { getPrefix } = require('../utils/settings');

module.exports = {
    name: 'help',
    aliases: ['ajuda', 'comandos'],
    async execute(message) {
        const p = getPrefix(message.guild.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('Aeternus')
                    .setDescription(
                        `Prefixo **${p}**\n\n\`${p}ping\` \`${p}saldo\` \`${p}daily\` \`${p}help\`\n\nMais comandos serão recarregados no repositório.`
                    )
            ]
        });
    }
};
