const mongoose = require('mongoose');

let connected = false;
let connecting = null;

async function connect() {
    const uri = process.env.MONGO_URI;
    const requireMongo =
        String(process.env.STORE_REQUIRE_MONGO || '').toLowerCase() === '1' ||
        String(process.env.STORE_REQUIRE_MONGO || '').toLowerCase() === 'true' ||
        process.env.NODE_ENV === 'production';

    if (!uri) {
        const msg =
            '⚠️ MONGO_URI não configurado — dados só em memória (perdem no restart no Discloud).';
        if (requireMongo) {
            console.error(
                '❌ MONGO_URI obrigatório neste ambiente.\n' +
                    'Defina MONGO_URI no painel do host (MongoDB Atlas ou outro).'
            );
            process.exit(1);
        }
        console.warn(msg);
        return false;
    }

    if (connected && mongoose.connection.readyState === 1) return true;
    if (connecting) return connecting;

    connecting = (async () => {
        try {
            mongoose.set('strictQuery', true);
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 15_000,
                connectTimeoutMS: 15_000,
                maxPoolSize: 10
            });
            connected = true;
            console.log('📦 MongoDB conectado!');

            mongoose.connection.on('disconnected', () => {
                connected = false;
                console.warn('⚠️ MongoDB desconectado');
            });
            mongoose.connection.on('reconnected', () => {
                connected = true;
                console.log('📦 MongoDB reconectado');
            });

            return true;
        } catch (e) {
            console.error('MongoDB falhou:', e.message);
            connected = false;
            if (requireMongo) {
                console.error('❌ Encerrando: STORE_REQUIRE_MONGO / production exige Mongo.');
                process.exit(1);
            }
            return false;
        } finally {
            connecting = null;
        }
    })();

    return connecting;
}

function isConnected() {
    return connected && mongoose.connection.readyState === 1;
}

const KvSchema = new mongoose.Schema(
    {
        _id: { type: String },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: 'aeternus_store', timestamps: false }
);

KvSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
});

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

const UserXpSchema = new mongoose.Schema(
    {
        _id: { type: String },
        xp: { type: Number, default: 0, index: true },
        level: { type: Number, default: 0, index: true },
        attrs: {
            forca: { type: Number, default: 5 },
            defesa: { type: Number, default: 5 },
            agilidade: { type: Number, default: 5 },
            vida: { type: Number, default: 10 }
        },
        attrPoints: { type: Number, default: 0 },
        totalXpGained: { type: Number, default: 0 },
        lastGainAt: { type: Date, default: null },
        lastGainAmount: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: 'aeternus_user_xp', timestamps: false }
);

const XpGainSchema = new mongoose.Schema(
    {
        userId: { type: String, index: true, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, default: 'xp' },
        levelBefore: { type: Number, default: 0 },
        levelAfter: { type: Number, default: 0 },
        attrs: { type: mongoose.Schema.Types.Mixed, default: null },
        attrGains: { type: mongoose.Schema.Types.Mixed, default: null },
        createdAt: { type: Date, default: Date.now, index: true }
    },
    { collection: 'aeternus_xp_gains' }
);

const UserXp = mongoose.models.AeternusUserXp || mongoose.model('AeternusUserXp', UserXpSchema);
const XpGain = mongoose.models.AeternusXpGain || mongoose.model('AeternusXpGain', XpGainSchema);
const Kv = mongoose.models.AeternusStore || mongoose.model('AeternusStore', KvSchema);
const Backup =
    mongoose.models.AeternusBackup || mongoose.model('AeternusBackup', BackupSchema);

module.exports = { connect, isConnected, Kv, Backup, UserXp, XpGain, mongoose };
