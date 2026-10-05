const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const player = require('../utils/player');

module.exports = {
    name: 'deletar',
    aliases: ['del', 'deletaritem', 'deletarslot'],
    description: 'Deletar um slot inteiro do inventário',
    data: new SlashCommandBuilder()
        .setName('deletar')
        .setDescription('Deletar um slot inteiro do inventário')
        .addSubcommand((s) => s
            .setName('slot')
            .setDescription('Remove todo o conteúdo de um slot')
            .addIntegerOption((o) => o
                .setName('numero')
                .setDescription('Número do slot')
                .setRequired(true)
                .setMinValue(1)
            )
        ),

    async execute(message, args) {
        if (String(args[0] || '').toLowerCase() !== 'slot') {
            return message.reply('Use **O.deletar slot <número>**. Exemplo: **O.deletar slot 3**.');
        }

        const number = Number(args[1]);
        if (!Number.isInteger(number) || number < 1) {
            return message.reply('Informe um número de slot válido.');
        }

        const result = player.removeItemAt(message.author.id, number - 1);
        if (!result) return message.reply('Esse slot não existe no seu inventário.');

        return message.reply(
            '🗑️ **Slot #' + String(number).padStart(2, '0') + ' removido.**\n' +
            (result.emoji || '📦') + ' **' + result.name + '** ×' + (result.quantity || 1) +
            ' foi removido permanentemente do inventário.'
        );
    },

    async executeSlash(interaction) {
        const number = interaction.options.getInteger('numero');
        const result = player.removeItemAt(interaction.user.id, number - 1);

        if (!result) {
            return interaction.reply({
                content: 'Esse slot não existe no seu inventário.',
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply(
            '🗑️ **Slot #' + String(number).padStart(2, '0') + ' removido.**\n' +
            (result.emoji || '📦') + ' **' + result.name + '** ×' + (result.quantity || 1) +
            ' foi removido permanentemente do inventário.'
        );
    }
};
