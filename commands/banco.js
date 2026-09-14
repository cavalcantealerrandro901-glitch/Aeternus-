const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { getPrefix } = require('../utils/settings');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function buildEmbed(user, guild) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const prefix = guild?.id ? getPrefix(guild.id) : 'O.';

    return new EmbedBuilder()
        .setColor(0x86efac)
        .setTitle('🏦 BANCO AETERNUS')
        .setDescription(
            [
                '*Aqui você poderá depositar éter para que os outros não o roubem de você. Basta continuar coletando o daily diariamente com `/diario` ou `' +
                    prefix +
                    'daily`.*',
                '',
                '----------------------------------------',
                '',
                '📋 **STATUS BANCÁRIOS**',
                '',
                `Você tem depositado: ✨ **${fmt(bankBal)}** éter.`,
                `👛 *Em mãos:* ✨ **${fmt(wallet)}** éter.`,
                '',
                '----------------------------------------',
                '',
                '💡 Use `/depositar-eter` ou `/sacar-eter` para proteger e sacar a quantia quando quiser!!! ✨'
            ].join('\n')
        );
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver extrato do banco',
    data: new SlashCommandBuilder()
        .setName('ver-banco')
        .setDescription('Ver extrato do banco de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({
            content: `${user}`,
            embeds: [buildEmbed(user, message.guild)],
            allowedMentions: { users: [user.id] }
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await i.reply({
            content: `${user}`,
            embeds: [buildEmbed(user, i.guild)],
            allowedMentions: { users: [user.id] }
        });
    }
};
