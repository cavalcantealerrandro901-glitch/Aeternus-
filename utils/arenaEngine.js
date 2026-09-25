/**
 * Motor de arena Aeternus — 1v1 / equipes, turnos longos, efeitos.
 */
const crypto = require('crypto');
const player = require('./player');
const xp = require('./xp');
const classes = require('./classes');
const abilities = require('./abilities');
const store = require('./store');

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
    const st = xp.get(userId) || { level: 0, attrs: {} };
    const attrs = { ...(st.attrs || {}) };
    const classId = classes.resolveClassId(prof.classId);
    const cls = (classId && classes.getClass(classId)) || {
        id: classId || 'unknown',
        name: 'Sem classe',
        emoji: '❓',
        type: 'melee',
        bonus: {},
        basicAttack: { id: 'basico', name: 'Ataque', emoji: '⚔️', type: 'physical', power: 1, mana: 0 }
    };
    for (const [k, v] of Object.entries(cls.bonus || {})) attrs[k] = (attrs[k] || 0) + Number(v || 0);
    // defaults se attrs vazios
    for (const k of ['forca', 'defesa', 'agilidade', 'vida']) {
        if (attrs[k] == null) attrs[k] = k === 'vida' ? 10 : 5;
    }
    try {
        const eq = player.getEquipmentBonuses?.(userId) || {};
        for (const [k, v] of Object.entries(eq)) if (typeof v === 'number') attrs[k] = (attrs[k] || 0) + v;
    } catch (_) {}
    let passMods = {};
    let equipped = { active: [], passive: [] };
    try {
        passMods = abilities.sumPassiveMods?.(userId) || {};
        equipped = abilities.getEquippedAbilities?.(userId) || equipped;
    } catch (_) {}
    const hp = maxHp(attrs, st.level);
    const mana = maxMana(st.level, classId, passMods.manaBonus);
    return {
        id: userId,
        name: prof.name || 'Guerreiro',
        classId: classId || cls.id,
        className: cls.name || 'Sem classe',
        emoji: cls.emoji || '❓',
        type: cls.type || 'melee',
        photo: player.getBattlePhoto?.(userId),
        battleAvatar: player.getBattleAvatar?.(userId),
        level: st.level || 0,
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
        id: f.id, name: f.name, classId: f.classId, className: f.className, emoji: f.emoji, type: f.type,
        photo: f.photo, battleAvatar: f.battleAvatar, level: f.level, attrs: f.attrs,
        hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana, effects: f.effects, team: f.team,
        actives: (f.actives || []).map(a => ({ id: a.id, name: a.name, emoji: a.emoji, mana: a.mana, cd: a.cd, currentCd: f.cds?.[a.id] || 0, desc: a.desc })),
        passives: (f.passives || []).map(a => ({ id: a.id, name: a.name, emoji: a.emoji, desc: a.desc })),
        basicAttack: f.basicAttack
    };
}

function createMatch({ mode = '1v1', teamA = [], teamB = [], bet = 0, fun = false } = {}) {
    const id = crypto.randomBytes(6).toString('hex');
    const fighters = {};
    for (const uid of teamA) {
        const f = loadFighter(uid);
        if (f) {
            f.team = 'A';
            fighters[uid] = f;
        }
    }
    for (const uid of teamB) {
        const f = loadFighter(uid);
        if (f) {
            f.team = 'B';
            fighters[uid] = f;
        }
    }
    const aIds = Object.values(fighters).filter((f) => f.team === 'A').map((f) => f.id);
    const bIds = Object.values(fighters).filter((f) => f.team === 'B').map((f) => f.id);
    if (!aIds.length || !bIds.length) return { ok: false, error: 'Times incompletos ou sem perfil.' };
    if (aIds.length !== bIds.length) {
        return { ok: false, error: 'Equipes devem ter o mesmo número de jogadores.' };
    }

    const isTeam = aIds.length > 1;
    const hasBet = Number(bet) > 0;
    let resolvedMode = mode;
    if (fun) resolvedMode = isTeam ? 'equipe_diversao' : 'diversao';
    else if (hasBet && isTeam) resolvedMode = 'equipe_aposta';
    else if (hasBet) resolvedMode = 'aposta';
    else if (isTeam) resolvedMode = 'equipe';
    else resolvedMode = mode === 'diversao' ? 'diversao' : '1v1';

    const labels = {
        diversao: '🎮 Diversão 1v1',
        aposta: '💰 Aposta 1v1',
        equipe: '🛡️ Equipes',
        equipe_aposta: '💰🛡️ Equipes + Aposta',
        equipe_diversao: '🎮🛡️ Equipes (diversão)',
        '1v1': '⚔️ 1v1'
    };
    const title = labels[resolvedMode] || '⚔️ Arena';

    const turnOrder = [...aIds, ...bIds];
    const match = {
        id,
        mode: resolvedMode,
        fun: !!fun || resolvedMode.includes('diversao'),
        fighters,
        teamA: aIds,
        teamB: bIds,
        turnOrder,
        turnIndex: 0,
        currentId: turnOrder[0],
        turnEndsAt: Date.now() + TURN_MS,
        log: [
            {
                t: Date.now(),
                text: `${title} — a arena se abre.${hasBet ? ` Aposta: **${bet}** ✨ por jogador.` : ''}`
            }
        ],
        status: 'active',
        winnerTeam: null,
        bet: Number(bet) || 0,
        lastEffect: null,
        createdAt: Date.now(),
        rewards: null,
        chat: []
    };
    arenas.set(id, match);
    return { ok: true, match };
}

function getMatch(id) { return arenas.get(id) || null; }
function aliveOnTeam(match, team) {
    return (team === 'A' ? match.teamA : match.teamB).filter(id => match.fighters[id]?.hp > 0);
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
    if (fighter.passMods?.manaRegen) fighter.mana = Math.min(fighter.maxMana, fighter.mana + fighter.passMods.manaRegen);
    for (const k of Object.keys(fighter.cds || {})) if (fighter.cds[k] > 0) fighter.cds[k] -= 1;
    return logs;
}

function calcDamage(attacker, defender, skill) {
    const atkAttr = skill.type === 'magic' || skill.type === 'heal'
        ? (attacker.attrs.forca || 5) * 0.4 + (attacker.level || 0) * 1.2
        : (attacker.attrs.forca || 5) * 1.1 + (attacker.attrs.agilidade || 5) * 0.3;
    const defAttr = (defender.attrs.defesa || 5) + (defender.attrs.vida || 5) * 0.15;
    let power = skill.power || 1;
    if (attacker.effects?.some(e => e.type === 'rage')) power *= 1.25;
    let raw = Math.max(4, (12 + atkAttr * 3.2) * power - defAttr * 1.4);
    if (skill.type === 'physical') raw *= 1 + (attacker.passMods?.physPower || 0);
    if (skill.type === 'magic') raw *= 1 + (attacker.passMods?.magicPower || 0);
    let reduce = 0;
    if (skill.type === 'physical') reduce += defender.passMods?.dmgReducePhys || 0;
    if (skill.type === 'magic') reduce += defender.passMods?.dmgReduceMag || 0;
    if (defender.effects?.some(e => e.type === 'barrier')) reduce += 0.35;
    if (defender.effects?.some(e => e.type === 'shield')) reduce += 0.25;
    if (defender.effects?.some(e => e.type === 'rage')) reduce -= 0.15;
    raw *= Math.max(0.2, 1 - reduce);
    const critChance = 0.08 + (attacker.passMods?.crit || 0) + (skill.critBonus || 0) + (attacker.attrs.agilidade || 0) * 0.002;
    const crit = Math.random() < critChance;
    if (crit) raw *= 1.75;
    const dodge = Math.max(0, (defender.passMods?.dodge || 0) - (attacker.passMods?.accuracy || 0));
    if (Math.random() < dodge) return { dmg: 0, crit: false, dodged: true };
    return { dmg: Math.floor(raw), crit, dodged: false };
}

function pickTarget(match, attacker, explicitTarget) {
    const enemyTeam = attacker.team === 'A' ? match.teamB : match.teamA;
    const alive = enemyTeam.filter(id => match.fighters[id]?.hp > 0);
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

function rollChest(luck = 1) {
    const r = Math.random() / Math.max(0.5, luck);
    let rarity = 'comum';
    if (r < 0.02) rarity = 'descritiva';
    else if (r < 0.08) rarity = 'lendario';
    else if (r < 0.2) rarity = 'epico';
    else if (r < 0.45) rarity = 'raro';
    const names = { comum: 'Baú Comum', raro: 'Baú Raro', epico: 'Baú Épico', lendario: 'Baú Lendário', descritiva: 'Baú Descritivo' };
    let item = null;
    try {
        const items = require('./items');
        const pool = Object.values(items.ITEMS || {}).filter(it => !it.consumable && (it.rarity === rarity || (rarity === 'descritiva' && it.rarity === 'lendario')));
        if (pool.length) item = items.instantiateItem(pool[Math.floor(Math.random() * pool.length)].id);
    } catch (_) {}
    return { rarity, name: names[rarity] || 'Baú', item };
}

function rollPvpItems(luck = 1) {
    const count = 3 + Math.floor(Math.random() * 3); // 3–5
    const out = [];
    try {
        const items = require('./items');
        const pool = Object.values(items.ITEMS || {}).filter((it) => !it.consumable);
        if (!pool.length) return out;
        for (let i = 0; i < count; i++) {
            const r = Math.random() / Math.max(0.5, luck);
            let rarity = 'comum';
            if (r < 0.05) rarity = 'lendario';
            else if (r < 0.18) rarity = 'epico';
            else if (r < 0.4) rarity = 'raro';
            let sub = pool.filter((it) => it.rarity === rarity);
            if (!sub.length) sub = pool;
            const def = sub[Math.floor(Math.random() * sub.length)];
            const inst = items.instantiateItem(def.id);
            if (inst) out.push(inst);
        }
    } catch (_) {}
    return out;
}

function applyRewards(match, winners, losers) {
    const avgLoserLevel =
        losers.reduce((s, id) => s + (match.fighters[id]?.level || 0), 0) / Math.max(1, losers.length);
    match.rewards = match.rewards || {};
    const cp = require('./cp');
    const eter = require('./eter');
    const fun = !!match.fun || String(match.mode || '').includes('diversao');
    const bet = fun ? 0 : Math.max(0, Number(match.bet) || 0);
    const pot = bet * (winners.length + losers.length);

    for (const id of winners) {
        const luck = 1 + (match.fighters[id]?.passMods?.luck || 0);
        let xpGain = Math.floor((40 + avgLoserLevel * 18 + Math.random() * 30) * luck);
        let cpGain = 8 + Math.floor(avgLoserLevel * 1.5) + Math.floor(Math.random() * 6);
        let drops = rollPvpItems(luck);

        if (fun) {
            // Diversão: XP leve, sem CP, sem itens, sem aposta
            xpGain = Math.floor(15 + avgLoserLevel * 4 + Math.random() * 12);
            cpGain = 0;
            drops = [];
        } else if (match.mode === 'aposta' || match.mode === 'equipe_aposta') {
            // Modo aposta: XP + CP + itens + pote
            // (padrão)
        } else if (match.mode === 'equipe') {
            // Equipes sem aposta: um pouco mais de CP (esforço em time)
            cpGain = Math.floor(cpGain * 1.15);
        }

        if (xpGain > 0) xp.addXp(id, xpGain);
        if (cpGain > 0) cp.add(id, cpGain, { reason: 'pvp_win' });
        for (const it of drops) {
            try {
                player.addItem(id, it);
            } catch (_) {}
        }
        let betShare = 0;
        if (bet > 0 && pot > 0) {
            betShare = Math.floor(pot / winners.length);
            try {
                eter.add(id, betShare, { reason: 'pvp_bet' });
            } catch (_) {}
        }
        match.rewards[id] = {
            xp: xpGain,
            cp: cpGain,
            items: drops.map((d) => ({ name: d.name, emoji: d.emoji, rarity: d.rarity })),
            betShare,
            fun
        };
        const parts = [];
        if (xpGain) parts.push(`+${xpGain} XP`);
        if (cpGain) parts.push(`+${cpGain} CP`);
        if (drops.length) parts.push(`${drops.length} itens`);
        if (betShare) parts.push(`+${betShare} ✨ aposta`);
        if (fun) parts.push('modo diversão');
        match.log.push({
            t: Date.now(),
            text: `🎁 ${match.fighters[id].name}: ${parts.join(' · ') || 'sem recompensa'}`
        });
    }
    for (const id of losers) {
        match.log.push({
            t: Date.now(),
            text: `💀 ${match.fighters[id].name} foi derrotado.`
        });
    }
}

function checkEnd(match) {
    const aAlive = aliveOnTeam(match, 'A');
    const bAlive = aliveOnTeam(match, 'B');
    if (!aAlive.length || !bAlive.length) {
        match.status = 'finished';
        match.winnerTeam = aAlive.length ? 'A' : 'B';
        const winners = match.winnerTeam === 'A' ? match.teamA : match.teamB;
        const losers = match.winnerTeam === 'A' ? match.teamB : match.teamA;
        match.log.push({ t: Date.now(), text: `🏆 Time ${match.winnerTeam} venceu a batalha!` });
        applyRewards(match, winners, losers);
        return true;
    }
    return false;
}

function applyMove(matchId, playerId, { moveId, targetId } = {}) {
    const match = getMatch(matchId);
    if (!match) return { ok: false, error: 'Arena não encontrada.' };
    if (match.status !== 'active') return { ok: false, error: 'Batalha já terminou.' };
    if (Date.now() > match.turnEndsAt && match.currentId !== playerId) {
        match.log.push({ t: Date.now(), text: '⏱️ Tempo esgotado. Turno avançado.' });
        advanceTurn(match);
    }
    if (match.currentId !== playerId) return { ok: false, error: 'Não é o seu turno.' };
    const attacker = match.fighters[playerId];
    if (!attacker || attacker.hp <= 0) return { ok: false, error: 'Você está fora de combate.' };

    let skill = null;
    if (moveId === 'basic' || moveId === attacker.basicAttack?.id) {
        skill = { ...attacker.basicAttack, power: attacker.basicAttack?.power || 1 };
    } else {
        skill = attacker.actives?.find(a => a.id === moveId);
        if (!skill) return { ok: false, error: 'Habilidade não equipada.' };
        if ((attacker.cds[skill.id] || 0) > 0) return { ok: false, error: 'Em recarga.' };
        if (attacker.mana < (skill.mana || 0)) return { ok: false, error: 'Mana insuficiente.' };
    }

    if (attacker.effects?.some(e => e.type === 'stun')) {
        match.log.push({ t: Date.now(), text: `💫 ${attacker.name} está atordoado e perde o turno!` });
        attacker.effects = attacker.effects.filter(e => e.type !== 'stun');
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
            match.log.push({ t: Date.now(), text: `💚 ${attacker.name} usou **${skill.name}** e recuperou ${attacker.hp - before} de vida.` });
            match.lastEffect = { type: 'heal', from: playerId, amount: attacker.hp - before };
        } else if (skill.effect) {
            attacker.effects = attacker.effects.filter(e => e.type !== skill.effect);
            attacker.effects.push({ type: skill.effect, turns: skill.effectTurns || 2 });
            match.log.push({ t: Date.now(), text: `✨ ${attacker.name} usou **${skill.name}** (${skill.effect}).` });
            match.lastEffect = { type: skill.effect, from: playerId };
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
                match.log.push({ t: Date.now(), text: `🌀 ${defender.name} esquivou de **${skill.name}** de ${attacker.name}!` });
                match.lastEffect = { type: 'dodge', from: playerId, to: defender.id };
                continue;
            }
            defender.hp = Math.max(0, defender.hp - result.dmg);
            match.log.push({ t: Date.now(), text: `⚔️ ${attacker.name} usou **${skill.name}** e causou **${result.dmg}** em ${defender.name}.${result.crit ? ' 💥 CRÍTICO!' : ''}` });
            if (skill.lifesteal) {
                const heal = Math.floor(result.dmg * skill.lifesteal);
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                match.log.push({ t: Date.now(), text: `🩸 ${attacker.name} drenou ${heal} de vida.` });
            }
            if (skill.effect && Math.random() < (skill.effectChance || 0)) {
                defender.effects = defender.effects.filter(e => e.type !== skill.effect);
                defender.effects.push({ type: skill.effect, turns: skill.effectTurns || 1 });
                match.log.push({ t: Date.now(), text: `✨ Efeito **${skill.effect}** aplicado em ${defender.name}.` });
            }
            match.lastEffect = { type: 'hit', skill: skill.id, from: playerId, to: defender.id, dmg: result.dmg, crit: result.crit };
        }
    }
    if (checkEnd(match)) return { ok: true, match: publicState(match, playerId) };
    advanceTurn(match);
    return { ok: true, match: publicState(match, playerId) };
}

function publicState(match, asUserId) {
    return {
        id: match.id,
        mode: match.mode,
        status: match.status,
        winnerTeam: match.winnerTeam,
        currentId: match.currentId,
        turnEndsAt: match.turnEndsAt,
        turnMs: TURN_MS,
        bet: match.bet || 0,
        fun: !!match.fun,
        teamA: match.teamA.map((id) => publicFighter(match.fighters[id])),
        teamB: match.teamB.map((id) => publicFighter(match.fighters[id])),
        log: match.log.slice(-40),
        lastEffect: match.lastEffect,
        you: asUserId || null,
        yourTurn: match.currentId === asUserId,
        rewards: match.rewards || null,
        chat: (match.chat || []).slice(-80),
        youWon: match.status === 'finished' && asUserId
            ? (match.winnerTeam === 'A' ? match.teamA : match.teamB).includes(asUserId)
            : null
    };
}

function postChat(matchId, playerId, text) {
    const match = getMatch(matchId);
    if (!match) return { ok: false, error: 'Arena não encontrada.' };
    if (!match.fighters[playerId]) return { ok: false, error: 'Você não está nesta luta.' };
    const msg = String(text || '').trim().slice(0, 300);
    if (!msg) return { ok: false, error: 'Mensagem vazia.' };
    if (!match.chat) match.chat = [];
    const name = match.fighters[playerId]?.name || 'Jogador';
    match.chat.push({ from: playerId, name, text: msg, t: Date.now() });
    if (match.chat.length > 100) match.chat = match.chat.slice(-100);
    return { ok: true, chat: match.chat.slice(-80) };
}

module.exports = {
    TURN_MS,
    createMatch,
    getMatch,
    applyMove,
    publicState,
    loadFighter,
    rollChest,
    rollPvpItems,
    postChat
};
