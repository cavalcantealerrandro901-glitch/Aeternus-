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
    name: 'pulso',
    aliases: ['reacao', 'reflexo'],
    description: 'Reação com ❄️ flocos — clique no ⚡ a tempo',
    async execute(message, args) {
        const stakeRaw = args[0] || '100';
        const stake = flocos.parseBet(stakeRaw, flocos.get(message.author.id)) || 100;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);
        const againArgs = [String(stakeRaw)];

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('⚡ PULSO')
            .setDescription(
                `Taxa: ${flocos.format(stake)}\nAguarde… um botão vira ⚡. Clique em **1,2s** → **3x**.`
            );

        const idleRow = new ActionRowBuilder().addComponents(
            [0, 1, 2].map((i) =>
                new ButtonBuilder()
                    .setCustomId(`pulso_idle_${message.author.id}_${i}`)
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
                    .setCustomId(`pulso_go_${message.author.id}_${i}`)
                    .setLabel(i === correct ? '⚡' : '●')
                    .setStyle(i === correct ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
        );

        try {
            await sent.edit({
                embeds: [EmbedBuilder.from(embed).setDescription(`⚡ **AGORA!** Taxa: ${flocos.format(stake)}`)],
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
            filter: (i) => i.user.id === message.author.id && i.customId.includes('pulso_go_')
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
                xp.add(message.author.id, 12);
                cristais.add(message.author.id, 2);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('⚡ Reflexo perfeito')
                            .setDescription(
                                `**${ms}ms** · ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: [againRow('pulso', message.author.id, againArgs)]
                });
            } else {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('💨 Errou o pulso')
                            .setDescription(`Perdeu ${flocos.format(stake)}.\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`)
                    ],
                    components: [againRow('pulso', message.author.id, againArgs)]
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
                            .setTitle('⏰ Lento')
                            .setDescription(`Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: [againRow('pulso', message.author.id, againArgs)]
                });
            } catch (_) {}
        });
    }
};
