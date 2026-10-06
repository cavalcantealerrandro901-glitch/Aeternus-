/**
 * Masmorra Aeternus — exploração por clique + 19 monstros + boss + armadilhas.
 */
const crypto = require('crypto');
const player = require('./player');
const xp = require('./xp');
const store = require('./store');
const arenaEngine = require('./arenaEngine');

const MAX_IMPLEMENTED = 26;
const MOBS_PER_FLOOR = 19;
const MAP_W = 14;
const MAP_H = 10;
const TURN_MS = arenaEngine.TURN_MS || 90000;

const MOB_POOL = [
    { name: 'Esqueleto', emoji: '💀' },
    { name: 'Zumbi', emoji: '🧟' },
    { name: 'Goblin', emoji: '👺' },
    { name: 'Aranha', emoji: '🕷️' },
    { name: 'Slime', emoji: '🟢' },
    { name: 'Morcego', emoji: '🦇' },
    { name: 'Cultista', emoji: '🧙' },
    { name: 'Lobo', emoji: '🐺' }
];
const BOSS_POOL = [
    { name: 'Rei Esqueleto', emoji: '👑' },
    { name: 'Abominação do Poço', emoji: '🧬' },
    { name: 'Arauto das Trevas', emoji: '📜' },
    { name: 'Guardião do Piso', emoji: '🛡️' }
];
const TRAP_TYPES = ['spike', 'poison', 'fire'];
const dungeonMatches = new Map();

function getProgress(userId) {
    const data = store.load('dungeon_progress.json', {});
    return data[userId] || { highest: 0, currentFloor: 1 };
}
function saveProgress(userId, prog) {
    const data = store.load('dungeon_progress.json', {});
    data[userId] = prog;
    store.save('dungeon_progress.json', data);
}
function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}
function key(x, y) {
    return x + ',' + y;
}
function generateMap(floor) {
    const tiles = [];
    for (let y = 0; y < MAP_H; y++) {
        const row = [];
        for (let x = 0; x < MAP_W; x++) {
            let t = 'floor';
            if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) t = 'wall';
            row.push(t);
        }
        tiles.push(row);
    }
    let seed = floor * 9973 + 13;
    const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    for (let i = 0; i < 12 + Math.min(8, floor); i++) {
        const x = 2 + Math.floor(rnd() * (MAP_W - 4));
        const y = 2 + Math.floor(rnd() * (MAP_H - 4));
        if (tiles[y][x] === 'floor') tiles[y][x] = 'wall';
    }
    for (let x = 1; x < MAP_W - 1; x++) tiles[1][x] = 'floor';
    for (let y = 1; y < MAP_H - 1; y++) tiles[y][1] = 'floor';
    tiles[1][1] = 'floor';
    tiles[MAP_H - 2][MAP_W - 2] = 'exit';
    return tiles;
}
function walkable(tiles, x, y) {
    if (!inBounds(x, y)) return false;
    const t = tiles[y][x];
    return t === 'floor' || t === 'exit' || t === 'trap';
}
function findPath(tiles, sx, sy, gx, gy, blocked) {
    if (!walkable(tiles, gx, gy)) return null;
    if (blocked && blocked.has(key(gx, gy))) return null;
    const q = [[sx, sy]];
    const prev = new Map();
    prev.set(key(sx, sy), null);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
        const [x, y] = q.shift();
        if (x === gx && y === gy) {
            const path = [];
            let cur = key(gx, gy);
            while (cur) {
                const [cx, cy] = cur.split(',').map(Number);
                path.push({ x: cx, y: cy });
                cur = prev.get(cur);
            }
            path.reverse();
            path.shift();
            return path;
        }
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            const k = key(nx, ny);
            if (prev.has(k)) continue;
            if (!walkable(tiles, nx, ny)) continue;
            if (blocked && blocked.has(k) && !(nx === gx && ny === gy)) continue;
            prev.set(k, key(x, y));
            q.push([nx, ny]);
        }
    }
    return null;
}
function makeMonster(floor, index, isBoss) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const pool = isBoss ? BOSS_POOL : MOB_POOL;
    const tpl = pool[index % pool.length];
    const scale = 1 + (f - 1) * 0.12;
    const level = Math.floor(f * 3.5 + (isBoss ? 10 : index * 0.15));
    const attrs = {
        forca: Math.floor((4 + f * 1.4) * (isBoss ? 1.7 : 1) * scale),
        defesa: Math.floor((3 + f * 1.1) * (isBoss ? 1.55 : 1) * scale),
        agilidade: Math.floor((3 + f * 0.9) * (isBoss ? 1.25 : 1)),
        vida: Math.floor((6 + f * 1.5) * (isBoss ? 2 : 1) * scale)
    };
    const hp = Math.floor((55 + f * 26) * (isBoss ? 2.4 : 1) * scale);
    return {
        id: (isBoss ? 'boss_' : 'mob_') + f + '_' + index + '_' + crypto.randomBytes(2).toString('hex'),
        name: tpl.name + (isBoss ? '' : ' ' + (index + 1)),
        emoji: tpl.emoji,
        isBoss: !!isBoss,
        isMonster: true,
        level,
        floor: f,
        attrs,
        hp,
        maxHp: hp,
        mana: 0,
        maxMana: 0,
        team: 'B',
        effects: [],
        cds: {},
        basicAttack: {
            id: isBoss ? 'furia_boss' : 'garra',
            name: isBoss ? 'Fúria do Boss' : 'Garra',
            emoji: isBoss ? '💥' : '🐾',
            type: 'physical',
            power: isBoss ? 1.45 : 1.05,
            mana: 0
        },
        actives: [],
        passives: [],
        passMods: {},
        className: isBoss ? 'Boss' : 'Monstro',
        classId: isBoss ? 'boss' : 'monster',
        x: 0,
        y: 0
    };
}
function placeEntities(tiles, floor) {
    const free = [];
    for (let y = 1; y < MAP_H - 1; y++) {
        for (let x = 1; x < MAP_W - 1; x++) {
            if (tiles[y][x] === 'floor' && !(x === 1 && y === 1)) free.push({ x, y });
        }
    }
    let seed = floor * 4243 + 7;
    const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
    }
    const monsters = [];
    for (let i = 0; i < MOBS_PER_FLOOR && i < free.length; i++) {
        const m = makeMonster(floor, i, false);
        m.x = free[i].x;
        m.y = free[i].y;
        monsters.push(m);
    }
    const traps = [];
    const trapCount = Math.min(4 + Math.floor(floor / 2), 10);
    let ti = MOBS_PER_FLOOR;
    for (let i = 0; i < trapCount && ti < free.length; i++, ti++) {
        const p = free[ti];
        if (tiles[p.y][p.x] !== 'floor') continue;
        tiles[p.y][p.x] = 'trap';
        traps.push({
            x: p.x,
            y: p.y,
            type: TRAP_TYPES[i % TRAP_TYPES.length],
            revealed: false,
            triggered: false
        });
    }
    return { monsters, traps };
}
function startFloor(userId, floor) {
    const f = Math.max(1, Math.min(MAX_IMPLEMENTED, Number(floor) || 1));
    const prog = getProgress(userId);
    if (f > prog.highest + 1) {
        return { ok: false, error: `Você só pode avançar até o piso ${prog.highest + 1}.` };
    }
    const fighter = arenaEngine.loadFighter(userId);
    if (!fighter) return { ok: false, error: 'Crie o perfil primeiro (O.j criar).' };
    fighter.team = 'A';
    fighter.x = 1;
    fighter.y = 1;
    const tiles = generateMap(f);
    const { monsters, traps } = placeEntities(tiles, f);
    const id = 'dg_' + crypto.randomBytes(5).toString('hex');
    const match = {
        id,
        mode: 'dungeon',
        dungeon: true,
        phase: 'explore',
        floor: f,
        tiles,
        width: MAP_W,
        height: MAP_H,
        traps,
        monsters,
        monstersDefeated: 0,
        monstersTarget: MOBS_PER_FLOOR,
        bossSpawned: false,
        bossDefeated: false,
        fighters: { [userId]: fighter },
        teamA: [userId],
        teamB: [],
        combatEnemyId: null,
        turnOrder: [],
        turnIndex: 0,
        currentId: null,
        turnEndsAt: 0,
        log: [
            {
                t: Date.now(),
                text: `🏰 Piso ${f}: explore a masmorra. Derrote **${MOBS_PER_FLOOR}** monstros para invocar o Boss.`
            }
        ],
        status: 'active',
        canAdvance: false,
        rewards: null,
        chat: [],
        lastEffect: null,
        createdAt: Date.now()
    };
    dungeonMatches.set(id, match);
    return { ok: true, match };
}
function getDungeonMatch(id) {
    return dungeonMatches.get(id) || null;
}
function monsterAt(match, x, y) {
    return (match.monsters || []).find((m) => m.hp > 0 && m.x === x && m.y === y) || null;
}
function blockedKeys(match, exceptId) {
    const set = new Set();
    for (const m of match.monsters || []) {
        if (m.hp > 0 && m.id !== exceptId) set.add(key(m.x, m.y));
    }
    return set;
}
function triggerTrap(match, fighter, trap) {
    if (!trap || trap.triggered) return;
    trap.triggered = true;
    trap.revealed = true;
    const f = match.floor || 1;
    let dmg = 0;
    let text = '';
    if (trap.type === 'spike') {
        dmg = Math.floor(8 + f * 6);
        text = `🪤 Espinhos! **${fighter.name}** perde ${dmg} HP.`;
    } else if (trap.type === 'poison') {
        dmg = Math.floor(5 + f * 4);
        fighter.effects = fighter.effects || [];
        fighter.effects.push({ type: 'poison', turns: 3 });
        text = `🪤 Veneno! **${fighter.name}** perde ${dmg} HP e está envenenado.`;
    } else {
        dmg = Math.floor(10 + f * 5);
        text = `🪤 Chamas! **${fighter.name}** perde ${dmg} HP.`;
    }
    fighter.hp = Math.max(1, fighter.hp - dmg);
    match.log.push({ t: Date.now(), text });
}
function startCombat(match, playerId, monster) {
    match.phase = 'combat';
    match.fighters[monster.id] = monster;
    match.teamB = [monster.id];
    match.combatEnemyId = monster.id;
    match.turnOrder = [playerId, monster.id];
    match.turnIndex = 0;
    match.currentId = playerId;
    match.turnEndsAt = Date.now() + TURN_MS;
    match.log.push({
        t: Date.now(),
        text: `⚔️ Combate! ${monster.emoji} **${monster.name}** (Nv.${monster.level})${monster.isBoss ? ' — BOSS' : ''}`
    });
}
function spawnBoss(match) {
    match.bossSpawned = true;
    const boss = makeMonster(match.floor, 99, true);
    boss.x = MAP_W - 3;
    boss.y = MAP_H - 3;
    if (!walkable(match.tiles, boss.x, boss.y)) {
        boss.x = MAP_W - 4;
        boss.y = MAP_H - 4;
    }
    match.monsters.push(boss);
    match.log.push({ t: Date.now(), text: `👑 **${boss.name}** surgiu no piso! Derrote o Boss.` });
}
function applyFloorRewards(match, playerId) {
    const f = match.floor;
    const xpGain = Math.floor(40 + f * 22 + Math.random() * 25);
    const cpGain = Math.floor(6 + f * 2 + Math.random() * 5);
    try {
        xp.addXp(playerId, xpGain);
    } catch (_) {}
    try {
        require('./cp').add(playerId, cpGain, { reason: 'dungeon' });
    } catch (_) {}
    const drops = [];
    try {
        if (typeof arenaEngine.rollPvpItems === 'function') {
            for (const it of arenaEngine.rollPvpItems(1 + f * 0.05).slice(0, 2 + (f > 5 ? 1 : 0))) {
                player.addItem(playerId, it);
                drops.push(it);
            }
        }
    } catch (_) {}
    match.rewards = {
        [playerId]: {
            xp: xpGain,
            cp: cpGain,
            items: drops.map((d) => ({ name: d.name, emoji: d.emoji }))
        }
    };
    match.log.push({
        t: Date.now(),
        text: `🎁 Recompensas: +${xpGain} XP · +${cpGain} CP` + (drops.length ? ` · ${drops.length} itens` : '')
    });
}
function endCombatVictory(match, playerId) {
    const enemyId = match.combatEnemyId;
    const enemy = match.fighters[enemyId];
    if (enemy) {
        enemy.hp = 0;
        match.monsters = (match.monsters || []).filter((m) => m.id !== enemyId);
        if (!enemy.isBoss) {
            match.monstersDefeated = (match.monstersDefeated || 0) + 1;
            try { require('./classAdvancement').recordEvent(playerId, { type: 'monster_defeated', name: enemy.name.replace(/ \\(\\d+\\)$/, ''), boss: false, region: enemy.region || null }); } catch (_) {}
            match.log.push({
                t: Date.now(),
                text: `💀 **${enemy.name}** derrotado. Monstros: **${match.monstersDefeated}/${match.monstersTarget}**`
            });
            if (match.monstersDefeated >= match.monstersTarget && !match.bossSpawned) spawnBoss(match);
        } else {
            match.bossDefeated = true;
            try { require('./classAdvancement').recordEvent(playerId, { type: 'monster_defeated', name: enemy.name, boss: true, region: enemy.region || null }); } catch (_) {}
            match.canAdvance = true;
            match.log.push({
                t: Date.now(),
                text: `👑 Boss derrotado! Piso **${match.floor}** concluído.`
            });
            applyFloorRewards(match, playerId);
            try { require('./classAdvancement').recordEvent(playerId, { type: 'dungeon_floor', floor: match.floor }); } catch (_) {}
            const prog = getProgress(playerId);
            if (match.floor > prog.highest) prog.highest = match.floor;
            prog.currentFloor = Math.min(MAX_IMPLEMENTED, match.floor + 1);
            saveProgress(playerId, prog);
        }
    }
    match.phase = 'explore';
    match.combatEnemyId = null;
    match.teamB = [];
    if (enemyId) delete match.fighters[enemyId];
    match.currentId = null;
    match.turnOrder = [];
}
function walkTo(matchId, playerId, tx, ty) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (match.status !== 'active') return { ok: false, error: 'Masmorra encerrada.' };
    if (match.phase === 'combat') return { ok: false, error: 'Termine o combate primeiro.' };
    if (!match.teamA.includes(playerId)) return { ok: false, error: 'Você não está nesta run.' };
    const fighter = match.fighters[playerId];
    if (!fighter || fighter.hp <= 0) return { ok: false, error: 'Você está incapacitado.' };
    tx = Math.floor(Number(tx));
    ty = Math.floor(Number(ty));
    if (!inBounds(tx, ty)) return { ok: false, error: 'Fora do mapa.' };
    if (match.tiles[ty][tx] === 'exit') {
        if (!match.bossDefeated) return { ok: false, error: 'A saída está selada. Derrote o Boss primeiro.' };
        match.status = 'finished';
        match.phase = 'finished';
        match.log.push({ t: Date.now(), text: `🚪 **${fighter.name}** saiu pelo portal.` });
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    const targetMob = monsterAt(match, tx, ty);
    const blocked = blockedKeys(match, targetMob?.id);
    const path = findPath(match.tiles, fighter.x, fighter.y, tx, ty, blocked);
    if (!path || !path.length) {
        if (fighter.x === tx && fighter.y === ty) return { ok: true, match: publicDungeon(match, playerId) };
        return { ok: false, error: 'Caminho bloqueado.' };
    }
    for (const step of path.slice(0, 12)) {
        fighter.x = step.x;
        fighter.y = step.y;
        const trap = (match.traps || []).find((t) => t.x === step.x && t.y === step.y && !t.triggered);
        if (trap) triggerTrap(match, fighter, trap);
        const mob = monsterAt(match, step.x, step.y);
        if (mob) {
            startCombat(match, playerId, mob);
            break;
        }
    }
    return { ok: true, match: publicDungeon(match, playerId) };
}
function combatMove(matchId, playerId, { moveId } = {}) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (match.phase !== 'combat') return { ok: false, error: 'Não há combate ativo.' };
    if (match.currentId !== playerId) return { ok: false, error: 'Não é o seu turno.' };
    const attacker = match.fighters[playerId];
    const enemy = match.fighters[match.combatEnemyId];
    if (!attacker || !enemy) return { ok: false, error: 'Combate inválido.' };
    let skill = null;
    if (moveId === 'basic' || moveId === attacker.basicAttack?.id) {
        skill = { ...attacker.basicAttack, power: attacker.basicAttack?.power || 1 };
    } else {
        skill = attacker.actives?.find((a) => a.id === moveId);
        if (!skill) return { ok: false, error: 'Habilidade não equipada.' };
        if ((attacker.cds?.[skill.id] || 0) > 0) return { ok: false, error: 'Em recarga.' };
        if ((attacker.mana || 0) < (skill.mana || 0)) return { ok: false, error: 'Mana insuficiente.' };
        attacker.mana -= skill.mana || 0;
        if (skill.cd) attacker.cds[skill.id] = skill.cd;
    }
    if (skill.type === 'heal') {
        const heal = Math.floor(18 + (attacker.attrs.vida || 10) * 2.5);
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        match.log.push({ t: Date.now(), text: `💚 ${attacker.name} recuperou ${attacker.hp - before} HP.` });
    } else {
        const atk = attacker.attrs.forca || 5;
        const def = enemy.attrs.defesa || 3;
        let dmg = Math.max(4, Math.floor((14 + atk * 3.1) * (skill.power || 1) - def * 1.2));
        if (Math.random() < 0.1) dmg = Math.floor(dmg * 1.7);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        match.log.push({
            t: Date.now(),
            text: `⚔️ ${attacker.name} usou **${skill.name}** → **${dmg}** em ${enemy.name}.`
        });
        match.lastEffect = { type: 'hit', dmg, from: playerId, to: enemy.id };
    }
    if (enemy.hp <= 0) {
        endCombatVictory(match, playerId);
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    const matk = enemy.attrs.forca || 4;
    const mdef = attacker.attrs.defesa || 3;
    const mdmg = Math.max(3, Math.floor(10 + matk * 2.6 - mdef * 1.1));
    attacker.hp = Math.max(0, attacker.hp - mdmg);
    match.log.push({
        t: Date.now(),
        text: `${enemy.emoji} ${enemy.name} atacou → **${mdmg}** em ${attacker.name}.`
    });
    if (attacker.hp <= 0) {
        match.status = 'finished';
        match.phase = 'finished';
        match.log.push({ t: Date.now(), text: `💀 **${attacker.name}** caiu. Masmorra falhou.` });
        return { ok: true, match: publicDungeon(match, playerId) };
    }
    match.currentId = playerId;
    match.turnEndsAt = Date.now() + TURN_MS;
    for (const k of Object.keys(attacker.cds || {})) if (attacker.cds[k] > 0) attacker.cds[k] -= 1;
    return { ok: true, match: publicDungeon(match, playerId) };
}
function applyDungeonMove(matchId, playerId, body = {}) {
    if (body.x != null && body.y != null) return walkTo(matchId, playerId, body.x, body.y);
    if (body.moveId) return combatMove(matchId, playerId, { moveId: body.moveId });
    return { ok: false, error: 'Informe destino (x,y) ou moveId.' };
}
function advanceFloor(matchId, playerId) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (!match.canAdvance && !match.bossDefeated) {
        return { ok: false, error: 'Derrote o Boss para avançar.' };
    }
    return startFloor(playerId, Math.min(MAX_IMPLEMENTED, match.floor + 1));
}
function leaveDungeon(matchId, playerId) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (!match.teamA.includes(playerId)) return { ok: false, error: 'Você não está nesta run.' };
    match.status = 'finished';
    match.phase = 'finished';
    match.log.push({ t: Date.now(), text: '🚪 Jogador saiu da masmorra.' });
    return { ok: true, match: publicDungeon(match, playerId) };
}
function postDungeonChat(matchId, playerId, text) {
    const match = getDungeonMatch(matchId);
    if (!match) return { ok: false, error: 'Masmorra não encontrada.' };
    if (!match.fighters[playerId] && !match.teamA.includes(playerId)) {
        return { ok: false, error: 'Você não está nesta run.' };
    }
    const msg = String(text || '').trim().slice(0, 300);
    if (!msg) return { ok: false, error: 'Mensagem vazia.' };
    if (!match.chat) match.chat = [];
    const name = match.fighters[playerId]?.name || 'Jogador';
    match.chat.push({ from: playerId, name, text: msg, t: Date.now() });
    if (match.chat.length > 100) match.chat = match.chat.slice(-100);
    return { ok: true, chat: match.chat.slice(-80) };
}
function objectiveText(match) {
    if (match.phase === 'finished' || match.status === 'finished') {
        return match.bossDefeated ? '✓ Piso concluído' : 'Masmorra encerrada';
    }
    if (match.bossSpawned && !match.bossDefeated) return '👑 Derrote o Boss';
    if ((match.monstersDefeated || 0) >= match.monstersTarget) return '👑 Derrote o Boss';
    return `👹 Monstros ${match.monstersDefeated || 0} / ${match.monstersTarget}`;
}
function publicDungeon(match, asUserId) {
    const me = match.fighters[asUserId] || null;
    const enemy = match.combatEnemyId ? match.fighters[match.combatEnemyId] : null;
    return {
        id: match.id,
        mode: 'dungeon',
        dungeon: true,
        phase: match.phase,
        status: match.status,
        floor: match.floor,
        width: match.width,
        height: match.height,
        tiles: match.tiles,
        traps: (match.traps || []).map((t) => ({
            x: t.x,
            y: t.y,
            type: t.revealed || t.triggered ? t.type : 'unknown',
            revealed: !!(t.revealed || t.triggered),
            triggered: !!t.triggered
        })),
        monsters: (match.monsters || [])
            .filter((m) => m.hp > 0)
            .map((m) => ({
                id: m.id,
                name: m.name,
                emoji: m.emoji,
                x: m.x,
                y: m.y,
                hp: m.hp,
                maxHp: m.maxHp,
                isBoss: !!m.isBoss,
                level: m.level
            })),
        player: me
            ? {
                  id: me.id,
                  name: me.name,
                  emoji: me.emoji,
                  className: me.className,
                  level: me.level,
                  x: me.x,
                  y: me.y,
                  hp: me.hp,
                  maxHp: me.maxHp,
                  mana: me.mana,
                  maxMana: me.maxMana,
                  attrs: me.attrs,
                  basicAttack: me.basicAttack,
                  actives: (me.actives || []).map((a) => ({
                      id: a.id,
                      name: a.name,
                      emoji: a.emoji,
                      mana: a.mana,
                      cd: a.cd,
                      currentCd: me.cds?.[a.id] || 0,
                      desc: a.desc
                  })),
                  unique: (me.unique || []).map((a) => ({
                      id: a.id, name: a.name, emoji: a.emoji, mana: a.mana, cd: a.cd,
                      currentCd: me.cds?.[a.id] || 0, desc: a.desc
                  })),
                  passives: (me.passives || []).map((a) => ({
                      id: a.id, name: a.name, emoji: a.emoji, desc: a.desc
                  })),
                  items: (me.equippedItems || []).map((it) => ({
                      slot: it.slot, id: it.id, name: it.name, emoji: it.emoji,
                      rarity: it.rarity, desc: it.desc
                  }))
              }
            : null,
        combat:
            match.phase === 'combat'
                ? {
                      enemy: enemy
                          ? {
                                id: enemy.id,
                                name: enemy.name,
                                emoji: enemy.emoji,
                                hp: enemy.hp,
                                maxHp: enemy.maxHp,
                                level: enemy.level,
                                isBoss: !!enemy.isBoss,
                                attrs: enemy.attrs || {},
                                className: enemy.className || (enemy.isBoss ? 'Boss' : 'Monstro')
                            }
                          : null,
                      currentId: match.currentId,
                      turnEndsAt: match.turnEndsAt,
                      yourTurn: match.currentId === asUserId
                  }
                : null,
        progress: {
            monstersDefeated: match.monstersDefeated || 0,
            monstersTarget: match.monstersTarget || MOBS_PER_FLOOR,
            bossSpawned: !!match.bossSpawned,
            bossDefeated: !!match.bossDefeated,
            canAdvance: !!match.canAdvance
        },
        log: (match.log || []).slice(-40),
        chat: (match.chat || []).slice(-80),
        rewards: match.rewards || null,
        objective: objectiveText(match)
    };
}

function getMissionSources() {
    return {
        monsters: MOB_POOL.map((m) => m.name),
        bosses: BOSS_POOL.map((m) => m.name),
        regions: [...new Set(MOB_POOL.flatMap((m) => Array.isArray(m.regions) ? m.regions : (m.region ? [m.region] : [])))],
        floors: Array.from({ length: MAX_IMPLEMENTED }, (_, i) => i + 1)
    };
}

module.exports = {
    MAX_IMPLEMENTED,
    MOBS_PER_FLOOR,
    getProgress,
    saveProgress,
    startFloor,
    getDungeonMatch,
    applyDungeonMove,
    walkTo,
    combatMove,
    advanceFloor,
    leaveDungeon,
    postDungeonChat,
    publicDungeon
};
