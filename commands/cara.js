const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'coinflip', 'cf'],
    async execute(message, args) {
        const side = (args[0] || '').toLowerCase();
        const amount = parseAmount(args[1]);
        if (!['cara', 'coroa'].includes(side) || !amount)
            return message.reply('Uso: `O.cara <cara|coroa> <valor>`');
        if (cristais.get(message.author.id) < amount)
            return message.reply('💠 Cristais insuficientes.');

        cristais.remove(message.author.id, amount);
        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === side;
        if (win) cristais.add(message.author.id, amount * 2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`cara:again:${side}:${amount}:${message.author.id}`)
                .setLabel('Jogar novamente')
                .setStyle(ButtonStyle.Primary)
        );

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x34d399 : 0xef4444)
                    .setTitle(win ? '🪙 Vitória' : '🪙 Derrota')
                    .setDescription(
                        `Escolha: **${side}** · Resultado: **${result}**\n${win ? '+' : '-'}${cristais.formatPlain(amount)} cristais\nSaldo: **${cristais.formatPlain(cristais.get(message.author.id))}**`
                    )
            ],
            components: [row]
        });
    },
    async handleComponent(interaction) {
        const [, , side, amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const amount = parseInt(amountStr, 10);
        if (cristais.get(owner) < amount)
            return interaction.reply({ content: '💠 Sem cristais.', ephemeral: true });
        cristais.remove(owner, amount);
        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === side;
        if (win) cristais.add(owner, amount * 2);
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x34d399 : 0xef4444)
                    .setTitle(win ? '🪙 Vitória' : '🪙 Derrota')
                    .setDescription(
                        `**${side}** vs **${result}**\n${win ? '+' : '-'}${cristais.formatPlain(amount)} · Saldo **${cristais.formatPlain(cristais.get(owner))}**`
                    )
            ]
        });
    }
};
