const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'fila',
    aliases: ['queue', 'q'],
    description: 'Fila',
    data: new SlashCommandBuilder().setName('fila').setDescription('Ver fila'),

    async execute(message) {
        const p = music.queueInfo(message.guild.id);
        if (!p.current && !p.queue.length) return message.reply('Fila vazia.');
        const lines = [];
        if (p.current) {
            lines.push(`🎵 [${p.current.title}](${p.current.uri || '#'}) · \`${music.formatMs(p.current.length)}\``);
        }
        p.queue.slice(0, 10).forEach((t, i) => {
            lines.push(`**${i + 1}.** [${t.title}](${t.uri || '#'}) · \`${music.formatMs(t.length)}\``);
        });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(music.COLOR)
                    .setTitle(`Fila · ${p.queue.length + (p.current ? 1 : 0)}`)
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `Volume ${p.volume}%` })
            ]
        });
    },

    async executeSlash(i) {
        const p = music.queueInfo(i.guild.id);
        if (!p.current && !p.queue.length)
            return i.reply({ content: 'Fila vazia.', ephemeral: true });
        const lines = [];
        if (p.current) {
            lines.push(`🎵 [${p.current.title}](${p.current.uri || '#'}) · \`${music.formatMs(p.current.length)}\``);
        }
        p.queue.slice(0, 10).forEach((t, idx) => {
            lines.push(`**${idx + 1}.** [${t.title}](${t.uri || '#'}) · \`${music.formatMs(t.length)}\``);
        });
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(music.COLOR)
                    .setTitle(`Fila · ${p.queue.length + (p.current ? 1 : 0)}`)
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `Volume ${p.volume}%` })
            ]
        });
    }
};
