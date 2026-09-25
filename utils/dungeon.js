/**
 * Masmorra Aeternus — pisos com várias ondas de monstros + boss final.
 * Piso 1: 10–12 monstros + 1 boss. Derrote todos para avançar.
 */
const crypto = require('crypto');
const store = require('./store');
const player = require('./player');
const xp = require('./xp');
const arenaEngine = require('./arenaEngine');
const cp = require('./cp');

const MAX_IMPLEMENTED = 26;

const MONSTER_TEMPLATES = [
    { name: 'Rato de Cripta', emoji: '🐀', type: 'beast' },
    { name: 'Esqueleto Errante', emoji: '💀', type: 'undead' },
    { name: 'Goblin Ladrão', emoji: '👺', type: 'humanoid' },
    { name: 'Lobo Sombrio', emoji: '🐺', type: 'beast' },
    { name: 'Cultista Menor', emoji: '🕯️', type: 'magic' },
    { name: 'Gárgula Rachada', emoji: '🗿', type: 'construct' },
    { name: 'Elemental de Cinzas', emoji: '🔥', type: 'elemental' },
    { name: 'Cavaleiro Caído', emoji: '⚔️', type: 'undead' },
    { name: 'Aranha do Vazio', emoji: '🕷️', type: 'beast' },
    { name: 'Espectro Faminto', emoji: '👻', type: 'undead' },
    { name: 'Ogro do Fosso', emoji: '👹', type: 'brute' },
    { name: 'Mago Renegado', emoji: '🧙', type: 'magic' },
    { name: 'Serpente Rúnica', emoji: '🐍', type: 'beast' },
    { name: 'Guardião de Pedra', emoji: '🛡️', type: 'construct' },
    { name: 'Demoníaco Menor', emoji: '😈', type: 'demon' },
    { name: 'Harpia das Torres', emoji: '🦅', type: 'beast' },
    { name: 'Necromante', emoji: '🖤', type: 'magic' },
    { name: 'Titã Quebrado', emoji: '🦴', type: 'brute' },
    { name: 'Lâmina Maldita', emoji: '🗡️', type: 'undead' },
    { name: 'Fênix Escura', emoji: '🔥', type: 'elemental' },
    { name: 'Bispo Corrompido', emoji: '✝️', type: 'magic' },
    { name: 'Dragãozinho de Cinzas', emoji: '🐉', type: 'dragon' },
    { name: 'Sentinela do Éter', emoji: '✨', type: 'construct' },
    { name: 'Rei Esqueleto', emoji: '👑', type: 'boss' },
    { name: 'Abominação do Poço', emoji: '🧬', type: 'boss' },
    { name: 'Arauto do Piso 26', emoji: '📜', type: 'boss' }
];

const BOSS_NAMES = [
    'Senhor das Trevas',
    'Guardião do Piso',
    'Colosso Ancestral',
    'Rainha das Cinzas',
    'Devorador de Éter'
];

function monstersForFloor(floor) {
    const f = Math.max(1, Number(floor) || 1);
    // piso 1: 10–12; sobe devagar
    const base = 10 + Math.min(6, Math.floor((f - 1) / 3));
    const n = base + Math.floor(Math.random() * 3); // base .. base+2
    return n;
}

function makeMonster(floor, index, isBoss = false) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const tpl = isBoss
        ? {
              name: BOSS_NAMES[f % BOSS_NAMES.length] + ` (P${f})`,
              emoji: '👹',
              type: 'boss'
          }
        : MONSTER_TEMPLATES[(f + index) % MONSTER_TEMPLATES.length];
    const level = Math.floor(f * 3.5 + (isBoss ? 8 : Math.random() * 2) + (isBoss ? 0 : index * 0.1));
    const scale = (1 + f * 0.12) * (isBoss ? 1.85 : 1);
    const attrs = {
        forca: Math.floor((4 + f * 1.4) * (isBoss ? 1.6 : 1)),
        defesa: Math.floor((3 + f * 1.1) * (isBoss ? 1.5 : 1)),
        agilidade: Math.floor((3 + f * 0.9) * (isBoss ? 1.2 : 1)),
        vida: Math.floor((6 + f * 1.5) * (isBoss ? 1.8 : 1))
    };
    const hp = Math.floor((60 + f * 28) * scale * (isBoss ? 2.2 : 1));
    const mana = Math.floor(20 + f * 4);
    return {
        id: (isBoss ? 'boss_' : 'mob_') + f + '_' + index + '_' + crypto.randomBytes(2).toString('hex'),
        name: tpl.name,
        emoji: tpl.emoji,
        type: tpl.type,
        isMonster: true,
        isBoss: !!isBoss,
        level,
        floor: f,
        attrs,
        hp,
        maxHp: hp,
        mana,
        maxMana: mana,
        className: isBoss ? 'Boss' : 'Monstro',
        classId: 'monster',
        actives: [
            {
                id: isBoss ? 'furia_boss' : 'garra',
                name: isBoss ? 'Fúria do Guardião' : 'Garra',
                emoji: isBoss ? '💥' : '🐾',
                type: 'physical',
                mana: isBoss ? 8 : 0,
                cd: isBoss ? 2 : 0,
                power: (isBoss ? 1.45 : 1) + f * 0.02,
                desc: isBoss ? 'Golpe devastador do boss' : 'Ataque selvagem'
            },
            {
                id: isBoss ? 'onda_sombria' : 'rugido',
                name: isBoss ? 'Onda Sombria' : 'Rugido',
                emoji: isBoss ? '🌑' : '📣',
                type: isBoss ? 'magic' : 'physical',
                mana: isBoss ? 12 : 5,
                cd: 2,
                power: (isBoss ? 1.35 : 1.2) + f * 0.02,
                desc: isBoss ? 'Área de escuridão' : 'Ataque poderoso'
            }
        ],
        passives: [],
        passMods: {},
        basicAttack: {
            id: 'basico_mob',
            name: 'Ataque',
            emoji: tpl.emoji,
            type: 'physical',
            power: isBoss ? 1.25 : 1,
            mana: 0
        },
        effects: [],
        cds: {},
        team: 'B',
        photo: null,
        battleAvatar: null
    };
}

function buildWave(floor) {
    const count = monstersForFloor(floor);
    const list = [];
    for (let i = 0; i < count; i++) list.push(makeMonster(floor, i, false));
    list.push(makeMonster(floor, count, true)); // boss no final
    return list;
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

const dungeonMatches = new Map();

function startFloor(userId, floor) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const prog = getProgress(userId);
    if (f > prog.highest + 1) {
        return { ok: false, error: `Você só pode avançar até o piso ${prog.highest + 1}.` };
    }
    const fighter = arenaEngine.loadFighter(userId);
    if (!fighter) return { ok: false, error: 'Crie o perfil primeiro.' };
    fighter.team = 'A';

    const wave = buildWave(f);
    const current = wave[0];
    const id = 'dg_' + crypto.randomBytes(5).toString('hex');
    const match = {
        id,
        mode: 'dungeon',
        floor: f,
        fighters: { [userId]: fighter, [current.id]: current },
        teamA: [userId],
        teamB: [current.id],
        wave,
        waveIndex: 0,
        monstersTotal: wave.length,
        monstersDefeated: 0,
        turnOrder: [userId, current.id],
        turnIndex: 0,
        currentId: userId,
        turnEndsAt: Date.now() + arenaEngine.TURN_MS,
        log: [
            {
                t: Date.now(),
                text: `🏰 Piso ${f}: **${wave.length}** inimigos (${wave.length - 1} monstros + boss). Prepare-se!`
            },
            {
                t: Date.now(),
                text: `⚔️ Inimigo 1/${wave.length}: ${current.emoji} **${current.name}** (Nv.${current.level})`
            }
        ],
        status: 'active',
        winnerTeam: null,
        bet: 0,
        lastEffect: null,
        createdAt: Date.now(),
        dungeon: true,
        canAdvance: false,
        rewards: null
    };
    dungeonMatches.set(id, match);
    return { ok: true, match };
}

function getDungeonMatch(id) {
    return dungeonMatches.get(id) || null;
}

function spawnNextMonster(match) {
    const nextIdx = match.waveIndex + 1;
    if (nextIdx >= match.wave.length) return false;
    const mob = match.wave[nextIdx];
    // remove old mob from fighters
    const oldId = match.teamB[0];
    if (oldId) delete match.fighters[oldId];
    match.fighters[mob.id] = mob;
    match.teamB = [mob.id];
    match.waveIndex = nextIdx;
    match.monstersDefeated = nextIdx;
    const label = mob.isBoss ? 'BOSS' : `Inimigo ${nextIdx + 1}/${match.wave.length}`;
    match.log.push({
        t: Date.now(),
        text: `➡️ ${label}: ${mob.emoji} **${mob.name}** (Nv.${mob.level})${mob.isBoss ? ' — mais forte que os demais!' : ''}`
    });
    match.currentId = match.teamA[0];
    match.turnEndsAt = Date.now() + arenaEngine.TURN_MS;
    return true;
}

function monsterAiMove(match) {
    const mobId = match.teamB[0];
    const mob = match.fighters[mobId];
    if (!mob || mob.hp <= 0) return;
    if (match.currentId !== mobId) return;
    const skill =
        mob.mana >= (mob.actives[1]?.mana || 5) && Math.random() < 0.45
            ? mob.actives[1]
            : mob.actives[0] || mob.basicAttack;
    const playerId = match.teamA[0];
    const defender = match.fighters[playerId];
    const power = skill.power || 1;
    const raw = Math.max(
        3,
        Math.floor(
            (10 + mob.level * 2 + (mob.attrs.forca || 5) * 2) * power -
                (defender.attrs.defesa || 5)
        )
    );
    defender.hp = Math.max(0, defender.hp - raw);
    match.log.push({
        t: Date.now(),
        text: `${mob.emoji} ${mob.name} usou **${skill.name}** e causou **${raw}** em ${defender.name}.`
    });
    match.lastEffect = { type: 'hit', from: mobId, to: playerId, dmg: raw };
}

function runPlayerMove(match, playerId, { moveId } = {}) {
    const attacker = match.fighters[playerId];
    let skill = null;
    if (moveId === 'basic' || moveId === attacker.basicAttack?.id) {
        skill = { ...attacker.basicAttack };
    } else {
        skill = attacker.actives?.find((a) => a.id === moveId);
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
        match.log.push({
            t: Date.now(),
            text: `💚 ${attacker.name} usou **${skill.name}** e curou ${heal}.`
        });
        return { ok: true };
    }

    const atk = (attacker.attrs.forca || 5) * (skill.type === 'magic' ? 0.8 : 1.2);
    const def = defender.attrs.defesa || 5;
    let dmg = Math.max(5, Math.floor((15 + atk * 3) * (skill.power || 1) - def * 1.2));
    const crit = Math.random() < 0.12 + (attacker.passMods?.crit || 0);
    if (crit) dmg = Math.floor(dmg * 1.7);
    defender.hp = Math.max(0, defender.hp - dmg);
    match.log.push({
        t: Date.now(),
        text: `⚔️ ${attacker.name} usou **${skill.name || 'Ataque'}** e causou **${dmg}** em ${defender.name}.${crit ? ' 💥 CRÍTICO!' : ''}`
    });
    match.lastEffect = { type: 'hit', from: playerId, to: defender.id, dmg, crit };

    for (const k of Object.keys(attacker.cds || {})) {
        if (attacker.cds[k] > 0) attacker.cds[k] -= 1;
    }
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
        const xpGain = Math.floor((40 + match.floor * 15 + match.monstersTotal * 4 + Math.random() * 25) * luck);
        const cpGain = 10 + match.floor * 2 + Math.floor(Math.random() * 8);
        xp.addXp(userId, xpGain);
        cp.add(userId, cpGain, { reason: 'dungeon' });
        const drops = [];
        const dropCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < dropCount; i++) {
            const d = rollDungeonDrop(match.floor, luck);
            if (d) {
                try {
                    player.addItem(userId, d);
                    drops.push(d);
                } catch (_) {}
            }
        }
        match.rewards = {
            [userId]: {
                xp: xpGain,
                cp: cpGain,
                items: drops.map((d) => ({ name: d.name, emoji: d.emoji, rarity: d.rarity }))
            }
        };
        match.canAdvance = match.floor < MAX_IMPLEMENTED;
        match.log.push({
            t: Date.now(),
            text: `🏆 Piso ${match.floor} limpo! +${xpGain} XP · +${cpGain} CP · ${drops.length} itens`
        });
    } else {
        match.canAdvance = false;
        match.log.push({
            t: Date.now(),
            text: `💀 Derrota no piso ${match.floor}.`
        });
    }
}

function rollDungeonDrop(floor, luck = 1) {
    if (Math.random() > 0.55 * luck) return null;
    try {
        const items = require('./items');
        const rarities = ['comum', 'comum', 'raro', 'epico'];
        if (floor >= 12) rarities.push('lendario');
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        const pool = Object.values(items.ITEMS).filter((it) => it.rarity === rarity && !it.consumable);
        if (!pool.length) return null;
        return items.instantiateItem(pool[Math.floor(Math.random() * pool.length)].id);
    } catch (_) {
        return null;
    }
}

function applyDungeonMove(matchId, playerId, body) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (match.status !== 'active') return { ok: false, error: 'Já terminou.' };
    if (match.currentId !== playerId) return { ok: false, error: 'Não é seu turno.' };

    const result = runPlayerMove(match, playerId, body);
    if (!result.ok) return result;

    const mob = match.fighters[match.teamB[0]];
    if (mob && mob.hp <= 0) {
        match.log.push({
            t: Date.now(),
            text: `✔️ ${mob.emoji} **${mob.name}** derrotado! (${match.waveIndex + 1}/${match.wave.length})`
        });
        if (spawnNextMonster(match)) {
            // continua o piso
            return { ok: true, match: publicDungeon(match, playerId) };
        }
        // todos mortos
        match.status = 'finished';
        match.winnerTeam = 'A';
        finishDungeon(match);
        return { ok: true, match: publicDungeon(match, playerId) };
    }

    // turno do monstro
    match.currentId = match.teamB[0];
    monsterAiMove(match);
    if (match.fighters[playerId].hp <= 0) {
        match.status = 'finished';
        match.winnerTeam = 'B';
        finishDungeon(match);
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    match.currentId = playerId;
    match.turnEndsAt = Date.now() + arenaEngine.TURN_MS;
    return { ok: true, match: publicDungeon(match, playerId) };
}

function advanceFloor(matchId, userId) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (match.status !== 'finished' || match.winnerTeam !== 'A') {
        return { ok: false, error: 'Só após vencer o piso.' };
    }
    if (!match.canAdvance) return { ok: false, error: 'Não há próximo piso.' };
    if (match.teamA[0] !== userId) return { ok: false, error: 'Não é sua masmorra.' };
    const next = match.floor + 1;
    return startFloor(userId, next);
}

function publicDungeon(match, asUserId) {
    const pf = (f) => ({
        id: f.id,
        name: f.name,
        emoji: f.emoji,
        level: f.level,
        hp: f.hp,
        maxHp: f.maxHp,
        mana: f.mana,
        maxMana: f.maxMana,
        attrs: f.attrs,
        photo: f.photo,
        battleAvatar: f.battleAvatar,
        actives: (f.actives || []).map((a) => ({
            id: a.id,
            name: a.name,
            emoji: a.emoji,
            mana: a.mana || 0,
            currentCd: f.cds?.[a.id] || 0,
            desc: a.desc
        })),
        passives: f.passives || [],
        basicAttack: f.basicAttack,
        isMonster: !!f.isMonster,
        isBoss: !!f.isBoss,
        className: f.className
    });
    return {
        id: match.id,
        mode: 'dungeon',
        floor: match.floor,
        status: match.status,
        winnerTeam: match.winnerTeam,
        currentId: match.currentId,
        turnEndsAt: match.turnEndsAt,
        player: pf(match.fighters[match.teamA[0]]),
        monster: pf(match.fighters[match.teamB[0]]),
        log: match.log.slice(-30),
        lastEffect: match.lastEffect,
        maxFloor: MAX_IMPLEMENTED,
        yourTurn: match.currentId === asUserId,
        waveIndex: match.waveIndex,
        monstersTotal: match.monstersTotal,
        monstersDefeated: match.monstersDefeated,
        canAdvance: !!match.canAdvance,
        rewards: match.rewards || null,
        youWon: match.status === 'finished' && match.winnerTeam === 'A'
    };
}

module.exports = {
    MAX_IMPLEMENTED,
    getProgress,
    startFloor,
    getDungeonMatch,
    applyDungeonMove,
    publicDungeon,
    advanceFloor,
    monstersForFloor
};
