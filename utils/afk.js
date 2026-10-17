const store = require('./store');

const STORE_KEY = 'afk.json';
const loaded = store.load(STORE_KEY, {});
const records = loaded && typeof loaded === 'object' && !Array.isArray(loaded)
    ? loaded
    : {};

function sanitizeReason(value) {
    const reason = String(value || '')
        .replace(/@everyone/gi, '@\u200beveryone')
        .replace(/@here/gi, '@\u200bhere')
        .replace(/<@!?\d+>/g, '@usuário')
        .replace(/<@&\d+>/g, '@cargo')
        .replace(/<#\d+>/g, '#canal')
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);

    return reason || 'Não informado';
}

function persist() {
    store.save(STORE_KEY, records);
}

function validId(id) {
    const key = String(id || '').trim();
    return key.length > 0 && key.length <= 32 ? key : null;
}

module.exports = {
    set(id, reason) {
        const key = validId(id);
        if (!key) return false;

        const previous = records[key];
        records[key] = {
            reason: sanitizeReason(reason),
            at: Date.now()
        };

        try {
            persist();
            return true;
        } catch (error) {
            if (previous === undefined) delete records[key];
            else records[key] = previous;
            console.error('[AFK] Não foi possível salvar o status:', error?.message || error);
            return false;
        }
    },

    get(id) {
        const key = validId(id);
        if (!key) return null;

        const record = records[key];
        if (!record || typeof record !== 'object') return null;

        const at = Number(record.at);
        if (!Number.isFinite(at) || at <= 0) return null;

        return {
            reason: sanitizeReason(record.reason),
            at
        };
    },

    has(id) {
        const key = validId(id);
        if (!key) return false;
        const record = records[key];
        const at = Number(record?.at);
        return Boolean(record && typeof record === 'object' && Number.isFinite(at) && at > 0);
    },

    clear(id) {
        const key = validId(id);
        if (!key || !Object.prototype.hasOwnProperty.call(records, key)) return false;

        const previous = records[key];
        delete records[key];

        try {
            persist();
            return true;
        } catch (error) {
            records[key] = previous;
            console.error('[AFK] Não foi possível remover o status:', error?.message || error);
            return false;
        }
    }
};
