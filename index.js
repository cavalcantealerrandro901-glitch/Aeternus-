require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Collection,
    Partials,
    Events
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
                // evita sobrescrever com o mesmo módulo (ex: editorperm → acessoeditor)
                if (client.commands.has(command.data.name)) {
                    const prev = client.commands.get(command.data.name);
                    if (prev === command) continue;
                    console.warn(`⚠️ Comando duplicado /${command.data.name} em ${entry.name} — mantendo o primeiro`);
                    continue;
                }
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

function isSnowflake(id) {
    return typeof id === 'string' && /^\d{17,20}$/.test(id.trim());
}

async function registerSlashCommands() {
    const body = [];
    const seen = new Set();

    for (const command of client.commands.values()) {
        try {
            const json = command.data.toJSON();
            if (!json?.name || seen.has(json.name)) continue;
            seen.add(json.name);
            body.push(json);
        } catch (err) {
            console.error(`❌ Serializar /${command.data?.name}:`, err.message);
        }
    }

    if (!body.length) {
        console.log('ℹ️ Nenhum slash command para registrar.');
        return;
    }

    try {
        // Mais confiável: usa a application do bot já logado (não depende de CLIENT_ID)
        if (!client.application) {
            await client.application?.fetch?.();
        }

        const guildId = (process.env.GUILD_ID || '').trim();

        if (guildId && isSnowflake(guildId)) {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                await guild.commands.set(body);
                console.log(`📡 ${body.length} slash command(s) no servidor ${guild.name} (${guildId})`);
            } else {
                console.warn(`⚠️ GUILD_ID ${guildId} inválido ou bot fora do servidor — registrando global`);
                await client.application.commands.set(body);
                console.log(`📡 ${body.length} slash command(s) globalmente`);
            }
        } else {
            if (guildId) {
                console.warn(`⚠️ GUILD_ID "${guildId}" não é snowflake — usando registro global`);
            }
            await client.application.commands.set(body);
            console.log(`📡 ${body.length} slash command(s) registrados globalmente`);
            console.log('   (Globais podem levar até ~1h para aparecer em todos os servidores)');
        }

        body.forEach((c) => console.log(`   • /${c.name}`));
    } catch (err) {
        console.error('❌ Falha ao registrar slash commands:', err.message);
        if (err.code) console.error('   code:', err.code);
        if (err.rawError) console.error(JSON.stringify(err.rawError, null, 2));
        if (err.status === 401 || err.code === 50035) {
            console.error(
                '   Dica: confira se TOKEN é do mesmo bot e se CLIENT_ID/GUILD_ID são só números (sem aspas extras).'
            );
        }
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

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`\n🎰 ${readyClient.user.tag} está online!`);
    console.log(`📡 Servidores: ${readyClient.guilds.cache.size}`);
    console.log(`🆔 Application ID: ${readyClient.user.id}`);

    // CLIENT_ID no Render deve ser igual a este ID (application id do bot)
    const envClientId = (process.env.CLIENT_ID || '').trim();
    if (envClientId && envClientId !== readyClient.user.id) {
        console.warn(
            `⚠️ CLIENT_ID no Render (${envClientId}) ≠ ID do bot logado (${readyClient.user.id}). Ajuste o CLIENT_ID.`
        );
    }

    await db.connect();
    await registerSlashCommands();
    startDailyNotifier(readyClient);
    startWebPanel(readyClient);
});

const token = (process.env.TOKEN || '').trim();
if (!token) {
    console.error('❌ TOKEN não definido nas variáveis de ambiente.');
    process.exit(1);
}

client.login(token).catch((err) => {
    console.error('❌ Login Discord falhou:', err.message);
    process.exit(1);
});
