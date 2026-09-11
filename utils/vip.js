const store = require('./store');
const crypto = require('crypto');

const PLANOS = ['VIP', 'VIP+', 'VIP++', 'MVP', 'Booster', 'Premium'];

/** Categorias de anotação / registro */
const CATEGORIES = [
    { value: 'compra_vip', name: 'Compra de VIP' },
    { value: 'patrimonio', name: 'Patrimônio' },
    { value: 'doacao', name: 'Doação' },
    { value: 'evento', name: 'Evento' },
    { value: 'boost', name: 'Boost / Nitro' },
    { value: 'sorteio', name: 'Sorteio' },
    { value: 'troca', name: 'Troca' },
    { value: 'reembolso', name: 'Reembolso' },
    { value: 'parceria', name: 'Parceria' },
    { value: 'premio', name: 'Prêmio' },
    { value: 'servico', name: 'Serviço' },
    { value: 'outro', name: 'Outro' }
];

const TIPOS = CATEGORIES;

function categoryLabel(value) {
    const c = CATEGORIES.find((x) => x.value === value);
    return c ? c.name : value || 'Outro';
}

function loadAll() {
    return store.load('vips.json', {});
}

function saveAll(all) {
    store.save('vips.json', all);
}

function newId() {
    return crypto.randomBytes(6).toString('hex');
}

function guildData(guildId) {
    const all = loadAll();
    let g = all[guildId];

    if (!g) {
        g = { list: [] };
        all[guildId] = g;
        return { all, data: g };
    }

    if (Array.isArray(g.list)) {
        return { all, data: g };
    }

    const list = [];
    for (const [userId, rec] of Object.entries(g)) {
        if (!rec || typeof rec !== 'object') continue;
        list.push({
            id: newId(),
            userId: String(userId),
            category: rec.type === 'compra' || !rec.type ? 'compra_vip' : String(rec.type),
            item: rec.vip || rec.tier || rec.roleName || 'VIP',
            vip: rec.vip || rec.tier || null,
            tier: rec.tier || null,
            roleId: rec.roleId || null,
            roleName: rec.roleName || null,
            registeredBy: rec.registeredBy || null,
            registeredAt: rec.registeredAt || Date.now(),
            expiresAt: rec.expiresAt || null,
            note: rec.note || ''
        });
    }
    g = { list };
    all[guildId] = g;
    saveAll(all);
    return { all, data: g };
}

function get(guildId, userId) {
    const { data } = guildData(guildId);
    const list = (data.list || [])
        .filter((r) => String(r.userId) === String(userId))
        .sort((a, b) => Number(b.registeredAt || 0) - Number(a.registeredAt || 0));
    const v = list[0];
    if (!v) return null;
    if (v.expiresAt && Number(v.expiresAt) > 0 && Date.now() > Number(v.expiresAt)) {
        return { ...v, expired: true };
    }
    return { ...v, expired: false };
}

function listActive(guildId) {
    const now = Date.now();
    return listAll(guildId).filter(
        (v) => !v.expiresAt || Number(v.expiresAt) === 0 || Number(v.expiresAt) > now
    );
}

function listAll(guildId, category) {
    const { data } = guildData(guildId);
    let list = [...(data.list || [])].map((v) => {
        const expired =
            v.expiresAt && Number(v.expiresAt) > 0 && Date.now() > Number(v.expiresAt);
        return { ...v, expired: !!expired };
    });
    if (category && category !== 'todas') {
        list = list.filter((v) => String(v.category || 'compra_vip') === String(category));
    }
    list.sort((a, b) => Number(b.registeredAt || 0) - Number(a.registeredAt || 0));
    return list;
}

function register({
    guildId,
    userId,
    item,
    vipName,
    registeredBy,
    days,
    note,
    roleId,
    roleName,
    type,
    category
}) {
    const { all, data } = guildData(guildId);
    const now = Date.now();
    const d = days == null || Number(days) <= 0 ? null : Number(days);
    const expiresAt = d ? now + d * 24 * 60 * 60 * 1000 : null;
    const cat = String(category || type || 'compra_vip');
    const name = String(item || vipName || roleName || 'Item').trim().slice(0, 80);

    const rec = {
        id: newId(),
        userId: String(userId),
        category: cat,
        item: name,
        vip: name,
        tier: name,
        roleId: roleId ? String(roleId) : null,
        roleName: roleName ? String(roleName).slice(0, 80) : null,
        registeredBy: String(registeredBy),
        registeredAt: now,
        expiresAt,
        note: note ? String(note).slice(0, 200) : ''
    };

    if (!Array.isArray(data.list)) data.list = [];
    data.list.push(rec);
    all[guildId] = data;
    saveAll(all);
    return { ...rec };
}

function remove(guildId, userId) {
    const { all, data } = guildData(guildId);
    const before = (data.list || []).length;
    data.list = (data.list || []).filter((r) => String(r.userId) !== String(userId));
    if (data.list.length === before) return false;
    all[guildId] = data;
    saveAll(all);
    return true;
}

function vipLabel(rec) {
    if (!rec) return null;
    return rec.item || rec.vip || rec.tier || rec.roleName || 'Item';
}

function formatDuration(ms) {
    if (ms == null || ms <= 0) return 'permanente';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    if (d > 0) return `${d} dia${d === 1 ? '' : 's'}${h > 0 ? ` e ${h}h` : ''}`;
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${Math.max(1, m)} min`;
}

function timeHeld(registeredAt) {
    if (!registeredAt) return '—';
    return formatDuration(Date.now() - Number(registeredAt));
}

function timeLeft(expiresAt) {
    if (!expiresAt) return 'permanente';
    const left = Number(expiresAt) - Date.now();
    if (left <= 0) return 'expirado';
    return formatDuration(left);
}

module.exports = {
    PLANOS,
    CATEGORIES,
    TIPOS,
    categoryLabel,
    get,
    listActive,
    listAll,
    register,
    remove,
    vipLabel,
    timeHeld,
    timeLeft,
    formatDuration
};
