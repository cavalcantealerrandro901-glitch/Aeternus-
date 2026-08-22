const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    const dir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            delete require.cache[require.resolve(path.join(dir, file))];
            const cmd = require(path.join(dir, file));
            if (!cmd?.name) continue;
            client.commands.set(cmd.name, cmd);
            console.log(`✨ [COMANDO] ${cmd.name}`);
        } catch (e) {
            console.error(`Erro comando ${file}:`, e.message);
        }
    }
}

function loadSlash(client) {
    const dir = path.join(__dirname, '..', 'slash');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const cmd = require(path.join(dir, file));
            const name = cmd.data?.name || cmd.name;
            if (!name) continue;
            client.slashCommands.set(name, cmd);
            console.log(`⚡ [SLASH] ${name}`);
        } catch (e) {
            console.error(`Erro slash ${file}:`, e.message);
        }
    }
}

function loadEvents(client) {
    const dir = path.join(__dirname, '..', 'events');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const ev = require(path.join(dir, file));
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
    const settings = require('../utils/settings');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const mod = require(path.join(dir, file));
            if (typeof mod === 'function') {
                mod(client, settings.getSettings);
                console.log(`🧩 [SISTEMA] ${file}`);
            }
        } catch (e) {
            console.error(`Erro sistema ${file}:`, e.message);
        }
    }
}

module.exports = { loadCommands, loadSlash, loadEvents, loadSystems };
