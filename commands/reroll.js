const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { rerollDrop } = require('../systems/drops');

module.exports = {
    name: 'reroll',
    aliases: ['resortear', 'redraw'],
    description: 'Re-sorteia um drop finalizado pelo ID',
    async execute(message, args, client) {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }

        const id = (args[0] || '').replace(/\D/g, '');
        if (!id) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🔁 Reroll')
                        .setDescription(
                            'Uso: `reroll <id>` ou `O.reroll <id>`\nO ID aparece no final de cada drop.'
                        )
                ]
            });
        }

        const result = await rerollDrop(client || message.client, id);
        if (!result.ok) {
            return message.reply(`❌ ${result.error}`);
        }
        await message.reply(`✅ Reroll do drop \`${id}\` executado.`).catch(() => {});
    }
};
