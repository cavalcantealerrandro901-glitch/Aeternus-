const { generatePhrase, getRandomEmoji, getFlirt } = require('../utils/phrases');

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
        // Ignora mensagens do próprio bot
        if (message.author.bot) return;

        // 1. Sistema de "Paquera e Reações" (Ativo em TODOS os canais)
        // Chance de 10% de interagir
        if (Math.random() < 0.10) {
            // Se for uma mensagem curta ou aleatória, o bot reage com emoji
            if (message.content.length < 20 || Math.random() < 0.5) {
                message.react(getRandomEmoji()).catch(() => {});
            } else {
                // Se for mais longa, o bot "paquera" respondendo com uma frase
                const flirt = getFlirt();
                const phrase = generatePhrase();
                const emoji = getRandomEmoji();
                
                message.reply(`🖤 ${flirt} ${emoji}\n\n*${phrase}*`).catch(() => {});
            }
        }

        // 2. Sistema AFK
        if (client.afk.has(message.author.id)) {
            client.afk.delete(message.author.id);
            const welcomeMsg = await message.reply('🥀 A escuridão sente sua volta, mestre. Status AFK removido.');
            setTimeout(() => welcomeMsg.delete().catch(() => {}), 5000);
        }

        // 3. Verificação de Menções AFK
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async user => {
                if (client.afk.has(user.id)) {
                    const afkData = client.afk.get(user.id);
                    const timeAgo = formatTime(afkData.time);
                    
                    const afkMsg = await message.reply(
                        `💀 **${user.username}** está mergulhado no abismo (AFK).\n` +
                        `📝 **Motivo:** ${afkData.reason}\n` +
                        `⏱️ **Ausente há:** ${timeAgo}`
                    );
                    setTimeout(() => afkMsg.delete().catch(() => {}), 7000);
                }
            });
        }

        // 4. Processamento de comandos
        if (!message.content.startsWith('!')) return;
        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            message.react(getRandomEmoji()).catch(() => {});
            command.execute(message, args, client);
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro nas trevas ao tentar executar esse comando!');
        }
    },
};
