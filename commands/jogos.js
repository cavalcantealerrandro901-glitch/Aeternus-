const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'jogos',
    aliases: ['games', 'minigames'],
    description: 'Lista os jogos do Aeternus',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('🎮 Jogos — Aeternus')
            .setDescription(
                '**💠 Cristais** → apostas\n**❄️ Flocos** → raciocínio / recompensas\nPrefixo: `O.`'
            )
            .addFields(
                {
                    name: '💠 Apostas (cristais)',
                    value:
                        '`O.cara` · `O.dado` · `O.roleta` · `O.minas` · `O.pulso` · `O.previsao` · `O.leilao` · `O.eco` · `O.labirinto` · `O.sincronia`'
                },
                {
                    name: '❄️ Raciocínio (flocos)',
                    value: '`O.quiz` · `O.conta` · `O.enigma`'
                },
                {
                    name: '💰 Saldo',
                    value: '`O.saldo` · `O.atm` · `O.bal`'
                }
            )
            .setFooter({ text: 'Valores: 100, 1k, half, all' });

        await message.reply({ embeds: [embed] });
    }
};
