/**
 * Anti-roubo por servidor — cargo configurável em cada guild.
 * 1) settings.economy.antiRobRoleId
 * 2) ANTI_ROB_ROLE_ID no env (legado)
 * 3) cargo com nome anti-roubo / antiroubo / proteção-banco
 */
const { getSettings, setSettings } = require('./settings');

const NAME_RE = /anti[\s_-]*roubo|antiroubo|prote[cç][aã]o[\s_-]*(banco|cofre|eter)|escudo[\s_-]*banco/i;

function envFallbackId() {
    return String(process.env.ANTI_ROB_ROLE_ID || '').trim() || null;
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
    if (configured && guild.roles.cache.has(configured)) return configured;
    if (configured) return configured;

    const envId = envFallbackId();
    if (envId && guild.roles.cache.has(envId)) return envId;

    const byName = guild.roles.cache.find((r) => NAME_RE.test(r.name));
    if (byName) return byName.id;

    return envId;
}

async function hasAntiRob(guild, userId) {
    if (!guild || !userId) return false;
    const roleId = resolveRoleId(guild);
    if (!roleId) return false;
    try {
        const member = await guild.members.fetch(String(userId)).catch(() => null);
        if (!member) return false;
        return member.roles.cache.has(roleId);
    } catch (_) {
        return false;
    }
}

function setAntiRobRole(guildId, roleId) {
    const id = roleId ? String(roleId).replace(/[<@&>]/g, '').trim() : null;
    if (id && !/^\d{15,25}$/.test(id)) {
        return { ok: false, error: 'ID de cargo inválido.' };
    }
    setSettings(String(guildId), {
        economy: { antiRobRoleId: id || null }
    });
    return { ok: true, roleId: id };
}

function mentionRole(guild) {
    const id = resolveRoleId(guild);
    if (!id) return '_nenhum cargo configurado_';
    return '<@&' + id + '>';
}

module.exports = {
    hasAntiRob,
    resolveRoleId,
    setAntiRobRole,
    getConfiguredRoleId,
    mentionRole,
    NAME_RE
};
