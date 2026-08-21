const music = require('../utils/musicPlayer');

module.exports = {
    name: 'stop',
    aliases: ['parar', 'leave'],
    description: 'Para a música, sai da voz e apaga a sala privada',
    async execute(message) {
        if (!message.guild) return;
        await music.stop(message.guild.id, message.client);
        await message.reply('⏹️ Música parada, sala privada removida (se existir).');
    }
};
