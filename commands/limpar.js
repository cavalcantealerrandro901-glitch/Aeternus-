const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'limpar',
    async execute(message, args) {
        // Verifica se o usuário tem permissão para gerenciar mensagens
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('⚠️ Forneça um número entre 1 e 100 para apagar.');
        }

        try {
            // Apaga a mensagem de comando do autor primeiro
            await message.delete().catch(() => {});

            // Busca as mensagens no canal
            const fetched = await message.channel.messages.fetch({ limit: amount });
            
            // O Discord bloqueia exclusão em massa de mensagens com mais de 14 dias (limite da API)
            const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const validMessages = fetched.filter(msg => msg.createdTimestamp > fourteenDaysAgo);

            if (validMessages.size === 0) {
                const aviso = await message.channel.send('⚠️ Nenhuma mensagem recente (com menos de 14 dias) foi encontrada para apagar.');
                setTimeout(() => aviso.delete().catch(() => {}), 5000);
                return;
            }

            // Executa a limpeza em massa
            await message.channel.bulkDelete(validMessages, true);

            // Mensagem de feedback que se apaga sozinha após 4 segundos
            const successMsg = await message.channel.send(`🧹 **${validMessages.size}** mensagens foram apagadas com sucesso!`);
            setTimeout(() => successMsg.delete().catch(() => {}), 4000);

        } catch (error) {
            console.error(error);
            const errorMsg = await message.channel.send('❌ Ocorreu um erro ao tentar limpar as mensagens.');
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
        }
    }
};
