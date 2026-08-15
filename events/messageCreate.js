// Função auxiliar para calcular o tempo passado
function formatTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} segundos atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutos atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours} horas atrás`;
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        // 1. Verifica se o autor estava AFK e remove
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            const welcomeMsg = await message.reply('👋 Bem-vindo de volta! Removi seu status de AFK.');
            setTimeout(() => welcomeMsg.delete().catch(() => {}), 5000);
        }

        // 2. Verifica se mencionaram alguém que está AFK
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async user => {
                if (client.afk.has(user.id)) {
                    const afkData = client.afk.get(user.id);
                    const timeAgo = formatTime(afkData.time);
                    
                    const afkMsg = await message.reply(
                        `💤 **${user.username}** está AFK.\n` +
                        `📝 **Motivo:** ${afkData.reason}\n` +
                        `⏱️ **Ausente há:** ${timeAgo}`
                    );

                    // Apaga a mensagem após 7 segundos
                    setTimeout(() => {
                        afkMsg.delete().catch(() => {});
                    }, 7000);
                }
            });
        }

        // 3. Processamento de comandos
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
