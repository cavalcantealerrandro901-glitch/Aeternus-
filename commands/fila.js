const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

function build(guildId) {
    const p = music.queueInfo(guildId);
    if (!p.current && !(p.queue && p.queue.length)) {
        return { content: 'A fila está vazia.' };
    }
    const lines = [];
    if (p.current) {
        const t = p.current;
        lines.push(
            `**Agora:** [${t.title}](${t.uri || t.url || '#'}) · \`${music.formatMs(t.length)}\``
        );
        if (t.requester) lines.push(`Pedido por: ${t.requester}`);
        lines.push('');
    }
    const q = p.queue || [];
    if (!q.length) lines.push('_Nada na fila._');
    else {
        lines.push('**Próximas:**');
        q.slice(0, 15).forEach((t, i) => {
            lines.push(
                `**${i + 1}.** [${t.title}](${t.uri || t.url || '#'}) · \`${music.formatMs(t.length)}\``
            );
        });
        if (q.length > 15) lines.push(`_…e mais ${q.length - 15}_`);
    }
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(music.COLOR)
                .setTitle('Fila')
                .setDescription(lines.join('\n').slice(0, 4000))
                .setFooter({ text: `Volume ${p.volume || 80}%` })
        ]
    };
}

module.exports = {
    name: 'fila',
    aliases: ['queue', 'q'],
    description: 'Ver a fila de músicas',
    data: new SlashCommandBuilder().setName('fila').setDescription('Ver a fila de músicas'),

    async execute(message) {
        await message.reply(build(message.guild.id));
    },

    async executeSlash(i) {
        await i.reply(build(i.guild.id));
    }
};
