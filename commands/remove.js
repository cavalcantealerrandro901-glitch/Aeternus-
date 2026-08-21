const music = require('../utils/musicPlayer');

module.exports = {
    name: 'remove',
    aliases: ['remover', 'rm'],
    description: 'Remove uma música da fila pelo número',
    async execute(message, args) {
        if (!message.guild) return;
        const n = parseInt(args[0], 10);
        if (!n || n < 1) {
            return message.reply('Uso: `O.remove <número>` — veja os números em `O.queue`.');
        }
        const removed = music.removeAt(message.guild.id, n);
        if (!removed) return message.reply('Posição inválida. Use `O.queue` para ver a fila.');
        await message.reply(`🗑️ Removido: **${removed.title}**`);
    }
};
