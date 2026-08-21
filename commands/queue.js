const music = require('../utils/musicPlayer');

module.exports = {
    name: 'queue',
    aliases: ['fila', 'q'],
    description: 'Mostra a fila de músicas',
    async execute(message) {
        if (!message.guild) return;
        const embed = music.buildQueueEmbed(message.guild.id);
        await message.reply({ embeds: [embed] });
    }
};
