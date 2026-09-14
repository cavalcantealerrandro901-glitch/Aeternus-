const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const TIMEOUT_MS = 15 * 60 * 1000;
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
            .setCustomId(`pix:accept:${id}`)
            .setLabel(`Aceitar (${count}/2)`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(count >= 2)
    );
}

function buildInviteText(from, to, amount) {
    return [
        `${from} está prestes a mandar ✨ **${fmt(amount)}** para ${to}.`,
        '',
        'Os dois precisam confirmar a transferência.',
        'Só o remetente e o destinatário podem clicar em **Aceitar**.',
        'Vocês têm **15 minutos**. Se o tempo acabar, o pedido é cancelado.',
        '',
        'Nada é transferido até os dois aceitarem.'
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

async function createTransfer(channel, from, to, amount) {
    const bal = eter.get(from.id);
    if (amount > bal) {
        return channel.send(
            `${from} saldo insuficiente para enviar ✨ **${fmt(amount)}** para ${to}. Carteira: ✨ **${fmt(bal)}**.`
        );
    }

    const id = `${Date.now().toString(36)}_${from.id.slice(-4)}_${to.id.slice(-4)}`;
    const text = buildInviteText(from, to, amount);
    const msg = await channel.send({
        content: text,
        components: [acceptRow(id, 0)],
        allowedMentions: { users: [from.id, to.id] }
    });

    const entry = {
        id,
        fromId: from.id,
        toId: to.id,
        amount,
        accepted: new Set(),
        channelId: channel.id,
        messageId: msg.id,
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
                await m.edit({
                    content:
                        buildInviteText(
                            `<@${p.fromId}>`,
                            `<@${p.toId}>`,
                            p.amount
                        ) + '\n\n**Expirado** — ninguém concluiu a tempo.',
                    components: []
                }).catch(() => {});
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
                content:
                    `Transferência cancelada: <@${p.fromId}> não tem mais ✨ **${fmt(amount)}** na carteira.`,
                components: []
            })
            .catch(() => {});
        return interaction.followUp({
            content: 'Saldo insuficiente no momento da confirmação.',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }

    eter.remove(p.fromId, amount, { reason: 'pix', to: p.toId });
    eter.add(p.toId, amount, { reason: 'pix', from: p.fromId });

    const toBal = eter.get(p.toId);
    const fromBal = eter.get(p.fromId);

    const body = [
        `Transferência concluída.`,
        '',
        `Agora <@${p.toId}> possui ✨ **${fmt(toBal)}**`,
        rankLine(p.toId, `<@${p.toId}>`),
        '',
        `<@${p.fromId}> agora possui ✨ **${fmt(fromBal)}**`,
        rankLine(p.fromId, `<@${p.fromId}>`)
    ].join('\n');

    await interaction.message
        .edit({
            content: buildInviteText(`<@${p.fromId}>`, `<@${p.toId}>`, amount) +
                '\n\n**Concluída** (2/2).',
            components: []
        })
        .catch(() => {});

    await interaction.channel
        .send({
            content: body,
            reply: { messageReference: p.messageId, failIfNotExists: false },
            allowedMentions: { users: [p.fromId, p.toId] }
        })
        .catch(() =>
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
        if (!targets.length) {
            return message.reply('Mencione alguém: `O.pix @usuario 1000`');
        }

        const amountRaw = parseAmountArg(args);
        const bal = eter.get(message.author.id);
        const bet = resolveBet(amountRaw, bal, { label: '✨' });
        if (!bet.ok) return message.reply(bet.error || 'Valor inválido.');

        const amount = bet.amount;
        if (amount <= 0) return message.reply('Valor inválido.');

        // Uma mensagem por destinatário
        for (const to of targets) {
            await createTransfer(message.channel, message.author, to, amount);
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
            content: 'Pedido de transferência criado.',
            flags: MessageFlags.Ephemeral
        });

        await createTransfer(i.channel, i.user, to, bet.amount);
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('pix:accept:')) return;

        const id = interaction.customId.split(':')[2];
        const p = pending.get(id);
        if (!p || p.done) {
            return interaction.reply({
                content: 'Este pedido não é mais válido.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (Date.now() > p.expires) {
            pending.delete(id);
            await interaction.update({
                content: 'Pedido expirado.',
                components: []
            }).catch(() => {});
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
                components: [acceptRow(id, count)]
            });
            return;
        }

        // 2/2
        await interaction.update({
            components: [acceptRow(id, 2)]
        }).catch(() => {});

        await finishTransfer(interaction, p);
    }
};
