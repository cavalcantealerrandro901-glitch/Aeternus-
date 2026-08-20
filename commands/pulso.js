const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/** PULSO — reação: um botão vira ⚡; clique em até 1,2s (3x) */
module.exports = {
    name: 'pulso',
    aliases: ['reacao', 'reflexo'],
    description: 'Jogo de reação: clique no pulso ⚡ no instante certo',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id)) || 100;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('⚡ PULSO')
            .setDescription(
                `Taxa: ${flocos.format(stake)}\n` +
                    `Em instantes **um** botão vira ⚡.\n` +
                    `Clique **somente nele** em até **1,2s**.\n` +
                    `Acerte = **3x**. Erre ou demore = perde a taxa.`
            );

        const idleRow = new ActionRowBuilder().addComponents(
            [0, 1, 2].map((i) =>
                new ButtonBuilder()
                    .setCustomId(`pulso_idle_${message.id}_${i}`)
                    .setLabel('●')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            )
        );

        const sent = await message.reply({ embeds: [embed], components: [idleRow] });
        await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 2500)));

        const correct = Math.floor(Math.random() * 3);
        const active = new ActionRowBuilder().addComponents(
            [0, 1, 2].map((i) =>
                new ButtonBuilder()
                    .setCustomId(`pulso_go_${message.id}_${i}`)
                    .setLabel(i === correct ? '⚡' : '●')
                    .setStyle(i === correct ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
        );

        try {
            await sent.edit({
                embeds: [
                    EmbedBuilder.from(embed).setDescription(
                        `⚡ **AGORA!** Clique no botão com o raio!\nTaxa: ${flocos.format(stake)}`
                    )
                ],
                components: [active]
            });
        } catch {
            flocos.add(message.author.id, stake);
            return;
        }

        const started = Date.now();
        let done = false;

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 1200,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (done) return;
            done = true;
            const pick = parseInt(i.customId.split('_').pop(), 10);
            const ms = Date.now() - started;
            const ok = pick === correct;

            if (ok) {
                const win = stake * 3;
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('⚡ Reflexo perfeito')
                            .setDescription(
                                `Tempo: **${ms}ms**\nGanhou ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: []
                });
            } else {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('💨 Errou o pulso')
                            .setDescription(
                                `Certo: **#${correct + 1}** · seu: **#${pick + 1}** (${ms}ms)\nPerdeu ${flocos.format(stake)}`
                            )
                    ],
                    components: []
                });
            }
            collector.stop('done');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'done' || done) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Lento demais')
                            .setDescription(`O pulso passou. Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
