const music = require('../utils/music');

module.exports = {
    name: 'resume',
    aliases: ['retomar', 'continuar', 'unpause'],
    description: 'Retoma a música pausada',
    async execute(message) {
        if (!message.member?.voice?.channel) return message.reply('❌ Entre em um canal de voz.');
        const ok = music.resume(message.guild.id);
        return message.reply(ok ? '▶️ Música retomada.' : '❌ Nada pausado.');
    }
};
