const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'fila',
    aliases: ['queue', 'q', 'playlist'],
    description: 'Mostra a fila de músicas com controles',
    async execute(message) {
        if (!message.guild) return;
        const data = music.getQueue(message.guild.id);
        const embed = music.buildQueueEmbed(message.guild.id);

        const lines = [];
        if (data.now) {
            lines.push(`**▶ Agora:** [${data.now.title}](${data.now.url})`);
        } else {
            lines.push('**▶** Nada tocando');
        }

        data.queue.slice(0, 12).forEach((t, i) => {
            lines.push(`**${i + 1}.** ${t.title}`);
        });

        if (!data.queue.length && !data.now) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x64748b)
                        .setTitle('📃 Fila vazia')
                        .setDescription('Use `O.play <música>` para começar.')
                ]
            });
        }

        embed
            .setDescription(lines.join('\n').slice(0, 4000))
            .setFooter({
                text: `Fila: ${data.queue.length}/${data.max} · Loop: ${data.loop ? 'on' : 'off'}`
            });

        if (data.privateChannelId) {
            embed.addFields({ name: 'Sala', value: `<#${data.privateChannelId}>`, inline: true });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mctl_pause_${message.guild.id}`)
                .setLabel('Pausa')
                .setEmoji('⏸️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`mctl_skip_${message.guild.id}`)
                .setLabel('Pular')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`mctl_loop_${message.guild.id}`)
                .setLabel('Loop')
                .setEmoji('🔁')
                .setStyle(data.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`mctl_stop_${message.guild.id}`)
                .setLabel('Parar')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
