const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/** LABIRINTO — grade 3x3 invisível; encontre a saída em N movimentos com dicas de calor */
module.exports = {
    name: 'labirinto',
    aliases: ['maze', 'saida'],
    description: 'Encontre a saída do labirinto às cegas com dicas de proximidade',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id)) || 120;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        // posições 0-8
        let pos = 4; // centro
        let exit = Math.floor(Math.random() * 9);
        while (exit === pos) exit = Math.floor(Math.random() * 9);

        let moves = 6;

        const heat = () => {
            const px = pos % 3;
            const py = Math.floor(pos / 3);
            const ex = exit % 3;
            const ey = Math.floor(exit / 3);
            const d = Math.abs(px - ex) + Math.abs(py - ey);
            if (d === 0) return '🏆';
            if (d === 1) return '🔥 Muito quente';
            if (d === 2) return '🟠 Quente';
            if (d === 3) return '🟡 Morno';
            return '🔵 Frio';
        };

        const grid = () => {
            let s = '';
            for (let i = 0; i < 9; i++) {
                if (i === pos) s += '🧑';
                else s += '⬛';
                if (i % 3 === 2) s += '\n';
            }
            return s;
        };

        const embed = () =>
            new EmbedBuilder()
                .setColor(0x14b8a6)
                .setTitle('🧭 LABIRINTO')
                .setDescription(
                    `${grid()}\n${heat()}\nMovimentos: **${moves}**\nAposta: ${flocos.format(stake)} → saída **3x**`
                );

        const controls = () =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lab_n_${message.id}`).setLabel('⬆️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_w_${message.id}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_e_${message.id}`).setLabel('➡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_s_${message.id}`).setLabel('⬇️').setStyle(ButtonStyle.Secondary)
            );

        const sent = await message.reply({ embeds: [embed()], components: [controls()] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 40000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            const dir = i.customId.split('_')[1];
            const x = pos % 3;
            const y = Math.floor(pos / 3);
            let nx = x;
            let ny = y;
            if (dir === 'n') ny -= 1;
            if (dir === 's') ny += 1;
            if (dir === 'w') nx -= 1;
            if (dir === 'e') nx += 1;

            if (nx < 0 || nx > 2 || ny < 0 || ny > 2) {
                await i.reply({ content: 'Parede! Tente outra direção.', ephemeral: true });
                return;
            }

            pos = ny * 3 + nx;
            moves -= 1;

            if (pos === exit) {
                const win = stake * 3;
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🧭 Saída encontrada!')
                            .setDescription(
                                `Você escapou com **${moves}** movimentos sobrando.\n${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: []
                });
                collector.stop('win');
                return;
            }

            if (moves <= 0) {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('🧭 Sem movimentos')
                            .setDescription(`A saída era a casa **#${exit + 1}**. Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: []
                });
                collector.stop('lose');
                return;
            }

            await i.update({ embeds: [embed()], components: [controls()] });
        });

        collector.on('end', async (_, reason) => {
            if (['win', 'lose'].includes(reason)) return;
            try {
                await sent.edit({ components: [] });
            } catch (_) {}
        });
    }
};
