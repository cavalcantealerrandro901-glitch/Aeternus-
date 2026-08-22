const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'eu'],
    description: 'Cristais, flocos e XP',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const p = xp.progress(xp.get(target.id));
        const mult = xp.dailyMultiplier(target.id);

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle(`Perfil — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: '💠 Cristais',
                    value: cristais.formatPlain(cristais.get(target.id)),
                    inline: true
                },
                {
                    name: '❄️ Flocos',
                    value: flocos.formatPlain(flocos.get(target.id)),
                    inline: true
                },
                {
                    name: '⭐ XP',
                    value:
                        `Nível **${p.level}**\n` +
                        `${p.xpInLevel}/${p.xpNeed} XP\n` +
                        `Daily **×${mult.toFixed(2)}**`,
                    inline: false
                }
            )
            .setFooter({ text: 'Apostas = 💠 · Raciocínio/loja = ❄️ · Chat = ⭐' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
