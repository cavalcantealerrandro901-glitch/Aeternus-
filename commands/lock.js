const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'lock',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('❌ Você não tem permissão para gerenciar canais.');
        }

        try {
            // Bloqueia o envio de mensagens para o cargo @everyone neste canal
            await message.channel.permissionOverwrites.edit(message.guild.id, {
                SendMessages: false
            });

            const reply = await message.reply('🔒 Este canal foi **bloqueado** com sucesso.');

            // Apaga o comando e a resposta após 7 segundos
            setTimeout(() => {
                reply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 7000);

        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao tentar bloquear o canal.');
        }
    }
};
