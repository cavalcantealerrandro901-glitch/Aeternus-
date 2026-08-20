const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'jogos',
    aliases: ['games', 'minigames'],
    description: 'Lista os jogos exclusivos do Aeternus',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('❄️ Jogos exclusivos — Aeternus')
            .setDescription('Moeda: **❄️ flocos** · Prefixo padrão: `O.`')
            .addFields(
                {
                    name: '⚡ O.pulso [valor]',
                    value: 'Reação: clique no ⚡ no instante certo (**3x**).'
                },
                {
                    name: '💣 O.minas [valor]',
                    value: 'Campo minado 1 linha — abra diamantes e **saque** antes da bomba.'
                },
                {
                    name: '🔮 O.eco [valor]',
                    value: 'Memorize a sequência de cores e repita (**2,5x**).'
                },
                {
                    name: '🏛️ O.leilao [valor]',
                    value: 'Leilão cego contra o bot — chegue perto do valor sem ultrapassar.'
                },
                {
                    name: '📡 O.previsao [valor]',
                    value: 'Maior/menor em cadeia com multiplicador e saque livre.'
                },
                {
                    name: '🧭 O.labirinto [valor]',
                    value: 'Grade 3×3 às cegas — siga o calor até a saída (**3x**).'
                },
                {
                    name: '🔗 O.sincronia [valor]',
                    value: 'Descubra a regra secreta entre dois números (**2,5x**).'
                },
                {
                    name: 'Outros',
                    value: '`O.cara` · `O.dado` · `O.roleta` · `O.quiz` · `O.conta` · `O.enigma` · `O.bal`'
                }
            )
            .setFooter({ text: 'Valores: 100, 1k, half, all' });

        await message.reply({ embeds: [embed] });
    }
};
