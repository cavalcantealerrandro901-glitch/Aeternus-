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
    '✨ **Obrigado por caminhar conosco.**\n\n' +
    'Você foi escolhido como **representante oficial** da parceria entre **{host}** e **{server}**.\n\n' +
    '🤝 Sua presença une duas comunidades — e isso significa muito.\n' +
    '🔗 Convite da parceria: {invite}\n\n' +
    '⚠️ Lembrete importante: se você **sair** de **{host}**, a parceria será **encerrada automaticamente** e o anúncio será removido.\n\n' +
    'Com gratidão,\n**Equipe {host}**';

/** GIF de anime (parceria / cumprimento) — fixa, não vem do painel */
const DM_GIF =
    'https://media.tenor.com/S3sG0fD1y0IAAAAC/anime-handshake.gif';

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
        roleId: entry.roleId || null,
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
        roleId: s.roleId || null,
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

function fixedDmPayload(vars) {
    const { EmbedBuilder } = require('discord.js');
    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🤝 Parceria confirmada')
        .setDescription(fixedDmText(vars))
        .setImage(DM_GIF)
        .setFooter({ text: 'Aeternus · obrigado pela confiança' })
        .setTimestamp();
    return { embeds: [emb] };
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
    fixedDmPayload,
    DEFAULT_PHRASE,
    FIXED_DM,
    DM_GIF
};
