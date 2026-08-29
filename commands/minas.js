const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const SIZE = 5;
const games = new Map();

function mult(opened, bombs) {
    if (opened <= 0) return 1;
    return Number((1 + opened * (0.35 + bombs * 0.04)).toFixed(2));
}

function buttons(game, reveal = false) {
    const rows = [];
    for (let y = 0; y < SIZE; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < SIZE; x++) {
            const i = y * SIZE + x;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);
            let label = '·';
            let style = ButtonStyle.Secondary;
            if (reveal && bomb) {
                label = '💣';
                style = ButtonStyle.Danger;
            } else if (opened) {
                label = '💎';
                style = ButtonStyle.Success;
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`minas:cell:${game.id}:${i}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(opened || game.dead || game.cashed)
            );
        }
        rows.push(row);
    }
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`minas:cash:${game.id}`)
                .setLabel(`Retirar ×${mult(game.opened.size, game.bombCount)}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!game.opened.size || game.dead || game.cashed),
            new ButtonBuilder()
                .setCustomId(`minas:again:${game.id}`)
                .setLabel('Novamente')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!(game.dead || game.cashed))
        )
    );
    return rows;
}

function boardEmbed(game, title, color) {
    const m = mult(game.opened.size, game.bombCount);
    const potential = Math.floor(game.amount * m);
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
            [
                `Aposta 💠 **${fmt(game.amount)}** · Bombas **${game.bombCount}**`,
                `Casas abertas **${game.opened.size}** · Multiplicador **×${m}**`,
                game.opened.size ? `Retirada agora: 💠 **${fmt(potential)}**` : '_Abra diamantes e retire quando quiser._'
            ].join('\n')
        )
        .setFooter({ text: betFooter() })
        .setTimestamp();
}

function makeGame(userId, amount, bombCount) {
    const id = `${userId}_${Date.now()}`;
    const bombs = new Set();
    while (bombs.size < bombCount) bombs.add(Math.floor(Math.random() * SIZE * SIZE));
    const g = { id, userId, amount, bombCount, bombs, opened: new Set(), dead: false, cashed: false };
    games.set(id, g);
    return g;
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine'],
    description: 'Campo minado 5×5',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok)
            return message.reply(`❌ ${bet.error}\nUso: \`O.minas <valor|all|half> [bombas]\``);
        const bombCount = Math.min(12, Math.max(3, parseInt(args[1], 10) || 5));

        cristais.remove(message.author.id, bet.amount);
        const game = makeGame(message.author.id, bet.amount, bombCount);
        await message.reply({
            embeds: [boardEmbed(game, '💎  Minas 5×5', C.info)],
            components: buttons(game)
        });
    },
    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const game = games.get(parts[2]);
        if (!game) return interaction.reply({ content: 'Jogo expirado.', ephemeral: true });
        if (interaction.user.id !== game.userId)
            return interaction.reply({ content: 'Não é seu jogo.', ephemeral: true });

        if (action === 'again') {
            const bet = resolveBet(String(game.amount), cristais.get(game.userId), { label: '💠' });
            if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            cristais.remove(game.userId, bet.amount);
            const ng = makeGame(game.userId, bet.amount, game.bombCount);
            games.delete(parts[2]);
            return interaction.update({
                embeds: [boardEmbed(ng, '💎  Minas 5×5 · Nova rodada', C.info)],
                components: buttons(ng)
            });
        }
        if (action === 'cash') {
            if (!game.opened.size || game.dead || game.cashed)
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            game.cashed = true;
            const m = mult(game.opened.size, game.bombCount);
            const win = Math.floor(game.amount * m);
            cristais.add(game.userId, win);
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(C.win)
                        .setTitle('💰  Retirou com sucesso')
                        .setDescription(
                            `×**${m}** → 💠 **${fmt(win)}**\nSaldo: 💠 **${fmt(cristais.get(game.userId))}**`
                        )
                        .setFooter({ text: betFooter() })
                ],
                components: buttons(game, true)
            });
        }
        if (action === 'cell') {
            if (game.dead || game.cashed) return interaction.deferUpdate();
            const idx = parseInt(parts[3], 10);
            if (game.opened.has(idx)) return interaction.deferUpdate();
            if (game.bombs.has(idx)) {
                game.dead = true;
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(C.lose)
                            .setTitle('💥  Explodiu')
                            .setDescription(
                                `Perdeu 💠 **${fmt(game.amount)}**\nSaldo: 💠 **${fmt(cristais.get(game.userId))}**`
                            )
                            .setFooter({ text: betFooter() })
                    ],
                    components: buttons(game, true)
                });
            }
            game.opened.add(idx);
            return interaction.update({
                embeds: [boardEmbed(game, '💎  Minas 5×5', C.info)],
                components: buttons(game)
            });
        }
    }
};
