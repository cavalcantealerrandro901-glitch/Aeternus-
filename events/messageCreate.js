const { Events } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Lê as configurações do arquivo
        let settings = {};
        try {
            if (fs.existsSync('./settings.json')) {
                settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
            }
        } catch (e) { console.error("Erro ao ler settings.json", e); }

        // Pega o prefixo do servidor, se não existir, usa '!'
        const guildSettings = settings[message.guild.id] || {};
        const prefix = guildSettings.prefix || '!';

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
        }
    },
};
