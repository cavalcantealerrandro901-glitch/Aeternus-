const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'invites',
    aliases: ['convites'],
    description: 'Ver convites',
    data: new SlashCommandBuilder()
        .setName('convites')
        .setDescription('Ver convites')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const invites = await message.guild.invites.fetch().catch(() => null);
        if (!invites) return message.reply('❌ Sem permissão de ver convites.');
        const total = invites.filter((inv) => inv.inviter?.id === user.id).reduce((a, inv) => a + (inv.uses || 0), 0);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Convites · ${user.username}`)
                    .setDescription(`Total de usos: **${total}**`)
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const invites = await i.guild.invites.fetch().catch(() => null);
        if (!invites) return i.reply({ content: '❌ Sem permissão de ver convites.', ephemeral: true });
        const total = invites.filter((inv) => inv.inviter?.id === user.id).reduce((a, inv) => a + (inv.uses || 0), 0);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Convites · ${user.username}`)
                    .setDescription(`Total de usos: **${total}**`)
            ]
        });
    }
};
