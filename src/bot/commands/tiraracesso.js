const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tiraracesso')
        .setDescription('Remove acesso ao Editor do painel (somente dono)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    aliases: ['tiraracesso'],

    async execute(interaction) {
        const owner = process.env.OWNER_ID || '';
        if (!owner || interaction.user.id !== owner) {
            return interaction.reply({ content: 'Só o dono do bot pode usar isto.', ephemeral: true });
        }
        const user = interaction.options.getUser('usuario');
        await db.removeEditorPermission(user.id);
        return interaction.reply({
            content: `Acesso removido de **${user.tag}**.`,
            ephemeral: true
        });
    },

    async executePrefix(message, args) {
        const owner = process.env.OWNER_ID || '';
        if (!owner || message.author.id !== owner) {
            return message.reply('Só o dono do bot pode usar isto.');
        }
        const user = message.mentions.users.first();
        if (!user) return message.reply('Use: `!tiraracesso @usuario`');
        await db.removeEditorPermission(user.id);
        return message.reply(`Acesso removido de **${user.tag}**.`);
    }
};
