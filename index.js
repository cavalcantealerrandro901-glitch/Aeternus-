require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadEvents, loadSystems } = require('./bot/loaders');
const startWeb = require('./web/server');
const { connect } = require('./utils/mongo');
const store = require('./utils/store');
const { getToken } = require('./utils/env');

async function main() {
    console.log('🚀 Aeternus iniciando…');
    const mongoOk = await connect();
    const hydrated = await store.hydrate();
    const docs = hydrated && typeof hydrated === 'object' ? hydrated.docs : hydrated;
    console.log(
        mongoOk
            ? '📦 Dados carregados do MongoDB (' + (docs ?? '?') + ' docs)'
            : '⚠️ Sem Mongo — dados efêmeros'
    );
    if (mongoOk && typeof store.migrateLocalToMongo === 'function') {
        try {
            const mig = await store.migrateLocalToMongo();
            if (mig?.uploaded) console.log('📤 Migração local→Mongo: ' + mig.uploaded + ' arquivo(s)');
        } catch (e) {
            console.warn('migração:', e.message);
        }
    }

    const token = getToken();
    if (!token) {
        console.error(
            '❌ Token do Discord não encontrado.\n' +
                'No .env ou no Render use:\n' +
                '  TOKEN  |  DISCORD_TOKEN  |  BOT_TOKEN'
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
    try { client.setMaxListeners(25); } catch (_) {}

    client.commands = new Collection();
    client.slash = new Collection();
    client.prefixDefault = 'O.';

    loadCommands(client);
    loadEvents(client);
    loadSystems(client);
    startWeb(client);

    const site =
        (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '') ||
        ('http://0.0.0.0:' + (process.env.PORT || 10000));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛠️  Editor do site: ' + site + '/editor.html');
    console.log('🌐 Painel:          ' + site + '/dashboard');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
