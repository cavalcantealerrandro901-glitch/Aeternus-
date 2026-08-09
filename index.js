require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const startWebServer = require('./src/web/server');
const registerLogs = require('./src/events/logs');
const registerWelcome = require('./src/events/welcome');

let config;
try { 
    config = require('./config.json'); 
} catch (e) {
    config = { 
        token: process.env.DISCORD_TOKEN || process.env.TOKEN, 
        clientId: process.env.CLIENT_ID, 
        clientSecret: process.env.CLIENT_SECRET, 
        mongoUri: process.env.MONGO_URI 
    };
}

const client = new Client({
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,    // Essencial para detectar novos membros
        GatewayIntentBits.GuildVoiceStates 
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const cmd = require(path.join(commandsPath, file));
        if ('data' in cmd && 'execute' in cmd) client.commands.set(cmd.data.name, cmd);
    }
}

if (config.mongoUri) {
    mongoose.connect(config.mongoUri)
        .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
        .catch(err => console.error('❌ Erro no MongoDB:', err));
}

// Registrar eventos
registerLogs(client);
registerWelcome(client);

// Iniciar Painel Web
startWebServer(client, config);

client.once('ready', async () => {
    console.log(`🤖 Aeternus online como ${client.user.tag}!`);
    const cmds = []; 
    client.commands.forEach(c => cmds.push(c.data.toJSON()));
    
    if (config.token && config.clientId) {
        try {
            await new REST({ version: '10' }).setToken(config.token).put(Routes.applicationCommands(config.clientId), { body: cmds });
            console.log('✨ Comandos barra registrados!');
        } catch (error) { 
            console.error('❌ Erro ao registrar comandos:', error); 
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.commands.get(interaction.commandName);
    if (cmd) {
        try { 
            await cmd.execute(interaction); 
        } catch (e) { 
            console.error(e); 
        }
    }
});

if (config.token) {
    client.login(config.token);
}
