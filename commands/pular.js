const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'pular',
    aliases: ['skip', 'next', 'proxima'],
    description: 'Pula a música atual',
    data: new SlashCommandBuilder().setName('pular').setDescription('Pula a música atual'),

    async execute(message) {
        return act(message);
    },
    async executeSlash(i) {
        return act(i, true);
    }
};

async function act(ctx, slash) {
    const guild = ctx.guild;
    const player = ctx.client.shoukaku?.players?.get(guild.id);
    const q = musicManager.getQueue(guild.id);
    if (!player || !q.current) {
        const msg = 'Não há nada tocando.';
        return slash ? ctx.reply({ content: msg, flags: 64 }) : ctx.reply(msg);
    }
    const member = ctx.member || guild.members.cache.get(ctx.user?.id);
    if (!member?.voice?.channelId) {
        const msg = 'Entre no canal de voz.';
        return slash ? ctx.reply({ content: msg, flags: 64 }) : ctx.reply(msg);
    }
    try {
        await player.stopTrack();
    } catch {
        await musicManager.playNext(ctx.client, guild.id);
    }
    const msg = '⏭️ Música pulada.';
    return slash ? ctx.reply(msg) : ctx.reply(msg);
}
