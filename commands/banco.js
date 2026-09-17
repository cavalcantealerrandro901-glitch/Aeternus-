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

    // Cores com bom contraste e menos dependentes de verde/vermelho
    // Protegido: azul · Desprotegido: âmbar (melhor para daltonismo)
    const color = safe ? 0x3b82f6 : 0xd97706;

    // Rótulos em TEXTO + símbolos de forma (não só cor)
    const badge = safe ? '【 PROTEGIDO 】' : '【 DESPROTEGIDO 】';
    const shape = safe ? '■■■' : '▲▲▲';

    const title = safe
        ? '🔐 Aeternus Banco · ' + badge
        : '⚠ Aeternus Banco · ' + badge;

    const statusLine = safe
        ? [
              shape + ' **Estado: PROTEGIDO**',
              '🔒 Proteção ativa pelo cargo <@&' + ANTI_ROB_ROLE_ID + '>.',
              'O seu éter está fora do alcance de qualquer roubo.'
          ].join('\n')
        : [
              shape + ' **Estado: DESPROTEGIDO**',
              '⚠ Sem o cargo anti-roubo, carteira e banco podem ser alvo de roubo.',
              'A proteção só vale com o cargo correspondente.'
          ].join('\n');

    const tip = safe
        ? '✔ Seu éter está em boas mãos. Mantenha o cargo e continue seguro.'
        : '◆ Garanta o cargo anti-roubo com a equipe e deixe seu éter realmente seguro.';

    // Ícones distintos por forma/significado (não só cor)
    const vaultIcon = safe ? '🔒' : '⚠';
    const handIcon = safe ? '👛' : '🪙';

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
            [
                statusLine,
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                '📋 **STATUS BANCÁRIOS**',
                '',
                vaultIcon + ' Depositado: ✨ **' + fmt(bankBal) + '** éter',
                handIcon + ' Em mãos: ✨ **' + fmt(wallet) + '** éter',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                tip
            ].join('\n')
        )
        .setFooter({
            text: safe
                ? 'Estado: PROTEGIDO · cargo anti-roubo ativo'
                : 'Estado: DESPROTEGIDO · adquira o cargo anti-roubo'
        });
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
