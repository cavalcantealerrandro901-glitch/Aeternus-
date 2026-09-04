const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'sair',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Sair do canal de voz',
    data: new SlashCommandBuilder().setName('sair_call').setDescription('Sair do canal de voz'),

    async execute(message) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        try {
            if (queue) await queue.stop();
            await message.guild.members.me.voice.disconnect();
            await message.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('👋 Sai da call.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        const err = needVoice(i, { memberNeed: true, botNeed: true, same: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        try {
            if (queue) await queue.stop();
            await i.guild.members.me.voice.disconnect();
            await i.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('👋 Sai da call.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
