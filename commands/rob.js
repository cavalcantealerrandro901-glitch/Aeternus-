const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const store = require('../utils/store');

const CD = 15 * 60 * 1000;
const MIN_HAND = 100;
const SUCCESS_CHANCE = 0.55;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function randBetween(min, max) {
    return min + Math.random() * (max - min);
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

async function run(thief, target, reply, botId) {
    if (!target) {
        return reply('Mencione alguém: `O.roubar @usuario`');
    }

    if (target.bot) return reply('Não dá para roubar bots.');
    if (target.id === thief.id) return reply('Você não pode roubar a si mesmo.');

    const cds = store.load('robcd.json', {});
    const last = Number(cds[thief.id] || 0);
    const left = CD - (Date.now() - last);
    if (left > 0) {
        const m = Math.ceil(left / 60000);
        return reply(`Aguarde **${m}** min.`);
    }

    const targetHand = eter.get(target.id);
    if (targetHand < MIN_HAND) {
        return reply(
            `**${target.username}** precisa ter pelo menos ✨ **${fmt(MIN_HAND)}** na carteira.`
        );
    }

    cds[thief.id] = Date.now();
    store.save('robcd.json', cds);

    if (Math.random() < SUCCESS_CHANCE) {
        const pct = randBetween(0.26, 0.4);
        let amount = Math.floor(targetHand * pct);
        amount = Math.max(1, Math.min(amount, targetHand));

        eter.remove(target.id, amount, { reason: 'roubo', to: thief.id });
        eter.add(thief.id, amount, { reason: 'roubo', from: target.id });

        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Roubo bem-sucedido')
                    .setDescription(
                        `Você roubou ✨ **${fmt(amount)}** de **${target.username}**.`
                    )
                    .addFields(
                        {
                            name: 'Sua carteira',
                            value: `✨ **${fmt(eter.get(thief.id))}**`,
                            inline: true
                        },
                        {
                            name: target.username,
                            value: `✨ **${fmt(eter.get(target.id))}**`,
                            inline: true
                        }
                    )
                    .setThumbnail(target.displayAvatarURL({ size: 64 }))
            ]
        });
    }

    const thiefHand = eter.get(thief.id);
    const failPct = randBetween(0.14, 0.22);
    let fine = Math.floor(thiefHand * failPct);
    fine = Math.min(fine, thiefHand);

    if (fine > 0) {
        eter.remove(thief.id, fine, { reason: 'roubo falhou', to: botId });
        if (botId) eter.add(botId, fine, { reason: 'multa de roubo', from: thief.id });
    }

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Roubo falhou')
                .setDescription(
                    fine > 0
                        ? `Você perdeu ✨ **${fmt(fine)}** (creditado ao bot).`
                        : 'Você não tinha éter para perder.'
                )
                .addFields({
                    name: 'Sua carteira',
                    value: `✨ **${fmt(eter.get(thief.id))}**`,
                    inline: true
                })
                .setThumbnail(target.displayAvatarURL({ size: 64 }))
        ]
    });
}

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Rouba éter da carteira de um usuário',
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('Rouba éter da carteira de um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Alvo').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveTarget(message, args);
        await run(message.author, target, (p) => message.reply(p), message.client.user?.id);
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario', true);
        await run(
            i.user,
            target,
            (p) =>
                typeof p === 'string'
                    ? i.reply({ content: p, flags: MessageFlags.Ephemeral })
                    : i.reply(p),
            i.client.user?.id
        );
    }
};
