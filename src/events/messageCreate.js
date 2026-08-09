const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const guildConfig = db.getGuildConfig(message.guild.id);
        const prefix = guildConfig.prefix || '!';

        // Responde ao marcar/mencionar o bot no chat
        const botMention = `<@${message.client.user.id}>`;
        const botMentionNick = `<@!${message.client.user.id}>`;
        if (message.content.trim() === botMention || message.content.trim() === botMentionNick) {
            return await message.reply({
                content: `👋 Olá ${message.author}! Meu prefixo neste servidor é \`${prefix}\`. Use \`${prefix}help\` para ver a lista de comandos.`
            });
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commandName) return;

        // Comando via texto tradicional para mudar o prefixo (Ex: !prefixo ?)
        if (commandName === 'prefixo' || commandName === 'prefix') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await message.reply('❌ Você precisa da permissão de **Administrador** para alterar o prefixo.');
            }

            const newPrefix = args[0];
            if (!newPrefix) {
                return await message.reply(`📌 O prefixo atual é \`${prefix}\`. Para alterar use: \`${prefix}prefixo <novo_prefixo>\``);
            }

            if (newPrefix.length > 5) {
                return await message.reply('❌ O prefixo não pode ter mais de 5 caracteres.');
            }

            db.setGuildConfig(message.guild.id, { prefix: newPrefix });
            return await message.reply(`✅ Prefixo alterado com sucesso para \`${newPrefix}\`!`);
        }

        // Comandos Personalizados do Painel Web
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

        // Comando de Ajuda
        if (commandName === 'help' || commandName === 'ajuda') {
            const embed = new EmbedBuilder()
                .setTitle('📜 Central de Comandos')
                .setDescription(`O prefixo atual neste servidor é \`${prefix}\``)
                .addFields(
                    { 
                        name: '⚙️ Prefixo', 
                        value: `Use \`${prefix}prefixo <novo>\`, o comando \`/prefixo\` ou o Painel Web para alterar.` 
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
