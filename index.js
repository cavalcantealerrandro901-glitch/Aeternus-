require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadEvents, loadSystems } = require('./bot/loaders');
const startWeb = require('./web/server');
const { connect } = require('./utils/mongo');
const store = require('./utils/store');
const { getToken } = require('./utils/env');

async function main() {
    await connect();
    await store.hydrate();

    const token = getToken();
    if (!token) {
        console.error(
            '❌ Token do Discord não encontrado.\n' +
                'No .env ou no Render use uma destas variáveis:\n' +
                '  TOKEN\n  DISCORD_TOKEN\n  BOT_TOKEN'
        );
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ],
        partials: [
            Partials.Channel,
            Partials.Message,
            Partials.GuildMember,
            Partials.Reaction
        ]
    });

    client.commands = new Collection();
    client.slash = new Collection();
    client.prefixDefault = 'O.';

    loadCommands(client);
    loadEvents(client);
    loadSystems(client);
    startWeb(client);

    const backup = require('./utils/backup');
    const shutdown = async (sig) => {
        console.log(`\n${sig} — salvando backup final…`);
        try {
            await store.flush();
            await backup.createBackup('shutdown');
        } catch (_) {}
        process.exit(0);
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    await client.login(token);
}

main().catch((e) => {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
});

// unhandledRejection / uncaughtException são capturados pelo systems/autoRepair
// (reportError → DM do OWNER_ID). Mantém log de fallback se o sistema ainda não carregou.
process.on('unhandledRejection', (err) => {
    try {
        const ar = require('./utils/autoRepair');
        ar.reportError({
            source: 'unhandledRejection',
            error: err,
            context: 'index fallback'
        }).catch(() => {});
    } catch (_) {
        console.error('[unhandledRejection]', err);
    }
});
process.on('uncaughtException', (err) => {
    try {
        const ar = require('./utils/autoRepair');
        ar.reportError({
            source: 'uncaughtException',
            error: err,
            context: 'index fallback'
        }).catch(() => {});
    } catch (_) {
        console.error('[uncaughtException]', err);
    }
});
