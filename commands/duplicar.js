const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'duplicar',
    aliases: ['double', 'dobrar'],
    async execute(message, args) {
        const amount = parseAmount(args[0]);
        if (!amount) return message.reply('Uso: `O.duplicar <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        cristais.remove(message.author.id, amount);
        const win = Math.random() < 0.45;
        if (win) cristais.add(message.author.id, amount * 2);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`duplicar:again:${amount}:${message.author.id}`).setLabel('De novo').setStyle(ButtonStyle.Primary)
        );
        await message.reply({
            embeds: [new EmbedBuilder().setColor(win ? 0x34d399 : 0xef4444).setTitle(win ? '✨ Duplicou' : '💥 Perdeu').setDescription(win ? `+${cristais.formatPlain(amount * 2)}` : `-${cristais.formatPlain(amount)}`)],
            components: [row]
        });
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner) return interaction.reply({ content: 'Não é seu.', ephemeral: true });
        const amount = parseInt(amountStr, 10);
        if (cristais.get(owner) < amount) return interaction.reply({ content: '💠 Sem saldo.', ephemeral: true });
        cristais.remove(owner, amount);
        const win = Math.random() < 0.45;
        if (win) cristais.add(owner, amount * 2);
        await interaction.update({
            embeds: [new EmbedBuilder().setColor(win ? 0x34d399 : 0xef4444).setTitle(win ? '✨ Duplicou' : '💥 Perdeu').setDescription(win ? `+${cristais.formatPlain(amount * 2)}` : `-${cristais.formatPlain(amount)}`)]
        });
    }
};
