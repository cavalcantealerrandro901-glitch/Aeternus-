/**
 * Uso no Termux / PC (uma vez ou quando quiser forçar):
 *
 *   cd ~/Aeternus
 *   node scripts/deploy-slash.js          # limpa + registra
 *   node scripts/deploy-slash.js --wipe   # só apaga tudo
 *
 * Precisa de .env com TOKEN e CLIENT_ID
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { registerSlash, wipeSlash } = require('../utils/registerSlash');

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

    if (!process.env.TOKEN || !process.env.CLIENT_ID) {
        console.error('Defina TOKEN e CLIENT_ID no .env');
        process.exit(1);
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });
    client.commands = new Collection();
    client.slash = new Collection();

    console.log('📦 Carregando comandos…');
    await loadCommandsInto(client);

    console.log('🔐 Login…');
    await client.login(process.env.TOKEN);

    await new Promise((r) => client.once('clientReady', r).once('ready', r));

    console.log(`🤖 ${client.user.tag}`);

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
