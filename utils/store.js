const fs = require('fs');
const path = require('path');
const { isConnected, Kv } = require('./mongo');

const memory = new Map();
const pending = new Map();
let flushTimer = null;

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

async function hydrate() {
    if (!isConnected()) return;
    try {
        const docs = await Kv.find({}).lean();
        for (const doc of docs) memory.set(doc._id, doc.data ?? {});
        console.log(`📦 Store: ${docs.length} doc(s) do MongoDB.`);
    } catch (e) {
        console.error('hydrate:', e.message);
    }
}

function load(name, fallback = {}) {
    if (memory.has(name)) return memory.get(name);
    const fromFile = loadFile(name, fallback);
    memory.set(name, fromFile);
    if (isConnected() && fromFile && typeof fromFile === 'object' && Object.keys(fromFile).length) {
        scheduleSave(name);
    }
    return memory.get(name);
}

function save(name, data) {
    memory.set(name, data);
    try {
        ensureDir();
        fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
    } catch (_) {}
    scheduleSave(name);
}

function scheduleSave(name) {
    pending.set(name, true);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flush().catch((e) => console.error('mongo flush:', e.message));
    }, 400);
}

async function flush() {
    if (!isConnected()) {
        pending.clear();
        return;
    }
    const keys = [...pending.keys()];
    pending.clear();
    for (const name of keys) {
        const data = memory.get(name) ?? {};
        await Kv.findByIdAndUpdate(name, { _id: name, data }, { upsert: true });
    }
}

/** Snapshot de tudo que está em memória + arquivos data/ */
function dumpAll() {
    ensureDir();
    const out = {};

    for (const [k, v] of memory.entries()) {
        out[k] = clone(v);
    }

    try {
        const dir = path.join(__dirname, '..', 'data');
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.json')) continue;
            if (out[file] !== undefined) continue;
            try {
                out[file] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
            } catch (_) {}
        }
    } catch (_) {}

    return out;
}

function keys() {
    return [...memory.keys()];
}

/** Restaura um dump completo no store */
async function restoreAll(payload) {
    if (!payload || typeof payload !== 'object') return 0;
    let n = 0;
    for (const [name, data] of Object.entries(payload)) {
        save(name, data);
        n++;
    }
    await flush();
    return n;
}

module.exports = {
    load,
    save,
    filePath,
    ensureDir,
    hydrate,
    flush,
    dumpAll,
    keys,
    restoreAll
};
