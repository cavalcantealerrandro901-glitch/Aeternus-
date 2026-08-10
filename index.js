const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const db = require('./src/database/db');
const registerLogs = require('./src/events/logs');
const registerWelcome = require('./src/events/welcome');
const startWebServer = require('./src/web/server');

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
        GatewayIntentBits.GuildMembers,
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

// Carregar Comandos Slash (/)
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const cmd = require(path.join(commandsPath, file));
        if ('data' in cmd && 'execute' in cmd) client.commands.set(cmd.data.name, cmd);
    }
}

// 📌 Carregador Automático de Eventos (inclui messageCreate.js)
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        // Ignora os módulos de funções específicas para não duplicar registradores
        if (file === 'logs.js' || file === 'welcome.js') continue;

        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.name && typeof event.execute === 'function') {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }
    }
}

// Conexão e carregamento das configurações salvas no MongoDB
if (config.mongoUri) {
    mongoose.connect(config.mongoUri)
        .then(async () => {
            console.log('📦 Conectado ao MongoDB com sucesso!');
            await db.init(); // Inicializa o cache com os dados salvos
        })
        .catch(err => console.error('❌ Erro no MongoDB:', err));
} else {
    console.warn('⚠️ MONGO_URI não definida! As configurações não serão salvas permanentemente.');
}

// Registrar módulos de eventos clássicos
registerLogs(client);
registerWelcome(client);

// Iniciar Painel Web
startWebServer(client, config);

client.once('clientReady', async () => {
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

// Handler de Comandos Slash (/)
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
