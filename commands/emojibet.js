const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

/** Tempo para participar (lobby) */
const LOBBY_MS = 60 * 60 * 1000; // 60 minutos
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 50;
const TAX_RATE = 0.05; // 5% para o bot

/** @type {Map<string, object>} */
const sessions = new Map();

const EMOJI_POOL = [
    '😎', '😍', '😂', '👻', '👽', '💀', '🔥', '✨',
    '🌟', '👑', '💎', '🎯', '🚀', '🌌', '🐻', '🐶',
    '🍎', '🍌', '🍉', '🍓', '⚡', '🌈', '🎲', '🎮',
    '🔮', '🐍', '🦄', '🐕', '🦁', '🐺', '🐧', '🧠',
    '🎉', '🌞', '💜', '💙', '💫', '🍀', '🌺', '🌹',
    '🦋', '🐝', '🐢', '🐋', '🙈', '🤠', '😈', '👾',
    '🎃', '🤖', '🐱', '🦊', '🐸', '🐯', '🐼', '🐨',
    '🍕', '🍩', '☕', '🎵', '🎸', '🏆', '🥇', '⚔️'
];

function fmt(n) {
    return eter.formatPlain ? eter.formatPlain(n) : Number(n || 0).toLocaleString('pt-BR');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomEmoji(used) {
    const free = EMOJI_POOL.filter((e) => !used.has(e));
    const pool = free.length ? free : EMOJI_POOL;
    return pick(pool);
}

function formatDate() {
    try {
        return new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (_) {
        return new Date().toLocaleString('pt-BR');
    }
}

/**
 * Sintaxe:
 *   O.emojibet              → diversão, até 50
 *   O.emojibet 5            → diversão, até 5
 *   O.emojibet 1k           → aposta 1k, até 50
 *   O.emojibet 10 1k        → aposta 1k, até 10 pessoas
 */
function parseMode(args) {
    const list = (args || []).map((a) => String(a).trim()).filter(Boolean);
    let fun = true;
    let amountRaw = null;
    let maxPlayers = MAX_PLAYERS;

    if (list.length === 0) {
        return { fun: true, amountRaw: null, maxPlayers: MAX_PLAYERS };
    }

    if (list.length === 1) {
        const a = list[0].toLowerCase();
        if (/^\d{1,2}$/.test(a)) {
            const n = Number(a);
            if (n >= MIN_PLAYERS && n <= MAX_PLAYERS) {
                return { fun: true, amountRaw: null, maxPlayers: n };
            }
        }
        if (['fun', 'diversao', 'diversão', 'brincadeira', 'free', 'gratis', 'grátis'].includes(a)) {
            return { fun: true, amountRaw: null, maxPlayers: MAX_PLAYERS };
        }
        return { fun: false, amountRaw: list[0], maxPlayers: MAX_PLAYERS };
    }

    const pRaw = list[0];
    const vRaw = list[1];
    if (/^\d{1,2}$/.test(pRaw)) {
        const n = Number(pRaw);
        if (n >= MIN_PLAYERS && n <= MAX_PLAYERS) maxPlayers = n;
    }
    fun = false;
    amountRaw = vRaw;
    return { fun, amountRaw, maxPlayers };
}

function listPlayers(session) {
    return [...session.players.values()];
}

function potOf(session) {
    if (session.fun) return 0;
    return Math.floor(Number(session.amount || 0) * session.players.size);
}

function prizeLabel(session) {
    if (session.fun) return 'diversão (sem aposta)';
    const pot = potOf(session);
    return '✨ ' + fmt(pot) + ' éter';
}

function buildEmbed(session) {
    const players = listPlayers(session);
    const cap = session.maxPlayers || MAX_PLAYERS;
    const hostMention = '<@' + session.hostId + '>';

    const participantLines = [];
    if (!players.length) {
        participantLines.push('_Ninguém entrou ainda._');
    } else {
        players.forEach((p, i) => {
            participantLines.push((i + 1) + '. ' + p.emoji + ' <@' + p.id + '>');
        });
    }

    const desc = [
        '_____________________________________',
        '',
        '🎲 **BATALHA DE EMOJIS**',
        '',
        '**"Prêmios:"** ' + prizeLabel(session),
        '',
        'Clique em ✅ **participar** para entrar e escolha seu emoji vencedor 🏆. A batalha só termina quando o tempo acaba ou quando ' +
            hostMention +
            ' clica em ▶️ **iniciar**.',
        '',
        '**"Vocês tem:"** **60 minutos** para participar.',
        '',
        '--------------------------------------',
        '',
        '**"Participantes:"** ' + players.length + '/' + cap,
        participantLines.join('\n'),
        '',
        'Aeternus jogos: ' + formatDate(),
        '_____________________________________'
    ].join('\n');

    return new EmbedBuilder()
        .setColor(session.fun ? 0xa78bfa : 0xfbbf24)
        .setDescription(desc);
}

function lobbyRow(sessionId, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('emojibet:join:' + sessionId)
            .setLabel('Participar')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!!disabled),
        new ButtonBuilder()
            .setCustomId('emojibet:start:' + sessionId)
            .setLabel('Iniciar')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!!disabled)
    );
}

function refundAll(session) {
    if (session.fun) return;
    for (const p of listPlayers(session)) {
        if (p.paid) {
            eter.add(p.id, session.amount, { reason: 'emojibet refund' });
            p.paid = false;
        }
    }
}

function insufficientError(amount) {
    return '❌ Erro, você esta tentando apostar o que você não tem ✨ ' + fmt(amount) + ' éter.';
}

async function finish(client, sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.phase === 'done') return;
    session.phase = 'done';

    if (session.lobbyTimer) {
        clearTimeout(session.lobbyTimer);
        session.lobbyTimer = null;
    }

    const players = listPlayers(session);
    const ch = await client.channels.fetch(session.channelId).catch(() => null);

    if (players.length < MIN_PLAYERS) {
        refundAll(session);
        sessions.delete(sessionId);
        try {
            const msg = ch ? await ch.messages.fetch(session.messageId).catch(() => null) : null;
            if (msg) {
                await msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setDescription(
                                '🎲 **Batalha cancelada**\nPoucos jogadores (mínimo ' +
                                    MIN_PLAYERS +
                                    ').' +
                                    (session.fun ? '' : ' Apostas devolvidas.')
                            )
                    ],
                    components: []
                });
            }
        } catch (_) {}
        return;
    }

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const winner = shuffled[0];
    const losers = shuffled.slice(1);

    const pot = potOf(session);
    const tax = session.fun ? 0 : Math.floor(pot * TAX_RATE);
    const winAmount = session.fun ? 0 : Math.max(0, pot - tax);

    if (!session.fun && winAmount > 0) {
        eter.add(winner.id, winAmount, { reason: 'emojibet win' });
    }

    try {
        const msg = ch ? await ch.messages.fetch(session.messageId).catch(() => null) : null;
        if (msg) {
            await msg.edit({
                embeds: [buildEmbed(session)],
                components: []
            });
        }
    } catch (_) {}

    let text;
    if (session.fun) {
        text =
            '<@' +
            winner.id +
            '> ganhou a batalha de emojis com ' +
            winner.emoji +
            ' — uma partida valendo nada.\n' +
            'E os outros ' +
            losers.map((p) => '<@' + p.id + '>').join(' ') +
            '\nsaíram de mãos abanando.';
    } else {
        const loseLine = losers.length
            ? 'E os outros ' +
              losers.map((p) => '<@' + p.id + '>').join(' ') +
              '\nPerderam ✨ ' +
              fmt(session.amount) +
              '.'
            : '';
        text =
            '<@' +
            winner.id +
            '> ganhou a batalha de emojis com ' +
            winner.emoji +
            ' e levou ✨ ' +
            fmt(winAmount) +
            ' éter (valor da taxa 5% ✨ ' +
            fmt(tax) +
            ').\n' +
            loseLine;
    }

    try {
        if (ch?.isTextBased()) {
            await ch.send({
                content: text,
                reply: session.originMessageId
                    ? { messageReference: session.originMessageId, failIfNotExists: false }
                    : session.messageId
                      ? { messageReference: session.messageId, failIfNotExists: false }
                      : undefined,
                allowedMentions: { users: players.map((p) => p.id) }
            });
        }
    } catch (_) {}

    sessions.delete(sessionId);
}

async function beginRound(client, session, interaction) {
    if (!session || session.phase !== 'lobby') return;
    if (listPlayers(session).length < MIN_PLAYERS) {
        if (interaction) {
            return interaction.reply({
                content: 'Precisa de pelo menos **' + MIN_PLAYERS + '** jogadores para iniciar.',
                ephemeral: true
            });
        }
        return finish(client, session.id);
    }

    session.phase = 'running';
    if (session.lobbyTimer) {
        clearTimeout(session.lobbyTimer);
        session.lobbyTimer = null;
    }

    const payload = {
        embeds: [buildEmbed(session)],
        components: [lobbyRow(session.id, true)]
    };

    try {
        if (interaction?.deferred || interaction?.replied) {
            await interaction.editReply(payload).catch(() => {});
        } else if (interaction?.update) {
            await interaction.update(payload).catch(() => {});
        } else {
            const ch = await client.channels.fetch(session.channelId).catch(() => null);
            const msg = ch ? await ch.messages.fetch(session.messageId).catch(() => null) : null;
            if (msg) await msg.edit(payload);
        }
    } catch (_) {}

    return finish(client, session.id);
}

async function createSession(user, channel, mode, originMessageId) {
    let amount = 0;
    const fun = !!mode.fun;
    const maxPlayers = Math.min(
        MAX_PLAYERS,
        Math.max(MIN_PLAYERS, Number(mode.maxPlayers) || MAX_PLAYERS)
    );

    if (!fun) {
        const bal = eter.get(user.id);
        const bet = resolveBet(mode.amountRaw, bal, { label: '✨' });
        if (!bet.ok) {
            const tryAmt =
                Number(String(mode.amountRaw || '').replace(/[^\d]/g, '')) ||
                Number(bet.amount) ||
                bal;
            if (
                /saldo|insuficiente|não tem|nao tem|não possui|nao possui/i.test(
                    String(bet.error || '')
                ) ||
                tryAmt > bal
            ) {
                return { ok: false, error: insufficientError(tryAmt > 0 ? tryAmt : bal) };
            }
            return { ok: false, error: bet.error };
        }
        amount = bet.amount;
        if (amount < 1) return { ok: false, error: 'Aposta inválida.' };
        if (bal < amount) {
            return { ok: false, error: insufficientError(amount) };
        }
    }

    const sessionId = channel.id + '_' + Date.now().toString(36);
    const used = new Set();
    const emoji = randomEmoji(used);
    used.add(emoji);

    const hostPlayer = {
        id: user.id,
        tag: user.username,
        emoji,
        paid: false
    };

    if (!fun) {
        eter.remove(user.id, amount, { reason: 'emojibet join' });
        hostPlayer.paid = true;
    }

    const session = {
        id: sessionId,
        hostId: user.id,
        hostTag: user.username,
        channelId: channel.id,
        messageId: null,
        originMessageId: originMessageId || null,
        fun,
        amount,
        maxPlayers,
        phase: 'lobby',
        players: new Map([[user.id, hostPlayer]]),
        usedEmojis: used,
        lobbyTimer: null
    };

    sessions.set(sessionId, session);
    return { ok: true, session };
}

module.exports = {
    name: 'emojibet',
    aliases: ['emoji', 'emojibattle', 'batalhaemoji'],
    description: 'Batalha de emojis — aposta ou diversão',

    data: new SlashCommandBuilder()
        .setName('emojibet')
        .setDescription('Batalha de emojis (aposta ou diversão)')
        .addIntegerOption((o) =>
            o
                .setName('pessoas')
                .setDescription('Máximo de participantes (2–50)')
                .setMinValue(MIN_PLAYERS)
                .setMaxValue(MAX_PLAYERS)
                .setRequired(false)
        )
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor da aposta (vazio = diversão)')
                .setRequired(false)
        ),

    async execute(message, args) {
        const mode = parseMode(args);
        const result = await createSession(message.author, message.channel, mode, message.id);
        if (!result.ok) {
            return message.reply({ content: result.error });
        }

        const session = result.session;
        session.lobbyTimer = setTimeout(() => finish(message.client, session.id), LOBBY_MS);

        const sent = await message.reply({
            embeds: [buildEmbed(session)],
            components: [lobbyRow(session.id, false)]
        });
        session.messageId = sent.id;
        return sent;
    },

    async executeSlash(interaction) {
        const pessoas = interaction.options.getInteger('pessoas');
        const valor = interaction.options.getString('valor');
        const mode = {
            fun: !valor,
            amountRaw: valor || null,
            maxPlayers: pessoas || MAX_PLAYERS
        };

        const result = await createSession(
            interaction.user,
            interaction.channel,
            mode,
            null
        );
        if (!result.ok) {
            return interaction.reply({ content: result.error, ephemeral: true });
        }

        const session = result.session;
        session.lobbyTimer = setTimeout(() => finish(interaction.client, session.id), LOBBY_MS);

        await interaction.reply({
            embeds: [buildEmbed(session)],
            components: [lobbyRow(session.id, false)]
        });
        const sent = await interaction.fetchReply().catch(() => null);
        if (sent) {
            session.messageId = sent.id;
            session.originMessageId = sent.id;
        }
    },

    async handleComponent(interaction) {
        if (!interaction.customId.startsWith('emojibet:')) return;

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const sessionId = parts[2];
        const session = sessions.get(sessionId);

        if (!session) {
            return interaction.reply({
                content: 'Essa batalha encerrou ou expirou.',
                ephemeral: true
            });
        }

        if (action === 'join') {
            if (session.phase !== 'lobby') {
                return interaction.reply({ content: 'As entradas estão fechadas.', ephemeral: true });
            }
            if (session.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Você já está na batalha.', ephemeral: true });
            }

            const cap = session.maxPlayers || MAX_PLAYERS;
            if (session.players.size >= cap) {
                return interaction.reply({ content: 'Batalha cheia.', ephemeral: true });
            }

            if (!session.fun) {
                const bal = eter.get(interaction.user.id);
                if (bal < session.amount) {
                    return interaction.reply({
                        content: insufficientError(session.amount),
                        ephemeral: true
                    });
                }
                eter.remove(interaction.user.id, session.amount, { reason: 'emojibet join' });
            }

            const emoji = randomEmoji(session.usedEmojis);
            session.usedEmojis.add(emoji);
            session.players.set(interaction.user.id, {
                id: interaction.user.id,
                tag: interaction.user.username,
                emoji,
                paid: !session.fun
            });

            if (session.players.size >= cap) {
                await interaction
                    .update({
                        embeds: [buildEmbed(session)],
                        components: [lobbyRow(sessionId, true)]
                    })
                    .catch(() => {});
                return beginRound(interaction.client, session, null);
            }

            return interaction.update({
                embeds: [buildEmbed(session)],
                components: [lobbyRow(sessionId, false)]
            });
        }

        if (action === 'start') {
            if (interaction.user.id !== session.hostId) {
                return interaction.reply({
                    content: 'Só quem abriu a batalha pode iniciar.',
                    ephemeral: true
                });
            }
            return beginRound(interaction.client, session, interaction);
        }
    }
};
