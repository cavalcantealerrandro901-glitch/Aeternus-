const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'fila',
    aliases: ['queue', 'q'],
    description: 'Mostra a fila de músicas',
    data: new SlashCommandBuilder().setName('fila').setDescription('Mostra a fila de músicas'),

    async execute(message) {
        return message.reply({ embeds: [build(message.guild.id)] });
    },
    async executeSlash(i) {
        return i.reply({ embeds: [build(i.guild.id)] });
    }
};

function build(guildId) {
    const q = musicManager.getQueue(guildId);
    const emb = new EmbedBuilder().setColor(0xa78bfa).setTitle('📜 Fila');

    if (!q.current && !q.tracks.length) {
        emb.setDescription('_Fila vazia._');
        return emb;
    }

    const lines = [];
    if (q.current) {
        lines.push(
            `**▶ Agora:** [${q.current.info?.title || '?'}](${q.current.info?.uri || '#'}) · <@${q.current.requester}>`
        );
    }
    q.tracks.slice(0, 15).forEach((t, i) => {
        lines.push(
            `**${i + 1}.** [${t.info?.title || '?'}](${t.info?.uri || '#'}) · ${musicManager.formatMs(t.info?.length)}`
        );
    });
    if (q.tracks.length > 15) lines.push(`_…e mais ${q.tracks.length - 15}_`);

    emb.setDescription(lines.join('\n'));
    emb.setFooter({ text: `Total na fila: ${q.tracks.length} · Loop: ${['off', 'faixa', 'fila'][q.loop] || 'off'}` });
    return emb;
}
