const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const antiRob = require('../utils/antiRob');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function buildEmbed(user, guild, client) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const wasSaved = antiRob.isSavedProtected(user.id);
    const safe = await antiRob.hasAntiRob(guild, user.id, client);
    const roleId = antiRob.resolveRoleId(guild);
    const roleMention = roleId ? '<@&' + roleId + '>' : 'cargo anti-roubo';
    const rec = antiRob.getRecord(user.id);

    const color = safe ? 0x3b82f6 : 0xd97706;
    const badge = safe ? '【 PROTEGIDO 】' : '【 DESPROTEGIDO 】';
    const title = (safe ? '🔐 ' : '⚠ ') + 'Aeternus Banco · ' + badge;

    let statusLine;
    if (safe && wasSaved) {
        statusLine = [
            '■■■ **Estado: PROTEGIDO (global)**',
            '',
            '🔒 Sua proteção está **salva no banco de dados**.',
            'Vale em **todos** os servidores — não precisa do cargo em cada um.',
            rec && rec.grantedAt ? '_Ativada em ' + new Date(rec.grantedAt).toLocaleDateString('pt-BR') + '_' : ''
        ].filter(Boolean).join('\n');
    } else if (safe) {
        statusLine = [
            '■■■ **Estado: PROTEGIDO**',
            '',
            '🔒 Você tem ' + roleMention + ' neste servidor.',
            'A proteção foi **gravada** e agora vale em qualquer servidor.'
        ].join('\n');
    } else {
        statusLine = [
            '▲▲▲ **Estado: DESPROTEGIDO**',
            '',
            '⚠ Sem cargo anti-roubo e sem registro no banco.',
            'Você pode ser roubado em **qualquer** servidor.',
            roleId
                ? 'Peça ' + roleMention + ' à equipe (uma vez) para proteção permanente.'
                : 'A equipe pode definir o cargo com `/config-antiroubo`.'
        ].join('\n');
    }

    const tip = safe
        ? '✔ Proteção global ativa no perfil Aeternus.'
        : '◆ Consiga o cargo anti-roubo uma vez — fica salvo no seu usuário.';

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription([
            statusLine, '', '━━━━━━━━━━━━━━━━━━━━', '',
            '📋 **STATUS BANCÁRIOS**', '',
            (safe ? '🔒' : '📭') + ' *Depositado:* ✨ **' + fmt(bankBal) + '** éter',
            (safe ? '👛' : '🪙') + ' *Em mãos:* ✨ **' + fmt(wallet) + '** éter',
            '', '━━━━━━━━━━━━━━━━━━━━', '', tip
        ].join('\n'))
        .setFooter({
            text: safe
                ? 'Anti-roubo global · salvo no banco de usuários'
                : 'Desprotegido · pode ser roubado em qualquer servidor'
        });
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver extrato do banco e status de proteção',
    data: new SlashCommandBuilder()
        .setName('ver-banco')
        .setDescription('Ver extrato do banco de éter')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const emb = await buildEmbed(user, message.guild, message.client);
        await message.reply({ content: '' + user, embeds: [emb], allowedMentions: { users: [user.id] } });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const emb = await buildEmbed(user, i.guild, i.client);
        await i.reply({ content: '' + user, embeds: [emb], allowedMentions: { users: [user.id] } });
    }
};
