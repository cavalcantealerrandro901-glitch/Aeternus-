const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'slowmode',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const errorMsg = await message.reply('❌ Você não tem permissão para gerenciar canais.');
            setTimeout(() => errorMsg.delete().catch(() => {}), 7000);
            return;
        }

        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            const errorMsg = await message.reply('⚠️ Forneça um valor válido em segundos (entre 0 e 21600).');
            setTimeout(() => errorMsg.delete().catch(() => {}), 7000);
            return;
        }

        try {
            await message.channel.setRateLimitPerUser(seconds);
            
            let replyText = `⏱️ O modo lento foi definido para **${seconds} segundos**.`;
            if (seconds === 0) {
                replyText = '⏱️ O modo lento foi **desativado** neste canal.';
            }

            const reply = await message.reply(replyText);

            setTimeout(() => {
                reply.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 7000);

        } catch (error) {
            console.error(error);
            const errorMsg = await message.reply('❌ Ocorreu um erro ao tentar alterar o modo lento.');
            setTimeout(() => errorMsg.delete().catch(() => {}), 7000);
        }
    }
};
