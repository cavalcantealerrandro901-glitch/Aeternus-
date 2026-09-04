const { PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'lock',
    aliases: ['trancar'],
    description: 'Trancar canal',
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Trancar canal de texto')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Sem permissão.');
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });
            await message.reply('🔒 Canal trancado.');
        } catch {
            await message.reply('❌ Não consegui trancar.');
        }
    },

    async executeSlash(i) {
        try {
            await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
            await i.reply('🔒 Canal trancado.');
        } catch {
            await i.reply({ content: '❌ Não consegui trancar.', ephemeral: true });
        }
    }
};
