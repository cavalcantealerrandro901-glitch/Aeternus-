const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'kick',
    async execute(message, args) {
        // Verifica se quem mandou o comando tem permissão de expulsar membros
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) {
            return message.reply('⚠️ Mencione o membro que deseja expulsar ou informe o ID.');
        }

        if (!target.kickable) {
            return message.reply('❌ Eu não consigo expulsar este membro (verifique a hierarquia de cargos).');
        }

        const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';

        // Cria os botões com IDs customizados contendo a ação, tipo e ID do alvo
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`kick_normal_${target.id}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`kick_silent_${target.id}`)
                .setLabel('Kick Silencioso')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({
            content: `⚠️ Deseja realmente expulsar **${target.user.tag}**?\n📝 **Motivo:** ${reason}`,
            components: [row]
        });
    }
};
