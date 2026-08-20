const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/** PREVISÃO — maior/menor em cadeia; multiplicador sobe; saque quando quiser */
module.exports = {
    name: 'previsao',
    aliases: ['forecast', 'maior'],
    description: 'Preveja se o próximo número sobe ou desce e saque a tempo',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id));
        if (!stake) return message.reply('Uso: `O.previsao <valor>`');

        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        let current = 10 + Math.floor(Math.random() * 80);
        let mult = 1;
        let streak = 0;

        const row = () =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`prev_up_${message.id}`)
                    .setLabel('📈 Maior')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`prev_down_${message.id}`)
                    .setLabel('📉 Menor')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`prev_cash_${message.id}`)
                    .setLabel(`💰 Sacar ×${mult.toFixed(2)}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(streak === 0)
            );

        const embed = () =>
            new EmbedBuilder()
                .setColor(0x06b6d4)
                .setTitle('📡 PREVISÃO')
                .setDescription(
                    `Número atual: **${current}**\n` +
                        `Sequência: **${streak}** · Multiplicador: **×${mult.toFixed(2)}**\n` +
                        `Valor agora: ${flocos.formatPlain(Math.floor(stake * mult))}\n` +
                        `O próximo será **maior** ou **menor**? (empate = perde)`
                );

        const sent = await message.reply({ embeds: [embed()], components: [row()] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('prev_cash_')) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💰 Previsão encerrada')
                            .setDescription(
                                `×${mult.toFixed(2)} · ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: []
                });
                collector.stop('cash');
                return;
            }

            const next = 1 + Math.floor(Math.random() * 99);
            const wantUp = i.customId.includes('_up_');
            const ok = wantUp ? next > current : next < current;

            if (!ok) {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('📉 Previsão falhou')
                            .setDescription(
                                `Era **${current}** → **${next}**\nVocê marcou ${wantUp ? 'maior' : 'menor'}.\nPerdeu ${flocos.format(stake)}.`
                            )
                    ],
                    components: []
                });
                collector.stop('fail');
                return;
            }

            current = next;
            streak += 1;
            mult = Math.round((1 + streak * 0.45) * 100) / 100;

            await i.update({ embeds: [embed()], components: [row()] });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'fail'].includes(reason)) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Sessão expirada')
                            .setDescription('Não sacou a tempo.')
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
