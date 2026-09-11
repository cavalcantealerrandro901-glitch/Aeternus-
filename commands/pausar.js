const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'pausar',
    aliases: ['pause'],
    description: 'Pausa a música',
    data: new SlashCommandBuilder().setName('pausar').setDescription('Pausa a música atual'),

    async execute(message) {
        return act(message);
    },
    async executeSlash(i) {
        return act(i, true);
    }
};

async function act(ctx, slash) {
    const player = ctx.client.shoukaku?.players?.get(ctx.guild.id);
    const q = musicManager.getQueue(ctx.guild.id);
    if (!player || !q.current) {
        const msg = 'Nada tocando.';
        return slash ? ctx.reply({ content: msg, flags: 64 }) : ctx.reply(msg);
    }
    await player.setPaused(true);
    q.paused = true;
    const msg = '⏸️ Pausado.';
    return slash ? ctx.reply(msg) : ctx.reply(msg);
}
