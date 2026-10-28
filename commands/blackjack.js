const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const sessions = new Map();
const INSURANCE_COST = 100000;

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
    if (result === 'bj') return '✦ 🌟 **BLACKJACK NATURAL**\n> 21 logo na abertura. A mesa não poderia pedir um começo melhor.';
    if (result === 'win') return '✦ 🏆 **VITÓRIA**\n> A sua mão terminou acima da banca. O Éter da rodada agora é seu.';
    if (result === 'push') return '✦ ⚖️ **EMPATE**\n> As mãos terminaram iguais. Sua aposta retorna sem alteração.';
    if (result === 'bust') return '✦ 💥 **PASSOU DE 21**\n> A última carta ultrapassou o limite. Esta rodada fica com a banca.';
    return '✦ 🌑 **DERROTA**\n> Desta vez, a banca levou a melhor. Sua próxima decisão começa uma nova mão.';
}
function tableEmbed(session, { phase = 'play', result = null, payout = 0, note = null } = {}) {
    const hide = phase === 'play';
    const color = result === 'bj' || result === 'win' ? 0xA78BFA : result === 'push' ? 0x818CF8 : result === 'lose' || result === 'bust' ? 0xF43F5E : 0x7C3AED;
    const art = {
        table: 'https://cdn.discordapp.com/attachments/1506622463965007904/1565122972677578852/grok-image-5aa59eff-57fb-4ed5-86dd-78c7a9371b77.jpg',
        loss: 'https://cdn.discordapp.com/attachments/1506622463965007904/1565122973222961162/lv_0_20260905194445.jpg',
        win: 'https://cdn.discordapp.com/attachments/1506622463965007904/1565122973663232050/lv_0_20260905194951.jpg'
    };
    // Durante a animação da Aeternus comprando cartas, mantenha a arte da mesa.
    // A arte de vitória/derrota só aparece depois que a animação termina.
    const imageUrl = phase !== 'end' ? art.table
        : result === 'win' || result === 'bj' ? art.win
        : result === 'lose' || result === 'bust' ? art.loss
        : art.table;
    const playerTotal = handTotal(session.player);
    const status = phase === 'dealer' ? '✦ VEZ DA AETERNUS' : result ? (result === 'bj' ? '✦ BLACKJACK NATURAL' : result === 'win' ? '✦ VITÓRIA' : result === 'push' ? '✦ EMPATE' : result === 'bust' ? '✦ ESTOURO' : '✦ FIM DA PARTIDA') : '✦ SUA VEZ';
    const betBlock = [
        `**✧ SUA APOSTA**`,
        `✨ **${fmt(session.amount)} Éter**${session.doubled ? ' · **APOSTA DOBRADA**' : ''}`,
        result
            ? mood(result)
            : phase === 'play'
                ? (session.hits > 0
                    ? '*🌌 Cada nova carta altera o destino. A Aeternus observa sua próxima escolha…*'
                    : '*✧ O destino está nas cartas. Que o Éter guie sua decisão.*')
                : null,
        session.insured ? `🛡️ Seguro: **${fmt(INSURANCE_COST)} Éter** · cobertura: **${fmt(session.insuranceCoverage)} Éter**` : null
    ].filter(Boolean).join('\n');

    const dealerBlock = [
        '**♜ DEALER**',
        handLabel(session.dealer, hide)
    ].join('\n');

    const playerBlock = [
        '**♠ SUA MÃO**',
        handLabel(session.player),
        `📊 Pontuação: **${playerTotal}**`
    ].join('\n');

    const details = [];
    if (result) {
        if (payout > 0) details.push(`✨ **Recebido:** +${fmt(payout)} Éter`);
        if (result === 'lose' || result === 'bust') details.push(`💫 **Perdido:** −${fmt(session.amount)} Éter`);
        if (result === 'push') details.push('↩️ Sua aposta foi devolvida.');
        if (session.insured && (result === 'lose' || result === 'bust')) details.push(`🛡️ **Seguro acionado:** +${fmt(session.insuranceCoverage)} Éter recuperados.`);
        details.push(`🪙 **Saldo atual:** ${fmt(eter.get(session.userId))} Éter`);
    } else {
        if (hide) details.push('🔒 A segunda carta do dealer está oculta.');
        details.push('_Blackjack natural paga 3:2 · Dealer para em 17 · Ás vale 1 ou 11._');
    }
    if (note) details.push(note);

    const panel = new ContainerBuilder().setAccentColor(color);
    const heading = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✧ A E T E R N U S\n## BLACKJACK · MESA DE ÉTER'));
    if (imageUrl) {
        heading.setThumbnailAccessory(new ThumbnailBuilder()
            .setURL(imageUrl)
            .setDescription('Ilustração da Aeternus para esta fase da mesa.'));
    }
    panel.addSectionComponents(heading)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(betBlock))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(dealerBlock))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(playerBlock));

    if (details.length) {
        panel.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(details.join('\n')));
    }
    if (phase === 'play') {
        panel.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(playButtons(session.userId, session.firstAction && session.player.length === 2 && eter.get(session.userId) >= session.amount, session));
    }
    return panel;
}
function playButtons(userId, canDouble, session) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`blackjack:hit:${userId}`).setLabel('Carta').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`blackjack:stand:${userId}`).setLabel('Parar').setEmoji('🛑').setStyle(ButtonStyle.Secondary)
    );
    if (canDouble) {
        row.addComponents(
            new ButtonBuilder().setCustomId(`blackjack:double:${userId}`).setLabel('Dobrar').setEmoji('✖️').setStyle(ButtonStyle.Success)
        );
    }
    if (session && !session.insured) {
        row.addComponents(new ButtonBuilder()
            .setCustomId(`blackjack:insurance:${userId}`)
            .setLabel(`Seguro (${fmt(INSURANCE_COST)})`)
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Success)
            .setDisabled(eter.get(userId) < INSURANCE_COST));
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
function startHand(userId, amount, artUrl = null) {
    const deck = freshDeck();
    const session = {
        userId,
        amount,
        artUrl,
        hits: 0,
        deck,
        player: [draw(deck), draw(deck)],
        dealer: [draw(deck), draw(deck)],
        doubled: false,
        firstAction: true,
        insured: false,
        insuranceCoverage: 0
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
        const session = startHand(message.author.id, bet.amount, message.client.user.displayAvatarURL({ extension: 'png', size: 256 }));

        if (isBlackjack(session.player)) {
            if (isBlackjack(session.dealer)) {
                eter.add(session.userId, session.amount, { reason: 'bj push' });
                sessions.delete(session.userId);
                return message.reply({
                    components: [tableEmbed(session, { phase: 'end', result: 'push', payout: session.amount }), againRow(session.userId, session.amount)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            const pay = Math.floor(session.amount * 2.5);
            eter.add(session.userId, pay, { reason: 'bj natural' });
            sessions.delete(session.userId);
            return message.reply({
                components: [tableEmbed(session, { phase: 'end', result: 'bj', payout: pay }), againRow(session.userId, session.amount)], flags: MessageFlags.IsComponentsV2
            });
        }
        if (isBlackjack(session.dealer)) {
            sessions.delete(session.userId);
            return message.reply({
                components: [tableEmbed(session, { phase: 'end', result: 'lose', note: 'Dealer abriu **Blackjack**.' }), againRow(session.userId, session.amount)], flags: MessageFlags.IsComponentsV2
            });
        }
        await message.reply({
            components: [tableEmbed(session, { phase: 'play' })], flags: MessageFlags.IsComponentsV2
        });
    },
    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const userId = parts[2];
        if (interaction.user.id !== userId)
            return interaction.reply({ content: 'Não é a sua mesa.', flags: MessageFlags.Ephemeral });

        if (action === 'again') {
            await interaction.deferUpdate();
            const amount = parseInt(parts[3], 10);
            const bet = resolveBet(String(amount), eter.get(userId), { label: '✨' });
            if (!bet.ok) return interaction.followUp({ content: `❌ ${bet.error}`, flags: MessageFlags.Ephemeral });
            if (sessions.has(userId)) {
                return interaction.followUp({
                    content: '⚠️ Você já tem uma mão ativa. Termine essa partida antes de iniciar outra.',
                    flags: MessageFlags.Ephemeral
                });
            }
            eter.remove(userId, bet.amount, { reason: 'bj again' });
            const mentionMessage = await interaction.channel.send({
                content: `<@${userId}>`,
                allowedMentions: { users: [userId] },
                reply: { messageReference: interaction.message.id, failIfNotExists: false }
            });
            const session = startHand(userId, bet.amount, interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }));
            if (isBlackjack(session.player)) {
                if (isBlackjack(session.dealer)) {
                    eter.add(userId, session.amount, { reason: 'bj push' });
                    sessions.delete(userId);
                    return interaction.channel.send({
                        reply: { messageReference: interaction.message.id, failIfNotExists: false },
                        components: [tableEmbed(session, { phase: 'end', result: 'push', payout: session.amount }), againRow(userId, session.amount)], flags: MessageFlags.IsComponentsV2
                    });
                }
                const pay = Math.floor(session.amount * 2.5);
                eter.add(userId, pay, { reason: 'bj natural' });
                sessions.delete(userId);
                return interaction.channel.send({
                    reply: { messageReference: mentionMessage.id, failIfNotExists: false },
                    components: [tableEmbed(session, { phase: 'end', result: 'bj', payout: pay }), againRow(userId, session.amount)], flags: MessageFlags.IsComponentsV2
                });
            }
            if (isBlackjack(session.dealer)) {
                sessions.delete(userId);
                return interaction.update({
                    components: [tableEmbed(session, { phase: 'end', result: 'lose', note: 'Dealer abriu **Blackjack**.' }), againRow(userId, session.amount)], flags: MessageFlags.IsComponentsV2
                });
            }
            return interaction.channel.send({
                reply: { messageReference: mentionMessage.id, failIfNotExists: false },
                components: [tableEmbed(session, { phase: 'play' })], flags: MessageFlags.IsComponentsV2
            });
        }

        const session = sessions.get(userId);
        if (!session)
            return interaction.reply({ content: '⏳ Mão expirada.', flags: MessageFlags.Ephemeral });

        if (action === 'insurance') {
            if (session.insured) return interaction.reply({ content: '🛡️ Você já contratou o seguro desta mão.', flags: MessageFlags.Ephemeral });
            if (eter.get(userId) < INSURANCE_COST) return interaction.reply({ content: `Você precisa de **${fmt(INSURANCE_COST)} Éter** para contratar o seguro.`, flags: MessageFlags.Ephemeral });
            eter.remove(userId, INSURANCE_COST, { reason: 'bj insurance' });
            session.insured = true;
            session.insuranceCoverage = session.amount;
            return interaction.update({ components: [tableEmbed(session, { phase: 'play', note: `🛡️ **Seguro contratado!** Custa ${fmt(INSURANCE_COST)} Éter. Se perder esta mão, a cobertura devolverá ${fmt(session.insuranceCoverage)} Éter.` })], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'hit') {
            session.player.push(draw(session.deck));
            session.hits++;
            session.firstAction = false;
            if (handTotal(session.player) > 21) {
                sessions.delete(userId);
                if (session.insured) eter.add(userId, session.insuranceCoverage, { reason: 'bj insurance payout' });
                return interaction.update({
                    components: [tableEmbed(session, { phase: 'end', result: 'bust' }), againRow(userId, session.amount)], flags: MessageFlags.IsComponentsV2
                });
            }
            return interaction.update({
                components: [tableEmbed(session, { phase: 'play' })], flags: MessageFlags.IsComponentsV2
            });
        }

        if (action === 'double') {
            if (!session.firstAction || session.player.length !== 2)
                return interaction.reply({ content: 'Só na primeira ação.', flags: MessageFlags.Ephemeral });
            if (eter.get(userId) < session.amount)
                return interaction.reply({
                    content: `❌ ✨ insuficiente. Precisa de **${fmt(session.amount)}**.`,
                    flags: MessageFlags.Ephemeral
                });
            eter.remove(userId, session.amount, { reason: 'bj double' });
            session.amount *= 2;
            session.doubled = true;
            session.firstAction = false;
            session.player.push(draw(session.deck));
            session.hits++;
            if (handTotal(session.player) > 21) {
                sessions.delete(userId);
                if (session.insured) eter.add(userId, session.insuranceCoverage, { reason: 'bj insurance payout' });
                return interaction.update({
                    components: [tableEmbed(session, { phase: 'end', result: 'bust' }), againRow(userId, Math.floor(session.amount / 2))], flags: MessageFlags.IsComponentsV2
                });
            }
            dealerPlay(session);
            const { result, payout } = settle(session);
            if (session.insured && (result === 'lose' || result === 'bust')) eter.add(userId, session.insuranceCoverage, { reason: 'bj insurance payout' });
            sessions.delete(userId);
            return interaction.update({
                components: [tableEmbed(session, { phase: 'end', result, payout }), againRow(userId, Math.floor(session.amount / 2))], flags: MessageFlags.IsComponentsV2
            });
        }

        if (action === 'stand') {
            // Mostra a Aeternus jogando, uma carta por vez.
            await interaction.update({
                components: [tableEmbed(session, {
                    phase: 'dealer',
                    note: '🌌 **A Aeternus está comprando cartas...**'
                })], flags: MessageFlags.IsComponentsV2
            });

            await new Promise(resolve => setTimeout(resolve, 900));

            while (handTotal(session.dealer) < 17) {
                session.dealer.push(draw(session.deck));
                await interaction.editReply({
                    components: [tableEmbed(session, {
                        phase: 'dealer',
                        note: `🃏 **A Aeternus comprou uma carta:** ${showCard(session.dealer[session.dealer.length - 1])}`
                    })], flags: MessageFlags.IsComponentsV2
                });
                await new Promise(resolve => setTimeout(resolve, 1100));
            }

            await interaction.editReply({
                components: [tableEmbed(session, {
                    phase: 'dealer',
                    note: '✧ A Aeternus encerrou a compra e está revelando o resultado...'
                })], flags: MessageFlags.IsComponentsV2
            });
            await new Promise(resolve => setTimeout(resolve, 800));

            const { result, payout } = settle(session);
            if (session.insured && (result === 'lose' || result === 'bust')) eter.add(userId, session.insuranceCoverage, { reason: 'bj insurance payout' });
            const original = session.doubled ? Math.floor(session.amount / 2) : session.amount;
            sessions.delete(userId);
            return interaction.editReply({
                components: [tableEmbed(session, { phase: 'end', result, payout }), againRow(userId, original)],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
