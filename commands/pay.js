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

const TIMEOUT_MS = 8 * 60 * 1000;
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
    if (!r) return `${label} ainda não está no rank global.`;
    return `${label} está em **#${r.rank}** no rank global.`;
}

function acceptRow(id, count) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pay:accept:${id}`)
            .setLabel(`Aceitar (${count}/2)`)
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(count >= 2)
    );
}

function buildInviteText(from, to, amount) {
    return [
        '✦ **AETERNUS • TRANSFERÊNCIA**',
        '',
        `💸 ${from}`,
        `└─ deseja enviar ✨ **${fmt(amount)}** éter para ${to}`,
        '',
        '✅ Os dois usuários precisam aceitar para concluir a transferência.',
        '',
        '⚠️ **ATENÇÃO:** Antes de aceitar, confira cuidadosamente quem está enviando, quem está recebendo e o valor da transferência. Não aceite caso você não reconheça a solicitação ou tenha qualquer dúvida sobre os dados apresentados.',
        '',
        'Ao aceitar, você confirma que revisou todas as informações e autorizou a operação. Depois de concluída, a transferência **não poderá ser desfeita ou recuperada** pelo Aeternus.',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '⏳ **PRAZO PARA ACEITAR: 8 MINUTOS**',
        '⚠️ Após 8 minutos, a solicitação expirará automaticamente.',
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
        `💸 ${from}`,
        `└─ desejava enviar ✨ **${fmt(amount)}** éter para ${to}`,
        '',
        '⏰ **Expirado** — o prazo de 8 minutos acabou e a transferência não foi concluída.',
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');
}

function parseAmountArg(args) {
    const candidates = (args || []).filter(
        (a) => !a.startsWith('<@') && !/^\d{15,20}$/.test(a)
    );
    return candidates.pop() || null;
}

async function resolveTargets(message, args) {
    const list = [...(message.mentions?.users?.values?.() || [])].filter(
        (u) => !u.bot && u.id !== message.author.id
    );
    if (list.length) return list;

    const raw = (args || []).find((a) => /\d{15,20}/.test(a));
    if (raw) {
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

/**
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {import('discord.js').User} from
 * @param {import('discord.js').User} to
 * @param {number} amount
 * @param {{ replyToId?: string|null }} [opts]
 */
async function createTransfer(channel, from, to, amount, opts = {}) {
    const bal = eter.get(from.id);
    if (amount > bal) {
        const payload = {
            content: `💸 ${from}, saldo insuficiente para enviar ✨ **${fmt(amount)}** para ${to}.\nCarteira: ✨ **${fmt(bal)}**.`,
            allowedMentions: { users: [from.id, to.id] }
        };
        if (opts.replyToId) {
            payload.reply = { messageReference: opts.replyToId, failIfNotExists: false };
        }
        return channel.send(payload).catch(() => channel.send(payload));
    }

    const id = `${Date.now().toString(36)}_${from.id.slice(-4)}_${to.id.slice(-4)}_${Math.random().toString(36).slice(2, 6)}`;
    const text = buildInviteText(from, to, amount);

    const sendPayload = {
        content: text,
        components: [acceptRow(id, 0)],
        allowedMentions: { users: [from.id, to.id] }
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
        expires: Date.now() + TIMEOUT_MS,
        done: false
    };
    pending.set(id, entry);

    setTimeout(async () => {
        const p = pending.get(id);
        if (!p || p.done) return;
        pending.delete(id);
        try {
            const m = await channel.messages.fetch(p.messageId).catch(() => null);
            if (m) {
                await m
                    .edit({
                        content: buildExpiredText(`<@${p.fromId}>`, `<@${p.toId}>`, p.amount),
                        components: []
                    })
                    .catch(() => {});
            }
        } catch (_) {}
    }, TIMEOUT_MS);

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
                    `Transferência cancelada: <@${p.fromId}> não tem mais ✨ **${fmt(amount)}** na carteira.`,
                    '',
                    '───────────────',
                    '✧ Aeternus Economy'
                ].join('\n'),
                components: []
            })
            .catch(() => {});
        return interaction
            .followUp({
                content: 'Saldo insuficiente no momento da confirmação.',
                flags: MessageFlags.Ephemeral
            })
            .catch(() => {});
    }

    eter.remove(p.fromId, amount, { reason: 'pix', to: p.toId });
    eter.add(p.toId, amount, { reason: 'pix', from: p.fromId });

    const toBal = eter.get(p.toId);
    const fromBal = eter.get(p.fromId);

    const body = [
        '✦ **AETERNUS • TRANSFERÊNCIA CONCLUÍDA**',
        '',
        `Agora <@${p.toId}> possui ✨ **${fmt(toBal)}**`,
        rankLine(p.toId, `<@${p.toId}>`),
        '',
        `<@${p.fromId}> agora possui ✨ **${fmt(fromBal)}**`,
        rankLine(p.fromId, `<@${p.fromId}>`),
        '',
        '───────────────',
        '✧ Aeternus Economy'
    ].join('\n');

    await interaction.message
        .edit({
            content: [
                '✦ **AETERNUS • TRANSFERÊNCIA**',
                '',
                `💸 <@${p.fromId}>`,
                `└─ enviou ✨ **${fmt(amount)}** éter para <@${p.toId}>`,
                '',
                '✅ **Concluída** (2/2).',
                '',
                '───────────────',
                '✧ Aeternus Economy'
            ].join('\n'),
            components: []
        })
        .catch(() => {});

    const confPayload = {
        content: body,
        reply: { messageReference: p.messageId, failIfNotExists: false },
        allowedMentions: { users: [p.fromId, p.toId] }
    };

    await interaction.channel.send(confPayload).catch(() =>
        interaction.channel.send({
            content: body,
            allowedMentions: { users: [p.fromId, p.toId] }
        })
    );
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Envia éter com confirmação dos dois lados',
    data: new SlashCommandBuilder()
        .setName('pagar')
        .setDescription('Envia éter (pix) com confirmação')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem vai receber').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor (ex: 1000, 1k, half, all)')
                .setRequired(true)
        ),

    async execute(message, args) {
        const targets = await resolveTargets(message, args);
        const prefix = message.guild?.id ? getPrefix(message.guild.id) : 'O.';

        if (!targets.length) {
            return message.reply(
                `💸 Mencione alguém para enviar éter.\nUse: \`${prefix}pix @usuario <valor>\``
            );
        }

        const amountRaw = parseAmountArg(args);
        const bal = eter.get(message.author.id);
        const bet = resolveBet(amountRaw, bal, { label: '✨' });
        if (!bet.ok) {
            return message.reply(
                bet.error ||
                    `💸 Valor inválido. Use: \`${prefix}pix @usuario <valor>\` (ex: 1000, 1k, half, all).`
            );
        }

        const amount = bet.amount;
        if (amount <= 0) {
            return message.reply(
                `💸 Valor inválido. Use: \`${prefix}pix @usuario <valor>\``
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
            content: `✦ Pedido de transferência para ${to} — ✨ **${fmt(bet.amount)}** éter`,
            allowedMentions: { users: [to.id] }
        });
        const cmdMsg = await i.fetchReply().catch(() => null);

        await createTransfer(i.channel, i.user, to, bet.amount, {
            replyToId: cmdMsg?.id || null
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
                    content: buildExpiredText(`<@${p.fromId}>`, `<@${p.toId}>`, p.amount),
                    components: []
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
            await interaction.update({ components: [acceptRow(id, count)] });
            return;
        }

        await interaction.update({ components: [acceptRow(id, 2)] }).catch(() => {});
        await finishTransfer(interaction, p);
    }
};
