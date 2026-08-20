const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cara')
        .setDescription('Aposta cara ou coroa com ❄️ flocos')
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor (ex: 100, 1k, all)').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('lado')
                .setDescription('cara ou coroa')
                .setRequired(true)
                .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })
        ),
    async execute(interaction) {
        const amount = flocos.parseBet(
            interaction.options.getString('valor'),
            flocos.get(interaction.user.id)
        );
        const side = interaction.options.getString('lado');
        if (!amount) {
            return interaction.reply({ content: 'Valor inválido.', ephemeral: true });
        }
        const check = flocos.canBet(interaction.user.id, amount);
        if (!check.ok) return interaction.reply({ content: check.error, ephemeral: true });

        flocos.add(interaction.user.id, -amount);
        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === side;
        let payout = 0;
        if (win) {
            payout = amount * 2;
            flocos.add(interaction.user.id, payout);
        }

        const embed = new EmbedBuilder()
            .setColor(win ? 0x22c55e : 0xef4444)
            .setTitle(win ? '🎉 Você ganhou!' : '💨 Você perdeu')
            .setDescription(
                `Caiu **${result}** · você: **${side}**\n` +
                    (win ? `+${flocos.formatPlain(payout)}` : `-${flocos.formatPlain(amount)}`) +
                    `\nSaldo: ${flocos.formatPlain(flocos.get(interaction.user.id))}`
            );

        await interaction.reply({ embeds: [embed] });
    }
};
