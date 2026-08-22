const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'leilao',
    aliases: ['auction', 'lance'],
    description: 'Leilão cego com 💠 cristais',
    async execute(message, args) {
        const stakeRaw = args[0] || '200';
        const entry = cristais.parseBet(stakeRaw, cristais.get(message.author.id)) || 200;
        const check = cristais.canBet(message.author.id, entry);
        if (!check.ok) return message.reply(check.error);

        cristais.add(message.author.id, -entry);
        const pot = entry * 2;
        const secret = 30 + Math.floor(Math.random() * 70);
        const againArgs = [String(stakeRaw)];

        const row = new ActionRowBuilder().addComponents(
            [40, 55, 70, 85].map((v) =>
                new ButtonBuilder()
                    .setCustomId(`lei_${message.author.id}_${v}`)
                    .setLabel(String(v))
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const sent = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xeab308)
                    .setTitle('🏛️ LEILÃO CEGO')
                    .setDescription(
                        `Pote: ${cristais.format(pot)}\nValor secreto **30–99**. Chegue perto **sem passar**.`
                    )
            ],
            components: [row]
        });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith('lei_'),
            max: 1
        });

        collector.on('collect', async (i) => {
            const playerBid = parseInt(i.customId.split('_').pop(), 10);
            let botBid = secret + Math.floor(Math.random() * 21) - 10;
            botBid = Math.max(30, Math.min(99, botBid));
            if (Math.random() < 0.4) botBid = [40, 55, 70, 85][Math.floor(Math.random() * 4)];

            const score = (b) => (b <= secret ? secret - b : Infinity);
            const pScore = score(playerBid);
            const bScore = score(botBid);

            let text;
            let color = 0x38bdf8;
            if (pScore === Infinity && bScore === Infinity) {
                cristais.add(message.author.id, Math.floor(entry / 2));
                text = `Real **${secret}**. Ambos passaram. Metade devolvida.`;
                color = 0x64748b;
            } else if (pScore < bScore) {
                cristais.add(message.author.id, pot);
                text = `Real **${secret}**. Você **${playerBid}** vs bot **${botBid}**. Pote ${cristais.format(pot)}!`;
                color = 0x22c55e;
            } else if (bScore < pScore) {
                text = `Real **${secret}**. Bot **${botBid}** venceu. Perdeu ${cristais.format(entry)}.`;
                color = 0xef4444;
            } else {
                const half = Math.floor(pot / 2);
                cristais.add(message.author.id, half);
                text = `Empate. Metade: ${cristais.format(half)}`;
                color = 0xf59e0b;
            }

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(color)
                        .setTitle('🏛️ Resultado')
                        .setDescription(`${text}\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`)
                ],
                components: [againRow('leilao', message.author.id, againArgs)]
            });
        });

        collector.on('end', async (c) => {
            if (c.size > 0) return;
            cristais.add(message.author.id, entry);
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('🏛️ Sem lances')
                            .setDescription('Entrada devolvida em 💠 cristais.')
                    ],
                    components: [againRow('leilao', message.author.id, againArgs)]
                });
            } catch (_) {}
        });
    }
};
