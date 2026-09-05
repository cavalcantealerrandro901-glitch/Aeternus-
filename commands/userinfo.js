const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function build(user, member, guild) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: 'ID', value: user.id, inline: true },
            {
                name: 'Conta',
                value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                inline: true
            },
            {
                name: 'Entrou',
                value: member?.joinedTimestamp
                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                    : '—',
                inline: true
            },
            {
                name: 'Cargos',
                value:
                    member?.roles.cache
                        .filter((r) => r.id !== guild?.id)
                        .map((r) => r.toString())
                        .slice(0, 12)
                        .join(' ') || 'Nenhum'
            }
        );
}

module.exports = {
    name: 'userinfo',
    aliases: ['whois', 'ui', 'user'],
    description: 'Info do usuário',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Informações de um usuário')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        await message.reply({ embeds: [build(user, member, message.guild)] });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const member = i.guild
            ? await i.guild.members.fetch(user.id).catch(() => null)
            : null;
        await i.reply({ embeds: [build(user, member, i.guild)] });
    }
};
