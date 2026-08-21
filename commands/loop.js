const music = require('../utils/musicPlayer');

module.exports = {
    name: 'loop',
    aliases: ['repeat'],
    description: 'Liga/desliga loop da música atual',
    async execute(message) {
        if (!message.guild) return;
        const on = music.toggleLoop(message.guild.id);
        await message.reply(on ? '🔁 Loop **ligado** (faixa atual).' : '➡️ Loop **desligado**.');
    }
};
