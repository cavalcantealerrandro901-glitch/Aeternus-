const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'labirinto',
    aliases: ['maze', 'saida'],
    description: 'Labirinto 3×3 com ❄️ flocos',
    async execute(message, args) {
        const stakeRaw = args[0] || '120';
        const stake = flocos.parseBet(stakeRaw, flocos.get(message.author.id)) || 120;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);
        const againArgs = [String(stakeRaw)];

        let pos = 4;
        let exit = Math.floor(Math.random() * 9);
        while (exit === pos) exit = Math.floor(Math.random() * 9);
        let moves = 6;

        const heat = () => {
            const d =
                Math.abs((pos % 3) - (exit % 3)) + Math.abs(Math.floor(pos / 3) - Math.floor(exit / 3));
            if (d <= 1) return '🔥 Muito quente';
            if (d === 2) return '🟠 Quente';
            if (d === 3) return '🟡 Morno';
            return '🔵 Frio';
        };

        const grid = () => {
            let s = '';
            for (let i = 0; i < 9; i++) {
                s += i === pos ? '🧑' : '⬛';
                if (i % 3 === 2) s += '\n';
            }
            return s;
        };

        const embed = () =>
            new EmbedBuilder()
                .setColor(0x14b8a6)
                .setTitle('🧭 LABIRINTO')
                .setDescription(
                    `${grid()}\n${heat()}\nMovimentos: **${moves}**\n${flocos.format(stake)} → saída **3x**`
                );

        const controls = () =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lab_n_${message.author.id}`).setLabel('⬆️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_w_${message.author.id}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_e_${message.author.id}`).setLabel('➡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`lab_s_${message.author.id}`).setLabel('⬇️').setStyle(ButtonStyle.Secondary)
            );

        const sent = await message.reply({ embeds: [embed()], components: [controls()] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 40000,
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith('lab_')
        });

        collector.on('collect', async (i) => {
            const dir = i.customId.split('_')[1];
            let x = pos % 3;
            let y = Math.floor(pos / 3);
            if (dir === 'n') y -= 1;
            if (dir === 's') y += 1;
            if (dir === 'w') x -= 1;
            if (dir === 'e') x += 1;
            if (x < 0 || x > 2 || y < 0 || y > 2) {
                await i.reply({ content: 'Parede!', ephemeral: true });
                return;
            }
            pos = y * 3 + x;
            moves -= 1;

            if (pos === exit) {
                const win = stake * 3;
                flocos.add(message.author.id, win);
                xp.add(message.author.id, 15);
                cristais.add(message.author.id, 2);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🧭 Saída!')
                            .setDescription(
                                `${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: [againRow('labirinto', message.author.id, againArgs)]
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
                            .setDescription(`Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: [againRow('labirinto', message.author.id, againArgs)]
                });
                collector.stop('lose');
                return;
            }

            await i.update({ embeds: [embed()], components: [controls()] });
        });

        collector.on('end', async (_, reason) => {
            if (['win', 'lose'].includes(reason)) return;
            try {
                await sent.edit({ components: [againRow('labirinto', message.author.id, againArgs)] });
            } catch (_) {}
        });
    }
};
