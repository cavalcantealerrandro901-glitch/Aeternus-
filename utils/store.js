/**
 * Store Aeternus — MongoDB como fonte da verdade.
 *
 * Fluxo:
 *  1. connect() no index
 *  2. hydrate() carrega aeternus_store → memória
 *  3. migrateLocalToMongo() sobe data/*.json que ainda não estão no Mongo
 *  4. load/save operam em memória + flush assíncrono para Mongo
 *
 * ENV:
 *  MONGO_URI          — obrigatório em produção / Discloud
 *  STORE_LOCAL=1      — também grava data/*.json (dev)
 *  STORE_REQUIRE_MONGO=1 — encerra se Mongo falhar
 *  STORE_FLUSH_MS     — debounce do flush (padrão 250)
 */
const fs = require('fs');
const path = require('path');
const { isConnected, Kv } = require('./mongo');

const memory = new Map();
const pending = new Map();
let flushTimer = null;
let hydrated = false;
let migrating = false;

const FLUSH_MS = Math.max(50, Number(process.env.STORE_FLUSH_MS || 250));

function wantLocalFiles() {
    const v = String(process.env.STORE_LOCAL || '').toLowerCase();
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    // em produção / sem disco persistente, não grava local por padrão
    if (process.env.NODE_ENV === 'production') return false;
    // se tem Mongo, prioriza só Mongo (menos I/O)
    if (isConnected()) return false;
    return true;
}

function filePath(name) {
    return path.join(__dirname, '..', 'data', name);
}

function ensureDir() {
    const dir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clone(v) {
    if (typeof v === 'object' && v !== null) return structuredClone(v);
    return v;
}

function loadFile(name, fallback) {
    try {
        const p = filePath(name);
        if (!fs.existsSync(p)) return clone(fallback);
        return JSON.parse(fs.readFileSync(p, 'utf8') || 'null') ?? clone(fallback);
    } catch {
        return clone(fallback);
    }
}

function listLocalJsonFiles() {
    try {
        ensureDir();
        const dir = path.join(__dirname, '..', 'data');
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.json') && !f.startsWith('backup-'));
    } catch {
        return [];
    }
}

/**
 * Carrega tudo do Mongo para a memória.
 * Deve ser chamado após connect().
 */
async function hydrate() {
    if (!isConnected()) {
        console.warn(
            '⚠️ Store: Mongo offline — usando apenas memória' +
                (wantLocalFiles() ? '/arquivos locais.' : '.')
        );
        // ainda carrega arquivos locais se existirem (migração posterior)
        for (const file of listLocalJsonFiles()) {
            if (!memory.has(file)) {
                memory.set(file, loadFile(file, {}));
            }
        }
        hydrated = true;
        return { ok: false, docs: 0 };
    }

    try {
        const docs = await Kv.find({}).lean();
        for (const doc of docs) {
            memory.set(String(doc._id), doc.data ?? {});
        }
        hydrated = true;
        console.log(`📦 Store: ${docs.length} doc(s) carregados do MongoDB.`);
        return { ok: true, docs: docs.length };
    } catch (e) {
        console.error('hydrate:', e.message);
        hydrated = true;
        return { ok: false, docs: 0, error: e.message };
    }
}

/**
 * Migra data/*.json locais → Mongo (uma vez no boot).
 * - Se a chave já existe no Mongo com dados, NÃO sobrescreve (Mongo ganha).
 * - Se Mongo está vazio nessa chave e o arquivo local tem dados, sobe.
 */
async function migrateLocalToMongo() {
    if (!isConnected() || migrating) return { uploaded: 0, skipped: 0 };
    migrating = true;
    let uploaded = 0;
    let skipped = 0;

    try {
        const files = listLocalJsonFiles();
        if (!files.length) {
            console.log('📦 Migração: nenhum JSON local em data/.');
            return { uploaded: 0, skipped: 0 };
        }

        for (const name of files) {
            const local = loadFile(name, null);
            if (local == null || typeof local !== 'object') {
                skipped++;
                continue;
            }
            const localKeys = Object.keys(local).length;
            if (!localKeys) {
                skipped++;
                continue;
            }

            const existing = memory.get(name);
            const existingKeys =
                existing && typeof existing === 'object' ? Object.keys(existing).length : 0;

            // Mongo já tem dados → não sobrescreve
            if (existingKeys > 0) {
                skipped++;
                continue;
            }

            memory.set(name, local);
            pending.set(name, true);
            uploaded++;
            console.log(`📤 Migrado → Mongo: ${name} (${localKeys} chave(s))`);
        }

        if (uploaded) {
            await flush();
            console.log(`📦 Migração concluída: ${uploaded} arquivo(s) enviados ao Mongo.`);
        } else {
            console.log(`📦 Migração: nada novo (Mongo já tinha os dados ou local vazio).`);
        }

        return { uploaded, skipped };
    } catch (e) {
        console.error('migrateLocalToMongo:', e.message);
        return { uploaded, skipped, error: e.message };
    } finally {
        migrating = false;
    }
}

/**
 * Força reenvio de TODAS as chaves em memória para o Mongo
 * (útil após import manual).
 */
async function pushAllToMongo() {
    if (!isConnected()) return { ok: false, error: 'Mongo offline' };
    for (const key of memory.keys()) {
        pending.set(key, true);
    }
    await flush();
    return { ok: true, keys: memory.size };
}

function load(name, fallback = {}) {
    if (memory.has(name)) return memory.get(name);

    // ainda não hidratou / chave nova: tenta arquivo local só como fallback de migração
    const fromFile = loadFile(name, fallback);
    memory.set(name, fromFile);

    // se veio do disco e tem Mongo, agenda upload
    if (
        isConnected() &&
        fromFile &&
        typeof fromFile === 'object' &&
        Object.keys(fromFile).length
    ) {
        scheduleSave(name);
    }

    return memory.get(name);
}

function save(name, data) {
    memory.set(name, data);

    if (wantLocalFiles()) {
        try {
            ensureDir();
            fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
        } catch (_) {}
    }

    scheduleSave(name);
}

function scheduleSave(name) {
    pending.set(name, true);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flush().catch((e) => console.error('mongo flush:', e.message));
    }, FLUSH_MS);
    if (flushTimer.unref) flushTimer.unref();
}

async function flush() {
    if (!isConnected()) {
        pending.clear();
        return { ok: false, flushed: 0 };
    }

    const keys = [...pending.keys()];
    pending.clear();
    if (!keys.length) return { ok: true, flushed: 0 };

    let flushed = 0;
    const ops = keys.map((name) => {
        const data = memory.get(name) ?? {};
        flushed++;
        return {
            updateOne: {
                filter: { _id: name },
                update: { $set: { _id: name, data } },
                upsert: true
            }
        };
    });

    try {
        // bulkWrite é bem mais rápido em Discloud / muitos saves
        await Kv.bulkWrite(ops, { ordered: false });
    } catch (e) {
        // fallback um a um
        console.warn('[store] bulkWrite falhou, fallback:', e.message);
        for (const name of keys) {
            const data = memory.get(name) ?? {};
            await Kv.findByIdAndUpdate(name, { _id: name, data }, { upsert: true });
        }
    }

    return { ok: true, flushed };
}

/** Snapshot completo (memória + local residual) */
function dumpAll() {
    const out = {};
    for (const [k, v] of memory.entries()) {
        out[k] = clone(v);
    }
    try {
        for (const file of listLocalJsonFiles()) {
            if (out[file] !== undefined) continue;
            try {
                out[file] = loadFile(file, {});
            } catch (_) {}
        }
    } catch (_) {}
    return out;
}

function keys() {
    return [...memory.keys()];
}

async function restoreAll(payload) {
    if (!payload || typeof payload !== 'object') return 0;
    let n = 0;
    for (const [name, data] of Object.entries(payload)) {
        memory.set(name, data);
        pending.set(name, true);
        if (wantLocalFiles()) {
            try {
                ensureDir();
                fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
            } catch (_) {}
        }
        n++;
    }
    await flush();
    return n;
}

function isHydrated() {
    return hydrated;
}

function stats() {
    return {
        hydrated,
        keys: memory.size,
        pending: pending.size,
        mongo: isConnected(),
        localFiles: wantLocalFiles()
    };
}

module.exports = {
    load,
    save,
    filePath,
    ensureDir,
    hydrate,
    migrateLocalToMongo,
    pushAllToMongo,
    flush,
    dumpAll,
    keys,
    restoreAll,
    isHydrated,
    stats
};
