const mongoose = require('mongoose');

let connected = false;

async function connect() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.warn('⚠️ MONGO_URI não configurado — dados só em memória/arquivo.');
        return false;
    }
    if (connected) return true;
    try {
        await mongoose.connect(uri);
        connected = true;
        console.log('📦 MongoDB conectado!');
        return true;
    } catch (e) {
        console.error('MongoDB falhou:', e.message);
        return false;
    }
}

function isConnected() {
    return connected && mongoose.connection.readyState === 1;
}

const KvSchema = new mongoose.Schema(
    {
        _id: { type: String },
        data: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    { collection: 'aeternus_store' }
);

const BackupSchema = new mongoose.Schema(
    {
        createdAt: { type: Date, default: Date.now, index: true },
        reason: { type: String, default: 'auto' },
        keys: { type: [String], default: [] },
        sizeBytes: { type: Number, default: 0 },
        payload: { type: mongoose.Schema.Types.Mixed, required: true }
    },
    { collection: 'aeternus_backups' }
);

const Kv = mongoose.models.AeternusStore || mongoose.model('AeternusStore', KvSchema);
const Backup =
    mongoose.models.AeternusBackup || mongoose.model('AeternusBackup', BackupSchema);

module.exports = { connect, isConnected, Kv, Backup, mongoose };
