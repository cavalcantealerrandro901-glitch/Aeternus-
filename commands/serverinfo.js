const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'server'],
    async execute(message) {
        const g = message.guild;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(g.name)
                    .setThumbnail(g.iconURL({ size: 128 }))
                    .addFields(
                        { name: 'Dono', value: `<@${g.ownerId}>`, inline: true },
                        { name: 'Membros', value: String(g.memberCount), inline: true },
                        { name: 'Canais', value: String(g.channels.cache.size), inline: true },
                        { name: 'Cargos', value: String(g.roles.cache.size), inline: true },
                        { name: 'Criado', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: 'ID', value: g.id, inline: true }
                    )
            ]
        });
    }
};
