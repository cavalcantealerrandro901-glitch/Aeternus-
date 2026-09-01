const music = require('../utils/music');

module.exports = {
    name: 'pause',
    aliases: ['pausar'],
    description: 'Pausa a música',
    async execute(message) {
        if (!message.member?.voice?.channel) return message.reply('❌ Entre em um canal de voz.');
        const ok = music.pause(message.guild.id);
        return message.reply(ok ? '⏸️ Música pausada.' : '❌ Nada tocando.');
    }
};
