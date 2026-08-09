const db = require('../database/db');
const { sendMessage } = require('../utils/messageSender');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Log no terminal para verificar se o bot está lendo mensagens
        if (message.content.startsWith('!') || message.content.startsWith('/')) {
            console.log(`💬 Mensagem detectada no servidor [${message.guild.name}]: "${message.content}"`);
        } else {
            return;
        }

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const guildConfig = db.getGuildConfig(message.guild.id);
        const customCommands = guildConfig.customCommands || [];

        const foundCmd = customCommands.find(c => c.name === commandName);
        if (!foundCmd) {
            console.log(`⚠️ Comando !${commandName} não encontrado no banco deste servidor.`);
            return;
        }

        try {
            console.log(`✅ Executando comando customizado !${commandName}...`);
            if (foundCmd.isEmbed) {
                await sendMessage(message.channel, {
                    embed: {
                        description: foundCmd.response
                    },
                    guild: message.guild,
                    user: message.author
                });
            } else {
                await sendMessage(message.channel, {
                    content: foundCmd.response,
                    guild: message.guild,
                    user: message.author
                });
            }
        } catch (err) {
            console.error(`❌ Erro ao enviar resposta do comando !${commandName}:`, err);
        }
    }
};
