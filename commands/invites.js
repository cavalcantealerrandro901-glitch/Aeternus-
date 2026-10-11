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
        if (!message.guild) return message.reply('❌ Este comando só funciona em um servidor.');
        if (!message.member.permissions.has(require('discord.js').PermissionFlagsBits.ManageGuild)) return message.reply('❌ Você precisa da permissão **Gerenciar servidor** para consultar os convites.');
        const user = message.mentions.users.first() || message.author;
        const invites = await message.guild.invites.fetch().catch(() => null);
        if (!invites) return message.reply('❌ Sem permissão de ver convites.');
        const total = invites.filter((inv) => inv.inviter?.id === user.id).reduce((a, inv) => a + (inv.uses || 0), 0);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`✦ AETERNUS • CONVITES`)
                    .setDescription(`Usuário: **${user.tag || user.username}**\nTotal de usos: **${total}**`)
                    
            ]
        });
    },

    async executeSlash(i) {
        if (!i.guild) return i.reply({ content: '❌ Este comando só funciona em um servidor.', ephemeral: true });
        if (!i.memberPermissions?.has(require('discord.js').PermissionFlagsBits.ManageGuild)) return i.reply({ content: '❌ Você precisa da permissão **Gerenciar servidor** para consultar os convites.', ephemeral: true });
        const user = i.options.getUser('usuario') || i.user;
        const invites = await i.guild.invites.fetch().catch(() => null);
        if (!invites) return i.reply({ content: '❌ Sem permissão de ver convites.', ephemeral: true });
        const total = invites.filter((inv) => inv.inviter?.id === user.id).reduce((a, inv) => a + (inv.uses || 0), 0);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('✦ AETERNUS • CONVITES')
                    .setDescription(`Usuário: **${user.tag || user.username}**\nTotal de usos: **${total}**`)
                    .setFooter({ text: 'Aeternus • Estatísticas de convites' })
                    .setTimestamp()
            ]
        });
    }
};
