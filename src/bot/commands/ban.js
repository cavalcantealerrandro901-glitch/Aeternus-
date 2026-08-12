const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um membro')
        .addUserOption(o => o.setName('usuario').setDescription('Alvo').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    aliases: ['banir'],

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });
        if (!member.bannable) return interaction.reply({ content: 'Não posso banir este membro.', ephemeral: true });

        await member.ban({ reason: `${interaction.user.tag}: ${reason}` });

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('🔨 Membro banido')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
            return message.reply('Sem permissão.');

        const user = message.mentions.users.first();
        if (!user) return message.reply('Uso: `ban @usuário [motivo]`');

        const reason = args.slice(1).join(' ') || 'Sem motivo';
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member || !member.bannable) return message.reply('Não posso banir este membro.');

        await member.ban({ reason: `${message.author.tag}: ${reason}` });

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('🔨 Membro banido')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
