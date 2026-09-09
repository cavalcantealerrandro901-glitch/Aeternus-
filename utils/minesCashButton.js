/**
 * Mensagem externa do Mines:
 * em jogo: embed (dica + nº partida + valor atual) + botão Sacar
 * fim: embed de saque/perda + Tentar novamente
 */
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

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

/** Embed em jogo (acima do botão Sacar) */
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

/** Embed de resultado (saque / perda / inatividade) */
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

async function syncCashMessage(client, game, potentialFn, resultText) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch || !ch.isTextBased?.()) return;

        const payload = cashPayload(game, potentialFn, resultText);

        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) {
                await m.edit(payload).catch(() => {});
                return;
            }
        }

        const sent = await ch.send(payload).catch(() => null);
        if (sent) game.cashMessageId = sent.id;
    } catch (e) {
        console.warn('[minesCash] sync:', e.message);
    }
}

async function deleteCashMessage(client, game) {
    if (!client || !game?.channelId || !game.cashMessageId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        const m = await ch?.messages?.fetch(game.cashMessageId).catch(() => null);
        if (m) await m.delete().catch(() => {});
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
