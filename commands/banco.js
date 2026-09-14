const { SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function getPrefix(guild) {
    try {
        const store = require('../utils/store');
        const data = store.load('prefixes.json', {});
        if (guild?.id && data[guild.id]) return String(data[guild.id]);
    } catch (_) {}
    return process.env.PREFIX || 'O.';
}

function buildText(user, guild) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const prefix = getPrefix(guild);

    return [
        '🏦 **BANCO AETERNUS**',
        '',
        '*Aqui você poderá depositar éter para que os outros não o roubem de você. Basta continuar coletando o daily diariamente com `/diario` ou `' +
            prefix +
            'daily`.*',
        '',
        '----------------------------------------',
        '',
        '📋 **STATUS BANCÁRIOS**',
        '',
        `${user} você tem depositado: ✨ **${fmt(bankBal)}** éter.`,
        `👛 *Em mãos:* ✨ **${fmt(wallet)}** éter.`,
        '',
        '----------------------------------------',
        '',
        '💡 Use `/depositar-eter` ou `/sacar-eter` para proteger e sacar a quantia quando quiser!!! ✨'
    ].join('\n');
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
            content: buildText(user, message.guild),
            allowedMentions: { users: [user.id] }
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await i.reply({
            content: buildText(user, i.guild),
            allowedMentions: { users: [user.id] }
        });
    }
};
