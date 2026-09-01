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

function credit(users, amount, byId) {
    const lines = [];
    for (const u of users) {
        eter.add(u.id, amount, { reason: `addmoney by ${byId}` });
        lines.push(
            `• ${u} → +✨ **${fmt(amount)}** · saldo **${fmt(eter.get(u.id))}**`
        );
    }
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('✨ Éter creditado')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: 'Moeda', value: '**Éter ✨**', inline: true },
                    { name: 'Valor', value: `**${fmt(amount)}**`, inline: true },
                    { name: 'Destinos', value: `**${users.length}**`, inline: true }
                )
                .setFooter({ text: 'O.addmoney @user 10k · O.addmoney @a @b 2m' })
                .setTimestamp()
        ]
    };
}

module.exports = {
    name: 'addmoney',
    aliases: ['addbal', 'dar', 'givemoney', 'addeter', 'addflocos', 'addcristais'],
    description: 'Adiciona Éter (admin) — vários usuários',
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Adiciona Éter (admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Ex: 10k, 2.5m').setRequired(true)
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
            return parseAmount(a) > 0;
        });
        const amount = parseAmount(amountToken);

        if (!users.length || !amount || !Number.isFinite(amount)) {
            return message.reply({
                embeds: [
                    err(
                        [
                            '**Uso**',
                            '`O.addmoney @user1 @user2 <valor>`',
                            '',
                            '`O.addmoney @user 10k`',
                            '`O.addmoney @a @b 2m`',
                            '',
                            'Moeda única: **Éter ✨**',
                            'Valores: `1k` · `2.5m` · número'
                        ].join('\n')
                    )
                ]
            });
        }

        return message.reply(credit(users, amount, message.author.id));
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
        const amount = parseAmount(interaction.options.getString('valor'));
        if (!users.length || !amount || !Number.isFinite(amount)) {
            return interaction.reply({
                embeds: [err('Informe usuário e valor válidos.')],
                ephemeral: true
            });
        }
        return interaction.reply(credit(users, amount, interaction.user.id));
    }
};
