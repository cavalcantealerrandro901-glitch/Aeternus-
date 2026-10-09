const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'volume',
    aliases: ['vol'],
    description: 'Ajusta o volume (0-100)',

    async execute(message, args) {
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n)) return message.reply('Use: `O.volume <0-100>`');
        return setVol(message, n);
    },
};

async function setVol(ctx, n, slash) {
    const vol = Math.max(0, Math.min(100, n));
    const player = ctx.client.shoukaku?.players?.get(ctx.guild.id);
    const q = musicManager.getQueue(ctx.guild.id);
    q.volume = vol;
    if (player) await player.setGlobalVolume(vol).catch(() => {});
    const msg = `🔊 Volume: **${vol}%**`;
    return slash ? ctx.reply(msg) : ctx.reply(msg);
}
