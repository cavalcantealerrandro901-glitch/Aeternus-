const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'continuar',
    aliases: ['resume', 'unpause'],
    description: 'Continuar música',
    data: new SlashCommandBuilder().setName('continuar').setDescription('Continuar música'),

    async execute(message) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        if (!queue.paused) return message.reply('Não está pausado.');
        queue.resume();
        await message.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription('▶️ Continuando.')]
        });
    },

    async executeSlash(i) {
        const err = needVoice(i, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        if (!queue.paused) return i.reply({ content: 'Não está pausado.', ephemeral: true });
        queue.resume();
        await i.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription('▶️ Continuando.')]
        });
    }
};
