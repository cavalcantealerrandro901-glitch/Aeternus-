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

const Kv = mongoose.models.AeternusStore || mongoose.model('AeternusStore', KvSchema);

module.exports = { connect, isConnected, Kv, mongoose };
