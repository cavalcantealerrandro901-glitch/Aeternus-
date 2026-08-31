const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

function sanitizeSlashName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32);
}

function ensureSlashData(cmd) {
    if (cmd.data) return;
    const n = sanitizeSlashName(cmd.name);
    if (!n || n.length < 1) return;

    try {
        cmd.data = new SlashCommandBuilder()
            .setName(n)
            .setDescription(String(cmd.description || cmd.name || n).slice(0, 100))
            .addStringOption((o) =>
                o
                    .setName('args')
                    .setDescription('Argumentos do comando (opcional)')
                    .setRequired(false)
            );
    } catch (e) {
        // nome inválido para slash — ignora
    }
}

function loadCommands(client) {
    const dir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(dir, file);
            delete require.cache[require.resolve(full)];
            const cmd = require(full);
            if (!cmd?.name) continue;

            ensureSlashData(cmd);

            client.commands.set(cmd.name, cmd);
            if (Array.isArray(cmd.aliases)) {
                for (const a of cmd.aliases) client.commands.set(String(a).toLowerCase(), cmd);
            }

            if (cmd.data?.name) {
                client.slash.set(cmd.data.name, cmd);
                console.log(`⚡ [SLASH] /${cmd.data.name}`);
            }

            console.log(`✨ [COMANDO] ${cmd.name}`);
        } catch (e) {
            console.error(`Erro comando ${file}:`, e.message);
        }
    }
}

function loadEvents(client) {
    const dir = path.join(__dirname, '..', 'events');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(dir, file);
            delete require.cache[require.resolve(full)];
            const ev = require(full);
            if (!ev?.name || !ev.execute) continue;
            if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
            else client.on(ev.name, (...args) => ev.execute(...args, client));
            console.log(`🔌 [EVENTO] ${ev.name}`);
        } catch (e) {
            console.error(`Erro evento ${file}:`, e.message);
        }
    }
}

function loadSystems(client) {
    const dir = path.join(__dirname, '..', 'systems');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(dir, file);
            delete require.cache[require.resolve(full)];
            const sys = require(full);
            if (typeof sys.setup === 'function') {
                sys.setup(client);
                console.log(`🧩 [SISTEMA] ${file}`);
            }
        } catch (e) {
            console.error(`Erro sistema ${file}:`, e.message);
        }
    }
}

module.exports = { loadCommands, loadEvents, loadSystems };
