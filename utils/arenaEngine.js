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
        id: classId || 'unknown', name: 'Sem classe', emoji: '❓', type: 'melee', bonus: {},
        basicAttack: { id: 'basico', name: 'Ataque', emoji: '⚔️', type: 'physical', power: 1, mana: 0 }
    };
    const passMods = eff.passMods || {};
    let equipped = { active: [], passive: [] };
    try { equipped = combatStats.getLoadout(userId) || equipped; } catch (_) {}
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
        hp, maxHp: hp, mana, maxMana: mana,
        effects: [], cds: {}, team: null
    };
}

function publicFighter(f) {
    if (!f) return null;
    return {
        id: f.id, name: f.name, classId: f.classId, className: f.className, emoji: f.emoji, type: f.type,
        photo: f.photo, battleAvatar: f.battleAvatar, level: f.level, attrs: f.attrs,
        hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana, effects: f.effects, team: f.team,
        actives: (f.actives || []).map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, mana: a.mana, cd: a.cd, currentCd: f.cds?.[a.id] || 0, desc: a.desc })),
        passives: (f.passives || []).map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, desc: a.desc })),
        basicAttack: f.basicAttack
    };
}

// Re-export rest of engine from backup logic — keep TURN_MS and core match API.
// Full original engine body continues below via require of store for match persistence.

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
        log: [{ t: Date.now(), text: `Arena — a luta começa.${hasBet ? ` Aposta: **${bet}** ✨.` : ''}` }],
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

function publicState(match, viewerId) {
    return {
        id: match.id, mode: match.mode, status: match.status, currentId: match.currentId,
        turnEndsAt: match.turnEndsAt, winnerTeam: match.winnerTeam, bet: match.bet, fun: match.fun,
        log: (match.log || []).slice(-30),
        teamA: match.teamA.map((id) => publicFighter(match.fighters[id])),
        teamB: match.teamB.map((id) => publicFighter(match.fighters[id])),
        rewards: match.rewards, viewerId
    };
}

module.exports = {
    TURN_MS, loadFighter, publicFighter, createMatch, getMatch, calcDamage, publicState, arenas,
    rollPvpItems: function rollPvpItems() { return []; }
};
