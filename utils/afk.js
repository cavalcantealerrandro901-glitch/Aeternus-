const store = require('./store');

// O Store já foi hidratado do MongoDB antes dos comandos/eventos serem carregados.
const STORE_KEY = 'afk.json';
const records = store.load(STORE_KEY, {});

function persist() {
    store.save(STORE_KEY, records);
}

module.exports = {
    set(id, reason) {
        if (!id) return;
        records[String(id)] = {
            reason: String(reason || 'AFK').slice(0, 180),
            at: Date.now()
        };
        persist();
    },

    get(id) {
        return records[String(id)] || null;
    },

    has(id) {
        return Object.prototype.hasOwnProperty.call(records, String(id));
    },

    clear(id) {
        const key = String(id);
        if (!Object.prototype.hasOwnProperty.call(records, key)) return;
        delete records[key];
        persist();
    }
};
