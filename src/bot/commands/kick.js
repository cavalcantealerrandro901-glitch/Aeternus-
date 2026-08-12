const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa um membro')
        .addUserOption(o => o.setName('usuario').setDescription('Alvo').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    aliases: ['expulsar'],

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: 'Não posso expulsar este membro.', ephemeral: true });

        await member.kick(`${interaction.user.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('👢 Membro expulso')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
            return message.reply('Sem permissão.');

        const user = message.mentions.users.first();
        if (!user) return message.reply('Uso: `kick @usuário [motivo]`');

        const reason = args.slice(1).join(' ') || 'Sem motivo';
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member || !member.kickable) return message.reply('Não posso expulsar este membro.');

        await member.kick(`${message.author.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('👢 Membro expulso')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Moderador', value: `${message.author.tag}`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
