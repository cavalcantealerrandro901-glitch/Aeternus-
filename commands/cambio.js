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

function rateEmbed() {
    const rate = loritta.sonhosPerEter();
    const st = queue.stats(Q);
    return new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💱 Câmbio · Éter ⇄ Sonhos (Loritta)')
        .setDescription(
            [
                'Câmbio por **fila de espera** + aprovação da staff.',
                `(API da Loritta não transfere sonhos com token de usuário.)`,
                '',
                `**Taxa:** \`1\` ✨ = **${fmt(rate)}** 💤`,
                `**Fila agora:** **${st.waiting}** aguardando · **${st.serving}** em atendimento`,
                '',
                '**Usuário**',
                '`O.cambio comprar <éter>` — entra na fila (Éter retido)',
                '`O.cambio vender <sonhos>` — entra na fila (você envia +pay)',
                '`O.cambio fila` — ver a fila e sua posição',
                '`O.cambio sair` — sair da fila (reembolsa se compra)',
                '`O.cambio saldo` — Éter + Sonhos',
                '',
                '**Staff**',
                '`O.cambio proximo` — chama o próximo da fila',
                '`O.cambio pedidos` — lista completa',
                '',
                '_Botões na mensagem do pedido para concluir/recusar._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus × Loritta · fila FIFO' })
        .setTimestamp();
}

function filaEmbed(client) {
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
                .setCustomId('cambio:staff_paid:' + id)
                .setLabel('Já enviei os sonhos')
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
            .setLabel('Creditar éter')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cambio:staff_reject:' + id)
            .setLabel('Recusar')
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    name: 'cambio',
    aliases: ['câmbio', 'loritta', 'sonhos', 'exchange'],
    description: 'Câmbio Éter ↔ Sonhos com fila de espera',

    async execute(message, args) {
        const sub = String(args[0] || 'ajuda').toLowerCase();

        if (['ajuda', 'help', 'taxa', 'info', 'rate'].includes(sub) || !args.length) {
            return message.reply({ embeds: [rateEmbed()] });
        }

        if (sub === 'fila' || sub === 'queue' || sub === 'lista') {
            const emb = filaEmbed(message.client);
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
                                `Taxa: 1✨ = **${fmt(loritta.sonhosPerEter())}**💤`
                            ].join('\n')
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
            const o = ownerId();

            let desc;
            if (p.type === 'buy') {
                desc = [
                    `**#1 da fila → atendimento**`,
                    `**Tipo:** 🛒 Comprar sonhos`,
                    `**User:** <@${item.userId}>`,
                    `**Retido:** ✨ **${fmt(p.eter)}**`,
                    `**Enviar:** 💤 **${fmt(p.sonhos)}**`,
                    '',
                    'Na Loritta:',
                    '```',
                    `+pay <@${item.userId}> ${p.sonhos}`,
                    '```',
                    'Depois use os botões abaixo.'
                ].join('\n');
            } else {
                desc = [
                    `**#1 da fila → atendimento**`,
                    `**Tipo:** 💰 Vender sonhos`,
                    `**User:** <@${item.userId}>`,
                    `**Deve ter enviado:** 💤 **${fmt(p.sonhos)}** para <@${o}>`,
                    `**Creditar:** ✨ **${fmt(p.eter)}**`,
                    '',
                    'Confira o `+pay` e clique em **Creditar éter**.'
                ].join('\n');
            }

            return message.reply({
                content: `<@${item.userId}> — sua vez na fila de câmbio!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('🔔 Próximo da fila')
                        .setDescription(desc)
                        .setFooter({ text: `ID: ${item.id}` })
                        .setTimestamp()
                ],
                components: [staffRow(item.id, p.type)]
            });
        }

        if (sub === 'pedidos' || sub === 'list') {
            if (!isStaff(message.author.id)) {
                return message.reply('❌ Só staff.');
            }
            return message.reply({ embeds: [filaEmbed(message.client)] });
        }

        // COMPRAR
        if (['comprar', 'buy', 'pedir', 'apelar', 'apelacao', 'apelação'].includes(sub)) {
            const already = queue.positionOf(Q, message.author.id);
            if (already) {
                return message.reply(
                    `Você já está na fila na posição **#${already.position}**. Use \`O.cambio fila\` ou \`O.cambio sair\`.`
                );
            }

            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply(
                    'Uso: `O.cambio comprar <éter>`\nEx.: `O.cambio comprar 100`'
                );
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
                                `**Tipo:** 🛒 Comprar sonhos`,
                                `**Retido:** ✨ **${fmt(bet.amount)}**`,
                                `**Você recebe:** 💤 **${fmt(sonhos)}** (quando for atendido)`,
                                '',
                                'Aguarde a staff chamar com `O.cambio proximo`.',
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

            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply('Uso: `O.cambio vender <sonhos>`');
            }
            const sonhos = Math.floor(Number(String(raw).replace(/[^\d]/g, '')) || 0);
            if (sonhos < loritta.sonhosPerEter()) {
                return message.reply(
                    '❌ Mínimo **' + fmt(loritta.sonhosPerEter()) + '** sonhos.'
                );
            }
            const eterOut = Math.floor(sonhos / loritta.sonhosPerEter());
            const o = ownerId();
            if (!o) return message.reply('❌ `OWNER_ID` não configurado.');

            const joined = queue.join(Q, {
                userId: message.author.id,
                payload: {
                    type: 'sell',
                    eter: eterOut,
                    sonhos,
                    ownerId: o,
                    userTag: message.author.tag,
                    channelId: message.channel.id
                }
            });

            if (!joined.ok) return message.reply('❌ ' + joined.error);

            // Tenta fluxo oficial de solicitação (pagador confirma na Loritta)
            let apiNote = '';
            if (loritta.configured() && message.guild) {
                try {
                    const req = await loritta.requestSonhosTransfer({
                        guildId: message.guild.id,
                        channelId: message.channel.id,
                        senderId: message.author.id,
                        receiverId: o,
                        quantity: sonhos,
                        reason: 'Cambio Aeternus: vender sonhos por eter',
                        expiresAfterMillis: 30 * 60 * 1000
                    });
                    if (req.ok) {
                        const tid = req.data?.id || req.data?.sonhosTransferId || '';
                        apiNote =
                            '\n\n📬 **Solicitação enviada à Loritta**' +
                            (tid ? ` (id \`' + tid + '\`)` : '') +
                            '. Confirme o pagamento no canal se a Lori postar o pedido.';
                    } else {
                        apiNote =
                            '\n\n⚠️ API solicitação: ' +
                            req.error +
                            ' — use `+pay` manualmente.';
                    }
                } catch (e) {
                    apiNote = '\n\n⚠️ API: ' + (e.message || e) + ' — use `+pay` manualmente.';
                }
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
                                '**Enviar:** 💤 **' + fmt(sonhos) + '** para <@' + o + '>',
                                '```',
                                '+pay <@' + o + '> ' + sonhos,
                                '```',
                                '**Recebe:** ✨ **' + fmt(eterOut) + '** (após staff confirmar)',
                                '',
                                'Aguarde `O.cambio proximo` da staff.' + apiNote
                            ].join('\n')
                        )
                        .setFooter({ text: 'ID: ' + joined.id })
                ]
            });
        }

        return message.reply({ embeds: [rateEmbed()] });
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

        if (action === 'staff_paid') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            queue.complete(Q, id);
            return interaction.update({
                content: `✅ <@${item.userId}> — **💤 ${fmt(p.sonhos)}** enviados. Fila: pedido concluído.`,
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
                content: `✅ <@${item.userId}> recebeu **✨ ${fmt(p.eter)}**.`,
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
