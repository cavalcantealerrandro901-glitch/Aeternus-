const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 18;
const games = new Map();

function mult(opened, bombs) {
    if (opened <= 0) return 1;
    return Number((1 + opened * (0.28 + bombs * 0.035)).toFixed(2));
}

function potential(game) {
    if (game.fun || !game.amount) return 0;
    return Math.floor(game.amount * mult(game.opened.size, game.bombCount));
}

function panelEmbed(game, extra) {
    const m = mult(game.opened.size, game.bombCount);
    const pot = potential(game);
    const safeLeft = Math.max(0, TOTAL - game.bombCount - game.opened.size);

    let status = '🟢 Em jogo';
    let color = C.info;
    if (game.dead) {
        status = '💥 Explodiu';
        color = C.lose;
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = C.win;
    }

    const fields = [
        {
            name: '📊 Status',
            value: status,
            inline: true
        },
        {
            name: '💣 Minas',
            value: `**${game.bombCount}**`,
            inline: true
        },
        {
            name: '💎 Abertas',
            value: `**${game.opened.size}** / ${TOTAL - game.bombCount}`,
            inline: true
        }
    ];

    if (game.fun) {
        fields.push({
            name: '🎮 Modo',
            value: 'Diversão · sem aposta',
            inline: true
        });
        fields.push({
            name: '🟩 Seguras',
            value: `**${safeLeft}** restantes`,
            inline: true
        });
        fields.push({ name: '\u200b', value: '\u200b', inline: true });
    } else {
        fields.push({
            name: '💠 Aposta',
            value: `**${fmt(game.amount)}**`,
            inline: true
        });
        fields.push({
            name: '📈 Multi',
            value: `**×${m}**`,
            inline: true
        });
        fields.push({
            name: '💵 Saque',
            value:
                game.opened.size > 0 && !game.dead && !game.cashed
                    ? `**${fmt(pot)}**`
                    : '—',
            inline: true
        });
    }

    let desc = 'Toque nas casas · **Aleatório** abre uma segura · **Sacar** finaliza.';
    if (game.dead) {
        desc = '😢 **Que azar…** Você acertou uma mina.\nUse **Tentar novamente** abaixo.';
    } else if (game.cashed && !game.fun) {
        desc = `🎉 **Ótimo jogo!** Lucro garantido.\n💠 **${fmt(game._lastWin || pot)}** creditados.`;
    } else if (game.cashed && game.fun) {
        desc = '🏁 Partida de diversão encerrada.';
    }

    if (extra) desc += `\n\n${extra}`;

    return new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: 'Aeternus Mines', iconURL: null })
        .setTitle('💎  Mines · 5×4')
        .setDescription(desc)
        .addFields(fields)
        .setFooter({
            text: game.fun ? 'O.mines <1-18> · diversão' : betFooter()
        })
        .setTimestamp();
}

function boardRows(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    const rows = [];

    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const num = String(i + 1);
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);

            let label = '·';
            let style = ButtonStyle.Secondary;

            if (ended) {
                if (bomb) {
                    label = `💣${num}`;
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = `💎${num}`;
                    style = ButtonStyle.Success;
                } else {
                    label = num;
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

function controlRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potential(game);
    const canCash = game.opened.size > 0 && !ended;

    let cashLabel = game.fun ? 'Encerrar' : 'Sacar';
    if (canCash && !game.fun) cashLabel = `Sacar ${fmt(pot)}`;

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
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`minas:cash:${game.id}`)
            .setLabel(cashLabel.slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:again:${game.id}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

/** Máx. 5 rows: 4 grade + 1 controles (ou Tentar novamente no fim) */
function fullComponents(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    if (ended) return [...boardRows(game, true), againRow(game)];
    return [...boardRows(game, false), controlRow(game)];
}

function makeGame(userId, amount, bombCount, fun) {
    const id = `${userId}_${Date.now()}`;
    const bombs = new Set();
    const maxBombs = Math.min(Math.max(1, bombCount), MAX_BOMBS, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));
    const g = {
        id,
        userId,
        amount: fun ? 0 : amount,
        fun: !!fun,
        bombCount: maxBombs,
        bombs,
        opened: new Set(),
        dead: false,
        cashed: false,
        _lastWin: 0
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
    if (game.opened.size >= TOTAL - game.bombCount) {
        game.cashed = true;
        let win = 0;
        if (!game.fun && game.amount > 0) {
            win = potential(game);
            game._lastWin = win;
            cristais.add(game.userId, win);
        }
        return { ok: true, bomb: false, autoWin: true, win };
    }
    return { ok: true, bomb: false };
}

function pickRandom(game) {
    const safe = [];
    const any = [];
    for (let i = 0; i < TOTAL; i++) {
        if (game.opened.has(i)) continue;
        any.push(i);
        if (!game.bombs.has(i)) safe.push(i);
    }
    const pool = safe.length ? safe : any;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function endPayload(game, win, note) {
    const extra = note || null;
    // reforça mensagem emocional no description via panelEmbed status
    if (!game.fun && win && game._lastWin) {
        /* já setado */
    }
    return {
        embeds: [panelEmbed(game, extra)],
        components: fullComponents(game, true)
    };
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 5×4',

    async execute(message, args) {
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    '💎 **Mines 5×4**',
                    '🎮 `O.mines <1-18>` — diversão',
                    '💠 `O.mines <bombas> <valor|all|half>` — aposta'
                ].join('\n')
            );
        }

        if (args[1] == null || args[1] === '') {
            const game = makeGame(message.author.id, 0, bombsRaw, true);
            return message.reply({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }

        const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        cristais.remove(message.author.id, bet.amount);
        const game = makeGame(message.author.id, bet.amount, bombsRaw, false);

        await message.reply({
            embeds: [panelEmbed(game)],
            components: fullComponents(game)
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const game = games.get(parts[2]);

        if (!game) {
            return interaction.reply({
                content: '⏱️ Jogo expirado. Use o comando de novo.',
                ephemeral: true
            });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é o seu Mines.', ephemeral: true });
        }

        if (action === 'again') {
            if (game.fun) {
                const ng = makeGame(game.userId, 0, game.bombCount, true);
                return interaction.update({
                    embeds: [panelEmbed(ng)],
                    components: fullComponents(ng)
                });
            }
            const bet = resolveBet(String(game.amount), cristais.get(game.userId), { label: '💠' });
            if (!bet.ok) {
                return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            }
            cristais.remove(game.userId, bet.amount);
            games.delete(parts[2]);
            const ng = makeGame(game.userId, bet.amount, game.bombCount, false);
            return interaction.update({
                embeds: [panelEmbed(ng)],
                components: fullComponents(ng)
            });
        }

        if (action === 'refresh') {
            const ended = game.dead || game.cashed;
            return interaction.update({
                embeds: [panelEmbed(game, ended ? null : '_Painel atualizado._')],
                components: fullComponents(game, ended)
            });
        }

        if (action === 'random') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Jogo encerrado.', ephemeral: true });
            }
            const idx = pickRandom(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa disponível.', ephemeral: true });
            }
            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update(endPayload(game, false, `Casa **#${idx + 1}** era mina.`));
            }
            if (res.autoWin) {
                return interaction.update(endPayload(game, true));
            }
            return interaction.update({
                embeds: [panelEmbed(game, `🎲 Aleatório abriu **#${idx + 1}**`)],
                components: fullComponents(game)
            });
        }

        if (action === 'cash') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            }
            if (game.fun) {
                game.cashed = true;
                return interaction.update(endPayload(game, true));
            }
            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    ephemeral: true
                });
            }
            game.cashed = true;
            const win = potential(game);
            game._lastWin = win;
            cristais.add(game.userId, win);
            return interaction.update(endPayload(game, true, `Saldo: 💠 **${fmt(cristais.get(game.userId))}**`));
        }

        if (action === 'cell') {
            if (game.dead || game.cashed) return interaction.deferUpdate().catch(() => {});
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', ephemeral: true });
            }
            if (game.opened.has(idx)) return interaction.deferUpdate().catch(() => {});

            const res = openCell(game, idx);
            if (res.bomb) return interaction.update(endPayload(game, false, `Casa **#${idx + 1}** era mina.`));
            if (res.autoWin) return interaction.update(endPayload(game, true));
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
