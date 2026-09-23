/**
 * Hot-reload de comandos e sistemas.
 *
 * Observa pastas commands/ e systems/ e recarrega arquivos .js alterados
 * sem reiniciar o bot.
 *
 * ENV:
 *   HOT_RELOAD=off  → desliga o watcher
 *   HOT_RELOAD=on   → liga (padrão em não-produção)
 *
 * Comandos: recarregamento seguro (cache + collections).
 * Sistemas: tenta limpar intervalos/timeouts capturados no setup;
 *           se o módulo exportar destroy/cleanup/stop, também é chamado.
 */
const fs = require('fs');
const path = require('path');
const {
    loadCommandFile,
    loadSystemFile,
    COMMANDS_DIR,
    SYSTEMS_DIR
} = require('../bot/loaders');

const DEBOUNCE_MS = 400;
const watches = [];
const pending = new Map(); // path -> timeout

function isEnabled() {
    const v = String(process.env.HOT_RELOAD || '').toLowerCase();
    if (v === 'off' || v === '0' || v === 'false' || v === 'no') return false;
    if (v === 'on' || v === '1' || v === 'true' || v === 'yes') return true;
    // padrão: ligado fora de produção explícita
    return process.env.NODE_ENV !== 'production';
}

function debounce(key, fn) {
    if (pending.has(key)) clearTimeout(pending.get(key));
    const t = setTimeout(() => {
        pending.delete(key);
        fn();
    }, DEBOUNCE_MS);
    pending.set(key, t);
}

function onCommandsChange(client, filename) {
    if (!filename || !filename.endsWith('.js')) return;
    const full = path.join(COMMANDS_DIR, filename);
    if (!fs.existsSync(full)) return;

    debounce('cmd:' + filename, () => {
        const r = loadCommandFile(client, filename, { quiet: true });
        if (r.ok) {
            console.log(`🔄 [hotReload] comando recarregado: ${r.name}${r.slash ? ' (/' + r.slash + ')' : ''}`);
        } else {
            console.warn(`🔄 [hotReload] falha comando ${filename}: ${r.error}`);
        }
    });
}

function onSystemsChange(client, filename) {
    if (!filename || !filename.endsWith('.js')) return;
    if (filename === 'hotReload.js') return; // evita auto-reload instável
    const full = path.join(SYSTEMS_DIR, filename);
    if (!fs.existsSync(full)) return;

    debounce('sys:' + filename, () => {
        const r = loadSystemFile(client, filename, { quiet: true });
        if (r.ok) {
            console.log(`🔄 [hotReload] sistema recarregado: ${r.name}`);
        } else {
            console.warn(`🔄 [hotReload] falha sistema ${filename}: ${r.error}`);
        }
    });
}

function watchDir(dir, handler) {
    if (!fs.existsSync(dir)) return null;
    try {
        const w = fs.watch(dir, { persistent: false }, (eventType, filename) => {
            if (!filename) return;
            // 'rename' também dispara em create/delete; só recarregamos se existir
            handler(String(filename));
        });
        w.on('error', (err) => {
            console.warn('[hotReload] watch error:', err.message);
        });
        watches.push(w);
        return w;
    } catch (e) {
        console.warn('[hotReload] não foi possível observar', dir, e.message);
        return null;
    }
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[hotReload] desligado (HOT_RELOAD=off ou NODE_ENV=production)');
        return;
    }

    // expõe helpers no client para uso manual / comando admin
    client.hotReload = {
        reloadCommand: (name) => require('../bot/loaders').reloadCommand(client, name),
        reloadSystem: (name) => require('../bot/loaders').reloadSystem(client, name),
        reloadAllCommands: () => {
            const { loadCommands } = require('../bot/loaders');
            loadCommands(client);
            return { ok: true };
        },
        reloadAllSystems: () => {
            const { loadSystems } = require('../bot/loaders');
            loadSystems(client);
            return { ok: true };
        }
    };

    watchDir(COMMANDS_DIR, (f) => onCommandsChange(client, f));
    watchDir(SYSTEMS_DIR, (f) => onSystemsChange(client, f));

    console.log('[hotReload] ativo · observando commands/ e systems/');
}

function destroy() {
    for (const w of watches) {
        try {
            w.close();
        } catch (_) {}
    }
    watches.length = 0;
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
}

module.exports = { setup, destroy };
