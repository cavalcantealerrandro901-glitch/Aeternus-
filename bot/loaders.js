const fs = require('fs');
const path = require('path');

function loadCommands(client) {
    const dir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const cmd = require(path.join(dir, file));
            if (!cmd?.name) continue;
            client.commands.set(cmd.name, cmd);
            if (Array.isArray(cmd.aliases)) {
                for (const a of cmd.aliases) client.commands.set(a, cmd);
            }
            if (cmd.data?.name) client.slash.set(cmd.data.name, cmd);
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
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const sys = require(path.join(dir, file));
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
