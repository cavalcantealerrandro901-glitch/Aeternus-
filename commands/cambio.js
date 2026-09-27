const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const loritta = require('../utils/loritta');
const { resolveBet } = require('../utils/parseAmount');
const store = require('../utils/store');

const PENDING_KEY = 'loritta_exchange_pending.json';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function loadPending() {
    return store.load(PENDING_KEY, {});
}
function savePending(data) {
    store.save(PENDING_KEY, data);
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
    return new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💱 Câmbio · Éter ⇄ Sonhos (Loritta)')
        .setDescription(
            [
                'A API pública da Loritta **não permite** transferir sonhos com token de usuário',
                '(`Only bots can use this endpoint`). O câmbio funciona por **pedido + aprovação**.',
                '',
                `**Taxa:** \`1\` ✨ = **${fmt(rate)}** 💤  ·  **${fmt(rate)}** 💤 = \`1\` ✨`,
                '',
                '**Comandos**',
                '`O.cambio comprar <éter>` — pede Sonhos (é debitado Éter; staff envia na Loritta)',
                '`O.cambio vender <sonhos>` — você envia Sonhos no `+pay` e pede Éter',
                '`O.cambio pedidos` — lista pedidos abertos (staff)',
                '`O.cambio saldo` — seu Éter + Sonhos (consulta API)',
                '`O.cambio taxa` — ver taxa',
                '',
                '_Staff aprova com os botões da mensagem do pedido._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus × Loritta · pedido/apelação' })
        .setTimestamp();
}

module.exports = {
    name: 'cambio',
    aliases: ['câmbio', 'loritta', 'sonhos', 'exchange'],
    description: 'Trocar Éter do Aeternus por Sonhos da Loritta (pedido + staff)',

    async execute(message, args) {
        const sub = String(args[0] || 'ajuda').toLowerCase();

        if (['ajuda', 'help', 'taxa', 'info', 'rate'].includes(sub) || !args.length) {
            return message.reply({ embeds: [rateEmbed()] });
        }

        if (sub === 'saldo' || sub === 'bal') {
            const et = eter.get(message.author.id);
            let sonhosLine = '_API Loritta não configurada ou indisponível._';
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
                                `✨ **${fmt(et)}** éter (Aeternus)`,
                                sonhosLine,
                                '',
                                `Taxa: 1✨ = **${fmt(loritta.sonhosPerEter())}**💤`
                            ].join('\n')
                        )
                        .setTimestamp()
                ]
            });
        }

        // —— COMPRAR: Éter → pedido de Sonhos (staff paga na Loritta) ——
        if (['comprar', 'buy', 'pedir', 'apelar', 'apelacao', 'apelação'].includes(sub)) {
            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply(
                    'Uso: `O.cambio comprar <éter>`\nEx.: `O.cambio comprar 100` → pedido de **' +
                        fmt(100 * loritta.sonhosPerEter()) +
                        '** sonhos'
                );
            }

            const bal = eter.get(message.author.id);
            const bet = resolveBet(raw, bal, { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            if (bet.amount < 1) return message.reply('❌ Mínimo **1** éter.');

            const sonhos = Math.floor(bet.amount * loritta.sonhosPerEter());
            if (sonhos < 1) return message.reply('❌ Quantidade de sonhos inválida.');

            const took = eter.remove(message.author.id, bet.amount, {
                reason: 'cambio_buy_hold'
            });
            if (!took) return message.reply('❌ Não foi possível debitar o éter.');

            const id = message.author.id + '_buy_' + Date.now();
            const pending = loadPending();
            pending[id] = {
                type: 'buy',
                userId: message.author.id,
                userTag: message.author.tag,
                eter: bet.amount,
                sonhos,
                at: Date.now(),
                channelId: message.channel.id,
                guildId: message.guild?.id || null,
                status: 'pending'
            };
            savePending(pending);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cambio:staff_paid:' + id)
                    .setLabel('Já enviei os sonhos')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cambio:staff_reject:' + id)
                    .setLabel('Recusar / reembolsar')
                    .setStyle(ButtonStyle.Danger)
            );

            const o = ownerId();
            const ping = o ? `<@${o}>` : 'staff';

            return message.reply({
                content: ping,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('📨 Pedido de câmbio · Éter → Sonhos')
                        .setDescription(
                            [
                                `**Solicitante:** <@${message.author.id}> (\`${message.author.id}\`)`,
                                `**Paga:** ✨ **${fmt(bet.amount)}** (já retido no Aeternus)`,
                                `**Recebe:** 💤 **${fmt(sonhos)}** sonhos na Loritta`,
                                '',
                                '**Staff:** envie na Loritta:',
                                '```',
                                `+pay <@${message.author.id}> ${sonhos}`,
                                '```',
                                'Depois clique em **Já enviei os sonhos**.',
                                'Se não puder cumprir, use **Recusar / reembolsar**.',
                                '',
                                `_ID do pedido: \`${id}\` · expira em 24h_`
                            ].join('\n')
                        )
                        .setTimestamp()
                ],
                components: [row]
            });
        }

        // —— VENDER: Sonhos → Éter ——
        if (['vender', 'sell'].includes(sub)) {
            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply(
                    'Uso: `O.cambio vender <sonhos>`\nEx.: `O.cambio vender 1000` → **' +
                        fmt(Math.floor(1000 / loritta.sonhosPerEter())) +
                        '** éter'
                );
            }
            const sonhos = Math.floor(Number(String(raw).replace(/[^\d]/g, '')) || 0);
            if (sonhos < loritta.sonhosPerEter()) {
                return message.reply(
                    '❌ Mínimo **' + fmt(loritta.sonhosPerEter()) + '** sonhos (1 éter).'
                );
            }
            const eterOut = Math.floor(sonhos / loritta.sonhosPerEter());
            if (eterOut < 1) return message.reply('❌ Valor muito baixo.');

            const o = ownerId();
            if (!o) {
                return message.reply('❌ `OWNER_ID` não configurado (quem recebe os sonhos).');
            }

            const id = message.author.id + '_sell_' + Date.now();
            const pending = loadPending();
            pending[id] = {
                type: 'sell',
                userId: message.author.id,
                userTag: message.author.tag,
                eter: eterOut,
                sonhos,
                ownerId: o,
                at: Date.now(),
                channelId: message.channel.id,
                status: 'pending'
            };
            savePending(pending);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cambio:user_sent:' + id)
                    .setLabel('Já enviei no +pay')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('cambio:staff_credit:' + id)
                    .setLabel('Staff: creditar éter')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cambio:cancel:' + id)
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('📨 Pedido de câmbio · Sonhos → Éter')
                        .setDescription(
                            [
                                `**Solicitante:** <@${message.author.id}>`,
                                `**Envia:** 💤 **${fmt(sonhos)}** sonhos`,
                                `**Recebe:** ✨ **${fmt(eterOut)}** éter`,
                                '',
                                '1. Na Loritta, envie para o tesouro:',
                                '```',
                                `+pay <@${o}> ${sonhos}`,
                                '```',
                                '2. Clique em **Já enviei no +pay**.',
                                '3. Staff confere e clica **Staff: creditar éter**.',
                                '',
                                `_ID: \`${id}\` · expira em 24h_`
                            ].join('\n')
                        )
                        .setTimestamp()
                ],
                components: [row]
            });
        }

        if (sub === 'pedidos' || sub === 'list') {
            if (!isStaff(message.author.id)) {
                return message.reply('❌ Só staff vê todos os pedidos.');
            }
            const pending = loadPending();
            const list = Object.entries(pending)
                .filter(([, p]) => p.status === 'pending')
                .slice(0, 15);
            if (!list.length) return message.reply('Nenhum pedido aberto.');
            const lines = list.map(([id, p]) => {
                const kind = p.type === 'buy' ? '🛒 buy' : '💰 sell';
                return `\`${id.slice(-12)}\` ${kind} <@${p.userId}> · ✨${fmt(p.eter)} · 💤${fmt(p.sonhos)}`;
            });
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('📋 Pedidos de câmbio abertos')
                        .setDescription(lines.join('\n'))
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
        const pending = loadPending();
        const p = pending[id];

        if (!p || p.status !== 'pending') {
            return interaction.reply({
                content: 'Pedido inexistente, já resolvido ou expirado.',
                ephemeral: true
            });
        }

        if (Date.now() - p.at > 24 * 60 * 60 * 1000) {
            if (p.type === 'buy' && p.eter) {
                eter.add(p.userId, p.eter, { reason: 'cambio_buy_expire_refund' });
            }
            delete pending[id];
            savePending(pending);
            return interaction.update({
                content: '⏰ Pedido expirado' + (p.type === 'buy' ? ' — Éter reembolsado.' : '.'),
                embeds: [],
                components: []
            });
        }

        // Staff: marcou que enviou sonhos (compra)
        if (action === 'staff_paid') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            p.status = 'done';
            delete pending[id];
            savePending(pending);
            return interaction.update({
                content:
                    `✅ <@${p.userId}> — staff confirmou envio de **💤 ${fmt(p.sonhos)}**. Pedido encerrado.`,
                embeds: [],
                components: []
            });
        }

        // Staff: recusa compra → reembolsa éter
        if (action === 'staff_reject') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            if (p.type === 'buy' && p.eter) {
                eter.add(p.userId, p.eter, { reason: 'cambio_buy_reject_refund' });
            }
            delete pending[id];
            savePending(pending);
            return interaction.update({
                content: `❌ Pedido recusado. <@${p.userId}> recebeu reembolso de **✨ ${fmt(p.eter || 0)}**.`,
                embeds: [],
                components: []
            });
        }

        // Usuário: disse que enviou +pay (venda)
        if (action === 'user_sent') {
            if (interaction.user.id !== p.userId) {
                return interaction.reply({ content: 'Só quem pediu.', ephemeral: true });
            }
            p.userMarkedSent = true;
            savePending(pending);
            return interaction.reply({
                content: '📌 Marcado. Aguarde a **staff** clicar em **Staff: creditar éter** após conferir o `+pay`.',
                ephemeral: true
            });
        }

        // Staff: credita éter na venda
        if (action === 'staff_credit') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            if (p.type !== 'sell') {
                return interaction.reply({ content: 'Pedido inválido.', ephemeral: true });
            }
            eter.add(p.userId, p.eter, { reason: 'cambio_sell_credit' });
            delete pending[id];
            savePending(pending);
            return interaction.update({
                content: `✅ <@${p.userId}> recebeu **✨ ${fmt(p.eter)}** (💤 ${fmt(p.sonhos)} conferidos pela staff).`,
                embeds: [],
                components: []
            });
        }

        if (action === 'cancel') {
            if (interaction.user.id !== p.userId && !isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Não autorizado.', ephemeral: true });
            }
            if (p.type === 'buy' && p.eter) {
                eter.add(p.userId, p.eter, { reason: 'cambio_buy_cancel_refund' });
            }
            delete pending[id];
            savePending(pending);
            return interaction.update({
                content: '❌ Pedido cancelado' + (p.type === 'buy' ? ' — Éter reembolsado.' : '.'),
                embeds: [],
                components: []
            });
        }

        return false;
    }
};
