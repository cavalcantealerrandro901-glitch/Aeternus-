const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'volar'],
    description: 'Ajustar volume',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajustar volume (0-100)')
        .addIntegerOption((o) =>
            o.setName('nivel').setDescription('0 a 100').setRequired(true).setMinValue(0).setMaxValue(100)
        ),

    async execute(message, args) {
        const err = needVoice(message, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return message.reply(err);
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n) || n < 0 || n > 100) return message.reply('Uso: `O.volume <0-100>`');
        const { queue } = voiceState(message);
        queue.setVolume(n);
        await message.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`🔊 Volume **${n}%**`)]
        });
    },

    async executeSlash(i) {
        const err = needVoice(i, { memberNeed: true, botNeed: true, same: true, queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const n = i.options.getInteger('nivel', true);
        const { queue } = voiceState(i);
        queue.setVolume(n);
        await i.reply({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`🔊 Volume **${n}%**`)]
        });
    }
};
