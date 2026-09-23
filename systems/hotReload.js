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
    if (!filename || !filename.endsWith('.js')) return;
    if (filename === 'hotReload.js') return;

    const fullPath = path.join(dir, filename);
    if (!fs.existsSync(fullPath)) return;

    const relativePath = path.relative(ROOT_DIR, fullPath);

    debounce('file:' + fullPath, () => {
        // Se o arquivo modificado for um comando
        if (fullPath.startsWith(COMMANDS_DIR)) {
            const relativeCmd = path.relative(COMMANDS_DIR, fullPath);
            const r = loadCommandFile(client, relativeCmd, { quiet: true });
            if (r.ok) {
                console.log(`🔄 [hotReload] comando recarregado: ${r.name}${r.slash ? ' (/' + r.slash + ')' : ''}`);
            } else {
                console.warn(`🔄 [hotReload] falha no comando ${relativeCmd}: ${r.error}`);
            }
            return;
        }

        // Se o arquivo modificado for um sistema
        if (fullPath.startsWith(SYSTEMS_DIR)) {
            const relativeSys = path.relative(SYSTEMS_DIR, fullPath);
            const r = loadSystemFile(client, relativeSys, { quiet: true });
            if (r.ok) {
                console.log(`🔄 [hotReload] sistema recarregado: ${r.name}`);
            } else {
                console.warn(`🔄 [hotReload] falha no sistema ${relativeSys}: ${r.error}`);
            }
            return;
        }

        // Para qualquer outro arquivo .js (utils, panels, index.js, etc.)
        try {
            const resolved = require.resolve(fullPath);
            delete require.cache[resolved];
            console.log(`🔄 [hotReload] arquivo recarregado: ${relativePath}`);
        } catch (err) {
            console.warn(`🔄 [hotReload] falha ao limpar cache de ${relativePath}: ${err.message}`);
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

    watchRecursive(client, ROOT_DIR);
    console.log('[hotReload] ativo · observando TODOS os arquivos .js do projeto!');
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
