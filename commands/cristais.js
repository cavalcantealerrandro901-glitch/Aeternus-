const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'cristais',
    aliases: ['cristal', 'gelo', 'ice'],
    description: 'Nível de cristais de gelo e multiplicador do daily',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const p = cristais.progress(cristais.get(target.id));
        const mult = cristais.dailyMultiplier(target.id);
        const barLen = 10;
        const filled = Math.min(barLen, Math.round((p.inLevel / p.need) * barLen));
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        const embed = new EmbedBuilder()
            .setColor(0x67e8f9)
            .setTitle(`${cristais.EMOJI} Cristais de gelo — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
                `**Nível ${p.level}**\n` +
                    `\`${bar}\` ${p.inLevel.toLocaleString('pt-BR')}/${p.need.toLocaleString('pt-BR')}\n\n` +
                    `Total: ${cristais.formatPlain(p.total)}\n` +
                    `Multiplicador do **daily**: **×${mult.toFixed(2)}**\n` +
                    `_Cada nível adiciona +0,05x no daily (❄️ flocos)._`
            );

        await message.reply({ embeds: [embed] });
    }
};
