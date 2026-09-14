const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const store = require('../utils/store');

const CD = 15 * 60 * 1000; // 15 min
const MIN_HAND = 100; // mínimo na carteira do alvo
const SUCCESS_CHANCE = 0.55; // 55% ganha / 45% perde

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

async function run(thief, target, reply) {
    if (!target) {
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('🕵️ Roubar')
                    .setDescription(
                        'Rouba **só o que está na carteira** (o banco está protegido).\n\n' +
                            '**Exemplos:**\n' +
                            '`O.roubar @usuario`\n' +
                            '`O.roubar 123456789012345678`\n' +
                            'Ou responda a mensagem com `O.roubar`\n\n' +
                            '**Regras:** 55% sucesso (26–40% da carteira) · 45% falha (14–22% do seu saldo)'
                    )
            ]
        });
    }

    if (target.bot) return reply('❌ Não dá para roubar bots.');
    if (target.id === thief.id) return reply('❌ Você não pode roubar a si mesmo.');

    const cds = store.load('robcd.json', {});
    const last = Number(cds[thief.id] || 0);
    const left = CD - (Date.now() - last);
    if (left > 0) {
        const m = Math.ceil(left / 60000);
        return reply(`⏳ Aguarde **${m}** minuto(s) para tentar roubar de novo.`);
    }

    // Só carteira (mãos) — banco protegido
    const targetHand = eter.get(target.id);
    const targetBank = bank.get(target.id);

    if (targetHand < MIN_HAND) {
        return reply(
            `❌ **${target.username}** não tem éter suficiente **na carteira** ` +
                `(mínimo ✨ **${fmt(MIN_HAND)}** em mãos).\n` +
                (targetBank > 0
                    ? `_O que está no banco (✨ ${fmt(targetBank)}) não pode ser roubado._`
                    : '')
        );
    }

    cds[thief.id] = Date.now();
    store.save('robcd.json', cds);

    const success = Math.random() < SUCCESS_CHANCE;

    if (success) {
        // 26% a 40% da carteira do alvo
        const pct = randBetween(0.26, 0.4);
        let amount = Math.floor(targetHand * pct);
        amount = Math.max(1, Math.min(amount, targetHand));

        eter.remove(target.id, amount, { reason: 'roubo' });
        eter.add(thief.id, amount, { reason: 'roubo' });

        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('💰 Roubo bem-sucedido')
                    .setDescription(
                        `**${thief.username}** roubou ✨ **${fmt(amount)}** ` +
                            `(${(pct * 100).toFixed(1)}% da carteira) de **${target.username}**.\n` +
                            `_O banco da vítima continua seguro._`
                    )
                    .addFields(
                        {
                            name: 'Sua carteira',
                            value: `✨ **${fmt(eter.get(thief.id))}**`,
                            inline: true
                        },
                        {
                            name: `Carteira de ${target.username}`,
                            value: `✨ **${fmt(eter.get(target.id))}**`,
                            inline: true
                        }
                    )
                    .setThumbnail(target.displayAvatarURL({ size: 64 }))
                    .setTimestamp()
            ]
        });
    }

    // Falhou — perde 14% a 22% do próprio saldo (carteira)
    const thiefHand = eter.get(thief.id);
    const failPct = randBetween(0.14, 0.22);
    let fine = Math.floor(thiefHand * failPct);
    fine = Math.min(fine, thiefHand);
    if (fine > 0) eter.remove(thief.id, fine, { reason: 'roubo falhou' });

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('🚨 Roubo falhou')
                .setDescription(
                    `**${target.username}** te pegou no flagra!\n` +
                        (fine > 0
                            ? `Você perdeu ✨ **${fmt(fine)}** (${(failPct * 100).toFixed(1)}% da sua carteira).`
                            : 'Você não tinha éter na carteira para perder.')
                )
                .addFields({
                    name: 'Sua carteira',
                    value: `✨ **${fmt(eter.get(thief.id))}**`,
                    inline: true
                })
                .setThumbnail(target.displayAvatarURL({ size: 64 }))
                .setTimestamp()
        ]
    });
}

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Rouba éter da carteira de outro usuário (banco protegido)',
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('Rouba éter da carteira de um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem você quer roubar').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveTarget(message, args);
        await run(message.author, target, (p) => message.reply(p));
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario', true);
        await run(i.user, target, (p) => {
            if (typeof p === 'string') {
                return i.reply({ content: p, flags: MessageFlags.Ephemeral });
            }
            return i.reply(p);
        });
    }
};
