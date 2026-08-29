const { EmbedBuilder } = require('discord.js');
const daily = require('../utils/daily');
const flocos = require('../utils/flocos');

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Coleta a recompensa diária',
    async execute(message) {
        const result = daily.claim(message.author.id, message.guild.id);
        if (!result.ok) return message.reply(`❄️ ${result.error}`);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('❄️ Daily coletado')
                    .setDescription(
                        [
                            `Você recebeu **${flocos.format(result.amount)}**`,
                            `🔥 Sequência **${result.streak}** · multiplicador ×**${result.multiplier.toFixed(2)}**`,
                            `💼 Saldo: ${flocos.format(result.balance)}`
                        ].join('\n')
                    )
                    .setFooter({ text: 'Também disponível no painel web · Daily' })
            ]
        });
    }
};
