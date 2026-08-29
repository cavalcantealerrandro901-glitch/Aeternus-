const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** sessões ativas por userId */
const sessions = new Map();

function freshDeck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function draw(deck) {
    if (!deck.length) deck.push(...freshDeck());
    return deck.pop();
}

function cardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank, 10);
}

/** Total realista com Ás flexível */
function handTotal(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        total += cardValue(c.rank);
        if (c.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

function isSoft(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        total += cardValue(c.rank);
        if (c.rank === 'A') aces++;
    }
    // soft = ainda conta pelo menos um Ás como 11
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return aces > 0 && total <= 21;
}

function isBlackjack(cards) {
    return cards.length === 2 && handTotal(cards) === 21;
}

function showCard(c) {
    const red = c.suit === '♥' || c.suit === '♦';
    return `${c.rank}${c.suit}`;
}

function showHand(cards, { hideHole = false } = {}) {
    if (!cards.length) return '—';
    if (hideHole && cards.length >= 2) {
        return `${showCard(cards[0])}  ·  🂠`;
    }
    return cards.map(showCard).join('  ·  ');
}

function handLabel(cards, hideHole = false) {
    if (hideHole) {
        const up = cardValue(cards[0].rank) === 11 ? 11 : cardValue(cards[0].rank);
        return `${showHand(cards, { hideHole: true })}   (**?** · visível ${up})`;
    }
    const t = handTotal(cards);
    const soft = isSoft(cards) ? ' soft' : '';
    const bj = isBlackjack(cards) ? ' · BJ' : '';
    return `${showHand(cards)}   (**${t}**${soft}${bj})`;
}

function mood(result) {
    if (result === 'bj') return '🌟 **BLACKJACK NATURAL!** As cartas perfeitas.';
    if (result === 'win') return '🎉 **Vitória!** Você leu a mesa melhor que a casa.';
    if (result === 'push') return '🤝 **Empate (push).** Aposta devolvida.';
    if (result === 'bust') return '💥 **Estourou.** Passou de 21… a casa leva.';
    return '😢 **Derrota.** O dealer fechou a mão. Tente outra vez.';
}

function tableEmbed(session, {
    phase = 'play',
    result = null,
    payout = 0,
    note = null
} = {}) {
    const hide = phase === 'play';
    const color =
        result === 'bj' || result === 'win'
            ? C.win
            : result === 'push'
              ? C.draw
              : result === 'lose' || result === 'bust'
                ? C.lose
                : 0x1a1a2e;

    const lines = [
        '```',
        '   ╔══════════════════════════════╗',
        '   ║     AETERNUS  ·  BLACKJACK   ║',
        '   ╚══════════════════════════════╝',
        '```',
        `💠 Aposta **${fmt(session.amount)}**${session.doubled ? ' · *doubled*' : ''}`,
        '',
        `🏠 **Dealer**`,
        `> ${handLabel(session.dealer, hide)}`,
        '',
        `👤 **Você**`,
        `> ${handLabel(session.player, false)}`
    ];

    if (result) {
        lines.push('', mood(result));
        if (payout > 0) lines.push(`✨ +💠 **${fmt(payout)}**`);
        if (result === 'lose' || result === 'bust')
            lines.push(`💫 −💠 **${fmt(session.amount)}**`);
        if (result === 'push') lines.push('Aposta devolvida na íntegra.');
        lines.push(`💼 Saldo: 💠 **${fmt(cristais.get(session.userId))}**`);
    } else {
        lines.push('', '_Carta · Parar · Dobrar (1ª decisão)_');
    }

    if (note) lines.push('', note);

    return new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: 'Aeternus Casino · Mesa 21',
            iconURL: null
        })
        .setTitle(result ? resultTitle(result) : '🃏  Blackjack')
        .setDescription(lines.join('\n'))
        .setFooter({
            text: 'BJ paga 3:2 · Dealer para em 17 · Ás vale 1 ou 11 · ' + betFooter()
        })
        .setTimestamp();
}

function resultTitle(r) {
    if (r === 'bj') return '🌟  Blackjack Natural';
    if (r === 'win') return '🃏  Você venceu';
    if (r === 'push') return '🤝  Push';
    if (r === 'bust') return '💥  Bust';
    return '🃏  Dealer venceu';
}

function playButtons(userId, canDouble) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack:hit:${userId}`)
            .setLabel('Carta')
            .setEmoji('🃏')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`blackjack:stand:${userId}`)
            .setLabel('Parar')
            .setEmoji('🛑')
            .setStyle(ButtonStyle.Secondary)
    );
    if (canDouble) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`blackjack:double:${userId}`)
                .setLabel('Dobrar')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Success)
        );
    }
    return row;
}

function againRow(userId, amount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack:again:${userId}:${amount}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function settle(session) {
    const p = handTotal(session.player);
    const d = handTotal(session.dealer);
    const bet = session.amount;

    if (p > 21) return { result: 'bust', payout: 0 };
    if (d > 21) {
        const pay = bet * 2;
        cristais.add(session.userId, pay);
        return { result: 'win', payout: pay };
    }
    if (p > d) {
        const pay = bet * 2;
        cristais.add(session.userId, pay);
        return { result: 'win', payout: pay };
    }
    if (p === d) {
        cristais.add(session.userId, bet);
        return { result: 'push', payout: bet };
    }
    return { result: 'lose', payout: 0 };
}

function dealerPlay(session) {
    // dealer revela e compra até >= 17 (stand on soft 17 simplificado: para em 17+)
    while (handTotal(session.dealer) < 17) {
        session.dealer.push(draw(session.deck));
    }
}

function startHand(userId, amount) {
    const deck = freshDeck();
    const player = [draw(deck), draw(deck)];
    const dealer = [draw(deck), draw(deck)];
    const session = {
        userId,
        amount,
        deck,
        player,
        dealer,
        doubled: false,
        firstAction: true
    };
    sessions.set(userId, session);
    return session;
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: 'Blackjack realista · Ás · double · 3:2',

    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) {
            return message.reply(
                `❌ ${bet.error}\nUso: \`O.bj <valor|all|half|k|m>\`\nBJ natural paga **3:2** · Dobrar na 1ª ação.`
            );
        }
        if (sessions.has(message.author.id)) {
            return message.reply('Termine a mão atual antes de iniciar outra.');
        }

        cristais.remove(message.author.id, bet.amount);
        const session = startHand(message.author.id, bet.amount);

        // Blackjack natural do jogador
        if (isBlackjack(session.player)) {
            if (isBlackjack(session.dealer)) {
                // push
                cristais.add(session.userId, session.amount);
                sessions.delete(session.userId);
                return message.reply({
                    embeds: [
                        tableEmbed(session, {
                            phase: 'end',
                            result: 'push',
                            payout: session.amount,
                            note: 'Dealer também tinha Blackjack.'
                        })
                    ],
                    components: [againRow(session.userId, session.amount)]
                });
            }
            // 3:2
            const pay = Math.floor(session.amount * 2.5);
            cristais.add(session.userId, pay);
            sessions.delete(session.userId);
            return message.reply({
                embeds: [
                    tableEmbed(session, {
                        phase: 'end',
                        result: 'bj',
                        payout: pay
                    })
                ],
                components: [againRow(session.userId, session.amount)]
            });
        }

        // dealer BJ → perda imediata (sem insurance nesta versão)
        if (isBlackjack(session.dealer)) {
            sessions.delete(session.userId);
            return message.reply({
                embeds: [
                    tableEmbed(session, {
                        phase: 'end',
                        result: 'lose',
                        payout: 0,
                        note: 'Dealer abriu **Blackjack**.'
                    })
                ],
                components: [againRow(session.userId, session.amount)]
            });
        }

        await message.reply({
            embeds: [tableEmbed(session, { phase: 'play' })],
            components: [playButtons(session.userId, true)]
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const userId = parts[2];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'Não é a sua mesa.', ephemeral: true });
        }

        // ── Nova mão ──────────────────────────────────────────────
        if (action === 'again') {
            const amount = parseInt(parts[3], 10);
            const bet = resolveBet(String(amount), cristais.get(userId), { label: '💠' });
            if (!bet.ok) {
                return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            }
            if (sessions.has(userId)) sessions.delete(userId);

            cristais.remove(userId, bet.amount);
            const session = startHand(userId, bet.amount);

            if (isBlackjack(session.player)) {
                if (isBlackjack(session.dealer)) {
                    cristais.add(userId, session.amount);
                    sessions.delete(userId);
                    return interaction.update({
                        embeds: [
                            tableEmbed(session, {
                                phase: 'end',
                                result: 'push',
                                payout: session.amount
                            })
                        ],
                        components: [againRow(userId, session.amount)]
                    });
                }
                const pay = Math.floor(session.amount * 2.5);
                cristais.add(userId, pay);
                sessions.delete(userId);
                return interaction.update({
                    embeds: [
                        tableEmbed(session, { phase: 'end', result: 'bj', payout: pay })
                    ],
                    components: [againRow(userId, session.amount)]
                });
            }

            if (isBlackjack(session.dealer)) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [
                        tableEmbed(session, {
                            phase: 'end',
                            result: 'lose',
                            note: 'Dealer abriu **Blackjack**.'
                        })
                    ],
                    components: [againRow(userId, session.amount)]
                });
            }

            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'play' })],
                components: [playButtons(userId, true)]
            });
        }

        const session = sessions.get(userId);
        if (!session) {
            return interaction.reply({
                content: '⏱️ Mão expirada. Use `O.bj <valor>` de novo.',
                ephemeral: true
            });
        }

        // ── Hit ───────────────────────────────────────────────────
        if (action === 'hit') {
            session.player.push(draw(session.deck));
            session.firstAction = false;
            const total = handTotal(session.player);

            if (total > 21) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [
                        tableEmbed(session, { phase: 'end', result: 'bust', payout: 0 })
                    ],
                    components: [againRow(userId, session.amount)]
                });
            }

            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'play' })],
                components: [playButtons(userId, false)]
            });
        }

        // ── Double ────────────────────────────────────────────────
        if (action === 'double') {
            if (!session.firstAction || session.player.length !== 2) {
                return interaction.reply({
                    content: 'Só é possível **dobrar** na primeira ação.',
                    ephemeral: true
                });
            }
            if (cristais.get(userId) < session.amount) {
                return interaction.reply({
                    content: `❌ 💠 insuficiente para dobrar. Precisa de **${fmt(session.amount)}**.`,
                    ephemeral: true
                });
            }
            cristais.remove(userId, session.amount);
            session.amount *= 2;
            session.doubled = true;
            session.firstAction = false;
            session.player.push(draw(session.deck));

            if (handTotal(session.player) > 21) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [
                        tableEmbed(session, { phase: 'end', result: 'bust', payout: 0 })
                    ],
                    components: [againRow(userId, Math.floor(session.amount / 2))]
                });
            }

            dealerPlay(session);
            const { result, payout } = settle(session);
            sessions.delete(userId);
            return interaction.update({
                embeds: [
                    tableEmbed(session, {
                        phase: 'end',
                        result,
                        payout
                    })
                ],
                components: [againRow(userId, Math.floor(session.amount / (session.doubled ? 2 : 1)))]
            });
        }

        // ── Stand ─────────────────────────────────────────────────
        if (action === 'stand') {
            dealerPlay(session);
            const { result, payout } = settle(session);
            const originalBet = session.doubled ? Math.floor(session.amount / 2) : session.amount;
            sessions.delete(userId);
            return interaction.update({
                embeds: [
                    tableEmbed(session, {
                        phase: 'end',
                        result,
                        payout
                    })
                ],
                components: [againRow(userId, originalBet)]
            });
        }
    }
};
