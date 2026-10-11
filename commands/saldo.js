const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function globalRank(userId) {
    const data = eter.all() || {};
    const list = Object.entries(data)
        .map(([id, v]) => ({ id, value: Number(v || 0) }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);
    const idx = list.findIndex((e) => e.id === String(userId));
    return idx < 0 ? null : idx + 1;
}

function buildEmbed(target) {
    const bal = eter.get(target.id);
    const rank = bal > 0 ? globalRank(target.id) : null;

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({
            name: 'AETERNUS • ECONOMY',
            iconURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png'
        })
        .setTitle(`💳 Saldo — ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '✨ Saldo de Éter',
                value: `\`\`\`fix\n${fmt(bal)} ÉTER\n\`\`\``,
                inline: false
            },
            {
                name: '🏆 Posição',
                value: rank ? `Top **#${rank}**` : '*Sem ranking*',
                inline: true
            },
            {
                name: '👤 Titular',
                value: `<@${target.id}>`,
                inline: true
            }
        )
        .setFooter({
            text: 'Aeternus Economy',
            iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    return embed;
}

async function run(target, reply) {
    return reply(buildEmbed(target));
}

module.exports = {
    name: 'saldo',
    aliases: ['balance', 'money', 'éter', 'eter', 'bal', 'atm'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver-saldo')
        .setDescription('Ver saldo de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await run(target, (embed) =>
            message.reply({
                embeds: [embed],
                allowedMentions: { parse: [], users: [target.id] }
            })
        );
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await run(target, (embed) =>
            i.reply({
                embeds: [embed],
                allowedMentions: { parse: [], users: [target.id] }
            })
        );
    }
};
