/**
 * Masmorra Aeternus — pisos 1 a 26
 */
const crypto = require('crypto');
const store = require('./store');
const player = require('./player');
const xp = require('./xp');
const arenaEngine = require('./arenaEngine');

const MAX_IMPLEMENTED = 26;
const dungeonMatches = new Map();

const MONSTER_TEMPLATES = [
    { name: 'Rato de Cripta', emoji: '🐀' }, { name: 'Esqueleto Errante', emoji: '💀' },
    { name: 'Goblin Ladrão', emoji: '👺' }, { name: 'Lobo Sombrio', emoji: '🐺' },
    { name: 'Cultista Menor', emoji: '🕯️' }, { name: 'Gárgula Rachada', emoji: '🗿' },
    { name: 'Elemental de Cinzas', emoji: '🔥' }, { name: 'Cavaleiro Caído', emoji: '⚔️' },
    { name: 'Aranha do Vazio', emoji: '🕷️' }, { name: 'Espectro Faminto', emoji: '👻' },
    { name: 'Ogro do Fosso', emoji: '👹' }, { name: 'Mago Renegado', emoji: '🧙' },
    { name: 'Serpente Rúnica', emoji: '🐍' }, { name: 'Guardião de Pedra', emoji: '🛡️' },
    { name: 'Demoníaco Menor', emoji: '😈' }, { name: 'Harpia das Torres', emoji: '🦅' },
    { name: 'Necromante', emoji: '🖤' }, { name: 'Titã Quebrado', emoji: '🦴' },
    { name: 'Lâmina Maldita', emoji: '🗡️' }, { name: 'Fênix Escura', emoji: '🔥' },
    { name: 'Bispo Corrompido', emoji: '✝️' }, { name: 'Dragãozinho de Cinzas', emoji: '🐉' },
    { name: 'Sentinela do Éter', emoji: '✨' }, { name: 'Rei Esqueleto', emoji: '👑' },
    { name: 'Abominação do Poço', emoji: '🧬' }, { name: 'Arauto do Piso 26', emoji: '📜' }
];

function floorMonster(floor) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const tpl = MONSTER_TEMPLATES[f - 1] || MONSTER_TEMPLATES[0];
    const level = Math.floor(f * 3.5 + Math.random() * 2);
    const scale = 1 + f * 0.12;
    const attrs = {
        forca: Math.floor(4 + f * 1.4), defesa: Math.floor(3 + f * 1.1),
        agilidade: Math.floor(3 + f * 0.9), vida: Math.floor(6 + f * 1.5)
    };
    const hp = Math.floor((60 + f * 28) * scale);
    const mana = Math.floor(20 + f * 4);
    return {
        id: 'mob_' + f + '_' + crypto.randomBytes(3).toString('hex'),
        name: tpl.name, emoji: tpl.emoji, isMonster: true, level, floor: f, attrs,
        hp, maxHp: hp, mana, maxMana: mana, className: 'Monstro', classId: 'monster',
        actives: [
            { id: 'garra', name: 'Garra', emoji: '🐾', type: 'physical', mana: 0, cd: 0, power: 1 + f * 0.02, desc: 'Ataque selvagem' },
            { id: 'rugido', name: 'Rugido', emoji: '📣', type: 'physical', mana: 5, cd: 2, power: 1.2 + f * 0.02, desc: 'Ataque poderoso' }
        ],
        passives: [], passMods: {},
        basicAttack: { id: 'basico_mob', name: 'Ataque', emoji: tpl.emoji, type: 'physical', power: 1, mana: 0 },
        effects: [], cds: {}, team: 'B', photo: null, battleAvatar: null
    };
}

function getProgress(userId) {
    const data = store.load('dungeon_progress.json', {});
    return data[userId] || { highest: 0, currentFloor: 1 };
}
function saveProgress(userId, prog) {
    const data = store.load('dungeon_progress.json', {});
    data[userId] = prog;
    store.save('dungeon_progress.json', data);
}

function startFloor(userId, floor) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const prog = getProgress(userId);
    if (f > prog.highest + 1) return { ok: false, error: `Você só pode avançar até o piso ${prog.highest + 1}.` };
    const fighter = arenaEngine.loadFighter(userId);
    if (!fighter) return { ok: false, error: 'Crie o perfil primeiro.' };
    fighter.team = 'A';
    const monster = floorMonster(f);
    const id = 'dg_' + crypto.randomBytes(5).toString('hex');
    const match = {
        id, mode: 'dungeon', floor: f,
        fighters: { [userId]: fighter, [monster.id]: monster },
        teamA: [userId], teamB: [monster.id],
        turnOrder: [userId, monster.id], turnIndex: 0, currentId: userId,
        turnEndsAt: Date.now() + arenaEngine.TURN_MS,
        log: [{ t: Date.now(), text: `🏰 Piso ${f}: ${monster.emoji} **${monster.name}** (Nv.${monster.level}) aparece!` }],
        status: 'active', winnerTeam: null, bet: 0, lastEffect: null, createdAt: Date.now(), dungeon: true
    };
    dungeonMatches.set(id, match);
    return { ok: true, match };
}

function getDungeonMatch(id) { return dungeonMatches.get(id) || null; }

function monsterAiMove(match) {
    const mobId = match.teamB[0];
    const mob = match.fighters[mobId];
    if (!mob || mob.hp <= 0 || match.currentId !== mobId) return;
    const skill = mob.mana >= 5 && Math.random() < 0.4 ? mob.actives[1] : mob.actives[0] || mob.basicAttack;
    const defender = match.fighters[match.teamA[0]];
    const power = skill.power || 1;
    const raw = Math.max(3, Math.floor((10 + mob.level * 2 + (mob.attrs.forca || 5) * 2) * power - (defender.attrs.defesa || 5)));
    defender.hp = Math.max(0, defender.hp - raw);
    match.log.push({ t: Date.now(), text: `${mob.emoji} ${mob.name} usou **${skill.name}** e causou **${raw}** em ${defender.name}.` });
    match.lastEffect = { type: 'hit', from: mobId, to: defender.id, dmg: raw };
}

function runPlayerMove(match, playerId, { moveId } = {}) {
    const attacker = match.fighters[playerId];
    let skill = null;
    if (moveId === 'basic' || moveId === attacker.basicAttack?.id) skill = { ...attacker.basicAttack };
    else {
        skill = attacker.actives?.find(a => a.id === moveId);
        if (!skill) return { ok: false, error: 'Habilidade não equipada.' };
        if ((attacker.cds[skill.id] || 0) > 0) return { ok: false, error: 'Em recarga.' };
        if (attacker.mana < (skill.mana || 0)) return { ok: false, error: 'Mana insuficiente.' };
        attacker.mana -= skill.mana || 0;
        if (skill.cd) attacker.cds[skill.id] = skill.cd;
    }
    const defender = match.fighters[match.teamB[0]];
    if (skill.type === 'heal') {
        const heal = Math.floor(20 + (attacker.attrs.vida || 10) * 2);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        match.log.push({ t: Date.now(), text: `💚 ${attacker.name} usou **${skill.name}** e curou ${heal}.` });
        return { ok: true };
    }
    const atk = (attacker.attrs.forca || 5) * (skill.type === 'magic' ? 0.8 : 1.2);
    let dmg = Math.max(5, Math.floor((15 + atk * 3) * (skill.power || 1) - (defender.attrs.defesa || 5) * 1.2));
    const crit = Math.random() < 0.12 + (attacker.passMods?.crit || 0);
    if (crit) dmg = Math.floor(dmg * 1.7);
    defender.hp = Math.max(0, defender.hp - dmg);
    match.log.push({ t: Date.now(), text: `⚔️ ${attacker.name} usou **${skill.name || 'Ataque'}** e causou **${dmg}** em ${defender.name}.${crit ? ' 💥 CRÍTICO!' : ''}` });
    match.lastEffect = { type: 'hit', from: playerId, to: defender.id, dmg, crit };
    for (const k of Object.keys(attacker.cds || {})) if (attacker.cds[k] > 0) attacker.cds[k] -= 1;
    return { ok: true };
}

function finishDungeon(match) {
    const userId = match.teamA[0];
    const prog = getProgress(userId);
    if (match.winnerTeam === 'A') {
        if (match.floor > prog.highest) prog.highest = match.floor;
        prog.currentFloor = Math.min(MAX_IMPLEMENTED, match.floor + 1);
        saveProgress(userId, prog);
        const luck = 1 + (match.fighters[userId]?.passMods?.luck || 0);
        const xpGain = Math.floor((25 + match.floor * 12 + Math.random() * 20) * luck);
        xp.addXp(userId, xpGain);
        const drop = rollDungeonDrop(match.floor, luck);
        if (drop) try { player.addItem(userId, drop); } catch (_) {}
        match.log.push({ t: Date.now(), text: `🏆 Piso ${match.floor} limpo! +${xpGain} XP${drop ? ` · drop: ${drop.emoji || ''} ${drop.name}` : ''}` });
        if (match.floor >= MAX_IMPLEMENTED) {
            match.log.push({ t: Date.now(), text: '📜 Limite atual da masmorra (piso 26). A história do Aeternus virá em breve...' });
        }
    } else {
        try {
            const data = store.load('xp.json', {});
            const cur = data[userId] || { xp: 0, level: 0, attrs: {} };
            const newLevel = Math.max(0, Math.floor((cur.level || 0) * 0.8));
            let totalXp = 0;
            for (let lv = 0; lv < newLevel; lv++) totalXp += xp.xpForLevel(lv);
            cur.level = newLevel; cur.xp = totalXp;
            for (const k of Object.keys(cur.attrs || {})) cur.attrs[k] = Math.max(0, Math.floor(Number(cur.attrs[k] || 0) * 0.8));
            data[userId] = cur; store.save('xp.json', data);
            match.log.push({ t: Date.now(), text: '💀 Derrota na masmorra. Você perdeu 20% do nível e dos atributos.' });
        } catch (e) {
            match.log.push({ t: Date.now(), text: 'Erro na penalidade: ' + e.message });
        }
    }
}

function rollDungeonDrop(floor, luck = 1) {
    if (Math.random() > 0.35 * luck) return null;
    try {
        const items = require('./items');
        const rarities = ['comum', 'comum', 'raro', 'epico'];
        if (floor >= 15) rarities.push('lendario');
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        const pool = Object.values(items.ITEMS).filter(it => it.rarity === rarity && !it.consumable);
        if (!pool.length) return null;
        return items.instantiateItem(pool[Math.floor(Math.random() * pool.length)].id);
    } catch (_) { return null; }
}

function applyDungeonMove(matchId, playerId, body) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (match.status !== 'active') return { ok: false, error: 'Já terminou.' };
    if (match.currentId !== playerId) return { ok: false, error: 'Não é seu turno.' };
    const result = runPlayerMove(match, playerId, body);
    if (!result.ok) return result;
    if (match.fighters[match.teamB[0]].hp <= 0) {
        match.status = 'finished'; match.winnerTeam = 'A'; finishDungeon(match);
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    match.currentId = match.teamB[0];
    monsterAiMove(match);
    if (match.fighters[playerId].hp <= 0) {
        match.status = 'finished'; match.winnerTeam = 'B'; finishDungeon(match);
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    match.currentId = playerId;
    match.turnEndsAt = Date.now() + arenaEngine.TURN_MS;
    return { ok: true, match: publicDungeon(match, playerId) };
}

function publicDungeon(match, asUserId) {
    const pf = (f) => ({
        id: f.id, name: f.name, emoji: f.emoji, level: f.level, hp: f.hp, maxHp: f.maxHp,
        mana: f.mana, maxMana: f.maxMana, attrs: f.attrs, photo: f.photo, battleAvatar: f.battleAvatar,
        actives: (f.actives || []).map(a => ({ id: a.id, name: a.name, emoji: a.emoji, mana: a.mana || 0, currentCd: f.cds?.[a.id] || 0, desc: a.desc })),
        passives: f.passives || [], basicAttack: f.basicAttack, isMonster: !!f.isMonster, className: f.className
    });
    return {
        id: match.id, mode: 'dungeon', floor: match.floor, status: match.status, winnerTeam: match.winnerTeam,
        currentId: match.currentId, turnEndsAt: match.turnEndsAt,
        player: pf(match.fighters[match.teamA[0]]), monster: pf(match.fighters[match.teamB[0]]),
        log: match.log.slice(-30), lastEffect: match.lastEffect, maxFloor: MAX_IMPLEMENTED,
        yourTurn: match.currentId === asUserId
    };
}

module.exports = { MAX_IMPLEMENTED, getProgress, startFloor, getDungeonMatch, applyDungeonMove, publicDungeon, floorMonster };
