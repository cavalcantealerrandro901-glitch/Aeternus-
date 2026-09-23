require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadEvents, loadSystems } = require('./bot/loaders');
const startWeb = require('./web/server');
const { connect } = require('./utils/mongo');
const store = require('./utils/store');
const { getToken } = require('./utils/env');

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function isTransientLoginError(err) {
    const msg = String(err?.message || err || '').toLowerCase();
    const code = err?.code || err?.status || '';
    return (
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('504') ||
        msg.includes('unexpected server response') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('enotfound') ||
        msg.includes('socket hang up') ||
        msg.includes('cloudflare') ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT'
    );
}

async function loginWithRetry(client, token, attempts = 8) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            await client.login(token);
            return;
        } catch (err) {
            lastErr = err;
            if (!isTransientLoginError(err) || i === attempts) throw err;
            const wait = Math.min(60_000, 2000 * Math.pow(1.6, i - 1));
            console.warn(
                `[login] tentativa ${i}/${attempts} falhou (${err.message || err}). Nova em ${Math.round(wait / 1000)}s…`
            );
            await sleep(wait);
        }
    }
    throw lastErr;
}

async function main() {
    // 1) Mongo
    const mongoOk = await connect();

    // 2) carrega tudo do Mongo → memória
    await store.hydrate();

    // 3) sobe data/*.json locais que ainda não estão no Mongo (migração one-shot)
    if (mongoOk) {
        await store.migrateLocalToMongo();
    }

    const token = getToken();
    if (!token) {
        console.error(
            '❌ Token do Discord não encontrado.\n' +
                'No .env ou no host use uma destas variáveis:\n' +
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

    client.on('error', (err) => {
        console.warn('[client] error:', err?.message || err);
    });
    client.on('shardError', (err) => {
        console.warn('[shard] error:', err?.message || err);
    });

    loadCommands(client);
    loadEvents(client);
    loadSystems(client);

    // painel web (usa as mesmas settings/guilds do store → Mongo)
    const web = startWeb;
    if (typeof web === 'function') web(client);
    else if (web && typeof web.startWeb === 'function') web.startWeb(client);

    const backup = require('./utils/backup');
    const shutdown = async (sig) => {
        console.log(`\n${sig} — flush Mongo + backup final…`);
        try {
            await store.flush();
            await backup.createBackup('shutdown');
        } catch (_) {}
        process.exit(0);
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    // flush periódico extra (segurança em hosts que matam o processo)
    setInterval(() => {
        store.flush().catch(() => {});
    }, 60_000).unref?.();

    await loginWithRetry(client, token);

    const st = store.stats();
    console.log(
        `📦 Store pronto · keys=${st.keys} · mongo=${st.mongo} · localFiles=${st.localFiles}`
    );
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
