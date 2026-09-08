const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function rankPosition(userId, guild) {
    const wallets = eter.all?.() || {};
    const banks = bank.all?.() || {};
    const scores = new Map();

    const addId = (id) => {
        if (!/^\d{16,20}$/.test(String(id))) return;
        const w = Number(wallets[id] || 0);
        const b = Number(banks[id] || 0);
        scores.set(String(id), w + b);
    };

    if (guild?.members?.cache?.size) {
        for (const id of guild.members.cache.keys()) addId(id);
        addId(userId);
    } else {
        for (const id of Object.keys(wallets)) addId(id);
        for (const id of Object.keys(banks)) addId(id);
    }

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([id]) => id === String(userId));
    if (idx < 0) return null;
    return idx + 1;
}

function buildEmbed(user, guild) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const total = wallet + bankBal;
    const pos = rankPosition(user.id, guild);
    const rankLine =
        pos != null
            ? `🏆 Posição no Ranking: **#${pos}**${guild ? ' no servidor' : ''}`
            : '🏆 Posição no Ranking: —';

    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `AETERNUS SALDO • @${user.username}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setDescription(
            [
                `👛 **Em Mãos:** ${fmt(wallet)} Éter`,
                `🏦 **No Banco:** ${fmt(bankBal)} Éter`,
                `💎 **Fortuna:** ${fmt(total)} Éter`,
                '',
                rankLine
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Aeternus · economia' })
        .setTimestamp();
}

async function run(user, guild, reply) {
    return reply({ embeds: [buildEmbed(user, guild)] });
}

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira', 'eter'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver_saldo')
        .setDescription('Ver saldo de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await run(user, message.guild, (p) => message.reply(p));
    },

    async executeSlash(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        await run(user, interaction.guild, (p) => interaction.reply(p));
    }
};
