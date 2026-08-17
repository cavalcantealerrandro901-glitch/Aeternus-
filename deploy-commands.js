require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!CLIENT_ID || !TOKEN) {
    console.error('❌ ERRO: CLIENT_ID ou TOKEN não estão definidos no arquivo .env!');
    process.exit(1);
}

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

if (fs.existsSync(foldersPath)) {
    const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(foldersPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST().setToken(TOKEN);

(async () => {
    try {
        console.log(`⏳ Iniciando o registro de ${commands.length} comandos slash (/)...`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Sucesso! ${data.length} comandos registrados com sucesso.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();
