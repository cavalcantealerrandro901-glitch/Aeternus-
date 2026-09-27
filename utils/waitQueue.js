/**
 * Sistema genérico de filas de espera (FIFO), persistido no store.
 * Uso: câmbio, eventos, atendimento, etc.
 */
const store = require('./store');

const KEY = 'wait_queues.json';

function loadAll() {
    const data = store.load(KEY, {});
    return data && typeof data === 'object' ? data : {};
}

function saveAll(data) {
    store.save(KEY, data);
}

function ensureQueue(all, name) {
    const n = String(name || 'default');
    if (!all[n] || !Array.isArray(all[n].items)) {
        all[n] = { items: [], updatedAt: Date.now() };
    }
    return all[n];
}

/**
 * Entra na fila. Um userId só pode ter 1 entrada ativa por fila (padrão).
 * @returns {{ ok, position, id, error? }}
 */
function join(queueName, { userId, payload = {}, unique = true } = {}) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const uid = String(userId);

    if (unique) {
        const existing = q.items.findIndex((i) => i.userId === uid && i.status === 'waiting');
        if (existing >= 0) {
            return {
                ok: false,
                error: 'Você já está na fila.',
                position: existing + 1,
                id: q.items[existing].id
            };
        }
    }

    const id = `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item = {
        id,
        userId: uid,
        payload,
        status: 'waiting', // waiting | serving | done | cancelled
        joinedAt: Date.now(),
        servedAt: null
    };
    q.items.push(item);
    q.updatedAt = Date.now();
    saveAll(all);

    const position = q.items.filter((i) => i.status === 'waiting').findIndex((i) => i.id === id) + 1;
    return { ok: true, position, id, item };
}

function leave(queueName, userIdOrId) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const key = String(userIdOrId);
    const idx = q.items.findIndex(
        (i) => (i.id === key || i.userId === key) && (i.status === 'waiting' || i.status === 'serving')
    );
    if (idx < 0) return { ok: false, error: 'Não está na fila.' };
    q.items[idx].status = 'cancelled';
    q.updatedAt = Date.now();
    saveAll(all);
    return { ok: true, item: q.items[idx] };
}

/** Lista apenas waiting, em ordem */
function listWaiting(queueName) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    return q.items.filter((i) => i.status === 'waiting');
}

function positionOf(queueName, userId) {
    const waiting = listWaiting(queueName);
    const idx = waiting.findIndex((i) => i.userId === String(userId));
    if (idx < 0) return null;
    return { position: idx + 1, total: waiting.length, item: waiting[idx] };
}

/**
 * Pega o próximo da fila (FIFO) e marca como serving.
 * @returns {{ ok, item?, error? }}
 */
function next(queueName) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const idx = q.items.findIndex((i) => i.status === 'waiting');
    if (idx < 0) return { ok: false, error: 'Fila vazia.' };
    q.items[idx].status = 'serving';
    q.items[idx].servedAt = Date.now();
    q.updatedAt = Date.now();
    saveAll(all);
    return { ok: true, item: q.items[idx] };
}

function complete(queueName, id) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const item = q.items.find((i) => i.id === id);
    if (!item) return { ok: false, error: 'Item não encontrado.' };
    item.status = 'done';
    item.doneAt = Date.now();
    q.updatedAt = Date.now();
    saveAll(all);
    return { ok: true, item };
}

function getById(queueName, id) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    return q.items.find((i) => i.id === id) || null;
}

/** Limpa done/cancelled antigos (opcional, retenção em ms) */
function prune(queueName, olderThanMs = 7 * 24 * 60 * 60 * 1000) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const cut = Date.now() - olderThanMs;
    q.items = q.items.filter(
        (i) => i.status === 'waiting' || i.status === 'serving' || (i.joinedAt || 0) > cut
    );
    q.updatedAt = Date.now();
    saveAll(all);
}

function stats(queueName) {
    const all = loadAll();
    const q = ensureQueue(all, queueName);
    const waiting = q.items.filter((i) => i.status === 'waiting').length;
    const serving = q.items.filter((i) => i.status === 'serving').length;
    return { waiting, serving, total: q.items.length };
}

module.exports = {
    join,
    leave,
    listWaiting,
    positionOf,
    next,
    complete,
    getById,
    prune,
    stats,
    loadAll
};
