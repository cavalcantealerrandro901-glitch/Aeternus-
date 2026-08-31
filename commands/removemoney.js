const {
    PermissionFlagsBits,
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}

function parseCoin(raw) {
    const s = String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    if (!s) return 'flocos';
    if (
        s.startsWith('cristal') ||
        s === 'c' ||
        s === '💎' ||
        s === '💠' ||
        s === 'crystal' ||
        s === 'crystals'
    ) {
        return 'cristais';
    }
    return 'flocos';
}

function isCoinToken(a) {
    return /^(flocos?|cristais?|f|c|❄️|💠|💎|crystal|crystals)$/i.test(String(a || ''));
}

function debit(users, amount, coin, byId) {
    const isC = coin === 'cristais';
    const lines = [];
    for (const u of users) {
        if (isC) {
            const before = cristais.get(u.id);
            const take = Math.min(before, amount);
            cristais.remove(u.id, take);
            lines.push(
                `• ${u} → −💠 **${fmt(take)}** · saldo **${fmt(cristais.get(u.id))}**` +
                    (take < amount ? ` _(tinha só ${fmt(before)})_` : '')
            );
        } else {
            const before = flocos.get(u.id);
            const take = Math.min(before, amount);
            flocos.remove(u.id, take, { reason: `removemoney by ${byId}` });
            lines.push(
                `• ${u} → −❄️ **${fmt(take)}** · saldo **${fmt(flocos.get(u.id))}**` +
                    (take < amount ? ` _(tinha só ${fmt(before)})_` : '')
            );
        }
    }
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0xf97316)
                .setTitle(isC ? '💠 Cristais removidos' : '❄️ Flocos removidos')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: 'Moeda', value: isC ? '**Cristais 💠**' : '**Flocos ❄️**', inline: true },
                    { name: 'Pedido', value: `**${fmt(amount)}**`, inline: true },
                    { name: 'Alvos', value: `**${users.length}**`, inline: true }
                )
                .setFooter({ text: 'O.removemoney @user 5k cristais · O.removemoney @user 10k flocos' })
                .setTimestamp()
        ]
    };
}

module.exports = {
    name: 'removemoney',
    aliases: ['take', 'remover', 'removemoney', 'rmmoney', 'tirar'],
    description: 'Remove flocos ou cristais (admin) — vários usuários',
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remove flocos ou cristais (admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Ex: 5k, 1m, all').setRequired(true)
        )
        .addStringOption((o) =>
            o
                .setName('moeda')
                .setDescription('flocos ou cristais')
                .setRequired(false)
                .addChoices(
                    { name: 'Flocos ❄️', value: 'flocos' },
                    { name: 'Cristais 💠', value: 'cristais' }
                )
        )
        .addUserOption((o) =>
            o.setName('usuario2').setDescription('Segundo usuário').setRequired(false)
        )
        .addUserOption((o) =>
            o.setName('usuario3').setDescription('Terceiro usuário').setRequired(false)
        ),

    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [err('Apenas administradores.')] });
        }

        const users = [...message.mentions.users.values()];
        const last = args[args.length - 1];
        const coin = isCoinToken(last) ? parseCoin(last) : 'flocos';

        // all = saldo do primeiro user
        const amountToken = args.find((a) => {
            if (/^<@!?\d+>$/.test(a)) return false;
            if (isCoinToken(a)) return false;
            return true;
        });

        let amount;
        if (users[0] && /^(all|tudo|max)$/i.test(String(amountToken || ''))) {
            amount =
                coin === 'cristais' ? cristais.get(users[0].id) : flocos.get(users[0].id);
        } else {
            amount = parseAmount(amountToken);
        }

        if (!users.length || !amount || !Number.isFinite(amount) || amount <= 0) {
            return message.reply({
                embeds: [
                    err(
                        [
                            '**Uso**',
                            '`O.removemoney @user1 @user2 <valor> [flocos|cristais]`',
                            '',
                            '`O.removemoney @user 5k flocos`',
                            '`O.removemoney @user 200 cristais`',
                            '`O.removemoney @user all cristais`',
                            '',
                            'Padrão da moeda: **flocos**.'
                        ].join('\n')
                    )
                ]
            });
        }

        return message.reply(debit(users, amount, coin, message.author.id));
    },

    async executeSlash(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [err('Apenas administradores.')], ephemeral: true });
        }
        const users = [
            interaction.options.getUser('usuario'),
            interaction.options.getUser('usuario2'),
            interaction.options.getUser('usuario3')
        ].filter(Boolean);
        const coin = parseCoin(interaction.options.getString('moeda') || 'flocos');
        const raw = interaction.options.getString('valor');
        let amount;
        if (users[0] && /^(all|tudo|max)$/i.test(String(raw || ''))) {
            amount =
                coin === 'cristais' ? cristais.get(users[0].id) : flocos.get(users[0].id);
        } else {
            amount = parseAmount(raw);
        }
        if (!users.length || !amount || amount <= 0) {
            return interaction.reply({
                embeds: [err('Informe usuário e valor válidos.')],
                ephemeral: true
            });
        }
        return interaction.reply(debit(users, amount, coin, interaction.user.id));
    }
};
