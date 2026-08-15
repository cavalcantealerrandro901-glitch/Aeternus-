const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: 'warn',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('❌ Você não tem permissão para avisar membros.');
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';

        if (!target) {
            return message.reply('⚠️ Mencione o membro que deseja avisar ou informe o ID.');
        }

        const totalWarns = db.addWarn(target.id, reason, message.author.tag);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`viewwarns_${target.id}`)
                .setLabel(`📋 Ver Avisos (${totalWarns})`)
                .setStyle(ButtonStyle.Primary)
        );

        message.reply({
            content: `⚠️ O membro **${target.user.tag}** recebeu um aviso.\n📝 **Motivo:** ${reason}\n📊 **Total de avisos:** ${totalWarns}`,
            components: [row]
        });
    }
};
