const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'np',
    aliases: ['now', 'tocando', 'agora', 'nowplaying'],
    description: 'Mostra a música atual',

    async execute(message) {
        const view = music.getQueueView(message.guild.id);
        if (!view.current) {
            return message.reply('❌ Nada tocando no momento.');
        }

        const t = view.current;
        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle(view.paused ? '⏸️  Pausado' : '🎵  Tocando agora')
            .setDescription(`[${t.title}](${t.url})`)
            .addFields(
                { name: 'Duração', value: music.fmtDuration(t.duration), inline: true },
                { name: 'Canal', value: String(t.channel || '—').slice(0, 40), inline: true },
                {
                    name: 'Fila',
                    value: String(view.queue.length),
                    inline: true
                }
            )
            .setFooter({
                text: `Loop: ${view.loop || 'off'} · Volume: ${view.volume}%`
            })
            .setTimestamp();
        if (t.thumbnail) emb.setThumbnail(t.thumbnail);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('music:pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('music:resume').setEmoji('▶️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('music:skip').setEmoji('⏭️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('music:stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('music:loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
        );

        return message.reply({ embeds: [emb], components: [row] });
    }
};
