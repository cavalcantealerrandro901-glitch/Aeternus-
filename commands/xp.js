const { EmbedBuilder } = require('discord.js');
const xp = require('../utils/xp');

module.exports = {
    name: 'xp',
    aliases: ['level', 'nivel'],
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const data = xp.get(user.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                    .setTitle('⭐ Experiência')
                    .setDescription(
                        `**Nível** ${data.level}\n**XP** ${data.xp.toLocaleString('pt-BR')}\n**Próximo** ${xp.xpForLevel(data.level).toLocaleString('pt-BR')} XP\n**Daily** ×${xp.dailyMultiplier(data.level).toFixed(2)}`
                    )
            ]
        });
    }
};
