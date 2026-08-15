module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        if (message.author.bot) return;

        // 1. Verifica se o autor estava AFK e remove
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            message.reply('👋 Bem-vindo de volta! Removi seu status de AFK.').then(msg => {
                setTimeout(() => msg.delete(), 5000);
            });
        }

        // 2. Verifica se mencionaram alguém que está AFK
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                if (client.afk.has(user.id)) {
                    const afkData = client.afk.get(user.id);
                    message.reply(`💤 **${user.username}** está AFK: ${afkData.reason}`);
                }
            });
        }

        // 3. Processamento de comandos (o prefixo !)
        if (!message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            command.execute(message, args, client);
        } catch (error) {
            console.error(error);
            message.reply('Houve um erro ao tentar executar esse comando!');
        }
    },
};
