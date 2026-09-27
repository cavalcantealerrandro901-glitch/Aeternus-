const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const loritta = require('../utils/loritta');
const { resolveBet } = require('../utils/parseAmount');
const queue = require('../utils/waitQueue');

const Q = 'cambio';
/** ID oficial da Loritta no Discord */
const LORITTA_BOT_ID = '297153970613387264';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function ownerId() {
    return String(process.env.OWNER_ID || process.env.LORITTA_TREASURY_ID || '').trim();
}

function isStaff(userId) {
    const o = ownerId();
    if (o && String(userId) === o) return true;
    const extra = String(process.env.CAMBIO_STAFF_IDS || '')
        .split(/[,\s]+/)
        .filter(Boolean);
    return extra.includes(String(userId));
}

/** Conta que recebe/envia sonhos no câmbio = o próprio bot Aeternus */
function treasuryUserId(client) {
    const env =
        String(process.env.CAMBIO_BOT_ID || process.env.LORITTA_TREASURY_ID || '').trim();
    if (env) return env;
    return client?.user?.id ? String(client.user.id) : '';
}

function rateEmbed(client) {
    const rate = loritta.sonhosPerEter();
    const st = queue.stats(Q);
    const botId = treasuryUserId(client);
    return new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💱 Câmbio · Éter ⇄ Sonhos')
        .setDescription(
            [
                'Troca entre **Éter (Aeternus)** e **Sonhos (Loritta)**.',
                'Os sonhos vão para / vêm do **bot Aeternus** via Loritta — sem pagamento manual da staff.',
                '',
                `**Taxa:** \`1\` ✨ = **${fmt(rate)}** 💤`,
                `**Fila:** **${st.waiting}** aguardando · **${st.serving}** em atendimento`,
                botId ? `**Tesouraria (bot):** <@${botId}>` : '',
                `**Loritta:** <@${LORITTA_BOT_ID}>`,
                '',
                '**Comandos**',
                '`O.cambio comprar <éter>` — retém éter e solicita sonhos pela Loritta',
                '`O.cambio vender <sonhos>` — você paga sonhos ao bot pela Loritta',
                '`O.cambio fila` — posição na fila',
                '`O.cambio sair` — sair (reembolsa compra)',
                '`O.cambio saldo` — éter + sonhos',
                '',
                '**Staff**',
                '`O.cambio proximo` — atende o próximo (processa transferência Loritta)',
                '`O.cambio pedidos` — lista a fila'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: 'Aeternus × Loritta · transfer bot' })
        .setTimestamp();
}

function filaEmbed() {
    const waiting = queue.listWaiting(Q);
    const st = queue.stats(Q);
    const lines = waiting.slice(0, 20).map((item, i) => {
        const p = item.payload || {};
        const kind = p.type === 'buy' ? '🛒' : '💰';
        return `**#${i + 1}** ${kind} <@${item.userId}> · ✨${fmt(p.eter || 0)} · 💤${fmt(p.sonhos || 0)}`;
    });
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('📋 Fila de câmbio')
        .setDescription(
            [
                `Aguardando: **${st.waiting}** · Em atendimento: **${st.serving}**`,
                '',
                lines.length ? lines.join('\n') : '_Fila vazia._',
                waiting.length > 20 ? `\n_…e mais ${waiting.length - 20}_` : ''
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setTimestamp();
}

function staffRow(id, type) {
    if (type === 'buy') {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cambio:staff_done_buy:' + id)
                .setLabel('Confirmar sonhos enviados (API)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cambio:staff_reject:' + id)
                .setLabel('Recusar / reembolsar')
                .setStyle(ButtonStyle.Danger)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cambio:staff_credit:' + id)
            .setLabel('Creditar éter (sonhos no bot)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cambio:staff_reject:' + id)
            .setLabel('Recusar')
            .setStyle(ButtonStyle.Danger)
    );
}

/**
 * Tenta enviar sonhos ao usuário via API Loritta (transfer do token / request).
 * Destino de tesouraria nas vendas = bot Aeternus.
 */
async function trySendSonhosToUser(message, userId, sonhos) {
    if (!loritta.configured() || !message.guild) {
        return { ok: false, error: 'API Loritta não configurada ou fora de servidor.' };
    }
    const reason = 'Cambio Aeternus: compra de sonhos com eter';
    // 1) transferência direta (só funciona com token de bot oficial)
    try {
        const tr = await loritta.transferSonhos({
            guildId: message.guild.id,
            channelId: message.channel.id,
            receiverId: userId,
            quantity: sonhos,
            reason,
            expiresAfterMillis: 30 * 60 * 1000
        });
        if (tr.ok) return { ok: true, mode: 'transfer', data: tr.data };
    } catch (_) {}

    // 2) solicitação (pagador = conta do token confirma na Loritta)
    try {
        const req = await loritta.requestSonhosTransfer({
            guildId: message.guild.id,
            channelId: message.channel.id,
            senderId: treasuryUserId(message.client) || ownerId(),
            receiverId: userId,
            quantity: sonhos,
            reason,
            expiresAfterMillis: 30 * 60 * 1000
        });
        if (req.ok) return { ok: true, mode: 'request', data: req.data };
        return { ok: false, error: req.error || 'Falha na solicitação' };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
}

async function tryRequestUserPayBot(message, userId, botId, sonhos) {
    if (!loritta.configured() || !message.guild) {
        return { ok: false, error: 'API Loritta não configurada.' };
    }
    try {
        const req = await loritta.requestSonhosTransfer({
            guildId: message.guild.id,
            channelId: message.channel.id,
            senderId: userId,
            receiverId: botId,
            quantity: sonhos,
            reason: 'Cambio Aeternus: venda de sonhos por eter',
            expiresAfterMillis: 30 * 60 * 1000
        });
        if (req.ok) return { ok: true, data: req.data };
        return { ok: false, error: req.error || 'Falha na solicitação' };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
}

module.exports = {
    name: 'cambio',
    aliases: ['câmbio', 'loritta', 'sonhos', 'exchange'],
    description: 'Câmbio Éter ↔ Sonhos (transferência Loritta ↔ bot)',

    async execute(message, args) {
        const sub = String(args[0] || 'ajuda').toLowerCase();
        const botId = treasuryUserId(message.client);

        if (['ajuda', 'help', 'taxa', 'info', 'rate'].includes(sub) || !args.length) {
            return message.reply({ embeds: [rateEmbed(message.client)] });
        }

        if (sub === 'fila' || sub === 'queue' || sub === 'lista') {
            const emb = filaEmbed();
            const mine = queue.positionOf(Q, message.author.id);
            if (mine) {
                emb.addFields({
                    name: 'Sua posição',
                    value: `Você é o **#${mine.position}** de **${mine.total}** na fila.`
                });
            }
            return message.reply({ embeds: [emb] });
        }

        if (sub === 'sair' || sub === 'leave' || sub === 'cancelar') {
            const pos = queue.positionOf(Q, message.author.id);
            if (!pos) return message.reply('Você não está na fila de câmbio.');
            const item = pos.item;
            const p = item.payload || {};
            queue.leave(Q, item.id);
            if (p.type === 'buy' && p.eter) {
                eter.add(message.author.id, p.eter, { reason: 'cambio_queue_leave_refund' });
            }
            return message.reply(
                '✅ Você saiu da fila.' +
                    (p.type === 'buy' ? ` ✨ **${fmt(p.eter)}** reembolsados.` : '')
            );
        }

        if (sub === 'saldo' || sub === 'bal') {
            const et = eter.get(message.author.id);
            let sonhosLine = '_API Loritta indisponível._';
            if (loritta.configured()) {
                try {
                    const u = await loritta.getUser(message.author.id);
                    sonhosLine = `💤 **${fmt(u.sonhos)}** sonhos`;
                } catch (e) {
                    sonhosLine = `⚠️ Loritta: ${e.response?.status || e.message}`;
                }
            }
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('💱 Seu saldo')
                        .setDescription(
                            [
                                `✨ **${fmt(et)}** éter`,
                                sonhosLine,
                                `Taxa: 1✨ = **${fmt(loritta.sonhosPerEter())}**💤`,
                                botId ? `Bot (tesouraria): <@${botId}>` : '',
                                `Loritta: <@${LORITTA_BOT_ID}>`
                            ]
                                .filter(Boolean)
                                .join('\n')
                        )
                ]
            });
        }

        if (sub === 'proximo' || sub === 'próximo' || sub === 'next') {
            if (!isStaff(message.author.id)) {
                return message.reply('❌ Só staff chama o próximo.');
            }
            const res = queue.next(Q);
            if (!res.ok) return message.reply('📭 ' + res.error);

            const item = res.item;
            const p = item.payload || {};

            if (p.type === 'buy') {
                const api = await trySendSonhosToUser(message, item.userId, p.sonhos);
                let apiLine;
                if (api.ok) {
                    apiLine =
                        api.mode === 'transfer'
                            ? '✅ **Transferência Loritta enviada** ao usuário.'
                            : '📬 **Solicitação Loritta criada** — confirme na Lori se pedido aparecer.';
                } else {
                    apiLine =
                        '⚠️ Não foi possível enviar pela API: `' +
                        (api.error || 'erro') +
                        '`. Use o botão para confirmar depois que a Loritta processar, ou recuse.';
                }

                return message.reply({
                    content: `<@${item.userId}> — sua vez na fila de câmbio!`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xfbbf24)
                            .setTitle('🔔 Próximo · compra de sonhos')
                            .setDescription(
                                [
                                    '**Tipo:** 🛒 Comprar sonhos',
                                    `**User:** <@${item.userId}>`,
                                    `**Éter retido:** ✨ **${fmt(p.eter)}**`,
                                    `**Sonhos:** 💤 **${fmt(p.sonhos)}**`,
                                    `**Via:** <@${LORITTA_BOT_ID}> → usuário`,
                                    '',
                                    apiLine
                                ].join('\n')
                            )
                            .setFooter({ text: `ID: ${item.id}` })
                            .setTimestamp()
                    ],
                    components: [staffRow(item.id, 'buy')]
                });
            }

            // sell
            return message.reply({
                content: `<@${item.userId}> — sua vez na fila de câmbio!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('🔔 Próximo · venda de sonhos')
                        .setDescription(
                            [
                                '**Tipo:** 💰 Vender sonhos',
                                `**User:** <@${item.userId}>`,
                                `**Sonhos → bot:** 💤 **${fmt(p.sonhos)}** para <@${botId}>`,
                                `**Creditar:** ✨ **${fmt(p.eter)}**`,
                                '',
                                'O usuário deve transferir sonhos ao **bot Aeternus** pela Loritta.',
                                'Quando os sonhos estiverem na conta do bot, clique em **Creditar éter**.'
                            ].join('\n')
                        )
                        .setFooter({ text: `ID: ${item.id}` })
                        .setTimestamp()
                ],
                components: [staffRow(item.id, 'sell')]
            });
        }

        if (sub === 'pedidos' || sub === 'list') {
            if (!isStaff(message.author.id)) {
                return message.reply('❌ Só staff.');
            }
            return message.reply({ embeds: [filaEmbed()] });
        }

        // COMPRAR
        if (['comprar', 'buy', 'pedir'].includes(sub)) {
            const already = queue.positionOf(Q, message.author.id);
            if (already) {
                return message.reply(
                    `Você já está na fila na posição **#${already.position}**. Use \`O.cambio fila\` ou \`O.cambio sair\`.`
                );
            }

            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply('Uso: `O.cambio comprar <éter>`\nEx.: `O.cambio comprar 100`');
            }

            const bal = eter.get(message.author.id);
            const bet = resolveBet(raw, bal, { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            if (bet.amount < 1) return message.reply('❌ Mínimo **1** éter.');

            const sonhos = Math.floor(bet.amount * loritta.sonhosPerEter());
            if (sonhos < 1) return message.reply('❌ Quantidade inválida.');

            const took = eter.remove(message.author.id, bet.amount, { reason: 'cambio_queue_hold' });
            if (!took) return message.reply('❌ Falha ao reter éter.');

            const joined = queue.join(Q, {
                userId: message.author.id,
                payload: {
                    type: 'buy',
                    eter: bet.amount,
                    sonhos,
                    userTag: message.author.tag,
                    channelId: message.channel.id
                }
            });

            if (!joined.ok) {
                eter.add(message.author.id, bet.amount, { reason: 'cambio_queue_join_fail_refund' });
                return message.reply('❌ ' + joined.error);
            }

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setTitle('✅ Entrou na fila de câmbio')
                        .setDescription(
                            [
                                `**Posição:** #**${joined.position}**`,
                                '**Tipo:** 🛒 Comprar sonhos',
                                `**Retido:** ✨ **${fmt(bet.amount)}**`,
                                `**Você recebe:** 💤 **${fmt(sonhos)}** via <@${LORITTA_BOT_ID}>`,
                                '',
                                'Quando for sua vez, a staff processa a transferência Loritta → você.',
                                'Sair: `O.cambio sair` (reembolsa o éter).'
                            ].join('\n')
                        )
                        .setFooter({ text: `ID: ${joined.id}` })
                ]
            });
        }

        // VENDER
        if (['vender', 'sell'].includes(sub)) {
            const already = queue.positionOf(Q, message.author.id);
            if (already) {
                return message.reply(
                    `Você já está na fila na posição **#${already.position}**. Use \`O.cambio sair\` antes.`
                );
            }

            if (!botId) {
                return message.reply('❌ Bot ainda não está pronto (sem ID de tesouraria).');
            }

            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply('Uso: `O.cambio vender <sonhos>`');
            }
            const sonhos = Math.floor(Number(String(raw).replace(/[^\d]/g, '')) || 0);
            if (sonhos < loritta.sonhosPerEter()) {
                return message.reply('❌ Mínimo **' + fmt(loritta.sonhosPerEter()) + '** sonhos.');
            }
            const eterOut = Math.floor(sonhos / loritta.sonhosPerEter());

            const joined = queue.join(Q, {
                userId: message.author.id,
                payload: {
                    type: 'sell',
                    eter: eterOut,
                    sonhos,
                    botId,
                    userTag: message.author.tag,
                    channelId: message.channel.id
                }
            });

            if (!joined.ok) return message.reply('❌ ' + joined.error);

            // Solicita transferência Loritta: usuário → bot Aeternus
            let apiNote = '';
            const api = await tryRequestUserPayBot(message, message.author.id, botId, sonhos);
            if (api.ok) {
                const tid = api.data?.id || api.data?.sonhosTransferId || '';
                apiNote =
                    '\n\n📬 **Pedido de transferência criado na Loritta**' +
                    (tid ? ` (id \`${tid}\`)` : '') +
                    `.\nConfirme o pagamento na <@${LORITTA_BOT_ID}> para enviar 💤 ao bot <@${botId}>.`;
            } else {
                apiNote =
                    '\n\n⚠️ API: `' +
                    (api.error || 'indisponível') +
                    ``.\nTransfira **pela Loritta** os sonhos para o bot:\n` +
                    `Mencione <@${LORITTA_BOT_ID}> e envie **${fmt(sonhos)}** 💤 para <@${botId}>.`;
            }

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('✅ Entrou na fila de câmbio')
                        .setDescription(
                            [
                                '**Posição:** #**' + joined.position + '**',
                                '**Tipo:** 💰 Vender sonhos',
                                `**Enviar:** 💤 **${fmt(sonhos)}** → <@${botId}> (via <@${LORITTA_BOT_ID}>)`,
                                `**Recebe:** ✨ **${fmt(eterOut)}** após confirmação`,
                                '',
                                'Não use pagamento manual para staff. Só transferência **Loritta → bot Aeternus**.' +
                                    apiNote
                            ].join('\n')
                        )
                        .setFooter({ text: 'ID: ' + joined.id })
                ]
            });
        }

        return message.reply({ embeds: [rateEmbed(message.client)] });
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('cambio:')) return false;
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const id = parts.slice(2).join(':');
        const item = queue.getById(Q, id);

        if (!item || (item.status !== 'serving' && item.status !== 'waiting')) {
            return interaction.reply({
                content: 'Pedido não está ativo na fila.',
                ephemeral: true
            });
        }

        const p = item.payload || {};

        if (action === 'staff_done_buy') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            queue.complete(Q, id);
            return interaction.update({
                content: `✅ <@${item.userId}> — compra concluída (**💤 ${fmt(p.sonhos)}** via Loritta).`,
                embeds: [],
                components: []
            });
        }

        if (action === 'staff_credit') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            if (p.type !== 'sell') {
                return interaction.reply({ content: 'Tipo inválido.', ephemeral: true });
            }
            eter.add(item.userId, p.eter, { reason: 'cambio_queue_sell_credit' });
            queue.complete(Q, id);
            return interaction.update({
                content: `✅ <@${item.userId}> recebeu **✨ ${fmt(p.eter)}** (sonhos creditados no bot).`,
                embeds: [],
                components: []
            });
        }

        if (action === 'staff_reject') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            if (p.type === 'buy' && p.eter) {
                eter.add(item.userId, p.eter, { reason: 'cambio_queue_reject_refund' });
            }
            queue.leave(Q, id);
            return interaction.update({
                content:
                    `❌ Pedido de <@${item.userId}> recusado.` +
                    (p.type === 'buy' ? ` ✨ **${fmt(p.eter)}** reembolsados.` : ''),
                embeds: [],
                components: []
            });
        }

        return false;
    }
};
