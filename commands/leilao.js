const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/** LEILÃO — lance secreto vs bot; quem chegar mais perto do valor oculto (sem passar) leva o pote */
module.exports = {
    name: 'leilao',
    aliases: ['auction', 'lance'],
    description: 'Leilão cego contra o bot pelo pote de flocos',
    async execute(message, args) {
        const entry = flocos.parseBet(args[0], flocos.get(message.author.id)) || 200;
        const check = flocos.canBet(message.author.id, entry);
        if (!check.ok) return message.reply(check.error);

        // entrada vai pro pote; bot também "entra"
        flocos.add(message.author.id, -entry);
        const pot = entry * 2;
        const secret = 30 + Math.floor(Math.random() * 70); // 30-99 valor alvo

        const embed = new EmbedBuilder()
            .setColor(0xeab308)
            .setTitle('🏛️ LEILÃO CEGO')
            .setDescription(
                `Pote: ${flocos.format(pot)}\n` +
                    `O item secreto vale entre **30 e 99**.\n` +
                    `Escolha um lance. **Quem chegar mais perto sem ultrapassar** leva o pote.\n` +
                    `Empate no limite: divide.`
            );

        const row = new ActionRowBuilder().addComponents(
            [40, 55, 70, 85].map((v) =>
                new ButtonBuilder()
                    .setCustomId(`lei_${message.id}_${v}`)
                    .setLabel(`${v}`)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        const sent = await message.reply({ embeds: [embed], components: [row] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id,
            max: 1
        });

        collector.on('collect', async (i) => {
            const playerBid = parseInt(i.customId.split('_').pop(), 10);
            // bot bid: random near secret with noise
            let botBid = secret + Math.floor(Math.random() * 21) - 10;
            botBid = Math.max(30, Math.min(99, botBid));
            // choices snap bot to similar grid sometimes
            if (Math.random() < 0.4) botBid = [40, 55, 70, 85][Math.floor(Math.random() * 4)];

            const valid = (b) => (b <= secret ? secret - b : Infinity);
            const pScore = valid(playerBid);
            const bScore = valid(botBid);

            let text;
            let color = 0x38bdf8;
            if (pScore === Infinity && bScore === Infinity) {
                // ambos passaram — ninguém leva, taxa queimada metade volta?
                flocos.add(message.author.id, Math.floor(entry / 2));
                text = `Valor real: **${secret}**\nSeu lance **${playerBid}** e bot **${botBid}** passaram.\nMetade da entrada devolvida.`;
                color = 0x64748b;
            } else if (pScore < bScore) {
                flocos.add(message.author.id, pot);
                text = `Valor real: **${secret}**\nVocê **${playerBid}** vs bot **${botBid}**\nLevou o pote ${flocos.format(pot)}!`;
                color = 0x22c55e;
            } else if (bScore < pScore) {
                text = `Valor real: **${secret}**\nVocê **${playerBid}** vs bot **${botBid}**\nO bot venceu. Perdeu a entrada.`;
                color = 0xef4444;
            } else {
                const half = Math.floor(pot / 2);
                flocos.add(message.author.id, half);
                text = `Valor real: **${secret}**\nEmpate técnico (${playerBid} vs ${botBid}).\nMetade do pote: ${flocos.format(half)}`;
                color = 0xf59e0b;
            }

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(color)
                        .setTitle('🏛️ Resultado do leilão')
                        .setDescription(`${text}\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`)
                ],
                components: []
            });
        });

        collector.on('end', async (c) => {
            if (c.size > 0) return;
            flocos.add(message.author.id, entry);
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('🏛️ Sem lances')
                            .setDescription('Entrada devolvida.')
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
