const music = require('../utils/musicPlayer');

module.exports = {
    name: 'skip',
    aliases: ['pular', 'next'],
    description: 'Pula a música atual',
    async execute(message) {
        if (!message.guild) return;
        music.skip(message.guild.id);
        await message.reply('⏭️ Música pulada.');
    }
};
