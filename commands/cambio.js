const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
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

function treasuryUserId(client) {
    const env = String(process.env.CAMBIO_BOT_ID || process.env.LORITTA_TREASURY_ID || '').trim();
    if (env) return env;
    return client?.user?.id ? String(client.user.id) : '';
}

/** Aceita menções: deve incluir Loritta + o bot Aeternus (ordem livre). */
function parsePairMentions(message) {
    const botId = treasuryUserId(message.client);
    const mentioned = [...message.mentions.users.values()].map((u) => String(u.id));
    if (!mentioned.length) return { ok: true, skipped: true, botId };

    const hasLori = mentioned.includes(LORITTA_BOT_ID);
    const hasBot = botId && mentioned.includes(String(botId));

    if (!hasLori || !hasBot) {
        return {
            ok: false,
            error:
                'Use assim:\n' +
                '`O.transferir @Loritta @' +
                (message.client.user?.username || 'meu-bot') +
                '`\n' +
                'Mencione **a Loritta** e **este bot** (os dois).'
        };
    }
    return { ok: true, skipped: false, botId, hasLori, hasBot };
}

function stripMentionArgs(args) {
    return args.filter((a) => !/^<@!?\d+>$/.test(a));
}

function rateEmbed(client) {
    const rate = loritta.sonhosPerEter();
    const st = queue.stats(Q);
    const botId = treasuryUserId(client);
    const botTag = client?.user ? `@${client.user.username}` : '@meu-bot';
    return new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💱 Intercâmbio · Loritta ⇄ Aeternus')
        .setDescription(
            [
                'Troca **Sonhos (Loritta)** ⇄ **Éter (Aeternus)**.',
                '',
                '**Como usar**',
                `\`O.transferir @Loritta ${botTag}\``,
                '`/intercambio loritta`',
                '',
                `**Taxa:** \`1\` ✨ = **${fmt(rate)}** 💤`,
                `**Fila:** **${st.waiting}** aguardando · **${st.serving}** em atendimento`,
                botId ? `**Bot:** <@${botId}>` : '',
                `**Loritta:** <@${LORITTA_BOT_ID}>`,
                '',
                '**Operações**',
                `\`O.transferir @Loritta ${botTag} comprar <éter>\``,
                `\`O.transferir @Loritta ${botTag} vender <sonhos>\``,
                '`O.transferir fila` · `sair` · `saldo`',
                '',
                '**Staff:** `O.transferir proximo` · `pedidos`'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: 'Aeternus × Loritta' })
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
        .setTitle('📋 Fila de intercâmbio')
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
                .setLabel('Confirmar sonhos enviados')
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

async function trySendSonhosToUser(message, userId, sonhos) {
    if (!loritta.configured() || !message.guild) {
        return { ok: false, error: 'API Loritta não configurada ou fora de servidor.' };
    }
    const reason = 'Intercambio Aeternus: compra de sonhos com eter';
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
            reason: 'Intercambio Aeternus: venda de sonhos por eter',
            expiresAfterMillis: 30 * 60 * 1000
        });
        if (req.ok) return { ok: true, data: req.data };
        return { ok: false, error: req.error || 'Falha na solicitação' };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
}

async function runBuy(message, amountRaw, reply) {
    const already = queue.positionOf(Q, message.author.id);
    if (already) {
        return reply(
            `Você já está na fila na posição **#${already.position}**. Use \`O.transferir fila\` ou \`O.transferir sair\`.`
        );
    }
    if (!amountRaw) {
        return reply('Uso: `O.transferir @Loritta @bot comprar <éter>`\nEx.: `O.transferir @Loritta @bot comprar 100`');
    }

    const bal = eter.get(message.author.id);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply('❌ ' + bet.error);
    if (bet.amount < 1) return reply('❌ Mínimo **1** éter.');

    const sonhos = Math.floor(bet.amount * loritta.sonhosPerEter());
    if (sonhos < 1) return reply('❌ Quantidade inválida.');

    const took = eter.remove(message.author.id, bet.amount, { reason: 'cambio_queue_hold' });
    if (!took) return reply('❌ Falha ao reter éter.');

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
        return reply('❌ ' + joined.error);
    }

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x34d399)
                .setTitle('✅ Fila · compra de sonhos')
                .setDescription(
                    [
                        `**Posição:** #**${joined.position}**`,
                        `**Par:** <@${LORITTA_BOT_ID}> ⇄ <@${treasuryUserId(message.client)}>`,
                        `**Retido:** ✨ **${fmt(bet.amount)}**`,
                        `**Você recebe:** 💤 **${fmt(sonhos)}**`,
                        '',
                        'Aguarde `O.transferir proximo` da staff.',
                        'Sair: `O.transferir sair`'
                    ].join('\n')
                )
                .setFooter({ text: `ID: ${joined.id}` })
        ]
    });
}

async function runSell(message, amountRaw, reply) {
    const botId = treasuryUserId(message.client);
    const already = queue.positionOf(Q, message.author.id);
    if (already) {
        return reply(`Você já está na fila na posição **#${already.position}**. Use \`O.transferir sair\`.`);
    }
    if (!botId) return reply('❌ Bot ainda não está pronto.');
    if (!amountRaw) return reply('Uso: `O.transferir @Loritta @bot vender <sonhos>`');

    const sonhos = Math.floor(Number(String(amountRaw).replace(/[^\d]/g, '')) || 0);
    if (sonhos < loritta.sonhosPerEter()) {
        return reply('❌ Mínimo **' + fmt(loritta.sonhosPerEter()) + '** sonhos.');
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
    if (!joined.ok) return reply('❌ ' + joined.error);

    let apiNote = '';
    const api = await tryRequestUserPayBot(message, message.author.id, botId, sonhos);
    if (api.ok) {
        const tid = api.data?.id || api.data?.sonhosTransferId || '';
        apiNote =
            '\n\n📬 **Pedido na Loritta**' +
            (tid ? ` (\`${tid}\`)` : '') +
            `.\nConfirme em <@${LORITTA_BOT_ID}> o envio de 💤 para <@${botId}>.`;
    } else {
        apiNote =
            '\n\n⚠️ API: `' +
            (api.error || 'indisponível') +
            `\.\nTransfira **${fmt(sonhos)}** 💤 via <@${LORITTA_BOT_ID}> para <@${botId}>.`;
    }

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x38bdf8)
                .setTitle('✅ Fila · venda de sonhos')
                .setDescription(
                    [
                        '**Posição:** #**' + joined.position + '**',
                        `**Par:** <@${LORITTA_BOT_ID}> ⇄ <@${botId}>`,
                        `**Enviar:** 💤 **${fmt(sonhos)}** → <@${botId}>`,
                        `**Recebe:** ✨ **${fmt(eterOut)}**`,
                        apiNote
                    ].join('\n')
                )
                .setFooter({ text: 'ID: ' + joined.id })
        ]
    });
}

async function handleArgs(message, args, reply) {
    // Menções @Loritta @bot são opcionais na frente; valida se existirem
    const pair = parsePairMentions(message);
    if (!pair.ok) return reply(pair.error);

    const rest = stripMentionArgs(args);
    const sub = String(rest[0] || '').toLowerCase();
    const botId = pair.botId;

    // Só menções (ou nada) → painel
    if (!sub || ['ajuda', 'help', 'taxa', 'info', 'loritta', 'rate'].includes(sub)) {
        return reply({ embeds: [rateEmbed(message.client)] });
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
        return reply({ embeds: [emb] });
    }

    if (sub === 'sair' || sub === 'leave' || sub === 'cancelar') {
        const pos = queue.positionOf(Q, message.author.id);
        if (!pos) return reply('Você não está na fila.');
        const item = pos.item;
        const p = item.payload || {};
        queue.leave(Q, item.id);
        if (p.type === 'buy' && p.eter) {
            eter.add(message.author.id, p.eter, { reason: 'cambio_queue_leave_refund' });
        }
        return reply(
            '✅ Você saiu da fila.' + (p.type === 'buy' ? ` ✨ **${fmt(p.eter)}** reembolsados.` : '')
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
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('💱 Seu saldo')
                    .setDescription(
                        [
                            `✨ **${fmt(et)}** éter`,
                            sonhosLine,
                            `Taxa: 1✨ = **${fmt(loritta.sonhosPerEter())}**💤`,
                            botId ? `Bot: <@${botId}>` : '',
                            `Loritta: <@${LORITTA_BOT_ID}>`
                        ]
                            .filter(Boolean)
                            .join('\n')
                    )
            ]
        });
    }

    if (sub === 'proximo' || sub === 'próximo' || sub === 'next') {
        if (!isStaff(message.author.id)) return reply('❌ Só staff chama o próximo.');
        const res = queue.next(Q);
        if (!res.ok) return reply('📭 ' + res.error);

        const item = res.item;
        const p = item.payload || {};

        if (p.type === 'buy') {
            const api = await trySendSonhosToUser(message, item.userId, p.sonhos);
            const apiLine = api.ok
                ? api.mode === 'transfer'
                    ? '✅ Transferência Loritta enviada.'
                    : '📬 Solicitação Loritta criada — confirme na Lori se aparecer.'
                : '⚠️ API: `' + (api.error || 'erro') + '`. Confirme ou recuse nos botões.';

            return reply({
                content: `<@${item.userId}> — sua vez!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('🔔 Próximo · compra')
                        .setDescription(
                            [
                                `**User:** <@${item.userId}>`,
                                `**Éter retido:** ✨ **${fmt(p.eter)}**`,
                                `**Sonhos:** 💤 **${fmt(p.sonhos)}**`,
                                `**Via:** <@${LORITTA_BOT_ID}> → usuário`,
                                '',
                                apiLine
                            ].join('\n')
                        )
                        .setFooter({ text: `ID: ${item.id}` })
                ],
                components: [staffRow(item.id, 'buy')]
            });
        }

        return reply({
            content: `<@${item.userId}> — sua vez!`,
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('🔔 Próximo · venda')
                    .setDescription(
                        [
                            `**User:** <@${item.userId}>`,
                            `**Sonhos → bot:** 💤 **${fmt(p.sonhos)}** → <@${botId}>`,
                            `**Creditar:** ✨ **${fmt(p.eter)}**`,
                            '',
                            'Confirme que os sonhos chegaram no bot via Loritta, depois **Creditar éter**.'
                        ].join('\n')
                    )
                    .setFooter({ text: `ID: ${item.id}` })
            ],
            components: [staffRow(item.id, 'sell')]
        });
    }

    if (sub === 'pedidos' || sub === 'list') {
        if (!isStaff(message.author.id)) return reply('❌ Só staff.');
        return reply({ embeds: [filaEmbed()] });
    }

    if (['comprar', 'buy', 'pedir'].includes(sub)) {
        return runBuy(message, rest.slice(1).join(' ').trim(), reply);
    }

    if (['vender', 'sell'].includes(sub)) {
        return runSell(message, rest.slice(1).join(' ').trim(), reply);
    }

    return reply({ embeds: [rateEmbed(message.client)] });
}

module.exports = {
    name: 'transferir',
    aliases: ['cambio', 'câmbio', 'intercambio', 'intercâmbio', 'loritta', 'sonhos', 'exchange'],
    description: 'Intercâmbio Éter ⇄ Sonhos (Loritta ↔ este bot)',
    data: new SlashCommandBuilder()
        .setName('intercambio')
        .setDescription('Intercâmbio Loritta ⇄ Aeternus')
        .addSubcommand((s) =>
            s.setName('loritta').setDescription('Ver taxa e como transferir com a Loritta')
        )
        .addSubcommand((s) =>
            s
                .setName('comprar')
                .setDescription('Comprar sonhos com éter')
                .addStringOption((o) =>
                    o.setName('eter').setDescription('Quantidade de éter (ex: 100, 1k)').setRequired(true)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('vender')
                .setDescription('Vender sonhos por éter')
                .addIntegerOption((o) =>
                    o.setName('sonhos').setDescription('Quantidade de sonhos').setRequired(true).setMinValue(1)
                )
        )
        .addSubcommand((s) => s.setName('saldo').setDescription('Ver éter e sonhos'))
        .addSubcommand((s) => s.setName('fila').setDescription('Ver fila de intercâmbio'))
        .addSubcommand((s) => s.setName('sair').setDescription('Sair da fila')),

    async execute(message, args) {
        await handleArgs(message, args, (p) => message.reply(p));
    },

    async executeSlash(i) {
        const sub = i.options.getSubcommand();
        const reply = (p) =>
            typeof p === 'string'
                ? i.reply({ content: p, ephemeral: true })
                : i.reply(p);

        // simula message-like para reutilizar handlers
        const fakeMsg = {
            author: i.user,
            client: i.client,
            guild: i.guild,
            channel: i.channel,
            mentions: { users: { values: () => [] } }
        };

        if (sub === 'loritta') {
            return reply({ embeds: [rateEmbed(i.client)] });
        }
        if (sub === 'saldo') {
            return handleArgs(fakeMsg, ['saldo'], reply);
        }
        if (sub === 'fila') {
            return handleArgs(fakeMsg, ['fila'], reply);
        }
        if (sub === 'sair') {
            return handleArgs(fakeMsg, ['sair'], reply);
        }
        if (sub === 'comprar') {
            return runBuy(fakeMsg, i.options.getString('eter'), reply);
        }
        if (sub === 'vender') {
            return runSell(fakeMsg, String(i.options.getInteger('sonhos')), reply);
        }
        return reply({ embeds: [rateEmbed(i.client)] });
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('cambio:')) return false;
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const id = parts.slice(2).join(':');
        const item = queue.getById(Q, id);

        if (!item || (item.status !== 'serving' && item.status !== 'waiting')) {
            return interaction.reply({ content: 'Pedido não está ativo na fila.', ephemeral: true });
        }

        const p = item.payload || {};

        if (action === 'staff_done_buy') {
            if (!isStaff(interaction.user.id)) {
                return interaction.reply({ content: 'Só staff.', ephemeral: true });
            }
            queue.complete(Q, id);
            return interaction.update({
                content: `✅ <@${item.userId}> — compra concluída (**💤 ${fmt(p.sonhos)}**).`,
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
