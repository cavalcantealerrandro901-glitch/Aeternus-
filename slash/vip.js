const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const { getVipRoleId, setVipRoleId } = require('../utils/vip');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip')
        .setDescription('Gerenciar VIP do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((s) =>
            s
                .setName('dar')
                .setDescription('Concede o cargo VIP')
                .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        )
        .addSubcommand((s) =>
            s
                .setName('retirar')
                .setDescription('Remove o cargo VIP')
                .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        )
        .addSubcommand((s) =>
            s
                .setName('cargo')
                .setDescription('Define qual cargo é o VIP')
                .addRoleOption((o) => o.setName('role').setDescription('Cargo VIP').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (sub === 'cargo') {
            const role = interaction.options.getRole('role');
            setVipRoleId(guild.id, role.id);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('👑 Cargo VIP definido')
                        .setDescription(`${role} será usado em /vip dar e /vip retirar.`)
                ],
                ephemeral: true
            });
        }

        const roleId = getVipRoleId(guild.id);
        if (!roleId) {
            return interaction.reply({
                content: 'Configure o cargo VIP com `/vip cargo @Cargo`.',
                ephemeral: true
            });
        }

        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
            return interaction.reply({ content: 'Cargo VIP não encontrado. Reconfigure com `/vip cargo`.', ephemeral: true });
        }

        const user = interaction.options.getUser('usuario');
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });
        }

        if (sub === 'dar') {
            await member.roles.add(role).catch((e) => {
                throw new Error('Não consegui adicionar o cargo. Verifique a hierarquia do bot.');
            });
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('👑 VIP concedido')
                        .setDescription(`${member} recebeu ${role}.`)
                ]
            });
        }

        if (sub === 'retirar') {
            await member.roles.remove(role).catch(() => {
                throw new Error('Não consegui remover o cargo.');
            });
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x64748b)
                        .setTitle('👑 VIP removido')
                        .setDescription(`${member} perdeu ${role}.`)
                ]
            });
        }
    }
};
