const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'parar',
    aliases: ['stop', 'leave', 'sair'],
    description: 'Para a música e fecha a sala',
    async execute(message) {
        if (!message.guild) return;
        const data = music.getQueue(message.guild.id);
        if (!data.now && !data.queue.length && !data.privateChannelId) {
            return message.reply('Não há sessão de música ativa.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mctl_stop_${message.guild.id}`)
                .setLabel('Confirmar parar')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`mctl_cancelstop_${message.guild.id}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('⏹️ Encerrar sessão?')
                    .setDescription('Isso para a música, limpa a fila e apaga a sala privada.')
            ],
            components: [row]
        });
    }
};
