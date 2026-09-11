const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'parar',
    aliases: ['stop', 'leave', 'sairvoz', 'disconnect'],
    description: 'Para a música e sai do canal',
    data: new SlashCommandBuilder().setName('parar').setDescription('Para e sai do canal de voz'),

    async execute(message) {
        return act(message);
    },
    async executeSlash(i) {
        return act(i, true);
    }
};

async function act(ctx, slash) {
    const guildId = ctx.guild.id;
    try {
        await ctx.client.shoukaku?.leaveVoiceChannel(guildId);
    } catch (_) {}
    musicManager.deleteQueue(guildId);
    const msg = '⏹️ Fila limpa e saí do canal.';
    return slash ? ctx.reply(msg) : ctx.reply(msg);
}
