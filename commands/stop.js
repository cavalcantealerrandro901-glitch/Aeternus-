const music = require('../utils/musicPlayer');

module.exports = {
    name: 'stop',
    aliases: ['parar', 'leave'],
    description: 'Para a música e sai do canal de voz',
    async execute(message) {
        if (!message.guild) return;
        music.stop(message.guild.id);
        await message.reply('⏹️ Fila limpa e bot desconectado do canal de voz.');
    }
};
