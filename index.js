require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Collection,
    Partials,
    Events,
    REST,
    Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const startWebPanel = require('./src/web/server');
const db = require('./src/database/db');
const { startDailyNotifier } = require('./src/bot/utils/dailyNotifier');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

client.commands = new Collection();

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            loadCommands(fullPath);
            continue;
        }

        if (!entry.name.endsWith('.js')) continue;

        try {
            delete require.cache[require.resolve(fullPath)];
            const command = require(fullPath);

            if (command?.data?.name && typeof command.execute === 'function') {
                client.commands.set(command.data.name, command);
                console.log(`✅ Comando carregado: ${command.data.name}`);
            } else {
                console.warn(`⚠️ Arquivo ignorado (sem data/execute): ${entry.name}`);
            }
        } catch (err) {
            console.error(`❌ Erro ao carregar comando ${entry.name}:`, err.message);
        }
    }
}

loadCommands(path.join(__dirname, 'src/bot/commands'));

async function registerSlashCommands() {
    const body = [];

    for (const command of client.commands.values()) {
        try {
            body.push(command.data.toJSON());
        } catch (err) {
            console.error(`❌ Erro ao serializar comando ${command.data?.name}:`, err.message);
        }
    }

    if (!body.length) {
        console.log('ℹ️ Nenhum slash command para registrar.');
        return;
    }

    const token = process.env.TOKEN;
    const clientId = process.env.CLIENT_ID;

    if (!token || !clientId) {
        console.warn('⚠️ TOKEN ou CLIENT_ID ausente — comandos não foram registrados na API.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        const guildId = process.env.GUILD_ID;

        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
            console.log(`📡 ${body.length} comando(s) registrado(s) no servidor ${guildId}`);
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body });
            console.log(`📡 ${body.length} comando(s) registrado(s) globalmente`);
        }

        body.forEach(c => console.log(`   • /${c.name}`));
    } catch (err) {
        console.error('❌ Falha ao registrar slash commands:', err.message);
        if (err.rawError) console.error(JSON.stringify(err.rawError, null, 2));
    }
}

function loadEvents(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            loadEvents(fullPath);
            continue;
        }

        if (!entry.name.endsWith('.js')) continue;

        try {
            const event = require(fullPath);
            if (!event?.name || typeof event.execute !== 'function') {
                console.warn(`⚠️ Evento inválido: ${entry.name}`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ Evento carregado: ${event.name}`);
        } catch (err) {
            console.error(`❌ Erro ao carregar evento ${entry.name}:`, err.message);
        }
    }
}

loadEvents(path.join(__dirname, 'src/bot/events'));

client.once(Events.ClientReady, async () => {
    console.log(`\n🎰 ${client.user.tag} está online!`);
    console.log(`📡 Servidores: ${client.guilds.cache.size}`);

    await db.connect();
    await registerSlashCommands();
    startDailyNotifier(client);
    startWebPanel(client);
});

client.login(process.env.TOKEN);
