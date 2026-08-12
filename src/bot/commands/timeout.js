const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Silencia um membro')
        .addUserOption(o => o.setName('usuario').setDescription('Alvo').setRequired(true))
        .addIntegerOption(o => o.setName('minutos').setDescription('Duração em minutos').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    aliases: ['mute', 'silenciar'],

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const minutes = interaction.options.getInteger('minutos');
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });
        if (!member.moderatable) return interaction.reply({ content: 'Não posso silenciar este membro.', ephemeral: true });

        await member.timeout(minutes * 60 * 1000, `${interaction.user.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle('🔇 Timeout aplicado')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Duração', value: `${minutes} min`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return message.reply('Sem permissão.');

        const user = message.mentions.users.first();
        const minutes = parseInt(args[1], 10);
        if (!user || !minutes) return message.reply('Uso: `timeout @usuário <minutos> [motivo]`');

        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member || !member.moderatable) return message.reply('Não posso silenciar este membro.');

        await member.timeout(minutes * 60 * 1000, `${message.author.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle('🔇 Timeout aplicado')
            .addFields(
                { name: 'Usuário', value: `${user.tag}`, inline: true },
                { name: 'Duração', value: `${minutes} min`, inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
