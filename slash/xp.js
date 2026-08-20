const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const xp = require('../utils/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Mostra XP e nível')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const p = xp.progress(xp.get(target.id));
        const barLen = 10;
        const filled = Math.min(barLen, Math.round((p.xpInLevel / p.xpNeed) * barLen));
        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

        const embed = new EmbedBuilder()
            .setColor(0xfbbf24)
            .setTitle(`${xp.EMOJI} XP — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
                `**Nível ${p.level}**\n\`${bar}\` ${p.xpInLevel}/${p.xpNeed}\n\nTotal: ${xp.formatPlain(p.total)}`
            );

        await interaction.reply({ embeds: [embed] });
    }
};
