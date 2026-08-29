const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const bank = require('../utils/bank');
const xp = require('../utils/xp');
const invites = require('../utils/invites');

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'eu'],
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const x = xp.get(user.id);
        const inv = invites.getStats(message.guild.id, user.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xc4b5fd)
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 128 }) })
                    .setThumbnail(user.displayAvatarURL({ size: 256 }))
                    .setTitle('👤 Perfil')
                    .addFields(
                        { name: '❄️ Flocos', value: flocos.formatPlain(flocos.get(user.id)), inline: true },
                        { name: '🏦 Banco', value: flocos.formatPlain(bank.get(user.id)), inline: true },
                        { name: '💠 Cristais', value: cristais.formatPlain(cristais.get(user.id)), inline: true },
                        { name: '⭐ Nível', value: `${x.level}`, inline: true },
                        { name: '📩 Convites', value: `${inv.total}`, inline: true }
                    )
                    .setTimestamp()
            ]
        });
    }
};
