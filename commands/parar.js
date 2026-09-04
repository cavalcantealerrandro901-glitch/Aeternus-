const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'parar',
    aliases: ['stop'],
    description: 'Parar música e limpar a fila',
    data: new SlashCommandBuilder().setName('parar').setDescription('Parar música e limpar a fila'),

    async execute(message) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        try {
            await queue.stop();
            if (message.client.distubeSettings?.leaveOnStop) await queue.voice.leave();
            await message.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏹️ Parado.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        const err = needVoice(i, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        try {
            await queue.stop();
            if (i.client.distubeSettings?.leaveOnStop) await queue.voice.leave();
            await i.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏹️ Parado.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
