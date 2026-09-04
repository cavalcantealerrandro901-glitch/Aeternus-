const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'unlock',
    aliases: ['destrancar'],
    description: 'Destrancar canal',
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Destrancar canal de texto')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Sem permissão.');
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null
            });
            await message.reply('🔓 Canal destrancado.');
        } catch {
            await message.reply('❌ Não consegui destrancar.');
        }
    },

    async executeSlash(i) {
        try {
            await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
            await i.reply('🔓 Canal destrancado.');
        } catch {
            await i.reply({ content: '❌ Não consegui destrancar.', ephemeral: true });
        }
    }
};
