const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

/** 5 colunas × 4 linhas (Discord max 5 rows = 4 grade + 1 controle) */
const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS; // 20
const MAX_BOMBS = 18;
const HOUSE = 0.97; // margem da casa no multi

const games = new Map();

/** Multiplicador realista estilo mines: produto das probabilidades */
function multAt(opened, bombs) {
    if (opened <= 0) return 1;
    let m = 1;
    for (let i = 0; i < opened; i++) {
        const safeLeft = TOTAL - bombs - i;
        const tilesLeft = TOTAL - i;
        if (safeLeft <= 0 || tilesLeft <= 0) break;
        m *= tilesLeft / safeLeft;
    }
    return Number(Math.max(1, m * HOUSE).toFixed(2));
}

function potentialAt(amount, opened, bombs) {
    if (!amount) return 0;
    return Math.floor(amount * multAt(opened, bombs));
}

function panelEmbed(game, extra) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const freeLeft = Math.max(0, safeTotal - opened);
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const curPay = potentialAt(game.amount, opened, bombs);
    const nextPay = potentialAt(game.amount, opened + 1, bombs);

    let status = '🟢 Em jogo';
    let color = 0x38bdf8;
    let phrase = '_Escolha uma casa com cuidado. Cada gema aumenta o risco e o prêmio._';

    if (game.dead) {
        status = '💥 Explodiu';
        color = C.lose;
        phrase = '😢 **Mina encontrada.** A rodada acabou — tente de novo.';
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = C.win;
        phrase = game.fun
            ? '🏁 Campo de diversão finalizado.'
            : `🎉 **Saque confirmado!** +💠 **${fmt(game._lastWin || curPay)}**`;
    }

    const modeLine = game.fun
        ? '🎮 **Modo diversão** · sem aposta'
        : `💠 **Aposta** ${fmt(game.amount)}`;

    const multiBlock = game.fun
        ? null
        : [
              `📈 **Multiplicador atual** · ×**${curM}**${opened > 0 ? ` → 💠 **${fmt(curPay)}**` : ''}`,
              opened < safeTotal && !game.dead && !game.cashed
                  ? `⏭️ **Próximo multi** · ×**${nextM}** → 💠 **${fmt(nextPay)}** _(se abrir +1)_`
                  : null
          ]
              .filter(Boolean)
              .join('\n');

    const desc = [
        `**${status}**`,
        phrase,
        '',
        modeLine,
        `💎 **Abertas** ${opened}/${safeTotal}  ·  💣 **Minas** ${bombs}`,
        `🟩 **Livres** ${freeLeft}/${safeTotal}  ·  📦 **Casas** ${TOTAL}`,
        multiBlock,
        extra ? `\n${extra}` : null
    ]
        .filter((x) => x != null && x !== '')
        .join('\n');

    return new EmbedBuilder()
        .setColor(color)
        .setTitle('💎  Mines · 5×4')
        .setDescription(desc)
        .setFooter({
            text: game.fun
                ? 'O.mines <1-18> · diversão'
                : `Multi sobe a cada gema · ${betFooter()}`
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
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
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
            win = potentialAt(game.amount, game.opened.size, game.bombCount);
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

function endPayload(game, note) {
    return {
        embeds: [panelEmbed(game, note || null)],
        components: fullComponents(game, true)
    };
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 5×4 realista',

    async execute(message, args) {
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    '💎 **Mines 5×4**',
                    '🎮 `O.mines <1-18>` — diversão',
                    '💠 `O.mines <bombas> <valor|all|half>` — aposta',
                    'Multi sobe a cada gema segura (fórmula de probabilidade).'
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
                return interaction.update(endPayload(game, `Casa **#${idx + 1}** era mina.`));
            }
            if (res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game, `🎲 Abriu **#${idx + 1}**`)],
                components: fullComponents(game)
            });
        }

        if (action === 'cash') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            }
            if (game.fun) {
                game.cashed = true;
                return interaction.update(endPayload(game));
            }
            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    ephemeral: true
                });
            }
            game.cashed = true;
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            cristais.add(game.userId, win);
            return interaction.update(
                endPayload(game, `Saldo: 💠 **${fmt(cristais.get(game.userId))}**`)
            );
        }

        if (action === 'cell') {
            if (game.dead || game.cashed) return interaction.deferUpdate().catch(() => {});
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', ephemeral: true });
            }
            if (game.opened.has(idx)) return interaction.deferUpdate().catch(() => {});

            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update(endPayload(game, `Casa **#${idx + 1}** era mina.`));
            }
            if (res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
