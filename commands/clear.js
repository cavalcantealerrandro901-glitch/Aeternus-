const music = require('../utils/musicPlayer');

module.exports = {
    name: 'clear',
    aliases: ['clearqueue', 'limparfila'],
    description: 'Limpa a fila (mantém a música atual)',
    async execute(message) {
        if (!message.guild) return;
        // não conflitar com limpar chat se alias igual — nome é clear
        const n = music.clearQueue(message.guild.id);
        await message.reply(`🧹 Fila limpa (**${n}** música(s) removida(s)). A atual continua tocando.`);
    }
};
