const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR, COLOR_ERR } = require('../systems/music');

module.exports = {
    name: 'pular',
    aliases: ['skip', 's'],
    description: 'Pular música',
    data: new SlashCommandBuilder().setName('pular').setDescription('Pular música atual'),

    async execute(message) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        try {
            await queue.skip();
            await message.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏭️ Próxima música.')]
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
            await queue.skip();
            await i.reply({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('⏭️ Próxima música.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
