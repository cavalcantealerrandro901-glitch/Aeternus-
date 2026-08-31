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

function credit(users, amount, coin, byId) {
    const isC = coin === 'cristais';
    const lines = [];
    for (const u of users) {
        if (isC) {
            cristais.add(u.id, amount);
            lines.push(
                `• ${u} → +💠 **${fmt(amount)}** · saldo **${fmt(cristais.get(u.id))}**`
            );
        } else {
            flocos.add(u.id, amount, { reason: `addmoney by ${byId}` });
            lines.push(
                `• ${u} → +❄️ **${fmt(amount)}** · saldo **${fmt(flocos.get(u.id))}**`
            );
        }
    }
    return {
        embeds: [
            new EmbedBuilder()
                .setColor(isC ? 0x22d3ee : 0x34d399)
                .setTitle(isC ? '💠 Cristais creditados' : '❄️ Flocos creditados')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: 'Moeda', value: isC ? '**Cristais 💠**' : '**Flocos ❄️**', inline: true },
                    { name: 'Valor', value: `**${fmt(amount)}**`, inline: true },
                    { name: 'Destinos', value: `**${users.length}**`, inline: true }
                )
                .setFooter({ text: 'O.addmoney @user 10k flocos · O.addmoney @user 500 cristais' })
                .setTimestamp()
        ]
    };
}

module.exports = {
    name: 'addmoney',
    aliases: ['addbal', 'dar', 'givemoney', 'addflocos', 'addcristais'],
    description: 'Adiciona flocos ou cristais (admin) — vários usuários',
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Adiciona flocos ou cristais (admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(true)
        )
        .addStringOption((o) =>
            o.setName('valor').setDescription('Ex: 10k, 2.5m').setRequired(true)
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

        const amountToken = args.find((a) => {
            if (/^<@!?\d+>$/.test(a)) return false;
            if (isCoinToken(a)) return false;
            return parseAmount(a) > 0;
        });
        const amount = parseAmount(amountToken);

        if (!users.length || !amount || !Number.isFinite(amount)) {
            return message.reply({
                embeds: [
                    err(
                        [
                            '**Uso**',
                            '`O.addmoney @user1 @user2 <valor> [flocos|cristais]`',
                            '',
                            'A **moeda** vai no **final** (padrão: flocos):',
                            '`O.addmoney @user 10k flocos`',
                            '`O.addmoney @user 500 cristais`',
                            '`O.addmoney @a @b 2m c`',
                            '',
                            'Valores: `1k` · `2.5m` · número'
                        ].join('\n')
                    )
                ]
            });
        }

        return message.reply(credit(users, amount, coin, message.author.id));
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
        const coin = parseCoin(interaction.options.getString('moeda') || 'flocos');
        if (!users.length || !amount || !Number.isFinite(amount)) {
            return interaction.reply({
                embeds: [err('Informe usuário e valor válidos.')],
                ephemeral: true
            });
        }
        return interaction.reply(credit(users, amount, coin, interaction.user.id));
    }
};
