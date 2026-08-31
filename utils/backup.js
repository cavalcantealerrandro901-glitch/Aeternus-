const fs = require('fs');
const path = require('path');
const store = require('./store');
const { isConnected, Backup } = require('./mongo');

const MAX_MONGO = Math.max(3, Number(process.env.BACKUP_KEEP_MONGO || 12));
const MAX_LOCAL = Math.max(2, Number(process.env.BACKUP_KEEP_LOCAL || 8));
const INTERVAL_MS =
    Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS || 6)) * 60 * 60 * 1000;

let timer = null;
let lastBackup = null;
let running = false;

function backupDir() {
    const dir = path.join(__dirname, '..', 'data', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function stamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

async function createBackup(reason = 'auto') {
    if (running) return { ok: false, error: 'Backup já em andamento.' };
    running = true;
    try {
        // garante flush pendente no Mongo antes de capturar
        await store.flush().catch(() => {});

        const payload = store.dumpAll();
        const keys = Object.keys(payload);
        const json = JSON.stringify(payload);
        const sizeBytes = Buffer.byteLength(json, 'utf8');

        // 1) disco local
        const dir = backupDir();
        const fileName = `backup-${stamp()}-${reason}.json`;
        const filePath = path.join(dir, fileName);
        fs.writeFileSync(filePath, json);

        // limpa backups locais antigos
        const localFiles = fs
            .readdirSync(dir)
            .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
            .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
        for (const old of localFiles.slice(MAX_LOCAL)) {
            try {
                fs.unlinkSync(path.join(dir, old.f));
            } catch (_) {}
        }

        // 2) MongoDB
        let mongoId = null;
        if (isConnected()) {
            const doc = await Backup.create({
                createdAt: new Date(),
                reason,
                keys,
                sizeBytes,
                payload
            });
            mongoId = String(doc._id);

            const all = await Backup.find({}).sort({ createdAt: -1 }).select('_id').lean();
            const extra = all.slice(MAX_MONGO);
            if (extra.length) {
                await Backup.deleteMany({ _id: { $in: extra.map((d) => d._id) } });
            }
        }

        lastBackup = {
            at: Date.now(),
            reason,
            keys: keys.length,
            sizeBytes,
            file: fileName,
            mongoId
        };

        console.log(
            `💾 Backup [${reason}] · ${keys.length} chave(s) · ${(sizeBytes / 1024).toFixed(1)} KB` +
                (mongoId ? ' · Mongo OK' : ' · só disco')
        );

        return { ok: true, ...lastBackup };
    } catch (e) {
        console.error('Backup falhou:', e.message);
        return { ok: false, error: e.message };
    } finally {
        running = false;
    }
}

async function listBackups(limit = 10) {
    const out = { local: [], mongo: [] };

    try {
        const dir = backupDir();
        out.local = fs
            .readdirSync(dir)
            .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
            .map((f) => {
                const st = fs.statSync(path.join(dir, f));
                return { file: f, sizeBytes: st.size, at: st.mtimeMs };
            })
            .sort((a, b) => b.at - a.at)
            .slice(0, limit);
    } catch (_) {}

    if (isConnected()) {
        try {
            out.mongo = await Backup.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('_id createdAt reason keys sizeBytes')
                .lean();
        } catch (_) {}
    }

    return out;
}

async function restoreLatest() {
    // prefer mongo
    if (isConnected()) {
        const doc = await Backup.findOne({}).sort({ createdAt: -1 }).lean();
        if (doc?.payload) {
            const n = await store.restoreAll(doc.payload);
            return { ok: true, source: 'mongo', id: String(doc._id), keys: n };
        }
    }

    const dir = backupDir();
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);

    if (!files.length) return { ok: false, error: 'Nenhum backup encontrado.' };

    const raw = JSON.parse(fs.readFileSync(path.join(dir, files[0].f), 'utf8'));
    const n = await store.restoreAll(raw);
    return { ok: true, source: 'local', file: files[0].f, keys: n };
}

async function restoreByMongoId(id) {
    if (!isConnected()) return { ok: false, error: 'Mongo offline.' };
    const doc = await Backup.findById(id).lean();
    if (!doc?.payload) return { ok: false, error: 'Backup não encontrado.' };
    const n = await store.restoreAll(doc.payload);
    return { ok: true, source: 'mongo', id: String(doc._id), keys: n };
}

function startAutoBackup() {
    if (timer) clearInterval(timer);

    // backup inicial após 2 min (deixa o bot estabilizar)
    setTimeout(() => {
        createBackup('boot').catch(() => {});
    }, 2 * 60 * 1000);

    timer = setInterval(() => {
        createBackup('auto').catch(() => {});
    }, INTERVAL_MS);

    // não impede o processo de sair
    if (timer.unref) timer.unref();

    console.log(
        `💾 Backup automático a cada ${Number(process.env.BACKUP_INTERVAL_HOURS || 6)}h · retenção Mongo=${MAX_MONGO} Local=${MAX_LOCAL}`
    );
}

function getStatus() {
    return {
        lastBackup,
        intervalHours: Number(process.env.BACKUP_INTERVAL_HOURS || 6),
        keepMongo: MAX_MONGO,
        keepLocal: MAX_LOCAL,
        running
    };
}

module.exports = {
    createBackup,
    listBackups,
    restoreLatest,
    restoreByMongoId,
    startAutoBackup,
    getStatus
};
