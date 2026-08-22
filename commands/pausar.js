const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'pausar',
    aliases: ['pause', 'resume', 'continuar'],
    description: 'Pausa ou continua a música',
    async execute(message) {
        if (!message.guild) return;
        const st = music.getQueue(message.guild.id);
        if (!st.now) return message.reply('Nada tocando agora.');

        // toggle via handleControl simulation
        const guildId = message.guild.id;
        const playerState = require('../utils/musicPlayer');
        // usa API interna
        const { getQueue } = playerState;
        // direct access through stop/skip pattern — toggle pause on player
        const mod = require('../utils/musicPlayer');
        // Expose toggle via fake interaction-less method
        const internal = mod.__togglePause
            ? mod.__togglePause(guildId)
            : null;

        // Fallback: send control buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mctl_pause_${guildId}`)
                .setLabel('Pausa / Continuar')
                .setEmoji('⏯️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`mctl_skip_${guildId}`)
                .setLabel('Pular')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('⏯️ Controles')
                    .setDescription(`**${st.now.title}**\nUse os botões abaixo.`)
            ],
            components: [row]
        });
    }
};
