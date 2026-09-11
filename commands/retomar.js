const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'retomar',
    aliases: ['resume', 'unpause', 'despausar'],
    description: 'Retoma a música pausada',
    data: new SlashCommandBuilder().setName('retomar').setDescription('Retoma a música'),

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
    await player.setPaused(false);
    q.paused = false;
    const msg = '▶️ Retomado.';
    return slash ? ctx.reply(msg) : ctx.reply(msg);
}
