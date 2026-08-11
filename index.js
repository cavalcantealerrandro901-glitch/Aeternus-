require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const startWebPanel = require('./src/web/server');
const db = require('./src/database/db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

client.commands = new Collection();

// Carregar comandos (quando existirem)
const commandsPath = path.join(__dirname, 'src/bot/commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./src/bot/commands/${file}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Comando carregado: ${command.data.name}`);
        }
    }
}

// Carregar eventos (quando existirem)
const eventsPath = path.join(__dirname, 'src/bot/events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(`./src/bot/events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`✅ Evento carregado: ${event.name}`);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`\n🎰 ${client.user.tag} está online!`);
    console.log(`📡 Servidores: ${client.guilds.cache.size}`);

    // Conectar MongoDB
    await db.connect();

    // Iniciar Painel Web
    startWebPanel(client);
});

client.login(process.env.TOKEN);
