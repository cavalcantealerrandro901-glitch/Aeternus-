const { EmbedBuilder } = require('discord.js');
const xp = require('../utils/xp');

module.exports = {
    name: 'xp',
    aliases: ['level', 'nivel', 'rank'],
    description: 'Mostra seu XP e nível',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const total = xp.get(target.id);
        const p = xp.progress(total);
        const barLen = 10;
        const filled = Math.min(barLen, Math.round((p.xpInLevel / p.xpNeed) * barLen));
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        const embed = new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle(`${xp.EMOJI} XP — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
                `**Nível ${p.level}**\n` +
                    `\`${bar}\` ${p.xpInLevel.toLocaleString('pt-BR')}/${p.xpNeed.toLocaleString('pt-BR')}\n\n` +
                    `XP total: ${xp.formatPlain(p.total)}`
            )
            .setFooter({ text: 'Ganhe XP jogando e usando o bot' });

        await message.reply({ embeds: [embed] });
    }
};
