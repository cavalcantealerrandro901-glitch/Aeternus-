const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Informações do servidor'),
    aliases: ['server', 'si'],

    async execute(interaction) {
        await interaction.reply({ embeds: [build(interaction.guild)] });
    },

    async executePrefix(message) {
        await message.reply({ embeds: [build(message.guild)] });
    }
};

function build(guild) {
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
            { name: 'Dono', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Membros', value: `${guild.memberCount}`, inline: true },
            { name: 'Canais', value: `${guild.channels.cache.size}`, inline: true },
            { name: 'Cargos', value: `${guild.roles.cache.size}`, inline: true },
            { name: 'Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'ID', value: guild.id, inline: true }
        )
        .setTimestamp();
}
