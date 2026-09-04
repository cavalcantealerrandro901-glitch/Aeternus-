const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function build(user) {
    const w = eter.get(user.id);
    const b = bank.get(user.id);
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setTitle('Banco')
        .addFields(
            { name: 'Carteira', value: `✨ **${fmt(w)}**`, inline: true },
            { name: 'Cofre', value: `✨ **${fmt(b)}**`, inline: true },
            { name: 'Total', value: `✨ **${fmt(w + b)}**`, inline: true }
        );
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver banco',
    data: new SlashCommandBuilder()
        .setName('banco')
        .setDescription('Ver banco')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({ embeds: [build(user)] });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await i.reply({ embeds: [build(user)] });
    }
};
