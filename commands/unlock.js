const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unlock',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('❌ Você não tem permissão para gerenciar canais.');
        }

        try {
            // Restaura a permissão de envio de mensagens para o cargo @everyone neste canal
            await message.channel.permissionOverwrites.edit(message.guild.id, {
                SendMessages: null
            });

            const reply = await message.reply('🔓 Este canal foi **desbloqueado** com sucesso.');

            // Apaga o comando e a resposta após 7 segundos
            setTimeout(() => {
                reply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 7000);

        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao tentar desbloquear o canal.');
        }
    }
};
