const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const startWebServer = require('./src/web/server');

let config;
try { config = require('./config.json'); } catch (e) {
    config = { token: process.env.DISCORD_TOKEN, clientId: process.env.CLIENT_ID, clientSecret: process.env.CLIENT_SECRET, mongoUri: process.env.MONGO_URI };
}

const client = new Client({
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ],
});
client.commands = new Collection();

// Carregar Comandos
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const cmd = require(path.join(commandsPath, file));
        if ('data' in cmd && 'execute' in cmd) client.commands.set(cmd.data.name, cmd);
    }
}

// MongoDB
if (config.mongoUri) {
    mongoose.connect(config.mongoUri).then(() => console.log('📦 Conectado ao MongoDB com sucesso!')).catch(err => console.error('Erro no MongoDB:', err));
}

// Iniciar Painel Web e injetar dependências (Cliente Discord e Configurações)
startWebServer(client, config);

// Eventos do Bot
client.once('ready', async () => {
    console.log(`🤖 Aeternus online como ${client.user.tag}!`);
    const cmds = []; client.commands.forEach(c => cmds.push(c.data.toJSON()));
    if (config.token && config.clientId) {
        try {
            await new REST({ version: '10' }).setToken(config.token).put(Routes.applicationCommands(config.clientId), { body: cmds });
            console.log('✨ Comandos barra registrados!');
        } catch (error) { console.error(error); }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.commands.get(interaction.commandName);
    if (cmd) try { await cmd.execute(interaction); } catch (e) { console.error(e); }
});

if (config.token) client.login(config.token);
