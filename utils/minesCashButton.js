/**
 * Mensagem externa do Mines:
 * em jogo: embed (dica + nº partida) + botão Sacar (uma só)
 * fim: embed de resultado + Tentar novamente
 */
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

/** Evita race: duas syncs ao mesmo tempo criando 2 mensagens */
const syncLocks = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cashRow(game, potentialFn) {
    const ended = !!(game.dead || game.cashed);
    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;
    const canCash = game.opened.size > 0 && !ended;
    const cashLabel = game.fun
        ? 'Encerrar'
        : 'Sacar ' + fmt(pot) + ' Éter';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:cash:' + game.id)
            .setLabel(String(cashLabel).slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '🟩')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:again:' + game.id)
            .setLabel('  Tentar novamente  ')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function tipLine() {
    return 'Avalie o risco antes de revelar a próxima casa.';
}

function partidaLine(game) {
    const n = game.number != null ? game.number : '—';
    return '🎮 Partida nº **#' + n + '**';
}

function playingEmbed(game, pot) {
    const lines = [tipLine(), '', partidaLine(game)];
    if (!game.fun && game.opened.size > 0) {
        lines.splice(1, 0, '', 'Valor atual se sacar agora: **✨ ' + fmt(pot) + '**');
    }
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('💣 Mines')
        .setDescription(lines.join('\n'));
}

function resultEmbed(game, resultText) {
    const dead = !!game.dead;
    const idle = !!game._idleAuto;

    let color = 0x57f287;
    let title = '💰 Saque seguro';
    if (dead) {
        color = 0xed4245;
        title = '💥 Explodiu';
    } else if (idle) {
        color = 0xf59e0b;
        title = '⏱️ Saque automático';
    } else if (game.fun) {
        color = 0x5865f2;
        title = '🏁 Partida encerrada';
    }

    const desc = [String(resultText || '').trim(), '', partidaLine(game)]
        .filter((x, i, a) => x || a[i - 1])
        .join('\n');

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc || 'Partida encerrada.');
}

function cashPayload(game, potentialFn, resultText) {
    const ended = !!(game.dead || game.cashed);

    if (ended) {
        return {
            content: null,
            embeds: [resultEmbed(game, resultText)],
            components: [againRow(game)]
        };
    }

    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;

    return {
        content: null,
        embeds: [playingEmbed(game, pot)],
        components: [cashRow(game, potentialFn)]
    };
}

function isMinesCashMessage(msg, gameId) {
    if (!msg?.components?.length) return false;
    try {
        for (const row of msg.components) {
            for (const c of row.components || []) {
                const id = c.customId || c.data?.custom_id || '';
                if (
                    id === 'minas:cash:' + gameId ||
                    id === 'minas:again:' + gameId ||
                    (typeof id === 'string' && id.startsWith('minas:cash:' + gameId))
                ) {
                    return true;
                }
            }
        }
    } catch (_) {}
    return false;
}

async function purgeDuplicateCashMessages(ch, game, keepId) {
    if (!ch?.messages?.fetch) return;
    try {
        const fetched = await ch.messages.fetch({ limit: 30 }).catch(() => null);
        if (!fetched) return;
        const botId = ch.client?.user?.id;
        for (const m of fetched.values()) {
            if (keepId && m.id === keepId) continue;
            if (botId && m.author?.id !== botId) continue;
            if (isMinesCashMessage(m, game.id)) {
                await m.delete().catch(() => {});
            }
        }
    } catch (_) {}
}

async function syncCashMessage(client, game, potentialFn, resultText) {
    if (!client || !game?.channelId) return;

    const prev = syncLocks.get(game.id) || Promise.resolve();
    let release;
    const gate = new Promise((r) => {
        release = r;
    });
    syncLocks.set(
        game.id,
        prev.then(() => gate).catch(() => gate)
    );
    await prev.catch(() => {});

    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch || !ch.isTextBased?.()) return;

        const payload = cashPayload(game, potentialFn, resultText);

        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) {
                await m.edit(payload).catch(() => {});
                await purgeDuplicateCashMessages(ch, game, m.id);
                return;
            }
            game.cashMessageId = null;
        }

        try {
            const fetched = await ch.messages.fetch({ limit: 20 }).catch(() => null);
            if (fetched) {
                const botId = client.user?.id;
                for (const m of fetched.values()) {
                    if (botId && m.author?.id !== botId) continue;
                    if (isMinesCashMessage(m, game.id)) {
                        game.cashMessageId = m.id;
                        await m.edit(payload).catch(() => {});
                        await purgeDuplicateCashMessages(ch, game, m.id);
                        return;
                    }
                }
            }
        } catch (_) {}

        const sent = await ch.send(payload).catch(() => null);
        if (sent) {
            game.cashMessageId = sent.id;
            await purgeDuplicateCashMessages(ch, game, sent.id);
        }
    } catch (e) {
        console.warn('[minesCash] sync:', e.message);
    } finally {
        release();
    }
}

async function deleteCashMessage(client, game) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch) {
            game.cashMessageId = null;
            return;
        }
        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) await m.delete().catch(() => {});
        }
        await purgeDuplicateCashMessages(ch, game, null);
    } catch (_) {}
    game.cashMessageId = null;
}

module.exports = {
    cashRow,
    againRow,
    cashPayload,
    syncCashMessage,
    deleteCashMessage,
    resultEmbed,
    playingEmbed,
    tipLine,
    partidaLine
};
