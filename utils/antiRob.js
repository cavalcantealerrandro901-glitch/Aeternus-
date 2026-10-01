/**
 * Anti-roubo GLOBAL por usuário
 *
 * - Sem proteção salva e sem cargo → pode ser roubado em qualquer servidor
 * - Com cargo anti-roubo → grava no banco de usuários
 * - Depois de salvo no DB, continua protegido em TODOS os servidores
 */
const store = require('./store');
const { getSettings, setSettings } = require('./settings');

const KEY = 'antirob_users.json';
const NAME_RE = /anti[\s_-]*roubo|antiroubo|prote[cç][aã]o[\s_-]*(banco|cofre|eter)|escudo[\s_-]*banco/i;

function envFallbackId() {
    return String(process.env.ANTI_ROB_ROLE_ID || process.env.ANTI_ROUBO_ROLE_ID || '').trim() || null;
}

function allUsers() {
    return store.load(KEY, {});
}

function saveUsers(data) {
    store.save(KEY, data);
}

function getRecord(userId) {
    return allUsers()[String(userId)] || null;
}

function isSavedProtected(userId) {
    const rec = getRecord(userId);
    return Boolean(rec && rec.protected === true);
}

function grantProtection(userId, meta = {}) {
    const id = String(userId);
    const data = allUsers();
    data[id] = {
        protected: true,
        grantedAt: data[id]?.grantedAt || Date.now(),
        updatedAt: Date.now(),
        grantedFromGuildId: meta.guildId ? String(meta.guildId) : data[id]?.grantedFromGuildId || null,
        grantedFromRoleId: meta.roleId ? String(meta.roleId) : data[id]?.grantedFromRoleId || null
    };
    saveUsers(data);
    return data[id];
}

function revokeProtection(userId) {
    const id = String(userId);
    const data = allUsers();
    if (!data[id]) return { ok: false, error: 'Usuário não tinha proteção salva.' };
    delete data[id];
    saveUsers(data);
    return { ok: true };
}

function getConfiguredRoleId(guildId) {
    if (!guildId) return null;
    try {
        const s = getSettings(String(guildId));
        const id = s?.economy?.antiRobRoleId;
        if (id && /^\d{15,25}$/.test(String(id))) return String(id);
    } catch (_) {}
    return null;
}

function resolveRoleId(guild) {
    if (!guild) return envFallbackId();
    const configured = getConfiguredRoleId(guild.id);
    if (configured) return configured;
    const envId = envFallbackId();
    if (envId && guild.roles?.cache?.has(envId)) return envId;
    const byName = guild.roles?.cache?.find((r) => NAME_RE.test(r.name));
    if (byName) return byName.id;
    return envId;
}

async function memberHasRoleHere(guild, userId) {
    if (!guild || !userId) return { has: false, roleId: null };
    const roleId = resolveRoleId(guild);
    if (!roleId) return { has: false, roleId: null };
    try {
        const member = await guild.members.fetch(String(userId)).catch(() => null);
        if (!member) return { has: false, roleId };
        return { has: member.roles.cache.has(roleId), roleId };
    } catch (_) {
        return { has: false, roleId };
    }
}

async function hasAntiRob(guild, userId, client = null) {
    if (!userId) return false;
    const uid = String(userId);

    if (isSavedProtected(uid)) return true;

    if (guild) {
        const here = await memberHasRoleHere(guild, uid);
        if (here.has) {
            grantProtection(uid, { guildId: guild.id, roleId: here.roleId });
            return true;
        }
    }

    if (client?.guilds?.cache) {
        for (const g of client.guilds.cache.values()) {
            if (guild && g.id === guild.id) continue;
            const roleId = resolveRoleId(g);
            if (!roleId) continue;
            try {
                const member = g.members.cache.get(uid) || (await g.members.fetch(uid).catch(() => null));
                if (member?.roles?.cache?.has(roleId)) {
                    grantProtection(uid, { guildId: g.id, roleId });
                    return true;
                }
            } catch (_) {}
        }
    }

    return false;
}

async function onMemberRolesUpdate(oldMember, newMember) {
    const uid = newMember?.id || oldMember?.id;
    if (!uid) return null;
    const guild = newMember?.guild || oldMember?.guild;
    const roleId = resolveRoleId(guild);
    if (!roleId) return null;
    const had = oldMember?.roles?.cache?.has(roleId);
    const has = newMember?.roles?.cache?.has(roleId);
    if (!had && has) {
        grantProtection(uid, { guildId: guild.id, roleId });
        return { granted: true, userId: uid };
    }
    return null;
}

function setAntiRobRole(guildId, roleId) {
    const id = roleId ? String(roleId).replace(/[<@&>]/g, '').trim() : null;
    if (id && !/^\d{15,25}$/.test(id)) return { ok: false, error: 'ID de cargo inválido.' };
    setSettings(String(guildId), { economy: { antiRobRoleId: id || null } });
    return { ok: true, roleId: id };
}

function mentionRole(guild) {
    const id = resolveRoleId(guild);
    if (!id) return '_nenhum cargo neste servidor_';
    return '<@&' + id + '>';
}

function statusFor(userId, guild) {
    return {
        protected: isSavedProtected(userId),
        saved: isSavedProtected(userId),
        roleId: guild ? resolveRoleId(guild) : null,
        record: getRecord(userId)
    };
}

module.exports = {
    hasAntiRob,
    isSavedProtected,
    grantProtection,
    revokeProtection,
    getRecord,
    resolveRoleId,
    setAntiRobRole,
    getConfiguredRoleId,
    mentionRole,
    onMemberRolesUpdate,
    statusFor,
    memberHasRoleHere,
    NAME_RE
};
