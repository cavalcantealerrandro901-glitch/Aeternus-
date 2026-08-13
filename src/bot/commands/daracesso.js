const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daracesso')
        .setDescription('Libera acesso ao Editor do painel (somente dono)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    aliases: ['daracesso'],

    async execute(interaction) {
        const owner = process.env.OWNER_ID || '';
        if (!owner || interaction.user.id !== owner) {
            return interaction.reply({ content: 'Só o dono do bot pode usar isto.', ephemeral: true });
        }
        const user = interaction.options.getUser('usuario');
        await db.addEditorPermission(user.id);
        return interaction.reply({
            content: `Acesso ao Editor liberado para **${user.tag}**.`,
            ephemeral: true
        });
    },

    async executePrefix(message, args) {
        const owner = process.env.OWNER_ID || '';
        if (!owner || message.author.id !== owner) {
            return message.reply('Só o dono do bot pode usar isto.');
        }
        const user = message.mentions.users.first();
        if (!user) return message.reply('Use: `!daracesso @usuario`');
        await db.addEditorPermission(user.id);
        return message.reply(`Acesso ao Editor liberado para **${user.tag}**.`);
    }
};
