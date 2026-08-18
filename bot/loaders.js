const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    const dir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const cmd = require(path.join(dir, file));
            if (cmd && cmd.name) {
                client.commands.set(cmd.name, cmd);
                console.log(`✨ [COMANDO] ${cmd.name}`);
            }
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
            if (cmd && cmd.data && cmd.data.name) {
                client.slashCommands.set(cmd.data.name, cmd);
                console.log(`⚡ [SLASH] ${cmd.data.name}`);
            }
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
            const event = require(path.join(dir, file));
            if (!event || !event.name) continue;
            const runner = (...args) => event.execute(...args, client);
            if (event.once) client.once(event.name, runner);
            else client.on(event.name, runner);
            console.log(`🔌 [EVENTO] ${event.name}`);
        } catch (e) {
            console.error(`Erro evento ${file}:`, e.message);
        }
    }
}

function loadSystems(client) {
    const { getSettings } = require('../utils/settings');
    const systemsDir = path.join(__dirname, '..', 'systems');
    if (!fs.existsSync(systemsDir)) return;

    for (const file of fs.readdirSync(systemsDir).filter((f) => f.endsWith('.js'))) {
        try {
            const mod = require(path.join(systemsDir, file));
            if (typeof mod === 'function') {
                mod(client, getSettings);
                console.log(`🧩 [SISTEMA] ${file}`);
            } else if (mod && typeof mod.setup === 'function') {
                mod.setup(client, getSettings);
                console.log(`🧩 [SISTEMA] ${file}`);
            }
        } catch (e) {
            console.error(`Erro sistema ${file}:`, e.message);
        }
    }
}

module.exports = { loadCommands, loadSlash, loadEvents, loadSystems };
