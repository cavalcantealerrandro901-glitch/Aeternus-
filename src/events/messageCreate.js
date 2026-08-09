const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // Se a mensagem começar com ! ou /
        if (!message.content.startsWith('!') && !message.content.startsWith('/')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const guildConfig = db.getGuildConfig(message.guild.id);
        const customCommands = guildConfig.customCommands || [];

        const foundCmd = customCommands.find(c => c.name === commandName);
        if (!foundCmd) return;

        try {
            // Substitui variáveis simples como {user} e {server}
            let formattedResponse = foundCmd.response
                .replace(/{user}/g, `<@${message.author.id}>`)
                .replace(/{server}/g, message.guild.name);

            if (foundCmd.isEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(formattedResponse)
                    .setColor('#38bdf8');
                await message.channel.send({ embeds: [embed] });
            } else {
                await message.channel.send(formattedResponse);
            }
        } catch (err) {
            console.error(`❌ Erro ao executar comando customizado !${commandName}:`, err);
        }
    }
};
