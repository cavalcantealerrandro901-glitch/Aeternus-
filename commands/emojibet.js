const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const DURATION_MS = 60_000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 20;

/** @type {Map<string, object>} */
const sessions = new Map();

const EMOJI_POOL = [
    '😎', '😍', '😂', '👻', '👽', '💀', '🔥', '✨',
    '🌟', '👑', '💎', '🎯', '🚀', '🌌', '🐻', '🐶',
    '🍎', '🍌', '🍉', '🍓', '⚡', '🌈', '🎲', '🎮',
    '🔮', '🐍', '🦄', '🐕', '🦁', '🐺', '🐧', '🧠'
];

const OPEN_PHRASES = [
    'Escolha seu emoji. O destino escolhe o resto.',
    'Uma arena aberta — entre quem quiser arriscar.',
    'Poucos emojis. Um vencedor. Sessenta segundos de tensão.',
    'A sorte não avisa. Só marca quem fica de pé.'
];

const RUN_PHRASES = [
    'Os emojis estão em jogo. Ninguém sai até o fim.',
    'O relógio corre. O vencedor ainda não tem nome.',
    'Sessenta segundos. Um será escolhido.',
    'A arena fechou as portas. Só resta esperar.'
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

function parseMode(args) {
    const raw = String(args?.[0] || '').toLowerCase().trim();
    if (!raw || ['fun', 'diversao', 'diversão', 'brincadeira', 'free', 'gratis', 'grátis'].includes(raw)) {
        return { fun: true, amount: 0 };
    }
    return { fun: false, amountRaw: raw };
}

function listPlayers(session) {
    return [...session.players.values()];
}

function buildEmbed(session, phase) {
    const players = listPlayers(session);
    const lines = [];

    if (phase === 'lobby') {
        lines.push(pick(OPEN_PHRASES));
        lines.push('');
        if (session.fun) {
            lines.push('**Modo:** diversão · sem aposta');
        } else {
            lines.push(`**Aposta:** ✨ **${fmt(session.amount)}** por pessoa`);
            lines.push(`**Potencial:** ✨ **${fmt(session.amount * Math.max(players.length, 1))}**`);
        }
        lines.push(`**Jogadores:** ${players.length}/${MAX_PLAYERS} · mínimo **${MIN_PLAYERS}**`);
        lines.push('');
        if (!players.length) {
            lines.push('_Ninguém entrou ainda. Seja o primeiro._');
        } else {
            for (const p of players) {
                lines.push(`${p.emoji}  **${p.tag}**`);
            }
        }
        lines.push('');
        lines.push('_Participar · depois Iniciar · 60s de disputa._');
    } else if (phase === 'running') {
        lines.push(pick(RUN_PHRASES));
        lines.push('');
        lines.push(`**Tempo:** ~${Math.max(1, Math.ceil((session.endsAt - Date.now()) / 1000))}s`);
        if (!session.fun) {
            lines.push(`**Poço:** ✨ **${fmt(session.amount * players.length)}**`);
        } else {
            lines.push('**Modo:** diversão');
        }
        lines.push('');
        for (const p of players) {
            lines.push(`${p.emoji}  **${p.tag}**`);
        }
    } else if (phase === 'result') {
        const ordered = session.ordered || [];
        const winner = ordered[0];
        lines.push(pick([
            'A sorte falou.',
            'Um emoji sobrou no topo.',
            'Fim da rodada.'
        ]));
        lines.push('');
        if (winner) {
            lines.push(`**1.** ${winner.emoji}  **${winner.tag}**`);
        }
        for (let i = 1; i < ordered.length; i++) {
            const p = ordered[i];
            lines.push(`**${i + 1}.** ${p.emoji}  **${p.tag}**`);
        }
    }

    const title =
        phase === 'result'
            ? '🎲 EmojiBet · Resultado'
            : phase === 'running'
              ? '🎲 EmojiBet · Em jogo'
              : '🎲 EmojiBet';

    const color =
        phase === 'result' ? 0xfbbf24 : phase === 'running' ? 0x38bdf8 : 0xa78bfa;

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(lines.join('\n'))
        .setFooter({
            text: session.fun
                ? `Host: ${session.hostTag} · diversão`
                : `Host: ${session.hostTag} · ✨ ${fmt(session.amount)}`
        });
}

function lobbyRow(sessionId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`emojibet:join:${sessionId}`)
            .setLabel('Participar')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`emojibet:start:${sessionId}`)
            .setLabel('Iniciar')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
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

async function finish(client, sessionId) {
    const session = sessions.get(sessionId);
    if (!session || session.phase === 'done') return;
    session.phase = 'done';

    const players = listPlayers(session);
    if (players.length < MIN_PLAYERS) {
        refundAll(session);
        sessions.delete(sessionId);
        try {
            const ch = await client.channels.fetch(session.channelId).catch(() => null);
            const msg = ch ? await ch.messages.fetch(session.messageId).catch(() => null) : null;
            if (msg) {
                await msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('🎲 EmojiBet cancelado')
                            .setDescription('Poucos jogadores. Aposta devolvida (se houver).')
                    ],
                    components: []
                });
            }
        } catch (_) {}
        return;
    }

    // ordem: vencedor aleatório no topo, resto embaralhado
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const winner = shuffled[0];
    const ordered = [winner, ...shuffled.slice(1)];
    session.ordered = ordered;

    const pot = session.fun ? 0 : session.amount * players.length;
    if (!session.fun && pot > 0) {
        eter.add(winner.id, pot, { reason: 'emojibet win' });
    }

    try {
        const ch = await client.channels.fetch(session.channelId).catch(() => null);
        if (!ch?.isTextBased()) {
            sessions.delete(sessionId);
            return;
        }
        const msg = await ch.messages.fetch(session.messageId).catch(() => null);
        if (msg) {
            await msg.edit({
                embeds: [buildEmbed(session, 'result')],
                components: []
            });
        }

        // mensagem final SEM embed
        const losers = ordered.slice(1);
        const loserMentions = losers.map((p) => `<@${p.id}>`).join(', ');

        let text;
        if (session.fun) {
            text = [
                `${winner.emoji} <@${winner.id}> saiu ganhando — **uma partida valendo nada**.`,
                losers.length
                    ? `${loserMentions} saíram de mãos abanando.`
                    : null
            ]
                .filter(Boolean)
                .join('\n');
        } else {
            text = [
                `${winner.emoji} <@${winner.id}> ganhou com esse emoji e levou ✨ **${fmt(pot)}**.`,
                losers.length
                    ? `${loserMentions} perderam ✨ **${fmt(session.amount)}** cada.`
                    : null
            ]
                .filter(Boolean)
                .join('\n');
        }

        await ch.send({ content: text });
    } catch (e) {
        console.error('[emojibet] finish', e.message);
    }

    sessions.delete(sessionId);
}

async function startGame(interaction, session) {
    if (session.phase !== 'lobby') {
        return interaction.reply({ content: 'Esta rodada já começou ou terminou.', ephemeral: true });
    }
    if (interaction.user.id !== session.hostId) {
        return interaction.reply({
            content: 'Só quem abriu a mesa pode iniciar.',
            ephemeral: true
        });
    }
    const players = listPlayers(session);
    if (players.length < MIN_PLAYERS) {
        return interaction.reply({
            content: `Precisa de pelo menos **${MIN_PLAYERS}** jogadores.`,
            ephemeral: true
        });
    }

    session.phase = 'running';
    session.endsAt = Date.now() + DURATION_MS;

    await interaction.update({
        embeds: [buildEmbed(session, 'running')],
        components: [lobbyRow(session.id, true)]
    });

    // atualiza o contador a cada 10s
    const iv = setInterval(async () => {
        const s = sessions.get(session.id);
        if (!s || s.phase !== 'running') {
            clearInterval(iv);
            return;
        }
        try {
            const ch = await interaction.client.channels.fetch(s.channelId).catch(() => null);
            const msg = ch ? await ch.messages.fetch(s.messageId).catch(() => null) : null;
            if (msg) {
                await msg.edit({ embeds: [buildEmbed(s, 'running')], components: [lobbyRow(s.id, true)] });
            }
        } catch (_) {}
    }, 10_000);

    setTimeout(() => {
        clearInterval(iv);
        finish(interaction.client, session.id);
    }, DURATION_MS);
}

async function createSession(user, channel, mode) {
    let amount = 0;
    let fun = !!mode.fun;

    if (!fun) {
        const bal = eter.get(user.id);
        const bet = resolveBet(mode.amountRaw, bal, { label: '✨' });
        if (!bet.ok) return { ok: false, error: bet.error };
        amount = bet.amount;
        if (amount < 1) return { ok: false, error: 'Aposta inválida.' };
    }

    const sessionId = `${channel.id}_${Date.now().toString(36)}`;
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
        const ok = eter.remove(user.id, amount, { reason: 'emojibet join' });
        if (ok === false || (typeof ok === 'number' && ok < 0)) {
            // remove returns new balance usually
        }
        if (eter.get(user.id) < 0) {
            eter.set(user.id, 0);
        }
        // verify had enough: resolveBet already checked
        hostPlayer.paid = true;
    }

    const session = {
        id: sessionId,
        hostId: user.id,
        hostTag: user.username,
        channelId: channel.id,
        messageId: null,
        fun,
        amount,
        phase: 'lobby',
        players: new Map([[user.id, hostPlayer]]),
        usedEmojis: used,
        endsAt: 0
    };

    sessions.set(sessionId, session);

    const payload = {
        embeds: [buildEmbed(session, 'lobby')],
        components: [lobbyRow(sessionId, false)]
    };

    return { ok: true, session, payload };
}

module.exports = {
    name: 'emojibet',
    aliases: ['emoji', 'emojijogo', 'eb'],
    description: 'Batalha de emojis — aposta ou diversão',
    data: new SlashCommandBuilder()
        .setName('emojibet')
        .setDescription('Batalha de emojis (aposta ou diversão)')
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Aposta em éter, ou "fun" para diversão')
                .setRequired(false)
        ),

    async execute(message, args) {
        const mode = parseMode(args);
        if (!mode.fun && !mode.amountRaw) {
            return message.reply(
                'Uso: `O.emojibet <valor|fun>` — exemplo: `O.emojibet 1k` ou `O.emojibet fun`'
            );
        }
        if (!mode.fun && !args[0]) {
            return message.reply('Informe o valor ou `fun`.');
        }

        // se sem args → fun
        if (!args?.length) mode.fun = true;

        const created = await createSession(message.author, message.channel, mode);
        if (!created.ok) return message.reply(`❌ ${created.error}`);

        const sent = await message.reply(created.payload);
        created.session.messageId = sent.id;
    },

    async executeSlash(i) {
        const valor = i.options.getString('valor');
        const mode = parseMode(valor ? [valor] : []);
        if (!valor) mode.fun = true;

        const created = await createSession(i.user, i.channel, mode);
        if (!created.ok) {
            return i.reply({ content: `❌ ${created.error}`, ephemeral: true });
        }

        await i.reply(created.payload);
        const sent = await i.fetchReply();
        created.session.messageId = sent.id;
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('emojibet:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const sessionId = parts.slice(2).join(':');
        const session = sessions.get(sessionId);

        if (!session) {
            return interaction.reply({
                content: 'Essa mesa encerrou ou expirou.',
                ephemeral: true
            });
        }

        if (action === 'join') {
            if (session.phase !== 'lobby') {
                return interaction.reply({ content: 'As entradas estão fechadas.', ephemeral: true });
            }
            if (session.players.has(interaction.user.id)) {
                return interaction.reply({ content: 'Você já está na mesa.', ephemeral: true });
            }
            if (session.players.size >= MAX_PLAYERS) {
                return interaction.reply({ content: 'Mesa cheia.', ephemeral: true });
            }

            if (!session.fun) {
                const bal = eter.get(interaction.user.id);
                if (bal < session.amount) {
                    return interaction.reply({
                        content: `Saldo insuficiente. Precisa de ✨ **${fmt(session.amount)}**.`,
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

            return interaction.update({
                embeds: [buildEmbed(session, 'lobby')],
                components: [lobbyRow(sessionId, false)]
            });
        }

        if (action === 'start') {
            return startGame(interaction, session);
        }
    }
};
