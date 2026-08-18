require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const setupLogs = require('./logsHandler');
const setupWelcome = require('./welcomeHandler');
const { startServer } = require('./server');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

client.afk = new Map();
client.commands = new Collection();
client.slashCommands = new Collection();

// Função para buscar as configurações gravadas do servidor
async function getSettings(guildId) {
    const filePath = path.join(__dirname, 'settings.json');
    if (!fs.existsSync(filePath)) return {};

    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const allSettings = JSON.parse(rawData || '{}');
        return allSettings[guildId] || {};
    } catch (error) {
        console.error('Erro ao ler settings.json:', error);
        return {};
    }
}

// Inicializa os ouvintes de Logs e Boas-Vindas
setupLogs(client, getSettings);
setupWelcome(client, getSettings);

// Carregador de Comandos de Prefixo
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
        console.log(`✨ [COMANDO] Carregado: ${command.name}`);
    }
}

// Carregador de Comandos Slash (/)
const slashPath = path.join(__dirname, 'slash');
if (fs.existsSync(slashPath)) {
    const slashFiles = fs.readdirSync(slashPath).filter(file => file.endsWith('.js'));
    for (const file of slashFiles) {
        const command = require(`./slash/${file}`);
        client.slashCommands.set(command.data.name, command);
        console.log(`⚡ [SLASH] Carregado: ${command.data.name}`);
    }
}

// Carregador de Eventos
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`🔌 [EVENTO] Carregado: ${event.name}`);
    }
}

// Executor de comandos Slash seguro
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Erro no comando:', error);
        try {
            const errorMessage = {
                content: 'Ocorreu um erro ao executar este comando!',
                flags: [MessageFlags.Ephemeral]
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (err) {
            // Evita crash caso a interação expire
        }
    }
});

// Painel web + bot no mesmo processo
startServer(client);

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
