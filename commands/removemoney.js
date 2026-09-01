const {
    PermissionFlagsBits,
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');
const eter = require('../utils/eter');
const { parseAmount } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}

function debit(users, amount, byId) {
    const lines = [];
    for (const u of users) {
        const before = eter.get(u.id);
        const take = Math.min(before, amount);
        eter.remove(u.id, take, { reason: `removemoney by ${byId}` });
        lines.push(
            `• ${u} → −✨ **${fmt(take)}** · saldo **${fmt(eter.get(u.id))}**` +
                (take < amount ? ` _(tinha só ${fmt(before)})_` : '')
        );
    }
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0xf97316)
                .setTitle('✨ Éter removido')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: 'Moeda', value: '**Éter ✨**', inline: true },
                    { name: 'Pedido', value: `**${fmt(amount)}**`, inline: true },
                    { name: 'Alvos', value: `**${users.length}**`, inline: true }
                )
                .setFooter({ text: 'O.removemoney @user 5k · O.removemoney @user all' })
                .setTimestamp()
        ]
    };
}

module.exports = {
    name: 'removemoney',
    aliases: ['take', 'remover', 'rmmoney', 'tirar'],
    description: 'Remove Éter (admin) — vários usuários',
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remove Éter (admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Ex: 5k, 1m, all').setRequired(true)
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

        const amountToken = args.find((a) => {
            if (/^<@!?\d+>$/.test(a)) return false;
            return true;
        });

        let amount;
        if (users[0] && /^(all|tudo|max)$/i.test(String(amountToken || ''))) {
            amount = eter.get(users[0].id);
        } else {
            amount = parseAmount(amountToken);
        }

        if (!users.length || !amount || !Number.isFinite(amount) || amount <= 0) {
            return message.reply({
                embeds: [
                    err(
                        [
                            '**Uso**',
                            '`O.removemoney @user1 @user2 <valor>`',
                            '',
                            '`O.removemoney @user 5k`',
                            '`O.removemoney @user all`',
                            '',
                            'Moeda única: **Éter ✨**'
                        ].join('\n')
                    )
                ]
            });
        }

        return message.reply(debit(users, amount, message.author.id));
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
        const raw = interaction.options.getString('valor');
        let amount;
        if (users[0] && /^(all|tudo|max)$/i.test(String(raw || ''))) {
            amount = eter.get(users[0].id);
        } else {
            amount = parseAmount(raw);
        }
        if (!users.length || !amount || amount <= 0) {
            return interaction.reply({
                embeds: [err('Informe usuário e valor válidos.')],
                ephemeral: true
            });
        }
        return interaction.reply(debit(users, amount, interaction.user.id));
    }
};
