/**
 * Trocas entre jogadores (P2P).
 * Ofertas: éter, itens do inventário, intensidade (pontos de atributo).
 * Sessões em memória + espelho leve no store (sobrevive restart curto).
 */
const player = require('./player');
const eter = require('./eter');
const xp = require('./xp');
const store = require('./store');

const TTL_MS = 30 * 60 * 1000;
/** @type {Map<string, object>} */
const sessions = new Map();

function loadDisk() {
    try {
        const raw = store.load('trades.json', {});
        if (!raw || typeof raw !== 'object') return;
        const now = Date.now();
        for (const [id, s] of Object.entries(raw)) {
            if (s && s.expiresAt > now && s.status === 'open') sessions.set(id, s);
        }
    } catch (_) {}
}

function saveDisk() {
    try {
        const out = {};
        for (const [id, s] of sessions) {
            if (s.status === 'open' && s.expiresAt > Date.now()) out[id] = s;
        }
        store.save('trades.json', out);
    } catch (_) {}
}

loadDisk();

function uid() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    ).toUpperCase();
}

function emptySide() {
    return {
        eter: 0,
        /** índices 1-based do inventário no momento da oferta */
        itemIndexes: [],
        /** pontos de atributo (intensidade) */
        intensity: 0,
        confirmed: false
    };
}

function createTrade(aId, bId) {
    aId = String(aId);
    bId = String(bId);
    if (!aId || !bId || aId === bId) return { ok: false, error: 'Usuários inválidos.' };
    if (!player.has(aId)) return { ok: false, error: 'Você precisa de personagem (`O.j criar`).' };
    if (!player.has(bId)) return { ok: false, error: 'O outro jogador ainda não tem personagem.' };

    // cancela sessões abertas antigas entre o mesmo par
    for (const [id, s] of sessions) {
        if (s.status !== 'open') continue;
        const pair = new Set([s.aId, s.bId]);
        if (pair.has(aId) && pair.has(bId)) {
            s.status = 'cancelled';
            sessions.delete(id);
        }
    }

    const id = uid();
    const session = {
        id,
        aId,
        bId,
        a: emptySide(),
        b: emptySide(),
        status: 'open',
        createdAt: Date.now(),
        expiresAt: Date.now() + TTL_MS
    };
    sessions.set(id, session);
    saveDisk();
    return { ok: true, session };
}

function getTrade(id) {
    const s = sessions.get(String(id || '').toUpperCase());
    if (!s) return null;
    if (s.expiresAt < Date.now() && s.status === 'open') {
        s.status = 'expired';
        sessions.delete(s.id);
        saveDisk();
        return null;
    }
    return s;
}

function sideOf(session, userId) {
    userId = String(userId);
    if (session.aId === userId) return 'a';
    if (session.bId === userId) return 'b';
    return null;
}

function partnerId(session, userId) {
    userId = String(userId);
    if (session.aId === userId) return session.bId;
    if (session.bId === userId) return session.aId;
    return null;
}

function listOpenFor(userId) {
    userId = String(userId);
    const out = [];
    for (const s of sessions.values()) {
        if (s.status !== 'open') continue;
        if (s.aId === userId || s.bId === userId) out.push(s);
    }
    return out;
}

function setOffer(tradeId, userId, patch) {
    const s = getTrade(tradeId);
    if (!s || s.status !== 'open') return { ok: false, error: 'Troca não encontrada ou expirada.' };
    const side = sideOf(s, userId);
    if (!side) return { ok: false, error: 'Você não participa desta troca.' };

    const eterAmt = Math.max(0, Math.floor(Number(patch.eter ?? s[side].eter) || 0));
    const intensity = Math.max(0, Math.floor(Number(patch.intensity ?? s[side].intensity) || 0));
    let indexes = Array.isArray(patch.itemIndexes)
        ? patch.itemIndexes.map((n) => Math.floor(Number(n))).filter((n) => n >= 1)
        : s[side].itemIndexes;

    // valida saldo
    if (eter.get(userId) < eterAmt) {
        return { ok: false, error: `Éter insuficiente (tem ${eter.get(userId)}).` };
    }
    const st = xp.get(userId);
    const pts = Number(st.attrPoints || 0);
    if (pts < intensity) {
        return { ok: false, error: `Intensidade insuficiente (pontos: ${pts}).` };
    }

    const inv = player.getInventory(userId) || [];
    const unique = [...new Set(indexes)].sort((a, b) => a - b);
    for (const idx of unique) {
        if (idx < 1 || idx > inv.length) {
            return { ok: false, error: `Item #${idx} não existe no inventário.` };
        }
    }

    s[side].eter = eterAmt;
    s[side].intensity = intensity;
    s[side].itemIndexes = unique;
    // mudar oferta reseta confirmações dos dois
    s.a.confirmed = false;
    s.b.confirmed = false;
    s.expiresAt = Date.now() + TTL_MS;
    saveDisk();
    return { ok: true, session: s };
}

function toggleConfirm(tradeId, userId) {
    const s = getTrade(tradeId);
    if (!s || s.status !== 'open') return { ok: false, error: 'Troca não encontrada ou expirada.' };
    const side = sideOf(s, userId);
    if (!side) return { ok: false, error: 'Você não participa desta troca.' };

    s[side].confirmed = !s[side].confirmed;
    s.expiresAt = Date.now() + TTL_MS;
    saveDisk();

    if (s.a.confirmed && s.b.confirmed) {
        return executeTrade(s);
    }
    return { ok: true, session: s, executed: false };
}

function cancelTrade(tradeId, userId) {
    const s = getTrade(tradeId);
    if (!s) return { ok: false, error: 'Troca não encontrada.' };
    if (s.status !== 'open') return { ok: false, error: 'Troca já encerrada.' };
    if (!sideOf(s, userId)) return { ok: false, error: 'Você não participa desta troca.' };
    s.status = 'cancelled';
    sessions.delete(s.id);
    saveDisk();
    return { ok: true };
}

function snapshotItems(userId, indexes) {
    const inv = player.getInventory(userId) || [];
    const out = [];
    for (const idx of indexes) {
        const item = inv[idx - 1];
        if (!item) return { ok: false, error: `Item #${idx} sumiu do inventário.` };
        out.push({ index: idx, item: { ...item } });
    }
    return { ok: true, items: out };
}

function executeTrade(s) {
    if (!s || s.status !== 'open') return { ok: false, error: 'Troca inválida.' };

    // revalida tudo no momento da execução
    for (const [uid, side] of [
        [s.aId, s.a],
        [s.bId, s.b]
    ]) {
        if (eter.get(uid) < side.eter) {
            s.a.confirmed = false;
            s.b.confirmed = false;
            saveDisk();
            return { ok: false, error: `<@${uid}> não tem éter suficiente.` };
        }
        const pts = Number(xp.get(uid).attrPoints || 0);
        if (pts < side.intensity) {
            s.a.confirmed = false;
            s.b.confirmed = false;
            saveDisk();
            return { ok: false, error: `<@${uid}> não tem intensidade suficiente.` };
        }
        const snap = snapshotItems(uid, side.itemIndexes);
        if (!snap.ok) {
            s.a.confirmed = false;
            s.b.confirmed = false;
            saveDisk();
            return snap;
        }
        side._snap = snap.items;
    }

    // remove itens do maior índice → menor (não desloca)
    function takeItems(userId, indexes) {
        const sorted = [...indexes].sort((a, b) => b - a);
        const taken = [];
        for (const idx of sorted) {
            const it = player.removeItemAt(userId, idx - 1);
            if (!it) throw new Error('Falha ao remover item #' + idx);
            taken.push(it);
        }
        return taken.reverse();
    }

    try {
        const fromA = takeItems(s.aId, s.a.itemIndexes);
        const fromB = takeItems(s.bId, s.b.itemIndexes);

        // éter
        if (s.a.eter > 0) {
            eter.remove(s.aId, s.a.eter, { reason: 'troca', to: s.bId });
            eter.add(s.bId, s.a.eter, { reason: 'troca', from: s.aId });
        }
        if (s.b.eter > 0) {
            eter.remove(s.bId, s.b.eter, { reason: 'troca', to: s.aId });
            eter.add(s.aId, s.b.eter, { reason: 'troca', from: s.bId });
        }

        // intensidade (attrPoints)
        if (s.a.intensity > 0 || s.b.intensity > 0) {
            const da = xp.get(s.aId);
            const db = xp.get(s.bId);
            da.attrPoints = Math.max(0, Number(da.attrPoints || 0) - s.a.intensity + s.b.intensity);
            db.attrPoints = Math.max(0, Number(db.attrPoints || 0) - s.b.intensity + s.a.intensity);
            // persist via spend/add helpers if exist
            if (typeof xp.setAttrPoints === 'function') {
                xp.setAttrPoints(s.aId, da.attrPoints);
                xp.setAttrPoints(s.bId, db.attrPoints);
            } else {
                const all = xp.all ? xp.all() : null;
                if (all) {
                    if (!all[s.aId]) all[s.aId] = da;
                    else all[s.aId].attrPoints = da.attrPoints;
                    if (!all[s.bId]) all[s.bId] = db;
                    else all[s.bId].attrPoints = db.attrPoints;
                    if (typeof xp.save === 'function') xp.save(all);
                    else store.save('xp.json', all);
                }
            }
        }

        // entrega itens
        for (const it of fromA) player.addItem(s.bId, it);
        for (const it of fromB) player.addItem(s.aId, it);

        s.status = 'done';
        sessions.delete(s.id);
        saveDisk();
        return { ok: true, session: s, executed: true };
    } catch (e) {
        s.a.confirmed = false;
        s.b.confirmed = false;
        saveDisk();
        return { ok: false, error: e.message || 'Falha ao executar troca.' };
    }
}

function summarizeSide(userId, side) {
    const inv = player.getInventory(userId) || [];
    const items = (side.itemIndexes || [])
        .map((idx) => {
            const it = inv[idx - 1];
            if (!it) return `#${idx} (?)`;
            const name = it.name || it.id || 'item';
            const emoji = it.emoji || '📦';
            return `${emoji} #${idx} ${name}`;
        })
        .join('\n');
    return {
        eter: side.eter || 0,
        intensity: side.intensity || 0,
        itemsText: items || '_nada_',
        confirmed: !!side.confirmed
    };
}

module.exports = {
    createTrade,
    getTrade,
    setOffer,
    toggleConfirm,
    cancelTrade,
    listOpenFor,
    sideOf,
    partnerId,
    summarizeSide,
    TTL_MS
};
