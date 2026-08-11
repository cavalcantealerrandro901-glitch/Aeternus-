const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const embed = baseEmbed()
            .setColor(0x22c55e)
            .setTitle('📥 Membro Entrou')
            .setDescription(`**Usuário:** ${member.user.tag} (\`${member.user.id}\`)`)
            .addFields({ name: 'Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` })
            .setThumbnail(member.user.displayAvatarURL());

        await sendLog(member.guild, 'member', embed);
    }
};
