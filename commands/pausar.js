const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'pausar',
    aliases: ['pause'],
    description: 'Pausar música',
    data: new SlashCommandBuilder().setName('pausar').setDescription('Pausar música'),

    async execute(message) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        if (queue.paused) return message.reply('Já está pausado.');
        queue.pause();
        await message.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏸️ Pausado.')]
        });
    },

    async executeSlash(i) {
        const err = needVoice(i, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        if (queue.paused) return i.reply({ content: 'Já está pausado.', ephemeral: true });
        queue.pause();
        await i.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏸️ Pausado.')]
        });
    }
};
