/**
 * Sistema de Guildas (clãs) do Aeternus.
 * Persistência: guilds.json via store (Mongo).
 */
const crypto = require('crypto');
const store = require('./store');
const eter = require('./eter');
const player = require('./player');

const CREATE_COST = 5000;
const MAX_NAME = 24;
const MAX_TAG = 6; // letras/números/emojis (grafemas)

/** Normaliza tag para comparação (case-insensitive nas letras). */
function tagKey(tag) {
    return [...String(tag || '')]
        .map((ch) => (/[A-Za-zÀ-ÿ]/.test(ch) ? ch.toLowerCase() : ch))
        .join('');
}

/** Mantém letras (maiús/minús), números e emojis; remove espaços. */
function sanitizeTag(raw) {
    const chars = [...String(raw || '').trim()].filter((ch) => {
        if (/\s/.test(ch)) return false;
        if (/[A-Za-z0-9À-ÿ]/.test(ch)) return true;
        // emojis e símbolos unicode (não ASCII de pontuação simples)
        const cp = ch.codePointAt(0);
        if (cp >= 0x1f000) return true; // emoji blocks
        if (cp >= 0x2600 && cp <= 0x27bf) return true; // misc symbols
        if (cp >= 0x1f300 && cp <= 0x1faff) return true;
        if (cp > 0x7f && !/[\u2000-\u206f]/.test(ch)) return true;
        return false;
    });
    return chars.slice(0, MAX_TAG).join('');
}
const MAX_DESC = 300;
const MAX_WELCOME = 300;
const MAX_MEMBERS_BASE = 15;
const MAX_MEMBERS_PER_LEVEL = 2;

function all() {
    return store.load('guilds.json', {});
}

function save(data) {
    store.save('guilds.json', data);
}

function list() {
    const data = all();
    if (!data || typeof data !== 'object') return [];
    return Object.values(data).filter((g) => g && typeof g === 'object');
}

function get(id) {
    if (!id) return null;
    return all()[id] || null;
}

function findByName(name) {
    const q = String(name || '').trim().toLowerCase();
    if (!q) return null;
    return (
        list().find((g) => {
            if (!g || typeof g !== 'object') return false;
            const n = String(g.name || '').toLowerCase();
            const tag = tagKey(g.tag);
            return n === q || tag === q || tag === tagKey(q);
        }) || null
    );
}

function isTagTaken(tag) {
    const q = tagKey(tag);
    if (!q) return false;
    return list().some((g) => g && tagKey(g.tag) === q);
}

function isNameTaken(name) {
    const q = String(name || '').trim().toLowerCase();
    if (!q) return false;
    return list().some((g) => g && String(g.name || '').toLowerCase() === q);
}

function findByMember(userId) {
    const uid = String(userId || '');
    return (
        list().find((g) =>
            (Array.isArray(g.members) ? g.members : []).some(
                (m) => m && String(m.id) === uid
            )
        ) || null
    );
}

function memberOf(guild, userId) {
    return (guild?.members || []).find((m) => m.id === userId) || null;
}

function isOfficer(guild, userId) {
    const m = memberOf(guild, userId);
    return m && (m.role === 'owner' || m.role === 'officer');
}

function isOwner(guild, userId) {
    return memberOf(guild, userId)?.role === 'owner';
}

function maxMembers(guild) {
    const lv = Math.max(1, Number(guild.level) || 1);
    return MAX_MEMBERS_BASE + (lv - 1) * MAX_MEMBERS_PER_LEVEL;
}

function slugName(name) {
    return String(name || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, MAX_NAME);
}

/**
 * @param {string} ownerId
 * @param {{ name, tag, description?, welcome?, imageUrl?, imageTag? }} opts
 */
function createGuild(ownerId, opts = {}) {
    if (!player.has(ownerId)) return { ok: false, error: 'Crie o perfil com `O.j criar`.' };
    if (findByMember(ownerId)) return { ok: false, error: 'Você já está em uma guilda. Saia antes de criar outra.' };

    const name = slugName(opts.name);
    const tag = sanitizeTag(opts.tag);
    if (name.length < 3) return { ok: false, error: 'Nome da guilda: mínimo 3 caracteres.' };
    if ([...tag].length < 2) {
        return { ok: false, error: 'Tag: 2 a 6 caracteres (letras, números ou emojis). Ex.: `Aes`, `LOBO`, `🔥G`' };
    }
    if (isNameTaken(name) || isTagTaken(tag) || findByName(name) || findByName(tag)) return { ok: false, error: 'Nome ou tag já em uso.' };

    const bal = eter.get(ownerId);
    if (bal < CREATE_COST) {
        return {
            ok: false,
            error: `Custo para criar: **${CREATE_COST.toLocaleString('pt-BR')}** ✨ (você tem ${bal.toLocaleString('pt-BR')}).`
        };
    }
    eter.remove(ownerId, CREATE_COST, { reason: 'guild_create' });

    const id = 'g_' + crypto.randomBytes(4).toString('hex');
    const data = all();
    data[id] = {
        id,
        name,
        tag,
        description: String(opts.description || '').trim().slice(0, MAX_DESC),
        welcome: String(opts.welcome || '').trim().slice(0, MAX_WELCOME),
        imageUrl: opts.imageUrl || null,
        imageTag: String(opts.imageTag || '').trim().slice(0, 64) || null,
        ownerId,
        level: 1,
        xp: 0,
        bank: 0,
        members: [{ id: ownerId, role: 'owner', joinedAt: Date.now() }],
        invites: [],
        inventory: [],
        discordRoleId: null,
        discordGuildId: opts.discordGuildId || null,
        createdAt: Date.now()
    };
    save(data);
    return { ok: true, guild: data[id] };
}


function setName(guildId, userId, name) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOwner(g, userId)) return { ok: false, error: 'Só o líder altera o nome.' };
    name = slugName(name);
    if (name.length < 3) return { ok: false, error: 'Nome: mínimo 3 caracteres.' };
    if (isNameTaken(name) && String(g.name || '').toLowerCase() !== name.toLowerCase()) {
        return { ok: false, error: 'Nome já em uso.' };
    }
    g.name = name;
    save(data);
    return { ok: true, guild: g };
}

function setTag(guildId, userId, tagRaw) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOwner(g, userId)) return { ok: false, error: 'Só o líder altera a tag.' };
    const tag = sanitizeTag(tagRaw);
    if ([...tag].length < 2) {
        return { ok: false, error: 'Tag inválida (2–6 letras/números/emojis).' };
    }
    if (isTagTaken(tag) && tagKey(g.tag) !== tagKey(tag)) {
        return { ok: false, error: 'Tag já em uso.' };
    }
    g.tag = tag;
    save(data);
    return { ok: true, guild: g };
}

function setDescription(guildId, userId, desc) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, userId)) return { ok: false, error: 'Só o líder ou oficiais podem editar.' };
    g.description = String(desc || '').trim().slice(0, MAX_DESC);
    save(data);
    return { ok: true, guild: g };
}

function setWelcome(guildId, userId, text) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, userId)) return { ok: false, error: 'Só o líder ou oficiais podem editar.' };
    g.welcome = String(text || '').trim().slice(0, MAX_WELCOME);
    save(data);
    return { ok: true, guild: g };
}

function setImage(guildId, userId, imageUrl, imageTag) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, userId)) return { ok: false, error: 'Só o líder ou oficiais podem editar.' };
    if (imageUrl) g.imageUrl = String(imageUrl).slice(0, 500);
    if (imageTag != null) g.imageTag = String(imageTag || '').trim().slice(0, 64) || null;
    save(data);
    return { ok: true, guild: g };
}

function invite(guildId, byUserId, targetId) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, byUserId)) return { ok: false, error: 'Só líder/oficiais convidam.' };
    if (!player.has(targetId)) return { ok: false, error: 'Alvo sem perfil.' };
    if (memberOf(g, targetId)) return { ok: false, error: 'Já é membro.' };
    if (findByMember(targetId)) return { ok: false, error: 'Essa pessoa já está em outra guilda.' };
    if (g.members.length >= maxMembers(g)) return { ok: false, error: 'Guilda cheia.' };
    if (!g.invites.includes(targetId)) g.invites.push(targetId);
    save(data);
    return { ok: true, guild: g };
}

function acceptInvite(userId, guildIdOrName) {
    if (!player.has(userId)) return { ok: false, error: 'Crie o perfil primeiro.' };
    if (findByMember(userId)) return { ok: false, error: 'Você já está em uma guilda.' };

    const data = all();
    let g = data[guildIdOrName] || findByName(guildIdOrName);
    if (!g || !data[g.id]) return { ok: false, error: 'Guilda não encontrada.' };
    g = data[g.id];
    if (!g.invites.includes(userId)) return { ok: false, error: 'Você não tem convite desta guilda.' };
    if (g.members.length >= maxMembers(g)) return { ok: false, error: 'Guilda cheia.' };

    g.invites = g.invites.filter((id) => id !== userId);
    g.members.push({ id: userId, role: 'member', joinedAt: Date.now() });
    save(data);
    return { ok: true, guild: g, welcome: g.welcome || null };
}

function leave(userId) {
    const data = all();
    const g = findByMember(userId);
    if (!g || !data[g.id]) return { ok: false, error: 'Você não está em uma guilda.' };
    const guild = data[g.id];
    if (isOwner(guild, userId)) {
        return { ok: false, error: 'O líder não pode sair. Use `O.guild transferir @user` ou `O.guild dissolver`.' };
    }
    guild.members = guild.members.filter((m) => m.id !== userId);
    save(data);
    return { ok: true, guild };
}

function kick(guildId, byUserId, targetId) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, byUserId)) return { ok: false, error: 'Sem permissão.' };
    if (targetId === byUserId) return { ok: false, error: 'Use `O.guild sair`.' };
    const target = memberOf(g, targetId);
    if (!target) return { ok: false, error: 'Não é membro.' };
    if (target.role === 'owner') return { ok: false, error: 'Não pode expulsar o líder.' };
    if (target.role === 'officer' && !isOwner(g, byUserId)) {
        return { ok: false, error: 'Só o líder expulsa oficiais.' };
    }
    g.members = g.members.filter((m) => m.id !== targetId);
    save(data);
    return { ok: true, guild: g };
}

function setRole(guildId, byUserId, targetId, role) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOwner(g, byUserId)) return { ok: false, error: 'Só o líder altera cargos.' };
    const target = memberOf(g, targetId);
    if (!target) return { ok: false, error: 'Não é membro.' };
    if (target.role === 'owner') return { ok: false, error: 'Não pode alterar o líder assim.' };
    if (!['member', 'officer'].includes(role)) return { ok: false, error: 'Cargo: member ou officer.' };
    target.role = role;
    save(data);
    return { ok: true, guild: g };
}

function transfer(guildId, byUserId, targetId) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOwner(g, byUserId)) return { ok: false, error: 'Só o líder transfere.' };
    const target = memberOf(g, targetId);
    if (!target) return { ok: false, error: 'Alvo precisa ser membro.' };
    const owner = memberOf(g, byUserId);
    owner.role = 'officer';
    target.role = 'owner';
    g.ownerId = targetId;
    save(data);
    return { ok: true, guild: g };
}

function disband(guildId, byUserId) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOwner(g, byUserId)) return { ok: false, error: 'Só o líder dissolve.' };
    if (g.bank > 0) {
        eter.add(byUserId, g.bank, { reason: 'guild_disband' });
    }
    const roleMeta = {
        discordRoleId: g.discordRoleId || null,
        discordGuildId: g.discordGuildId || null,
        tag: g.tag
    };
    delete data[guildId];
    save(data);
    return { ok: true, refunded: g.bank || 0, roleMeta };
}

function deposit(userId, amount) {
    const data = all();
    const g = findByMember(userId);
    if (!g || !data[g.id]) return { ok: false, error: 'Você não está em uma guilda.' };
    const guild = data[g.id];
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return { ok: false, error: 'Valor inválido.' };
    if (eter.get(userId) < n) return { ok: false, error: 'Éter insuficiente.' };
    eter.remove(userId, n, { reason: 'guild_deposit' });
    guild.bank = Math.floor(Number(guild.bank) || 0) + n;
    guild.xp = Math.floor(Number(guild.xp) || 0) + Math.floor(n / 100);
    while (guild.xp >= guildLevelNeed(guild.level)) {
        guild.xp -= guildLevelNeed(guild.level);
        guild.level += 1;
    }
    save(data);
    return { ok: true, guild };
}

function withdraw(userId, amount) {
    const data = all();
    const g = findByMember(userId);
    if (!g || !data[g.id]) return { ok: false, error: 'Você não está em uma guilda.' };
    const guild = data[g.id];
    if (!isOfficer(guild, userId)) return { ok: false, error: 'Só líder/oficiais sacam do banco.' };
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return { ok: false, error: 'Valor inválido.' };
    if ((guild.bank || 0) < n) return { ok: false, error: 'Banco da guilda insuficiente.' };
    guild.bank -= n;
    eter.add(userId, n, { reason: 'guild_withdraw' });
    save(data);
    return { ok: true, guild };
}

function guildLevelNeed(level) {
    const lv = Math.max(1, Number(level) || 1);
    return Math.floor(500 + lv * 250);
}


function ensureInventory(g) {
    if (!Array.isArray(g.inventory)) g.inventory = [];
    return g.inventory;
}

function getInventory(guildId) {
    const g = get(guildId);
    if (!g) return [];
    return ensureInventory(g).map((it, i) => ({ ...it, index: i + 1 }));
}

/**
 * Oficial deposita um ou mais itens iguais do inventário pessoal na guilda.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} playerIndex1 - índice 1-based de um item no inventário do jogador
 * @param {number} [qty=1] - quantidade do mesmo item (mesmo id)
 */
function depositItem(guildId, userId, playerIndex1, qty = 1) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, userId)) return { ok: false, error: 'Só líder/oficiais depositam itens.' };

    const player = require('./player');
    if (!player.has(userId)) return { ok: false, error: 'Sem perfil.' };

    const amount = Math.max(1, Math.floor(Number(qty) || 1));
    if (amount > 50) return { ok: false, error: 'Máximo de **50** itens por depósito.' };

    const inv = player.getInventory(userId, 'todos');
    const idx = Math.floor(Number(playerIndex1) || 0) - 1;
    if (idx < 0 || idx >= inv.length) {
        return { ok: false, error: 'Índice inválido. Veja `O.inventario`.' };
    }

    const ref = inv[idx];
    const itemId = ref.id || ref.name;
    if (!itemId) return { ok: false, error: 'Item inválido.' };

    // Conta quantos do mesmo id o jogador tem
    const same = inv.filter((it) => String(it.id || it.name) === String(itemId));
    if (same.length < amount) {
        return {
            ok: false,
            error:
                `Você só tem **${same.length}**× **${ref.name || itemId}** no inventário ` +
                `(pediu **${amount}**).`
        };
    }

    // Remove `amount` entradas com esse id (do fim da lista para não bagunçar índices)
    const pdata = player.all ? player.all() : null;
    // removeItemAt usa índice 0-based na lista bruta — vamos remover por uid
    const store = require('./store');
    const players = store.load('players.json', {});
    const p = players[userId];
    if (!p || !Array.isArray(p.inventory)) return { ok: false, error: 'Inventário inválido.' };

    const toMove = [];
    let need = amount;
    // Percorre de trás pra frente
    for (let i = p.inventory.length - 1; i >= 0 && need > 0; i--) {
        const it = p.inventory[i];
        if (!it) continue;
        if (String(it.id || it.name) !== String(itemId)) continue;
        const [removed] = p.inventory.splice(i, 1);
        toMove.push(removed);
        need--;
    }
    if (toMove.length < amount) {
        return { ok: false, error: 'Não foi possível remover a quantidade pedida.' };
    }
    p.updatedAt = Date.now();
    store.save('players.json', players);

    ensureInventory(g);
    const deposited = [];
    for (const removed of toMove) {
        const entry = {
            ...removed,
            depositedBy: userId,
            depositedAt: Date.now()
        };
        g.inventory.push(entry);
        deposited.push(entry);
    }
    save(data);
    return {
        ok: true,
        guild: g,
        item: deposited[0],
        items: deposited,
        amount: deposited.length
    };
}

/**
 * Membro retira item do inventário da guilda para o inventário pessoal.
 */
function withdrawItem(guildId, userId, guildIndex1) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!memberOf(g, userId)) return { ok: false, error: 'Você não é membro.' };

    ensureInventory(g);
    const idx = Math.floor(Number(guildIndex1) || 0) - 1;
    if (idx < 0 || idx >= g.inventory.length) {
        return { ok: false, error: 'Índice inválido. Use `O.guild inventario`.' };
    }
    const [item] = g.inventory.splice(idx, 1);
    save(data);

    const player = require('./player');
    const { depositedBy, depositedAt, index, ...clean } = item;
    player.addItem(userId, clean);
    return { ok: true, guild: g, item: clean };
}

/** Oficial remove item do baú (sem devolver — destrói ou só remove). */
function removeGuildItem(guildId, userId, guildIndex1) {
    const data = all();
    const g = data[guildId];
    if (!g) return { ok: false, error: 'Guilda não encontrada.' };
    if (!isOfficer(g, userId)) return { ok: false, error: 'Só líder/oficiais removem itens do baú.' };
    ensureInventory(g);
    const idx = Math.floor(Number(guildIndex1) || 0) - 1;
    if (idx < 0 || idx >= g.inventory.length) {
        return { ok: false, error: 'Índice inválido.' };
    }
    const [item] = g.inventory.splice(idx, 1);
    save(data);
    return { ok: true, guild: g, item };
}

function ranking(limit = 10) {
    return list()
        .filter((g) => g && g.name)
        .slice()
        .sort((a, b) => {
            if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
            return (b.bank || 0) - (a.bank || 0);
        })
        .slice(0, Math.max(1, Number(limit) || 10));
}

module.exports = {
    CREATE_COST,
    MAX_DESC,
    MAX_WELCOME,
    all,
    list,
    get,
    findByName,
    isTagTaken,
    isNameTaken,
    sanitizeTag,
    tagKey,
    findByMember,
    memberOf,
    isOfficer,
    isOwner,
    maxMembers,
    createGuild,
    setName,
    setTag,
    setDescription,
    setWelcome,
    setImage,
    invite,
    acceptInvite,
    leave,
    kick,
    setRole,
    transfer,
    disband,
    deposit,
    withdraw,
    ranking,
    guildLevelNeed,
    getInventory,
    depositItem,
    withdrawItem,
    removeGuildItem,
    ensureInventory
};
