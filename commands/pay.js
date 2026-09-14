const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function resolveTarget(message, args) {
    let user = message.mentions?.users?.first?.() || null;
    if (user) return user;

    const raw = (args || []).find((a) => /\d{15,20}/.test(a));
    if (raw) {
        const id = String(raw).replace(/[<@!>]/g, '');
        user = await message.client.users.fetch(id).catch(() => null);
        if (user) return user;
    }

    if (message.reference?.messageId) {
        const ref = await message.channel.messages
            .fetch(message.reference.messageId)
            .catch(() => null);
        if (ref?.author) return ref.author;
    }

    return null;
}

function parseAmountArg(args) {
    // último arg que não seja menção/id
    const candidates = (args || []).filter((a) => !a.startsWith('<@') && !/^\d{15,20}$/.test(a));
    return candidates.pop() || null;
}

async function run(from, to, amountRaw, reply) {
    if (!to) return reply('Mencione alguém: `O.pix @usuario 1000`');
    if (to.bot) return reply('Não dá para enviar éter a bots.');
    if (to.id === from.id) return reply('Você não pode enviar éter para si mesmo.');

    const bal = eter.get(from.id);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(bet.error || 'Valor inválido.');

    const amount = bet.amount;
    if (amount <= 0) return reply('Valor inválido.');
    if (amount > bal) return reply(`Saldo insuficiente. Carteira: ✨ **${fmt(bal)}**`);

    eter.remove(from.id, amount, { reason: 'pix', to: to.id });
    eter.add(to.id, amount, { reason: 'pix', from: from.id });

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x32bcad)
                .setTitle('Pix')
                .setDescription(
                    `**${from.username}** enviou ✨ **${fmt(amount)}** para **${to.username}**.`
                )
                .addFields(
                    {
                        name: 'Sua carteira',
                        value: `✨ **${fmt(eter.get(from.id))}**`,
                        inline: true
                    },
                    {
                        name: to.username,
                        value: `✨ **${fmt(eter.get(to.id))}**`,
                        inline: true
                    }
                )
                .setThumbnail(to.displayAvatarURL({ size: 64 }))
        ]
    });
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Envia éter para outro usuário',
    data: new SlashCommandBuilder()
        .setName('pagar')
        .setDescription('Envia éter (pix)')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem vai receber').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor (ex: 1000, 1k, half, all)').setRequired(true)
        ),

    async execute(message, args) {
        const to = await resolveTarget(message, args);
        const amountRaw = parseAmountArg(args);
        await run(message.author, to, amountRaw, (p) => message.reply(p));
    },

    async executeSlash(i) {
        const to = i.options.getUser('usuario', true);
        const amountRaw = i.options.getString('valor', true);
        await run(i.user, to, amountRaw, (p) =>
            typeof p === 'string'
                ? i.reply({ content: p, flags: MessageFlags.Ephemeral })
                : i.reply(p)
        );
    }
};
