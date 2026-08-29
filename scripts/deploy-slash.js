/**
 * Termux / PC:
 *   node scripts/deploy-slash.js
 *   node scripts/deploy-slash.js --wipe
 *
 * Env aceitos:
 *   TOKEN | DISCORD_TOKEN | BOT_TOKEN
 *   CLIENT_ID | DISCORD_CLIENT_ID | APPLICATION_ID
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { registerSlash, wipeSlash } = require('../utils/registerSlash');
const { getToken, getClientId } = require('../utils/env');

async function loadCommandsInto(client) {
    const dir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            delete require.cache[require.resolve(path.join(dir, file))];
            const cmd = require(path.join(dir, file));
            if (!cmd?.name) continue;
            client.commands.set(cmd.name, cmd);
            if (cmd.data?.name) client.slash.set(cmd.data.name, cmd);
            if (Array.isArray(cmd.aliases)) {
                for (const a of cmd.aliases) client.commands.set(a, cmd);
            }
            console.log(`  · ${cmd.name}${cmd.data ? ' [slash]' : ''}`);
        } catch (e) {
            console.error(`  × ${file}: ${e.message}`);
        }
    }
}

async function main() {
    const wipeOnly = process.argv.includes('--wipe');
    const token = getToken();

    if (!token) {
        console.error(
            'Token ausente. No .env coloque:\nTOKEN=...\nou\nDISCORD_TOKEN=...'
        );
        process.exit(1);
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.commands = new Collection();
    client.slash = new Collection();

    console.log('📦 Comandos…');
    await loadCommandsInto(client);

    console.log('🔐 Login…');
    await client.login(token);
    await new Promise((r) => {
        client.once('clientReady', r);
        client.once('ready', r);
    });

    console.log(`🤖 ${client.user.tag}`);
    console.log(`🆔 Application ID usado: ${getClientId(client)}`);

    if (wipeOnly) {
        await wipeSlash(client);
        console.log('🗑️ Wipe completo.');
    } else {
        const res = await registerSlash(client);
        console.log(res.ok ? `✅ OK — ${res.count} slash` : `❌ ${res.error}`);
    }

    client.destroy();
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
