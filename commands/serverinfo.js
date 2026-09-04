const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function build(g) {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(g.name)
        .setThumbnail(g.iconURL({ size: 128 }))
        .addFields(
            { name: 'Dono', value: `<@${g.ownerId}>`, inline: true },
            { name: 'Membros', value: String(g.memberCount), inline: true },
            { name: 'Canais', value: String(g.channels.cache.size), inline: true },
            { name: 'Cargos', value: String(g.roles.cache.size), inline: true },
            {
                name: 'Criado',
                value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,
                inline: true
            },
            { name: 'ID', value: g.id, inline: true }
        );
}

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'server'],
    description: 'Info do servidor',
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Info do servidor'),

    async execute(message) {
        await message.reply({ embeds: [build(message.guild)] });
    },

    async executeSlash(i) {
        await i.reply({ embeds: [build(i.guild)] });
    }
};
