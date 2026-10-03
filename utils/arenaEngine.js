/**
 * Motor de arena Aeternus — 1v1 / equipes, turnos longos, efeitos.
 */
const crypto = require('crypto');
const player = require('./player');
const xp = require('./xp');
const classes = require('./classes');
const abilities = require('./abilities');
const store = require('./store');
const combatStats = require('./combatStats');

const TURN_MS = 90000;
const arenas = new Map();

function maxHp(attrs, level) {
    return Math.floor(80 + (attrs.vida || 10) * 35 + (attrs.defesa || 5) * 8 + (level || 0) * 12);
}
function maxMana(level, classId, manaBonus) {
    const base = player.maxManaFromLevel(level, classes.resolveClassId(classId));
    return Math.floor(base * (1 + (manaBonus || 0)));
}

function loadFighter(userId) {
    const prof = player.get(userId);
    if (!prof) return null;
    const eff = combatStats.getEffectiveAttrs(userId);
    const attrs = { ...(eff.attrs || {}) };
    const classId = eff.classId || classes.resolveClassId(prof.classId);
    const cls = eff.cls || (classId && classes.getClass(classId)) || {
        id: classId || 'unknown',
        name: 'Sem classe',
        emoji: '❓',
        type: 'melee',
        bonus: {},
        basicAttack: { id: 'basico', name: 'Ataque', emoji: '⚔️', type: 'physical', power: 1, mana: 0 }
    };
    const passMods = eff.passMods || {};
    let equipped = { active: [], passive: [] };
    try {
        equipped = combatStats.getLoadout(userId) || equipped;
    } catch (_) {}
    const stLevel = eff.level || 0;
    const hp = maxHp(attrs, stLevel);
    const mana = maxMana(stLevel, classId, (passMods.manaBonus || 0) + (eff.extra?.manaBonus || 0));
    return {
        id: userId,
        name: prof.name || 'Guerreiro',
        classId: classId || cls.id,
        className: cls.name || 'Sem classe',
        emoji: cls.emoji || '❓',
        type: cls.type || 'melee',
        photo: player.getBattlePhoto?.(userId),
        battleAvatar: player.getBattleAvatar?.(userId),
        level: stLevel || 0,
        attrs,
        passMods,
        actives: (equipped.active || []).filter(Boolean),
        passives: (equipped.passive || []).filter(Boolean),
        basicAttack: cls.basicAttack || { id: 'basico', name: 'Ataque', emoji: '⚔️', type: 'physical', power: 1, mana: 0 },
        hp,
        maxHp: hp,
        mana,
        maxMana: mana,
        effects: [],
        cds: {},
        team: null
    };
}

function publicFighter(f) {
    if (!f) return null;
    return {
        id: f.id,
        name: f.name,
        classId: f.classId,
        className: f.className,
        emoji: f.emoji,
        type: f.type,
        photo: f.photo,
        battleAvatar: f.battleAvatar,
        level: f.level,
        attrs: f.attrs,
        hp: f.hp,
        maxHp: f.maxHp,
        mana: f.mana,
        maxMana: f.maxMana,
        effects: f.effects,
        team: f.team,
        actives: (f.actives || []).map((a) => ({
            id: a.id, name: a.name, emoji: a.emoji, mana: a.mana, cd: a.cd,
            currentCd: f.cds?.[a.id] || 0, desc: a.desc
        })),
        passives: (f.passives || []).map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, desc: a.desc })),
        basicAttack: f.basicAttack
    };
}

function createMatch({ mode = '1v1', teamA = [], teamB = [], bet = 0, fun = false } = {}) {
    const id = crypto.randomBytes(6).toString('hex');
    const fighters = {};
    for (const uid of teamA) { const f = loadFighter(uid); if (f) { f.team = 'A'; fighters[uid] = f; } }
    for (const uid of teamB) { const f = loadFighter(uid); if (f) { f.team = 'B'; fighters[uid] = f; } }
    const aIds = Object.values(fighters).filter((f) => f.team === 'A').map((f) => f.id);
    const bIds = Object.values(fighters).filter((f) => f.team === 'B').map((f) => f.id);
    if (!aIds.length || !bIds.length) return { ok: false, error: 'Times incompletos ou sem perfil.' };
    if (aIds.length !== bIds.length) return { ok: false, error: 'Equipes devem ter o mesmo número de jogadores.' };
    const isTeam = aIds.length > 1;
    const hasBet = Number(bet) > 0;
    let resolvedMode = mode;
    if (fun) resolvedMode = isTeam ? 'equipe_diversao' : 'diversao';
    else if (hasBet && isTeam) resolvedMode = 'equipe_aposta';
    else if (hasBet) resolvedMode = 'aposta';
    else if (isTeam) resolvedMode = 'equipe';
    else resolvedMode = mode === 'diversao' ? 'diversao' : '1v1';
    const turnOrder = [...aIds, ...bIds];
    const match = {
        id, mode: resolvedMode, fun: !!fun || resolvedMode.includes('diversao'),
        fighters, teamA: aIds, teamB: bIds, turnOrder, turnIndex: 0, currentId: turnOrder[0],
        turnEndsAt: Date.now() + TURN_MS,
        log: [{ t: Date.now(), text: `Arena aberta.${hasBet ? ` Aposta: **${bet}** ✨.` : ''}` }],
        status: 'active', winnerTeam: null, bet: Number(bet) || 0, lastEffect: null,
        createdAt: Date.now(), rewards: null, chat: []
    };
    arenas.set(id, match);
    return { ok: true, match };
}

function getMatch(id) { return arenas.get(id) || null; }
function aliveOnTeam(match, team) {
    return (team === 'A' ? match.teamA : match.teamB).filter((id) => match.fighters[id]?.hp > 0);
}

function applyDotAndRegen(fighter) {
    const logs = [];
    const next = [];
    for (const e of fighter.effects || []) {
        if (e.type === 'burn') {
            const dmg = Math.floor(fighter.maxHp * 0.04);
            fighter.hp = Math.max(0, fighter.hp - dmg);
            logs.push(`${fighter.name} queima e perde ${dmg} de vida.`);
        } else if (e.type === 'poison') {
            const dmg = Math.floor(fighter.maxHp * 0.03);
            fighter.hp = Math.max(0, fighter.hp - dmg);
            logs.push(`${fighter.name} sofre ${dmg} de veneno.`);
        }
        e.turns -= 1;
        if (e.turns > 0) next.push(e);
    }
    fighter.effects = next;
    const regen = fighter.passMods?.regenPct || 0;
    if (regen > 0 && fighter.hp > 0) {
        const h = Math.floor(fighter.maxHp * regen);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + h);
        if (h > 0) logs.push(`${fighter.name} regenera ${h} de vida.`);
    }
    if (fighter.passMods?.manaRegen || fighter.passMods?.manaRegenPerTurn) {
        const r = fighter.passMods.manaRegen || fighter.passMods.manaRegenPerTurn || 0;
        fighter.mana = Math.min(fighter.maxMana, fighter.mana + r);
    }
    for (const k of Object.keys(fighter.cds || {})) if (fighter.cds[k] > 0) fighter.cds[k] -= 1;
    return logs;
}

function calcDamage(attacker, defender, skill) {
    const atkAttr =
        skill.type === 'magic' || skill.type === 'heal'
            ? (attacker.attrs.inteligencia || 5) * 1.1 + (attacker.attrs.forca || 5) * 0.25 + (attacker.level || 0) * 1.0
            : (attacker.attrs.forca || 5) * 1.1 + (attacker.attrs.agilidade || 5) * 0.3;
    const defAttr = (defender.attrs.defesa || 5) + (defender.attrs.resistencia || 0) * 0.35 + (defender.attrs.vida || 5) * 0.1;
    let power = skill.power || 1;
    if (attacker.effects?.some((e) => e.type === 'rage')) power *= 1.25;
    let raw = Math.max(4, (12 + atkAttr * 3.2) * power - defAttr * 1.4);
    if (skill.type === 'physical') raw *= 1 + (attacker.passMods?.physPower || 0);
    if (skill.type === 'magic') raw *= 1 + (attacker.passMods?.magicPower || 0);
    let reduce = 0;
    if (skill.type === 'physical') reduce += defender.passMods?.dmgReducePhys || 0;
    if (skill.type === 'magic') reduce += defender.passMods?.dmgReduceMag || 0;
    if (defender.effects?.some((e) => e.type === 'barrier')) reduce += 0.35;
    if (defender.effects?.some((e) => e.type === 'shield')) reduce += 0.25;
    raw *= Math.max(0.2, 1 - reduce);
    const critChance =
        0.08 + (attacker.passMods?.crit || 0) + (skill.critBonus || 0) +
        (attacker.attrs.agilidade || 0) * 0.002 +
        (attacker.attrs.precisao || 0) * 0.0004 +
        (attacker.attrs.sorte || 0) * 0.0003;
    const crit = Math.random() < Math.min(0.45, critChance);
    if (crit) raw *= 1.75;
    const dodge = Math.max(0, (defender.passMods?.dodge || 0) - (attacker.passMods?.accuracy || 0));
    if (Math.random() < dodge) return { dmg: 0, crit: false, dodged: true };
    return { dmg: Math.floor(raw), crit, dodged: false };
}

function pickTarget(match, attacker, explicitTarget) {
    const enemyTeam = attacker.team === 'A' ? match.teamB : match.teamA;
    const alive = enemyTeam.filter((id) => match.fighters[id]?.hp > 0);
    if (!alive.length) return null;
    if (explicitTarget && alive.includes(explicitTarget)) return match.fighters[explicitTarget];
    return match.fighters[alive[Math.floor(Math.random() * alive.length)]];
}

function advanceTurn(match) {
    const n = match.turnOrder.length;
    for (let i = 0; i < n; i++) {
        match.turnIndex = (match.turnIndex + 1) % n;
        const id = match.turnOrder[match.turnIndex];
        if (match.fighters[id]?.hp > 0) {
            match.currentId = id;
            match.turnEndsAt = Date.now() + TURN_MS;
            for (const t of applyDotAndRegen(match.fighters[id])) match.log.push({ t: Date.now(), text: t });
            return;
        }
    }
}

function checkEnd(match) {
    const aAlive = aliveOnTeam(match, 'A');
    const bAlive = aliveOnTeam(match, 'B');
    if (!aAlive.length || !bAlive.length) {
        match.status = 'finished';
        match.winnerTeam = aAlive.length ? 'A' : 'B';
        match.log.push({ t: Date.now(), text: `🏆 Time ${match.winnerTeam} venceu!` });
        return true;
    }
    return false;
}

function processTimeout(match) {
    if (!match || match.status !== 'active') return false;
    if (Date.now() <= (match.turnEndsAt || 0)) return false;
    let steps = 0;
    while (match.status === 'active' && Date.now() > (match.turnEndsAt || 0) && steps < 8) {
        const cur = match.fighters[match.currentId];
        match.log.push({ t: Date.now(), text: `⏱️ Tempo de **${cur?.name || 'Jogador'}** esgotado.` });
        if (checkEnd(match)) return true;
        advanceTurn(match);
        steps += 1;
    }
    return steps > 0;
}

function applyMove(matchId, playerId, { moveId, targetId } = {}) {
    const match = getMatch(matchId);
    if (!match) return { ok: false, error: 'Arena não encontrada.' };
    if (match.status !== 'active') return { ok: false, error: 'Batalha já terminou.' };
    processTimeout(match);
    if (match.status !== 'active') return { ok: true, match: publicState(match, playerId) };
    if (match.currentId !== playerId) return { ok: false, error: 'Não é o seu turno.' };
    const attacker = match.fighters[playerId];
    if (!attacker || attacker.hp <= 0) return { ok: false, error: 'Você está fora de combate.' };

    let skill = null;
    if (moveId === 'basic' || moveId === attacker.basicAttack?.id) {
        skill = { ...attacker.basicAttack, power: attacker.basicAttack?.power || 1 };
    } else {
        skill = attacker.actives?.find((a) => a.id === moveId);
        if (!skill) return { ok: false, error: 'Habilidade não equipada.' };
        if ((attacker.cds[skill.id] || 0) > 0) return { ok: false, error: 'Em recarga.' };
        if (attacker.mana < (skill.mana || 0)) return { ok: false, error: 'Mana insuficiente.' };
    }

    if (attacker.effects?.some((e) => e.type === 'stun')) {
        match.log.push({ t: Date.now(), text: `💫 ${attacker.name} está atordoado!` });
        attacker.effects = attacker.effects.filter((e) => e.type !== 'stun');
        advanceTurn(match);
        return { ok: true, match: publicState(match, playerId) };
    }

    attacker.mana -= skill.mana || 0;
    if (skill.cd) attacker.cds[skill.id] = skill.cd;

    if (skill.type === 'heal' || skill.self) {
        if (skill.type === 'heal') {
            const heal = Math.floor((18 + (attacker.attrs.vida || 10) * 2.5 + attacker.level) * (skill.power || 1));
            const before = attacker.hp;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            match.log.push({ t: Date.now(), text: `💚 ${attacker.name} usou **${skill.name}** (+${attacker.hp - before} HP).` });
        } else if (skill.effect) {
            attacker.effects = attacker.effects.filter((e) => e.type !== skill.effect);
            attacker.effects.push({ type: skill.effect, turns: skill.effectTurns || 2 });
            match.log.push({ t: Date.now(), text: `✨ ${attacker.name} usou **${skill.name}**.` });
        }
    } else {
        const targets = [];
        if (skill.aoe) {
            const enemyTeam = attacker.team === 'A' ? match.teamB : match.teamA;
            for (const id of enemyTeam) if (match.fighters[id]?.hp > 0) targets.push(match.fighters[id]);
        } else {
            const t = pickTarget(match, attacker, targetId);
            if (t) targets.push(t);
        }
        if (!targets.length) return { ok: false, error: 'Sem alvos.' };
        for (const defender of targets) {
            const result = calcDamage(attacker, defender, skill);
            if (result.dodged) {
                match.log.push({ t: Date.now(), text: `🌀 ${defender.name} esquivou de **${skill.name}**!` });
                continue;
            }
            defender.hp = Math.max(0, defender.hp - result.dmg);
            match.log.push({
                t: Date.now(),
                text: `⚔️ ${attacker.name} **${skill.name}** → **${result.dmg}**${result.crit ? ' CRIT' : ''} em ${defender.name}.`
            });
        }
    }

    if (checkEnd(match)) return { ok: true, match: publicState(match, playerId) };
    advanceTurn(match);
    return { ok: true, match: publicState(match, playerId) };
}

function publicState(match, viewerId) {
    return {
        id: match.id, mode: match.mode, status: match.status, currentId: match.currentId,
        turnEndsAt: match.turnEndsAt, winnerTeam: match.winnerTeam, bet: match.bet, fun: match.fun,
        log: (match.log || []).slice(-40),
        teamA: match.teamA.map((id) => publicFighter(match.fighters[id])),
        teamB: match.teamB.map((id) => publicFighter(match.fighters[id])),
        rewards: match.rewards, viewerId
    };
}

function rollPvpItems() { return []; }

module.exports = {
    TURN_MS, loadFighter, publicFighter, createMatch, getMatch, applyMove,
    processTimeout, publicState, calcDamage, rollPvpItems, arenas
};
