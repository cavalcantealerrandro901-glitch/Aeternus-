const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const store = require('../utils/store');

const CD = 15 * 60 * 1000;
const MIN_TOTAL = 100;
const SUCCESS_CHANCE = 0.55;

/** Cargo de anti-roubo (proteção) */
const ANTI_ROB_ROLE_ID = '1550256144138637423';

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

async function hasAntiRob(guild, userId) {
    if (!guild || !userId) return false;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return false;
        return member.roles.cache.has(ANTI_ROB_ROLE_ID);
    } catch (_) {
        return false;
    }
}

function stealFromTarget(targetId, amount) {
    let left = Math.max(0, Math.floor(Number(amount) || 0));
    let fromWallet = 0;
    let fromBank = 0;

    const hand = eter.get(targetId);
    if (left > 0 && hand > 0) {
        fromWallet = Math.min(left, hand);
        eter.remove(targetId, fromWallet, { reason: 'roubo' });
        left -= fromWallet;
    }

    const saved = bank.get(targetId);
    if (left > 0 && saved > 0) {
        fromBank = Math.min(left, saved);
        bank.remove(targetId, fromBank);
        left -= fromBank;
    }

    return { fromWallet, fromBank, total: fromWallet + fromBank };
}

function protectedMessage(target) {
    const name = target.username || 'Este usuário';
    return [
        '🔐 **Escudo ativo**',
        '',
        '**' + name + '** está sob proteção do cargo <@&' + ANTI_ROB_ROLE_ID + '>.',
        'Carteira e banco ficam fora do alcance de qualquer roubo.',
        '',
        '💎 Quer a mesma imunidade? Fale com a equipe e garanta o cargo.'
    ].join('\n');
}

async function run(thief, target, reply, botId, guild) {
    if (!target) {
        return reply('Mencione alguém: `O.roubar @usuario`');
    }

    if (target.bot) return reply('Não dá para roubar bots.');
    if (target.id === thief.id) return reply('Você não pode roubar a si mesmo.');

    if (await hasAntiRob(guild, target.id)) {
        return reply({
            content: protectedMessage(target),
            allowedMentions: { roles: [ANTI_ROB_ROLE_ID] }
        });
    }

    const cds = store.load('robcd.json', {});
    const last = Number(cds[thief.id] || 0);
    const leftCd = CD - (Date.now() - last);
    if (leftCd > 0) {
        const m = Math.ceil(leftCd / 60000);
        return reply(
            '⏳ Aguarde **' +
                m +
                '** min para roubar de novo.\n_Quando o tempo acabar, você recebe um aviso no PV._'
        );
    }

    const targetHand = eter.get(target.id);
    const targetBank = bank.get(target.id);
    const targetTotal = targetHand + targetBank;

    if (targetTotal < MIN_TOTAL) {
        return reply(
            '**' +
                target.username +
                '** precisa ter pelo menos ✨ **' +
                fmt(MIN_TOTAL) +
                '** no total (carteira + banco).\n' +
                'Carteira: ✨ **' +
                fmt(targetHand) +
                '** · Banco: ✨ **' +
                fmt(targetBank) +
                '**'
        );
    }

    cds[thief.id] = Date.now();
    store.save('robcd.json', cds);

    if (Math.random() < SUCCESS_CHANCE) {
        const pct = randBetween(0.26, 0.4);
        let amount = Math.floor(targetTotal * pct);
        amount = Math.max(1, Math.min(amount, targetTotal));

        const taken = stealFromTarget(target.id, amount);
        if (taken.total > 0) {
            eter.add(thief.id, taken.total, { reason: 'roubo', from: target.id });
        }

        const parts = [];
        if (taken.fromWallet > 0) parts.push('carteira ✨ **' + fmt(taken.fromWallet) + '**');
        if (taken.fromBank > 0) parts.push('banco ✨ **' + fmt(taken.fromBank) + '**');

        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('💰 Roubo bem-sucedido')
                    .setDescription(
                        'Você roubou **' +
                            target.username +
                            '** e levou ✨ **' +
                            fmt(taken.total) +
                            '**.\n' +
                            (parts.length ? 'Origem: ' + parts.join(' · ') + '.' : '')
                    )
                    .addFields(
                        {
                            name: 'Sua carteira',
                            value: '✨ **' + fmt(eter.get(thief.id)) + '**',
                            inline: true
                        },
                        {
                            name: target.username,
                            value:
                                'Carteira ✨ **' +
                                fmt(eter.get(target.id)) +
                                '**\nBanco ✨ **' +
                                fmt(bank.get(target.id)) +
                                '**',
                            inline: true
                        }
                    )
                    .setThumbnail(target.displayAvatarURL({ size: 64 }))
                    .setFooter({ text: 'Cooldown 15 min · aviso no PV quando liberar' })
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
                .setTitle('🚫 Roubo falhou')
                .setDescription(
                    fine > 0
                        ? 'Você foi pego tentando roubar **' +
                              target.username +
                              '** e perdeu ✨ **' +
                              fmt(fine) +
                              '** (creditado ao bot).'
                        : 'Você foi pego, mas não tinha éter para perder.'
                )
                .addFields({
                    name: 'Sua carteira',
                    value: '✨ **' + fmt(eter.get(thief.id)) + '**',
                    inline: true
                })
                .setThumbnail(target.displayAvatarURL({ size: 64 }))
                .setFooter({ text: 'Cooldown 15 min · aviso no PV quando liberar' })
        ]
    });
}

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Tenta roubar éter da carteira e do banco de outro usuário',
    category: 'economia',
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('Tenta roubar éter da carteira e do banco de alguém')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Alvo do roubo').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveTarget(message, args);
        await run(
            message.author,
            target,
            (p) => message.reply(p),
            message.client.user?.id,
            message.guild
        );
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
            i.client.user?.id,
            i.guild
        );
    }
};
