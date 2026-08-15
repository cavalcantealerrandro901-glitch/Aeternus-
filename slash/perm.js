const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perm')
        .setDescription('Gerencia permissões para o comando addmoney')
        .addSubcommand(sub =>
            sub.setName('dar')
                .setDescription('Concede permissão a um usuário')
                .addUserOption(opt => opt.setName('usuario').setDescription('O usuário').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remover')
                .setDescription('Remove a permissão de um usuário')
                .addUserOption(opt => opt.setName('usuario').setDescription('O usuário').setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Apenas administradores podem gerenciar essas permissões.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        const allowed = db.getPerms();

        if (subcommand === 'dar') {
            if (allowed.includes(target.id)) {
                return interaction.reply({ content: `⚠️ **${target.tag}** já possui permissão.`, ephemeral: true });
            }
            db.setPerm(target.id, true);
            return interaction.reply({ content: `✅ Permissão concedida com sucesso para **${target.tag}**.` });
        } else if (subcommand === 'remover') {
            if (!allowed.includes(target.id)) {
                return interaction.reply({ content: `⚠️ **${target.tag}** não possui permissão.`, ephemeral: true });
            }
            db.setPerm(target.id, false);
            return interaction.reply({ content: `✅ Permissão removida de **${target.tag}**.` });
        }
    }
};
