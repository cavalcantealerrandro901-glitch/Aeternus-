/**
 * Migração manual: sobe todos os data/*.json para o MongoDB.
 *
 * Uso (com MONGO_URI no .env):
 *   node scripts/migrate-to-mongo.js
 *
 * Flags:
 *   --force  sobrescreve documentos que já existem no Mongo
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connect, isConnected, Kv } = require('../utils/mongo');

async function main() {
    const force = process.argv.includes('--force');
    const ok = await connect();
    if (!ok || !isConnected()) {
        console.error('Mongo offline. Defina MONGO_URI.');
        process.exit(1);
    }

    const dir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) {
        console.log('Pasta data/ vazia.');
        process.exit(0);
    }

    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json') && !f.startsWith('backup-'));

    let up = 0;
    let skip = 0;

    for (const name of files) {
        let data;
        try {
            data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        } catch (e) {
            console.warn('Ignorado (JSON inválido):', name);
            skip++;
            continue;
        }
        if (!data || typeof data !== 'object') {
            skip++;
            continue;
        }

        const existing = await Kv.findById(name).lean();
        const hasRemote =
            existing?.data &&
            typeof existing.data === 'object' &&
            Object.keys(existing.data).length > 0;

        if (hasRemote && !force) {
            console.log(`skip  ${name} (já no Mongo, use --force para sobrescrever)`);
            skip++;
            continue;
        }

        await Kv.findByIdAndUpdate(
            name,
            { _id: name, data, updatedAt: new Date() },
            { upsert: true }
        );
        const n = Object.keys(data).length;
        console.log(`ok    ${name} (${n} chave(s))${force && hasRemote ? ' [FORCE]' : ''}`);
        up++;
    }

    console.log(`\nConcluído: ${up} enviado(s), ${skip} ignorado(s).`);
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
