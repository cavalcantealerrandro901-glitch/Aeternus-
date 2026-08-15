const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ban',
    async execute(message, args) {
        // Verifica se quem mandou o comando tem permissão de banir
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) {
            return message.reply('⚠️ Mencione o membro que deseja banir ou informe o ID.');
        }

        if (!target.bannable) {
            return message.reply('❌ Eu não consigo banir este membro (verifique a hierarquia de cargos).');
        }

        const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';

        // Criamos os botões embutindo o ID do alvo no customId para segurança
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ban_normal_${target.id}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ban_silent_${target.id}`)
                .setLabel('Banimento Silencioso')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({
            content: `⚠️ Deseja realmente banir **${target.user.tag}**?\n📝 **Motivo:** ${reason}`,
            components: [row]
        });
    }
};
