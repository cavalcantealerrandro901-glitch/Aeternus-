const music = require('../utils/music');

module.exports = {
    name: 'loop',
    aliases: ['repeat', 'repetir'],
    description: 'Alterna loop: off → faixa → fila',
    async execute(message, args) {
        const arg = (args[0] || '').toLowerCase();
        let mode = 'cycle';
        if (['off', '0', 'desligar'].includes(arg)) mode = false;
        else if (['track', 'faixa', 'song', '1'].includes(arg)) mode = 'track';
        else if (['queue', 'fila', 'all', '2'].includes(arg)) mode = 'queue';

        const result = music.setLoop(message.guild.id, mode === 'cycle' ? 'cycle' : mode);
        const label = result === 'track' ? 'faixa' : result === 'queue' ? 'fila' : 'desligado';
        return message.reply(`🔁 Loop: **${label}**`);
    }
};
