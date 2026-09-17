const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { getPrefix } = require('../utils/settings');

const DEFAULT_TIMEOUT_MS = 8 * 60 * 1000;

function parseTimeout(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return DEFAULT_TIMEOUT_MS;
    const m = s.match(/^(\d+)\s*(m|min|h|hr|d)?$/i);
    if (!m) return DEFAULT_TIMEOUT_MS;
    const n = Math.max(1, parseInt(m[1], 10) || 1);
    const u = (m[2] || 'm').toLowerCase();
    let ms;
    if (u.startsWith('h')) ms = n * 60 * 60 * 1000;
    else if (u.startsWith('d')) ms = n * 24 * 60 * 60 * 1000;
    else ms = n * 60 * 1000;
    return Math.min(7 * 24 * 60 * 60 * 1000, Math.max(60 * 1000, ms));
}

function formatTimeout(ms) {
    const s = Math.floor(Number(ms) / 1000);
    if (s < 60) return s + ' segundo' + (s === 1 ? '' : 's');
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' minuto' + (m === 1 ? '' : 's');
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' hora' + (h === 1 ? '' : 's');
    const d = Math.floor(h / 24);
    return d + ' dia' + (d === 1 ? '' : 's');
}

/** @type {Map<string, object>} */
const pending = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function globalRank(userId) {
    const data = eter.all() || {};
    const list = Object.entries(data)
        .map(([id, v]) => ({ id, value: Number(v || 0) }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);
    const idx = list.findIndex((e) => e.id === userId);
    if (idx < 0) return null;
    return { rank: idx + 1, total: list.length, value: list[idx].value };
}

function rankLine(userId, label) {
    const r = globalRank(userId);
    if (!r) return label + ' ainda não está no rank global.';
    return label + ' está em **#' + r.rank + '** no rank global.';
}

function acceptRow(id, count) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pay:accept:' + id)
            .setLabel('Aceitar (' + count + '/2)')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(count >= 2)
    );
}

function mention(u) {
    if (!u) return '@usuário';
    if (typeof u === 'string') {
        const id = u.replace(/[<@!>]/g, '');
        return '<@' + id + '>';
    }
    if (u.id) return '<@' + u.id + '>';
    return String(u);
}

function buildInviteText(from, to, amount, timeoutMs) {
    const fromM = mention(from);
    const toM = mention(to);
    const label = formatTimeout(timeoutMs || DEFAULT_TIMEOUT_MS).toUpperCase();
    return [
        '✦ **AETERNUS • TRANSFERÊNCIA**',
        '',
        '💸 ' + fromM + ' → ' + toM,
        '└─ ' + fromM + ' deseja enviar ✨ **' + fmt(amount) + '** éter para ' + toM,
        '',
        '✅ Os dois usuários precisam aceitar para concluir a transferência.',
        '',
        '⚠️ **ATENÇÃO:** Antes de aceitar, confira cuidadosamente quem está enviando, quem está recebendo e o valor da transferência. Não aceite caso você não reconheça a solicitação ou tenha qualquer dúvida sobre os dados apresentados.',
        '',
        'Ao aceitar, você confirma que revisou todas as informações e autorizou a operação. Depois de concluída, a transferência **não poderá ser desfeita ou recuperada** pelo Aeternus.',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '⏳ **PRAZO PARA ACEITAR: ' + label + '**',
        '⚠️ Após esse prazo, a solicitação expirará automaticamente.',
        '━━━━━━━━━━━━━━━━━━',
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

function buildExpiredText(from, to, amount) {
    return [
        '✦ **AETERNUS • TRANSFERÊNCIA**',
        '',
        '⏳ Solicitação expirada.',
        mention(from) + ' → ' + mention(to) + ' · ✨ **' + fmt(amount) + '**',
        '',
        'Nenhuma transferência foi feita.',
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

function buildDoneText(fromId, toId, fromBal, toBal) {
    return [
        '✦ **AETERNUS • TRANSFERÊNCIA CONCLUÍDA**',
        '',
        '✅ Transferência concluída.',
        '',
        mention(toId) + ' agora possui ✨ **' + fmt(toBal) + '**',
        rankLine(toId, mention(toId)),
        '',
        mention(fromId) + ' agora possui ✨ **' + fmt(fromBal) + '**',
        rankLine(fromId, mention(fromId)),
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

function dmPendingText(from, amount, timeoutMs) {
    return [
        '✦ **Aeternus · Pedido de transferência**',
        '',
        '**' +
            (from.username || 'Alguém') +
            '** deseja enviar ✨ **' +
            fmt(amount) +
            '** éter para você.',
        '',
        'Abra o servidor e aceite o pedido no chat para concluir.',
        'Prazo: **' + formatTimeout(timeoutMs || DEFAULT_TIMEOUT_MS) + '**.',
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

function dmReceivedText(from, amount, newBal) {
    return [
        '✦ **Aeternus · Você recebeu éter**',
        '',
        '**' +
            (from.username || 'Alguém') +
            '** enviou ✨ **' +
            fmt(amount) +
            '** éter para você.',
        '',
        'Sua carteira agora: ✨ **' + fmt(newBal) + '**',
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

async function sendDm(user, text) {
    if (!user || user.bot) return false;
    try {
        await user.send(text);
        return true;
    } catch (_) {
        return false;
    }
}

function parseAmountArg(args) {
    const list = (args || []).map((a) => String(a).trim()).filter(Boolean);
    const filtered = list.filter((a) => !/^<@!?\d+>$/.test(a) && !/^@/.test(a));
    return filtered[filtered.length - 1] || filtered[0] || '';
}

async function resolveTargets(message, args) {
    const fromMentions = [...(message.mentions?.users?.values?.() || [])].filter(
        (u) => u && !u.bot && u.id !== message.author.id
    );
    if (fromMentions.length) return fromMentions;

    for (const raw of args || []) {
        if (!/<@!?\d+>/.test(String(raw)) && !/^\d{16,20}$/.test(String(raw))) continue;
        const id = String(raw).replace(/[<@!>]/g, '');
        const u = await message.client.users.fetch(id).catch(() => null);
        if (u && !u.bot && u.id !== message.author.id) return [u];
    }

    if (message.reference?.messageId) {
        const ref = await message.channel.messages
            .fetch(message.reference.messageId)
            .catch(() => null);
        if (ref?.author && !ref.author.bot && ref.author.id !== message.author.id) {
            return [ref.author];
        }
    }

    return [];
}

async function executeImmediateTransfer(channel, from, to, amount, opts = {}) {
    const bal = eter.get(from.id);
    if (amount > bal) {
        const payload = {
            content:
                '💸 ' +
                mention(from) +
                ', saldo insuficiente para enviar ✨ **' +
                fmt(amount) +
                '** para ' +
                mention(to) +
                '.\nCarteira: ✨ **' +
                fmt(bal) +
                '**.',
            allowedMentions: { parse: [], users: [String(from.id), String(to.id)] }
        };
        if (opts.replyToId) {
            payload.reply = { messageReference: opts.replyToId, failIfNotExists: false };
        }
        return channel.send(payload).catch(() => channel.send(payload));
    }

    eter.remove(from.id, amount, { reason: 'transferência auto', to: to.id });
    eter.add(to.id, amount, { reason: 'transferência auto', from: from.id });

    const fromBal = eter.get(from.id);
    const toBal = eter.get(to.id);

    const payload = {
        content: buildDoneText(from.id, to.id, fromBal, toBal),
        allowedMentions: { parse: [], users: [String(from.id), String(to.id)] }
    };
    if (opts.replyToId) {
        payload.reply = { messageReference: opts.replyToId, failIfNotExists: false };
    }
    try {
        await channel.send(payload);
    } catch (_) {
        delete payload.reply;
        await channel.send(payload).catch(() => {});
    }

    await sendDm(to, dmReceivedText(from, amount, toBal));
}

async function createTransfer(channel, from, to, amount, opts = {}) {
    const bal = eter.get(from.id);
    if (amount > bal) {
        const payload = {
            content:
                '💸 ' +
                mention(from) +
                ', saldo insuficiente para enviar ✨ **' +
                fmt(amount) +
                '** para ' +
                mention(to) +
                '.\nCarteira: ✨ **' +
                fmt(bal) +
                '**.',
            allowedMentions: { parse: [], users: [String(from.id), String(to.id)] }
        };
        if (opts.replyToId) {
            payload.reply = { messageReference: opts.replyToId, failIfNotExists: false };
        }
        return channel.send(payload).catch(() => channel.send(payload));
    }

    if (opts.autoAccept) {
        return executeImmediateTransfer(channel, from, to, amount, opts);
    }

    const id =
        Date.now().toString(36) +
        '_' +
        from.id.slice(-4) +
        '_' +
        to.id.slice(-4) +
        '_' +
        Math.random().toString(36).slice(2, 6);
    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const text = buildInviteText(from, to, amount, timeoutMs);

    const sendPayload = {
        content: text,
        components: [acceptRow(id, 0)],
        allowedMentions: { parse: [], users: [String(from.id), String(to.id)] }
    };
    if (opts.replyToId) {
        sendPayload.reply = { messageReference: opts.replyToId, failIfNotExists: false };
    }

    let msg;
    try {
        msg = await channel.send(sendPayload);
    } catch (_) {
        delete sendPayload.reply;
        msg = await channel.send(sendPayload);
    }

    const entry = {
        id,
        fromId: from.id,
        toId: to.id,
        amount,
        accepted: new Set(),
        channelId: channel.id,
        messageId: msg.id,
        sourceMessageId: opts.replyToId || null,
        expires: Date.now() + timeoutMs,
        timeoutMs,
        done: false
    };
    pending.set(id, entry);

    await sendDm(to, dmPendingText(from, amount, timeoutMs));

    setTimeout(async () => {
        const p = pending.get(id);
        if (!p || p.done) return;
        pending.delete(id);
        try {
            const m = await channel.messages.fetch(p.messageId).catch(() => null);
            if (m) {
                await m.edit({
                    content: buildExpiredText(p.fromId, p.toId, p.amount),
                    components: [],
                    allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] }
                });
            }
        } catch (_) {}
    }, timeoutMs);

    return msg;
}

async function finishTransfer(interaction, p) {
    p.done = true;
    pending.delete(p.id);

    const amount = p.amount;
    const bal = eter.get(p.fromId);
    if (amount > bal) {
        await interaction.message
            .edit({
                content: [
                    '✦ **AETERNUS • TRANSFERÊNCIA**',
                    '',
                    '💸 Saldo insuficiente no momento da conclusão.',
                    mention(p.fromId) + ' → ' + mention(p.toId),
                    'Valor: ✨ **' + fmt(amount) + '**',
                    '',
                    '───────────────',
                    '✧ Aeternus Economy'
                ].join('\n'),
                components: [],
                allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] }
            })
            .catch(() => {});
        return;
    }

    eter.remove(p.fromId, amount, { reason: 'transferência', to: p.toId });
    eter.add(p.toId, amount, { reason: 'transferência', from: p.fromId });

    const fromBal = eter.get(p.fromId);
    const toBal = eter.get(p.toId);

    const replyPayload = {
        content: buildDoneText(p.fromId, p.toId, fromBal, toBal),
        allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] },
        reply: {
            messageReference: interaction.message.id,
            failIfNotExists: false
        }
    };

    try {
        await interaction.channel.send(replyPayload);
    } catch (_) {
        delete replyPayload.reply;
        await interaction.channel.send(replyPayload).catch(() => {});
    }

    try {
        const toUser = await interaction.client.users.fetch(p.toId).catch(() => null);
        const fromUser = await interaction.client.users.fetch(p.fromId).catch(() => null);
        if (toUser) {
            await sendDm(
                toUser,
                dmReceivedText(fromUser || { username: 'Alguém' }, amount, toBal)
            );
        }
    } catch (_) {}
}

module.exports = {
    name: 'pay',
    aliases: ['pix', 'enviar', 'transferir', 'pagar'],
    description: 'Enviar éter para outro usuário (os dois precisam aceitar)',
    category: 'economia',
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Enviar éter (os dois precisam aceitar)')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem vai receber').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor (ex: 1000, 1k, half, all)')
                .setRequired(true)
        )
        .addBooleanOption((o) =>
            o
                .setName('auto')
                .setDescription('true = aceitar automaticamente · false = os dois precisam aceitar')
                .setRequired(false)
        )
        .addStringOption((o) =>
            o
                .setName('prazo')
                .setDescription('Tempo até cancelar (só se auto = false)')
                .setRequired(false)
                .addChoices(
                    { name: '7 minutos', value: '7m' },
                    { name: '8 minutos (padrão)', value: '8m' },
                    { name: '1 hora', value: '1h' },
                    { name: '12 horas', value: '12h' },
                    { name: '1 dia', value: '1d' },
                    { name: '3 dias', value: '3d' },
                    { name: '5 dias', value: '5d' }
                )
        ),

    async execute(message, args) {
        const targets = await resolveTargets(message, args);
        const prefix = message.guild?.id ? getPrefix(message.guild.id) : 'O.';

        if (!targets.length) {
            return message.reply(
                '💸 Mencione alguém para enviar éter.\nUse: `' +
                    prefix +
                    'pix @usuario <valor>`'
            );
        }

        const amountRaw = parseAmountArg(args);
        const bal = eter.get(message.author.id);
        const bet = resolveBet(amountRaw, bal, { label: '✨' });
        if (!bet.ok) {
            return message.reply(
                bet.error ||
                    ('💸 Valor inválido. Use: `' +
                        prefix +
                        'pix @usuario <valor>` (ex: 1000, 1k, half, all).')
            );
        }

        const amount = bet.amount;
        if (amount <= 0) {
            return message.reply(
                '💸 Valor inválido. Use: `' + prefix + 'pix @usuario <valor>`'
            );
        }

        const replyToId = message.id || null;
        for (const to of targets) {
            await createTransfer(message.channel, message.author, to, amount, {
                replyToId
            });
        }
    },

    async executeSlash(i) {
        const to = i.options.getUser('usuario', true);
        const amountRaw = i.options.getString('valor', true);
        const auto = i.options.getBoolean('auto') === true;
        const prazoRaw = i.options.getString('prazo') || '8m';
        const timeoutMs = parseTimeout(prazoRaw);

        if (to.bot) {
            return i.reply({
                content: 'Não dá para enviar éter a bots.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (to.id === i.user.id) {
            return i.reply({
                content: 'Você não pode enviar éter para si mesmo.',
                flags: MessageFlags.Ephemeral
            });
        }

        const bal = eter.get(i.user.id);
        const bet = resolveBet(amountRaw, bal, { label: '✨' });
        if (!bet.ok) {
            return i.reply({
                content: bet.error || 'Valor inválido.',
                flags: MessageFlags.Ephemeral
            });
        }

        await i.reply({
            content:
                '✦ Pedido de transferência: ' +
                mention(i.user) +
                ' → ' +
                mention(to) +
                ' — ✨ **' +
                fmt(bet.amount) +
                '** éter' +
                (auto ? ' · **aceite automático**' : ''),
            allowedMentions: { parse: [], users: [String(i.user.id), String(to.id)] }
        });
        const cmdMsg = await i.fetchReply().catch(() => null);

        await createTransfer(i.channel, i.user, to, bet.amount, {
            replyToId: cmdMsg?.id || null,
            timeoutMs,
            autoAccept: auto
        });
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('pay:accept:')) return;

        const id = interaction.customId.split(':').slice(2).join(':');
        const p = pending.get(id);
        if (!p || p.done) {
            return interaction.reply({
                content: 'Este pedido não é mais válido.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (Date.now() > p.expires) {
            pending.delete(id);
            await interaction
                .update({
                    content: buildExpiredText(p.fromId, p.toId, p.amount),
                    components: [],
                    allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] }
                })
                .catch(() => {});
            return;
        }

        const uid = interaction.user.id;
        if (uid !== p.fromId && uid !== p.toId) {
            return interaction.reply({
                content: 'Só o remetente e o destinatário podem aceitar.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (p.accepted.has(uid)) {
            return interaction.reply({
                content: 'Você já aceitou.',
                flags: MessageFlags.Ephemeral
            });
        }

        p.accepted.add(uid);
        const count = p.accepted.size;

        if (count < 2) {
            await interaction.update({
                content: buildInviteText(p.fromId, p.toId, p.amount, p.timeoutMs),
                components: [acceptRow(id, count)],
                allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] }
            });
            return;
        }

        await interaction
            .update({
                content: buildInviteText(p.fromId, p.toId, p.amount, p.timeoutMs),
                components: [acceptRow(id, 2)],
                allowedMentions: { parse: [], users: [String(p.fromId), String(p.toId)] }
            })
            .catch(() => {});
        await finishTransfer(interaction, p);
    }
};
