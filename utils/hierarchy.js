const { PermissionFlagsBits } = require('discord.js');
const { getSettings, setSettings } = require('./settings');

const RANKS = Object.freeze([
    { key: 'mestre', name: 'Mestre', icon: '👑', limit: 1 },
    { key: 'grao-mestre', name: 'Grão-Mestre', icon: '🜲', limit: 4 },
    { key: 'comandante', name: 'Comandante', icon: '⚔️', limit: 12 },
    { key: 'capitao', name: 'Capitão', icon: '🗡️', limit: 36 },
    { key: 'tenente', name: 'Tenente', icon: '🛡️', limit: 108 },
    { key: 'oficial', name: 'Oficial', icon: '⚜️', limit: 324 },
    { key: 'membro', name: 'Membro', icon: '👤', limit: Infinity }
]);

function rank(key) { return RANKS.find((r) => r.key === key) || null; }
function indexOfRank(key) { return RANKS.findIndex((r) => r.key === key); }
function getConfig(guildId) { return getSettings(guildId).hierarchy || { enabled: false, roleIds: {} }; }
function saveConfig(guildId, patch) { return setSettings(guildId, { hierarchy: patch }); }
function memberRank(member, config = getConfig(member.guild.id)) {
    const ids = config.roleIds || {};
    for (const r of RANKS) if (ids[r.key] && member.roles.cache.has(ids[r.key])) return r;
    return null;
}
function countRank(guild, rankKey, config = getConfig(guild.id)) {
    const id = config.roleIds?.[rankKey];
    const role = id ? guild.roles.cache.get(id) : null;
    return role ? role.members.size : 0;
}
function canManage(invoker, target, desiredKey, config) {
    if (invoker.id === target.id) return false;
    if (invoker.id === invoker.guild.ownerId) return true;
    const inv = memberRank(invoker, config);
    const targetRank = memberRank(target, config);
    const desiredIndex = indexOfRank(desiredKey);
    if (!inv || desiredIndex < 0) return false;
    const invIndex = indexOfRank(inv.key);
    const targetIndex = targetRank ? indexOfRank(targetRank.key) : RANKS.length;
    return invIndex < targetIndex && invIndex < desiredIndex;
}
async function ensureRoles(guild) {
    const config = getConfig(guild.id);
    const roleIds = { ...(config.roleIds || {}) };
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return { ok: false, error: 'O Aeternus precisa da permissão **Gerenciar Cargos**.' };
    for (const r of RANKS) {
        let role = roleIds[r.key] ? guild.roles.cache.get(roleIds[r.key]) : null;
        if (!role) role = guild.roles.cache.find((x) => !x.managed && x.name === `${r.icon} ${r.name}`) || null;
        if (!role) {
            try { role = await guild.roles.create({ name: `${r.icon} ${r.name}`, mentionable: false, hoist: false, reason: 'Configuração da Hierarquia Aeternus' }); }
            catch (e) { return { ok: false, error: `Não consegui criar o cargo **${r.name}**: ${e.message}` }; }
        }
        if (me.roles.highest.comparePositionTo(role) <= 0) return { ok: false, error: `O cargo **${role.name}** precisa ficar abaixo do cargo mais alto do Aeternus.` };
        roleIds[r.key] = role.id;
    }
    // Organiza os cargos da hierarquia abaixo do cargo mais alto do bot.
    const botTop = me.roles.highest.position;
    const ordered = RANKS.map((r) => roleIds[r.key]).filter(Boolean);
    for (let i = 0; i < ordered.length; i++) {
        const role = guild.roles.cache.get(ordered[i]);
        if (!role) continue;
        const targetPosition = Math.max(1, botTop - 1 - i);
        await role.setPosition(targetPosition, 'Organizar Hierarquia Aeternus').catch(() => {});
    }
    saveConfig(guild.id, { enabled: true, roleIds });
    const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
    if (owner) {
        const mestreId = roleIds.mestre;
        if (mestreId && !owner.roles.cache.has(mestreId)) {
            for (const r of RANKS.filter((x) => x.key !== 'mestre')) { const id = roleIds[r.key]; if (id && owner.roles.cache.has(id)) await owner.roles.remove(id, 'Hierarquia Aeternus').catch(() => {}); }
            await owner.roles.add(mestreId, 'Mestre da Hierarquia Aeternus').catch(() => {});
        }
    }
    return { ok: true, config: getConfig(guild.id) };
}
async function setRank(member, desiredKey, actor) {
    const config = getConfig(member.guild.id);
    const desired = rank(desiredKey);
    if (!desired || !config.enabled) return { ok: false, error: 'A hierarquia ainda não foi configurada.' };
    if (!canManage(actor, member, desiredKey, config)) return { ok: false, error: 'Você não possui autoridade para atribuir essa posição.' };
    const current = memberRank(member, config);
    if (current?.key === desired.key) return { ok: false, error: 'O membro já ocupa essa posição.' };
    const occupied = countRank(member.guild, desired.key, config);
    if (Number.isFinite(desired.limit) && occupied >= desired.limit) return { ok: false, error: `A posição **${desired.icon} ${desired.name}** já atingiu o limite de **${desired.limit}**.` };
    const me = member.guild.members.me || await member.guild.members.fetchMe().catch(() => null);
    const role = member.guild.roles.cache.get(config.roleIds[desired.key]);
    if (!role || !me?.permissions.has(PermissionFlagsBits.ManageRoles) || me.roles.highest.comparePositionTo(role) <= 0) return { ok: false, error: 'Não consigo gerenciar esse cargo. Verifique a posição dos cargos do Aeternus.' };
    for (const r of RANKS) { const id = config.roleIds[r.key]; if (id && member.roles.cache.has(id) && id !== role.id) await member.roles.remove(id, 'Atualização da Hierarquia Aeternus').catch(() => {}); }
    await member.roles.add(role, 'Atualização da Hierarquia Aeternus');
    return { ok: true, rank: desired, previous: current };
}
async function promote(member, actor) {
    const config = getConfig(member.guild.id); const current = memberRank(member, config);
    const nextIndex = current ? indexOfRank(current.key) - 1 : indexOfRank('membro') - 1;
    if (nextIndex < 0) return { ok: false, error: 'O membro já está no topo da hierarquia.' };
    return setRank(member, RANKS[nextIndex].key, actor);
}
async function demote(member, actor) {
    const config = getConfig(member.guild.id); const current = memberRank(member, config);
    if (!current || current.key === 'membro') return { ok: false, error: 'O membro já está na posição Membro.' };
    return setRank(member, RANKS[indexOfRank(current.key) + 1].key, actor);
}
function overview(guild) { const config = getConfig(guild.id); return RANKS.map((r) => ({ ...r, roleId: config.roleIds?.[r.key] || null, occupied: countRank(guild, r.key, config) })); }

module.exports = { RANKS, rank, getConfig, memberRank, countRank, ensureRoles, setRank, promote, demote, overview };