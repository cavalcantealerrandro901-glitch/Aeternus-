require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadEvents, loadSystems } = require('./bot/loaders');
const startWeb = require('./web/server');
const { connect } = require('./utils/mongo');
const store = require('./utils/store');

async function main() {
    await connect();
    await store.hydrate();

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ],
        partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
    });

    client.commands = new Collection();
    client.slash = new Collection();
    client.prefixDefault = 'O.';

    loadCommands(client);
    loadEvents(client);
    loadSystems(client);
    startWeb(client);

    await client.login(process.env.TOKEN);
}

main().catch((e) => {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
