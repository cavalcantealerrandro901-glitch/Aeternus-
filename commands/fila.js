const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'fila',
    aliases: ['queue', 'q'],
    description: 'Ver fila de músicas',
    data: new SlashCommandBuilder().setName('fila').setDescription('Ver fila de músicas'),

    async execute(message) {
        const err = needVoice(message, { queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        const list = queue.songs
            .slice(0, 12)
            .map((s, i) => {
                const mark = i === 0 ? '🎵' : `**${i}.**`;
                return `${mark} [${s.name}](${s.url}) · \`${s.formattedDuration}\``;
            })
            .join('\n');
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle(`Fila · ${queue.songs.length} música(s)`)
                    .setDescription(list || 'Vazia')
                    .setFooter({ text: `Volume ${queue.volume}%` })
            ]
        });
    },

    async executeSlash(i) {
        const err = needVoice(i, { queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        const list = queue.songs
            .slice(0, 12)
            .map((s, idx) => {
                const mark = idx === 0 ? '🎵' : `**${idx}.**`;
                return `${mark} [${s.name}](${s.url}) · \`${s.formattedDuration}\``;
            })
            .join('\n');
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR)
                    .setTitle(`Fila · ${queue.songs.length} música(s)`)
                    .setDescription(list || 'Vazia')
                    .setFooter({ text: `Volume ${queue.volume}%` })
            ]
        });
    }
};
