const { EmbedBuilder } = require('discord.js');
const player = require('../utils/player');

module.exports = {
    name: 'excluiritem',
    aliases: ['delitem', 'removeritem', 'dropitem', 'jogaritem'],
    description: 'Remove um item do inventário pelo número',
    async execute(message, args) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie o perfil com `O.j criar`.');
        }
        const idx = parseInt(args[0], 10);
        if (!Number.isFinite(idx) || idx < 1) {
            return message.reply('Uso: `O.excluiritem <número>` — veja os números em `O.j perfil` / inventário.');
        }
        const removed = player.removeItemAt(message.author.id, idx - 1);
        if (!removed) {
            return message.reply('Item não encontrado nesse número.');
        }
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('Item removido')
                    .setDescription(
                        `Removido: ${removed.emoji || '📦'} **${removed.name}**` +
                            (removed.rarity ? ` (${removed.rarity})` : '')
                    )
            ]
        });
    }
};
