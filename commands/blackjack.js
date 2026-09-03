const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
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
function handTotal(cards) {
    let total = 0, aces = 0;
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
    let total = 0, aces = 0;
    for (const c of cards) {
        total += cardValue(c.rank);
        if (c.rank === 'A') aces++;
    }
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
    return `${c.rank}${c.suit}`;
}
function showHand(cards, { hideHole = false } = {}) {
    if (!cards.length) return '—';
    if (hideHole && cards.length >= 2) return `${showCard(cards[0])}  ·  🂠`;
    return cards.map(showCard).join('  ·  ');
}
function handLabel(cards, hideHole = false) {
    if (hideHole) {
        const up = cardValue(cards[0].rank);
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
    return '😢 **Derrota.** Prejuízo na mesa. Tente outra vez.';
}
function tableEmbed(session, { phase = 'play', result = null, payout = 0, note = null } = {}) {
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
        '   ╔════════════════════════════════╗',
        '   ║     AETERNUS  ·  BLACKJACK   ║',
        '   ╚════════════════════════════════╝',
        '```',
        `✨ Aposta **${fmt(session.amount)}**${session.doubled ? ' · *doubled*' : ''}`,
        '',
        `🏠 **Dealer**`,
        `> ${handLabel(session.dealer, hide)}`,
        '',
        `👤 **Você**`,
        `> ${handLabel(session.player, false)}`
    ];
    if (result) {
        lines.push('', mood(result));
        if (payout > 0) lines.push(`✨ + **${fmt(payout)}**`);
        if (result === 'lose' || result === 'bust')
            lines.push(`💫 Prejuízo − **${fmt(session.amount)}**`);
        if (result === 'push') lines.push('Aposta devolvida na íntegra.');
        lines.push(`💼 Saldo: ✨ **${fmt(eter.get(session.userId))}**`);
    } else {
        lines.push('', '_Carta · Parar · Dobrar (1ª decisão)_');
    }
    if (note) lines.push('', note);
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(
            result === 'bj'
                ? '🌟  Blackjack Natural'
                : result === 'win'
                  ? '🃏  Você venceu'
                  : result === 'push'
                    ? '🤝  Push'
                    : result === 'bust'
                      ? '💥  Bust'
                      : result
                        ? '🃏  Dealer venceu'
                        : '🃏  Blackjack'
        )
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'BJ 3:2 · Dealer 17 · Ás 1/11 · ' + betFooter() })
        .setTimestamp();
}
function playButtons(userId, canDouble) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`blackjack:hit:${userId}`).setLabel('Carta').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`blackjack:stand:${userId}`).setLabel('Parar').setEmoji('🛑').setStyle(ButtonStyle.Secondary)
    );
    if (canDouble) {
        row.addComponents(
            new ButtonBuilder().setCustomId(`blackjack:double:${userId}`).setLabel('Dobrar').setEmoji('✖️').setStyle(ButtonStyle.Success)
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
    if (d > 21 || p > d) {
        const pay = bet * 2;
        eter.add(session.userId, pay, { reason: 'bj win' });
        return { result: 'win', payout: pay };
    }
    if (p === d) {
        eter.add(session.userId, bet, { reason: 'bj push' });
        return { result: 'push', payout: bet };
    }
    return { result: 'lose', payout: 0 };
}
function dealerPlay(session) {
    while (handTotal(session.dealer) < 17) session.dealer.push(draw(session.deck));
}
function startHand(userId, amount) {
    const deck = freshDeck();
    const session = {
        userId,
        amount,
        deck,
        player: [draw(deck), draw(deck)],
        dealer: [draw(deck), draw(deck)],
        doubled: false,
        firstAction: true
    };
    sessions.set(userId, session);
    return session;
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: 'Blackjack · éter',
    async execute(message, args) {
        const bet = resolveBet(args[0], eter.get(message.author.id), { label: '✨' });
        if (!bet.ok)
            return message.reply(`❌ ${bet.error}\nUso: \`O.bj <valor|all|half>\``);
        if (sessions.has(message.author.id))
            return message.reply('Termine a mão atual primeiro.');

        eter.remove(message.author.id, bet.amount, { reason: 'bj bet' });
        const session = startHand(message.author.id, bet.amount);

        if (isBlackjack(session.player)) {
            if (isBlackjack(session.dealer)) {
                eter.add(session.userId, session.amount, { reason: 'bj push' });
                sessions.delete(session.userId);
                return message.reply({
                    embeds: [tableEmbed(session, { phase: 'end', result: 'push', payout: session.amount })],
                    components: [againRow(session.userId, session.amount)]
                });
            }
            const pay = Math.floor(session.amount * 2.5);
            eter.add(session.userId, pay, { reason: 'bj natural' });
            sessions.delete(session.userId);
            return message.reply({
                embeds: [tableEmbed(session, { phase: 'end', result: 'bj', payout: pay })],
                components: [againRow(session.userId, session.amount)]
            });
        }
        if (isBlackjack(session.dealer)) {
            sessions.delete(session.userId);
            return message.reply({
                embeds: [tableEmbed(session, { phase: 'end', result: 'lose', note: 'Dealer abriu **Blackjack**.' })],
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
        if (interaction.user.id !== userId)
            return interaction.reply({ content: 'Não é a sua mesa.', ephemeral: true });

        if (action === 'again') {
            const amount = parseInt(parts[3], 10);
            const bet = resolveBet(String(amount), eter.get(userId), { label: '✨' });
            if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
            if (sessions.has(userId)) sessions.delete(userId);
            eter.remove(userId, bet.amount, { reason: 'bj again' });
            const session = startHand(userId, bet.amount);
            if (isBlackjack(session.player)) {
                if (isBlackjack(session.dealer)) {
                    eter.add(userId, session.amount, { reason: 'bj push' });
                    sessions.delete(userId);
                    return interaction.update({
                        embeds: [tableEmbed(session, { phase: 'end', result: 'push', payout: session.amount })],
                        components: [againRow(userId, session.amount)]
                    });
                }
                const pay = Math.floor(session.amount * 2.5);
                eter.add(userId, pay, { reason: 'bj natural' });
                sessions.delete(userId);
                return interaction.update({
                    embeds: [tableEmbed(session, { phase: 'end', result: 'bj', payout: pay })],
                    components: [againRow(userId, session.amount)]
                });
            }
            if (isBlackjack(session.dealer)) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [tableEmbed(session, { phase: 'end', result: 'lose', note: 'Dealer abriu **Blackjack**.' })],
                    components: [againRow(userId, session.amount)]
                });
            }
            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'play' })],
                components: [playButtons(userId, true)]
            });
        }

        const session = sessions.get(userId);
        if (!session)
            return interaction.reply({ content: '⏳ Mão expirada.', ephemeral: true });

        if (action === 'hit') {
            session.player.push(draw(session.deck));
            session.firstAction = false;
            if (handTotal(session.player) > 21) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [tableEmbed(session, { phase: 'end', result: 'bust' })],
                    components: [againRow(userId, session.amount)]
                });
            }
            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'play' })],
                components: [playButtons(userId, false)]
            });
        }

        if (action === 'double') {
            if (!session.firstAction || session.player.length !== 2)
                return interaction.reply({ content: 'Só na primeira ação.', ephemeral: true });
            if (eter.get(userId) < session.amount)
                return interaction.reply({
                    content: `❌ ✨ insuficiente. Precisa de **${fmt(session.amount)}**.`,
                    ephemeral: true
                });
            eter.remove(userId, session.amount, { reason: 'bj double' });
            session.amount *= 2;
            session.doubled = true;
            session.firstAction = false;
            session.player.push(draw(session.deck));
            if (handTotal(session.player) > 21) {
                sessions.delete(userId);
                return interaction.update({
                    embeds: [tableEmbed(session, { phase: 'end', result: 'bust' })],
                    components: [againRow(userId, Math.floor(session.amount / 2))]
                });
            }
            dealerPlay(session);
            const { result, payout } = settle(session);
            sessions.delete(userId);
            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'end', result, payout })],
                components: [againRow(userId, Math.floor(session.amount / 2))]
            });
        }

        if (action === 'stand') {
            dealerPlay(session);
            const { result, payout } = settle(session);
            const original = session.doubled ? Math.floor(session.amount / 2) : session.amount;
            sessions.delete(userId);
            return interaction.update({
                embeds: [tableEmbed(session, { phase: 'end', result, payout })],
                components: [againRow(userId, original)]
            });
        }
    }
};
