/**
 * Compat: resultado e again ficam na mensagem principal.
 * Só limpa mensagens antigas de saque separadas.
 */

function isMinesCashMessage(msg, gameId) {
    if (!msg?.components?.length) return false;
    try {
        for (const row of msg.components) {
            for (const c of row.components || []) {
                const id = c.customId || c.data?.custom_id || '';
                if (id === 'minas:cash:' + gameId || id === 'minas:again:' + gameId) {
                    const hasCell = (msg.components || []).some((r) =>
                        (r.components || []).some((x) =>
                            String(x.customId || x.data?.custom_id || '').includes('minas:cell:')
                        )
                    );
                    return !hasCell;
                }
            }
        }
    } catch (_) {}
    return false;
}

async function purgeDuplicateCashMessages(ch, game) {
    if (!ch?.messages?.fetch) return;
    try {
        const fetched = await ch.messages.fetch({ limit: 25 }).catch(() => null);
        if (!fetched) return;
        const botId = ch.client?.user?.id;
        for (const m of fetched.values()) {
            if (botId && m.author?.id !== botId) continue;
            if (game.messageId && m.id === game.messageId) continue;
            if (isMinesCashMessage(m, game.id)) {
                await m.delete().catch(() => {});
            }
        }
    } catch (_) {}
}

/** Não cria mensagem separada — só apaga legado */
async function syncCashMessage(client, game) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch?.isTextBased?.()) return;
        await purgeDuplicateCashMessages(ch, game);
        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) await m.delete().catch(() => {});
            game.cashMessageId = null;
        }
    } catch (_) {}
}

async function deleteCashMessage(client, game) {
    return syncCashMessage(client, game);
}

module.exports = {
    syncCashMessage,
    deleteCashMessage,
    purgeDuplicateCashMessages
};
