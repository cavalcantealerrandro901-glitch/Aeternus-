/**
 * Parcerias por servidor
 * Store: partnerships.json
 */
const store = require('./store');
const { getSettings } = require('./settings');

const KEY = 'partnerships.json';

const DEFAULT_PHRASE =
    '🤝 **Nova parceria!**\nRepresentante: {rep}\nServidor: **{server}**\nConvite: {invite}';

/** Mensagem fixa no DM — não configurável no painel */
const FIXED_DM =
    'Olá! Você foi registrado como **representante de parceria** no servidor **{host}**.\n\n' +
    '📦 Parceria: **{server}**\n' +
    '🔗 Convite salvo pela staff.\n\n' +
    '⚠️ Se você **sair** do servidor **{host}**, a parceria será **cancelada automaticamente** e o convite/anúncio será removido.\n\n' +
    'Obrigado pela parceria!';

function all() {
    return store.load(KEY, {});
}

function save(data) {
    store.save(KEY, data);
}

function list(guildId) {
    const data = all();
    return Object.values(data[guildId] || {});
}

function get(guildId, partnerId) {
    return all()[guildId]?.[partnerId] || null;
}

function findByRep(guildId, repId) {
    return list(guildId).filter((p) => p.repId === String(repId) && !p.cancelled);
}

function create(guildId, entry) {
    const data = all();
    if (!data[guildId]) data[guildId] = {};
    const id = entry.id || `p_${Date.now().toString(36)}`;
    data[guildId][id] = {
        id,
        guildId: String(guildId),
        repId: String(entry.repId),
        repTag: entry.repTag || null,
        inviteUrl: entry.inviteUrl || null,
        serverName: entry.serverName || 'Servidor parceiro',
        messageId: entry.messageId || null,
        channelId: entry.channelId || null,
        createdAt: Date.now(),
        createdBy: entry.createdBy || null,
        cancelled: false
    };
    save(data);
    return data[guildId][id];
}

function update(guildId, partnerId, patch) {
    const data = all();
    if (!data[guildId]?.[partnerId]) return null;
    Object.assign(data[guildId][partnerId], patch);
    save(data);
    return data[guildId][partnerId];
}

function cancel(guildId, partnerId) {
    return update(guildId, partnerId, {
        cancelled: true,
        cancelledAt: Date.now()
    });
}

function remove(guildId, partnerId) {
    const data = all();
    if (data[guildId]?.[partnerId]) {
        delete data[guildId][partnerId];
        save(data);
        return true;
    }
    return false;
}

function getConfig(guildId) {
    const s = getSettings(guildId).partnership || {};
    return {
        enabled: s.enabled !== false,
        channelId: s.channelId || null,
        phrase: s.phrase || DEFAULT_PHRASE,
        image: s.image || null
    };
}

function fill(tpl, vars) {
    let out = String(tpl || '');
    for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{${k}}`).join(String(v ?? ''));
    }
    return out.slice(0, 4000);
}

function fixedDmText(vars) {
    return fill(FIXED_DM, vars);
}

module.exports = {
    list,
    get,
    findByRep,
    create,
    update,
    cancel,
    remove,
    getConfig,
    fill,
    fixedDmText,
    DEFAULT_PHRASE,
    FIXED_DM
};
