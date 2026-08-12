const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Informações de um usuário')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário')),
    aliases: ['user', 'whois', 'ui'],

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        await interaction.reply({ embeds: [build(user, member)] });
    },

    async executePrefix(message) {
        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        await message.reply({ embeds: [build(user, member)] });
    }
};

function build(user, member) {
    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: 'ID', value: user.id, inline: true },
            { name: 'Conta criada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

    if (member) {
        embed.addFields(
            { name: 'Entrou em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: 'Cargos', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).slice(0, 15).join(' ') || 'Nenhum' }
        );
    }

    return embed;
}
