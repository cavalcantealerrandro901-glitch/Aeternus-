const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');

/** Mesmo cargo do anti-roubo em rob.js */
const ANTI_ROB_ROLE_ID = '1550256144138637423';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function isProtected(guild, userId) {
    if (!guild || !userId) return false;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return false;
        return member.roles.cache.has(ANTI_ROB_ROLE_ID);
    } catch (_) {
        return false;
    }
}

async function buildEmbed(user, guild) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const safe = await isProtected(guild, user.id);

    const title = safe ? '🏦 Aeternus Banco · Protegido' : '🏦 Aeternus Banco · Desprotegido';

    const statusLine = safe
        ? '🛡️ **Proteção ativa.**\nSeu cofre conta com o cargo <@&' +
          ANTI_ROB_ROLE_ID +
          '> — o seu éter está fora do alcance de qualquer roubo.'
        : '⚠️ **Atenção: sem proteção.**\nEnquanto você não tiver o cargo anti-roubo, tanto a **carteira** quanto o **banco** podem ser alvo de roubo.';

    const tip = safe
        ? '✨ *Seu éter está em boas mãos. Mantenha o cargo e continue seguro.*'
        : '💎 *Garanta o cargo anti-roubo com a equipe e deixe seu éter realmente seguro.*';

    const color = safe ? 0x86efac : 0xfbbf24;

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
            [
                statusLine,
                '',
                '----------------------------------------',
                '',
                '📋 **STATUS BANCÁRIOS**',
                '',
                '💰 *Você tem depositado:* ✨ **' + fmt(bankBal) + '** éter.',
                '👛 *Em mãos:* ✨ **' + fmt(wallet) + '** éter.',
                '',
                '----------------------------------------',
                '',
                tip
            ].join('\n')
        );
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver extrato do banco e status de proteção',
    data: new SlashCommandBuilder()
        .setName('ver-banco')
        .setDescription('Ver extrato do banco de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const emb = await buildEmbed(user, message.guild);
        await message.reply({
            content: `${user}`,
            embeds: [emb],
            allowedMentions: {
                users: [user.id],
                roles: [ANTI_ROB_ROLE_ID]
            }
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const emb = await buildEmbed(user, i.guild);
        await i.reply({
            content: `${user}`,
            embeds: [emb],
            allowedMentions: {
                users: [user.id],
                roles: [ANTI_ROB_ROLE_ID]
            }
        });
    }
};
