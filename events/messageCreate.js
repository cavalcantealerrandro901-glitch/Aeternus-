const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

function readSettings() {
    const filePath = path.join(__dirname, '..', 'settings.json');
    if (!fs.existsSync(filePath)) return {};
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
    } catch {
        return {};
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const all = readSettings();
        const guildSettings = all[message.guild.id] || {};
        const prefix = guildSettings.prefix || process.env.PREFIX || '!';

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            await command.execute(message, args, client);
        } catch (error) {
            console.error(`[CMD ${commandName}]`, error);
            message.reply('Erro ao executar este comando.').catch(() => {});
        }
    }
};
