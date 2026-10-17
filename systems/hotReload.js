/**
 * Hot-reload global para TODOS os arquivos .js do projeto.
 *
 * Mapeia e observa recursivamente toda a raiz do projeto (exceto node_modules, .git e data).
 */
const fs = require('fs');
const path = require('path');
const {
    loadCommandFile,
    loadSystemFile,
    COMMANDS_DIR,
    SYSTEMS_DIR
} = require('../bot/loaders');

const ROOT_DIR = path.join(__dirname, '..');
// O hot-reload só observa comandos e sistemas que já existiam na inicialização.
// Não executa automaticamente novos arquivos nem limpa o cache de módulos arbitrários.
const TRUSTED_COMMAND_FILES = new Set(fs.existsSync(COMMANDS_DIR) ? fs.readdirSync(COMMANDS_DIR).filter(f => /^[a-zA-Z0-9_-]+\.js$/.test(f)) : []);
const TRUSTED_SYSTEM_FILES = new Set(fs.existsSync(SYSTEMS_DIR) ? fs.readdirSync(SYSTEMS_DIR).filter(f => /^[a-zA-Z0-9_-]+\.js$/.test(f)) : []);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'data', 'public', '.cache', '.npm']);

const DEBOUNCE_MS = 400;
const watches = [];
const pending = new Map(); // path -> timeout

function isEnabled() {
    const v = String(process.env.HOT_RELOAD || '').toLowerCase();
    if (v === 'off' || v === '0' || v === 'false' || v === 'no') return false;
    if (v === 'on' || v === '1' || v === 'true' || v === 'yes') return true;
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

function handleFileChange(client, dir, filename) {
    if (!filename || !/^[a-zA-Z0-9_-]+\.js$/.test(filename) || filename === 'hotReload.js') return;

    const fullPath = path.resolve(dir, filename);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return;

    // Novos arquivos são bloqueados até uma implantação/reinicialização controlada.
    if (path.resolve(dir) === path.resolve(COMMANDS_DIR)) {
        if (!TRUSTED_COMMAND_FILES.has(filename)) {
            console.warn('[hotReload] bloqueado comando novo não autorizado: ' + filename);
            return;
        }
    } else if (path.resolve(dir) === path.resolve(SYSTEMS_DIR)) {
        if (!TRUSTED_SYSTEM_FILES.has(filename)) {
            console.warn('[hotReload] bloqueado sistema novo não autorizado: ' + filename);
            return;
        }
    } else {
        // Nunca tenta carregar ou limpar cache de JS fora das pastas autorizadas.
        return;
    }

    debounce('file:' + fullPath, () => {
        if (path.resolve(dir) === path.resolve(COMMANDS_DIR)) {
            const r = loadCommandFile(client, filename, { quiet: true });
            if (r.ok) console.log(`🔄 [hotReload] comando recarregado: ${r.name}`);
            else console.warn(`🔄 [hotReload] comando bloqueado/falhou ${filename}: ${r.error}`);
            return;
        }

        if (path.resolve(dir) === path.resolve(SYSTEMS_DIR)) {
            const r = loadSystemFile(client, filename, { quiet: true });
            if (r.ok) console.log(`🔄 [hotReload] sistema recarregado: ${r.name}`);
            else console.warn(`🔄 [hotReload] sistema bloqueado/falhou ${filename}: ${r.error}`);
        }
    });
}

function watchRecursive(client, dir) {
    if (!fs.existsSync(dir)) return;

    const baseName = path.basename(dir);
    if (IGNORED_DIRS.has(baseName)) return;

    try {
        const watcher = fs.watch(dir, { persistent: false }, (eventType, filename) => {
            if (filename) handleFileChange(client, dir, String(filename));
        });

        watcher.on('error', (err) => {
            console.warn(`[hotReload] erro ao observar ${dir}:`, err.message);
        });

        watches.push(watcher);

        // Varre subpastas
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
                watchRecursive(client, path.join(dir, entry.name));
            }
        }
    } catch (e) {
        console.warn(`[hotReload] erro ao varrer pasta ${dir}:`, e.message);
    }
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[hotReload] desligado (HOT_RELOAD=off ou NODE_ENV=production)');
        return;
    }

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

    watchRecursive(client, COMMANDS_DIR);
    watchRecursive(client, SYSTEMS_DIR);
    console.log('[hotReload] protegido · observa apenas comandos/sistemas existentes; bloqueia arquivos novos e módulos fora da lista.');
}

function destroy() {
    for (const w of watches) {
        try { w.close(); } catch (_) {}
    }
    watches.length = 0;
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
}

module.exports = { setup, destroy };
