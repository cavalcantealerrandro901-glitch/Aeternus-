const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

/** 5 colunas × 4 linhas = 20 casas */
const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;

const games = new Map();

function mult(opened, bombs) {
    if (opened <= 0) return 1;
    // sobe conforme abre casas seguras
    return Number((1 + opened * (0.28 + bombs * 0.035)).toFixed(2));
}

function potential(game) {
    return Math.floor(game.amount * mult(game.opened.size, game.bombCount));
}

function panelEmbed(game, extra) {
    const m = mult(game.opened.size, game.bombCount);
    const pot = potential(game);
    const safeLeft = TOTAL - game.bombCount - game.opened.size;

    let status = '🟢 Em jogo';
    if (game.dead) status = '💥 Explodiu';
    if (game.cashed) status = '💰 Sacado';

    const lines = [
        `**MINES PANEL** · ${status}`,
        '',
        `💠 Aposta **${fmt(game.amount)}**`,
        `💣 Minas **${game.bombCount}** · 💎 Abertas **${game.opened.size}** · Restantes seguras **${Math.max(0, safeLeft)}**`,
        `📈 Multiplicador **×${m}**`,
        game.opened.size > 0 && !game.dead && !game.cashed
            ? `💵 Se sacar agora: 💠 **${fmt(pot)}**`
            : '_Abra casas ou use **Aleatório**._',
        extra ? `\n${extra}` : ''
    ];

    return new EmbedBuilder()
        .setColor(game.dead ? C.lose : game.cashed ? C.win : C.info)
        .setTitle('💎  Mines 5×4')
        .setDescription(lines.filter(Boolean).join('\n'))
        .setFooter({ text: betFooter() })
        .setTimestamp();
}

/**
 * Tabuleiro: no fim do jogo mostra números nas casas (1–20)
 * Durante o jogo: · / 💎 / 💣
 */
function boardRows(game, { reveal = false } = {}) {
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const num = i + 1;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);
            const ended = game.dead || game.cashed;

            let label = '·';
            let style = ButtonStyle.Secondary;

            if (ended || reveal) {
                // tabuleiro final com números
                if (bomb) {
                    label = `💣${num}`;
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = `💎${num}`;
                    style = ButtonStyle.Success;
                } else {
                    label = String(num);
                    style = ButtonStyle.Secondary;
                }
            } else if (opened) {
                label = '💎';
                style = ButtonStyle.Success;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`minas:cell:${game.id}:${i}`)
                    .setLabel(label.slice(0, 80))
                    .setStyle(style)
                    .setDisabled(ended || opened)
            );
        }
        rows.push(row);
    }
    return rows;
}

function actionRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potential(game);
    const m = mult(game.opened.size, game.bombCount);

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:random:${game.id}`)
            .setLabel('Aleatório')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId(`minas:refresh:${game.id}`)
            .setLabel('Atualizar')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false)
    );
}

function cashRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potential(game);
    const m = mult(game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:cash:${game.id}`)
            .setLabel(
                canCash
                    ? `Sacar 💠 ${fmt(pot)} (×${m})`.slice(0, 80)
                    : 'Sacar'
            )
            .setEmoji('💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canCash)
    );
}

function fullComponents(game, reveal = false) {
    return [...boardRows(game, { reveal }), actionRow(game), cashRow(game)];
}

function makeGame(userId, amount, bombCount) {
    const id = `${userId}_${Date.now()}`;
    const bombs = new Set();
    const maxBombs = Math.min(bombCount, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));
    const g = {
        id,
        userId,
        amount,
        bombCount: maxBombs,
        bombs,
        opened: new Set(),
        dead: false,
        cashed: false,
        messageId: null,
        channelId: null
    };
    games.set(id, g);
    return g;
}

function openCell(game, idx) {
    if (game.dead || game.cashed || game.opened.has(idx)) return { ok: false };
    if (game.bombs.has(idx)) {
        game.dead = true;
        return { ok: true, bomb: true };
    }
    game.opened.add(idx);
    // vitória automática se abriu todas as seguras
    if (game.opened.size >= TOTAL - game.bombCount) {
        game.cashed = true;
        const win = potential(game);
        cristais.add(game.userId, win);
        return { ok: true, bomb: false, autoWin: true, win };
    }
    return { ok: true, bomb: false };
}

function pickRandomSafe(game) {
    const pool = [];
    for (let i = 0; i < TOTAL; i++) {
        if (!game.opened.has(i) && !game.bombs.has(i)) pool.push(i);
    }
    // se só restam bombas, qualquer não aberta
    if (!pool.length) {
        for (let i = 0; i < TOTAL; i++) if (!game.opened.has(i)) pool.push(i);
    }
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 5×4',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok)
            return message.reply(`❌ ${bet.error}\nUso: \`O.mines <valor|all|half> [minas 1-10]\``);

        const bombCount = Math.min(10, Math.max(1, parseInt(args[1], 10) || 4));

        cristais.remove(message.author.id, bet.amount);
        const game = makeGame(message.author.id, bet.amount, bombCount);

        const msg = await message.reply({
            embeds: [panelEmbed(game)],
            components: fullComponents(game)
        });

        game.messageId = msg.id;
        game.channelId = msg.channel.id;
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const game = games.get(parts[2]);

        if (!game) {
            return interaction.reply({
                content: '⏱️ Jogo expirado. Use o comando novamente.',
                ephemeral: true
            });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é o seu Mines.', ephemeral: true });
        }

        // ── Atualizar (reenvia o estado atual — útil se deu erro de internet)
        if (action === 'refresh') {
            const reveal = game.dead || game.cashed;
            return interaction.update({
                embeds: [
                    panelEmbed(
                        game,
                        reveal ? null : '_Painel atualizado._'
                    )
                ],
                components: fullComponents(game, reveal)
            });
        }

        // ── Aleatório
        if (action === 'random') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Jogo já encerrado.', ephemeral: true });
            }
            const idx = pickRandomSafe(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa disponível.', ephemeral: true });
            }
            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update({
                    embeds: [panelEmbed(game, `Casa **#${idx + 1}** era mina.`)],
                    components: fullComponents(game, true)
                });
            }
            if (res.autoWin) {
                return interaction.update({
                    embeds: [
                        panelEmbed(
                            game,
                            `Todas as casas seguras! +💠 **${fmt(res.win)}**`
                        )
                    ],
                    components: fullComponents(game, true)
                });
            }
            return interaction.update({
                embeds: [panelEmbed(game, `Aleatório abriu a casa **#${idx + 1}**.`)],
                components: fullComponents(game)
            });
        }

        // ── Sacar
        if (action === 'cash') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            }
            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    ephemeral: true
                });
            }
            game.cashed = true;
            const win = potential(game);
            cristais.add(game.userId, win);
            return interaction.update({
                embeds: [
                    panelEmbed(
                        game,
                        `Você sacou 💠 **${fmt(win)}** · Saldo: 💠 **${fmt(cristais.get(game.userId))}**`
                    )
                ],
                components: fullComponents(game, true)
            });
        }

        // ── Célula
        if (action === 'cell') {
            if (game.dead || game.cashed) {
                return interaction.deferUpdate().catch(() => {});
            }
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', ephemeral: true });
            }
            if (game.opened.has(idx)) {
                return interaction.deferUpdate().catch(() => {});
            }

            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update({
                    embeds: [panelEmbed(game, `Casa **#${idx + 1}** era mina.`)],
                    components: fullComponents(game, true)
                });
            }
            if (res.autoWin) {
                return interaction.update({
                    embeds: [
                        panelEmbed(
                            game,
                            `Campo limpo! +💠 **${fmt(res.win)}**`
                        )
                    ],
                    components: fullComponents(game, true)
                });
            }
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
