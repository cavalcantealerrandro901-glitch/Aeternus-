const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Banir membro',
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banir membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mencione o membro.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await member.ban({ reason });
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Ban')
                        .setDescription(`**${member.user.tag}**\n${reason}`)
                ]
            });
        } catch {
            await message.reply('❌ Não consegui banir.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        try {
            await member.ban({ reason });
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Ban')
                        .setDescription(`**${user.tag}**\n${reason}`)
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui banir.', ephemeral: true });
        }
    }
};
