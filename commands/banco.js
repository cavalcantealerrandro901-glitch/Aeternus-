const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function build(user) {
    const wallet = eter.get(user.id);
    const bank = eter.getBank?.(user.id) ?? 0;
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('Banco')
        .setDescription(
            [
                `**${user.username}**`,
                `✨ Carteira: **${fmt(wallet)}**`,
                `🏦 Cofre: **${fmt(bank)}**`,
                `💰 Total: **${fmt(wallet + bank)}**`
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }));
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver banco',
    data: new SlashCommandBuilder()
        .setName('ver-banco')
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
