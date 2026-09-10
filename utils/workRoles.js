/**
 * Cargos de trabalho no Discord.
 */
const { PermissionFlagsBits } = require('discord.js');
const store = require('./store');
const { RANKS } = require('./work');

const PREFIX = 'Trabalho \u00b7 ';
const CACHE_KEY = 'work_role_ids.json';

const COLORS = [
    0x86efac, 0x93c5fd, 0xfcd34d, 0xfbbf24, 0xfb923c,
    0xf87171, 0xc084fc, 0x67e8f9, 0xfde047, 0xe879f9
];

function loadMap(guildId) {
    const all = store.load(CACHE_KEY, {});
    return all[String(guildId)] || {};
}

function saveMap(guildId, map) {
    const all = store.load(CACHE_KEY, {});
    all[String(guildId)] = map;
    store.save(CACHE_KEY, all);
}

function roleName(rank) {
    return PREFIX + rank.name;
}

function canManage(guild) {
    const me = guild.members.me;
    if (!me) return false;
    return me.permissions.has(PermissionFlagsBits.ManageRoles);
}

async function ensureRoles(guild) {
    if (!guild || !guild.id) return {};
    if (!canManage(guild)) {
        console.warn('[workRoles] sem permissao Gerenciar Cargos em', guild.id);
        return loadMap(guild.id);
    }
    const map = Object.assign({}, loadMap(guild.id));
    let changed = false;
    for (const rank of RANKS) {
        const name = roleName(rank);
        let role =
            (map[rank.id] && guild.roles.cache.get(map[rank.id])) ||
            guild.roles.cache.find((r) => r.name === name) ||
            null;
        if (!role) {
            try {
                const color = Number(COLORS[Number(rank.id)] != null ? COLORS[Number(rank.id)] : 0x99aab5);
                role = await guild.roles.create({
                    name: name,
                    color: Number.isFinite(color) ? color : 0x99aab5,
                    hoist: false,
                    mentionable: false,
                    reason: 'Cargo automatico do sistema de trabalho (Aeternus)'
                });
                console.log('[workRoles] criado ' + name + ' em ' + guild.name);
            } catch (e) {
                console.error('[workRoles] falha ao criar', name, e.message);
                continue;
            }
        }
        if (map[rank.id] !== role.id) {
            map[rank.id] = role.id;
            changed = true;
        }
    }
    if (changed) saveMap(guild.id, map);
    return map;
}

async function syncMember(member, rankId) {
    if (!member || !member.guild || rankId == null) return { ok: false, reason: 'invalid' };
    if (!canManage(member.guild)) return { ok: false, reason: 'no_perm' };
    const map = await ensureRoles(member.guild);
    const targetId = map[String(rankId)] != null ? map[String(rankId)] : map[rankId];
    if (!targetId) return { ok: false, reason: 'no_role' };
    const me = member.guild.members.me;
    const allIds = Object.values(map).filter(Boolean);
    const manageable = allIds.filter((id) => {
        const role = member.guild.roles.cache.get(id);
        if (!role || !me) return false;
        return role.editable && me.roles.highest.position > role.position;
    });
    try {
        const toRemove = manageable.filter((id) => id !== targetId && member.roles.cache.has(id));
        if (toRemove.length) await member.roles.remove(toRemove, 'Troca de cargo de trabalho');
        if (!member.roles.cache.has(targetId) && manageable.includes(targetId)) {
            await member.roles.add(targetId, 'Cargo de trabalho atual');
        }
        return { ok: true, roleId: targetId };
    } catch (e) {
        console.error('[workRoles] sync', member.id, e.message);
        return { ok: false, reason: e.message };
    }
}

async function applyForJobs(member, jobs) {
    const { rankFor } = require('./work');
    const rank = rankFor(Math.max(0, Number(jobs) || 0));
    return syncMember(member, rank.id);
}

module.exports = {
    PREFIX: PREFIX,
    ensureRoles: ensureRoles,
    syncMember: syncMember,
    applyForJobs: applyForJobs,
    roleName: roleName
};
