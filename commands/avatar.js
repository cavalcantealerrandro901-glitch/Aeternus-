const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Ver avatar',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Ver avatar')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(user.username)
                    .setImage(user.displayAvatarURL({ size: 4096 }))
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(user.username)
                    .setImage(user.displayAvatarURL({ size: 4096 }))
            ]
        });
    }
};
