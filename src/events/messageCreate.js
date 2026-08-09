const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignora mensagens enviadas por bots ou em conversas privadas (DMs)
        if (message.author.bot || !message.guild) return;

        // Obter as configurações do servidor no banco de dados
        const guildConfig = db.getGuildConfig(message.guild.id);
        const prefix = guildConfig.prefix || '!';

        // Responde com o prefixo atual se o bot for mencionado
        const botMention = `<@${message.client.user.id}>`;
        const botMentionNick = `<@!${message.client.user.id}>`;
        if (message.content.trim() === botMention || message.content.trim() === botMentionNick) {
            return await message.reply({
                content: `👋 Olá ${message.author}! Meu prefixo neste servidor é \`${prefix}\`.`
            });
        }

        // Verifica se a mensagem começa com o prefixo configurado
        if (!message.content.startsWith(prefix)) return;

        // Separa o nome do comando dos argumentos
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commandName) return;

        // 1. CHECAR COMANDOS PERSONALIZADOS (Criados no Painel Web)
        const customCommands = guildConfig.customCommands || [];
        const customCmd = customCommands.find(c => c.name.toLowerCase() === commandName);

        if (customCmd) {
            if (customCmd.isEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(customCmd.response)
                    .setColor('#38bdf8');
                return await message.channel.send({ embeds: [embed] });
            } else {
                return await message.channel.send(customCmd.response);
            }
        }

        // 2. COMANDO PADRÃO DE AJUDA COM PREFIXO
        if (commandName === 'help' || commandName === 'ajuda') {
            const embed = new EmbedBuilder()
                .setTitle('📜 Central de Comandos')
                .setDescription(`O prefixo atual neste servidor é \`${prefix}\``)
                .addFields(
                    { 
                        name: '⚙️ Prefixo', 
                        value: `Use \`${prefix}prefixo\` no painel ou \`/prefixo\` para alterar.` 
                    },
                    { 
                        name: '⚡ Comandos Customizados', 
                        value: customCommands.length > 0 
                            ? customCommands.map(c => `\`${prefix}${c.name}\``).join(', ') 
                            : 'Nenhum comando customizado cadastrado.' 
                    }
                )
                .setColor('#38bdf8')
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                .setTimestamp();

            return await message.channel.send({ embeds: [embed] });
        }
    }
};
