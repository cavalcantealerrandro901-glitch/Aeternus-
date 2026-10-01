const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const antiRob = require('../utils/antiRob');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function buildEmbed(user, guild) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const safe = await antiRob.hasAntiRob(guild, user.id);
    const roleId = antiRob.resolveRoleId(guild);
    const roleMention = roleId ? '<@&' + roleId + '>' : 'cargo anti-roubo';

    const color = safe ? 0x3b82f6 : 0xd97706;
    const badge = safe ? '【 PROTEGIDO 】' : '【 DESPROTEGIDO 】';
    const title = (safe ? '🔐 ' : '⚠ ') + 'Aeternus Banco · ' + badge;

    const statusLine = safe
        ? [
              '■■■ **Estado: PROTEGIDO**',
              '',
              '🔒 Seu cofre está protegido pelo cargo ' + roleMention + '.',
              'Ninguém consegue roubar o éter que você guardou aqui.'
          ].join('\n')
        : [
              '▲▲▲ **Estado: DESPROTEGIDO**',
              '',
              '⚠ Sem o cargo de proteção, carteira e banco ficam expostos.',
              'Qualquer pessoa pode tentar roubar o seu éter.',
              roleId
                  ? 'Peça o cargo ' + roleMention + ' à equipe deste servidor.'
                  : 'A equipe ainda não configurou o cargo (`/config-antiroubo`).'
          ].join('\n');

    const tip = safe
        ? '✔ Proteção ativa — mantenha o cargo e continue em segurança.'
        : '◆ Fale com a equipe, adquira o cargo anti-roubo e proteja o seu éter.';

    const vaultIcon = safe ? '🔒' : '📭';
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
                vaultIcon + ' *Depositado:* ✨ **' + fmt(bankBal) + '** éter',
                handIcon + ' *Em mãos:* ✨ **' + fmt(wallet) + '** éter',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                tip
            ].join('\n')
        )
        .setFooter({
            text: safe
                ? 'Estado: PROTEGIDO · anti-roubo ativo neste servidor'
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
        const roleId = antiRob.resolveRoleId(message.guild);
        await message.reply({
            content: '' + user,
            embeds: [emb],
            allowedMentions: {
                users: [user.id],
                roles: roleId ? [roleId] : []
            }
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const emb = await buildEmbed(user, i.guild);
        const roleId = antiRob.resolveRoleId(i.guild);
        await i.reply({
            content: '' + user,
            embeds: [emb],
            allowedMentions: {
                users: [user.id],
                roles: roleId ? [roleId] : []
            }
        });
    }
};
