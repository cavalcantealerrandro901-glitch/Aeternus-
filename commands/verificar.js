const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getSettings } = require('../utils/settings');

module.exports = {
    name: 'verificar',
    aliases: ['verify'],
    description: 'Verificação',
    data: new SlashCommandBuilder().setName('verificacao').setDescription('Verificacao'),

    async execute(message) {
        const s = getSettings(message.guild.id);
        const roleId = s.verifyRoleId || s.verification?.roleId;
        if (!roleId) return message.reply('Verificação não configurada no painel.');
        try {
            await message.member.roles.add(roleId);
            await message.reply('✅ Verificado.');
        } catch {
            await message.reply('❌ Não consegui dar o cargo.');
        }
    },

    async executeSlash(i) {
        const s = getSettings(i.guild.id);
        const roleId = s.verifyRoleId || s.verification?.roleId;
        if (!roleId) return i.reply({ content: 'Verificação não configurada no painel.', ephemeral: true });
        try {
            await i.member.roles.add(roleId);
            await i.reply('✅ Verificado.');
        } catch {
            await i.reply({ content: '❌ Não consegui dar o cargo.', ephemeral: true });
        }
    }
};
