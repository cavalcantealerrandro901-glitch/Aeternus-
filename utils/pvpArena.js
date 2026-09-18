const crypto = require('crypto');

/** @type {Map<string, object>} */
const arenas = new Map();

const MANA_COST = {
    default: { attack: 0, heavy: 8, defend: 3, special: 14 },
    mago: { attack: 5, heavy: 12, defend: 4, special: 100 }
};

const CLASS_MOVES = {
    mago: {
        attack: { label: 'Raio', emoji: '⚡' },
        heavy: { label: 'Bola de Fogo', emoji: '🔥' },
        defend: { label: 'Barreira', emoji: '🛡️' },
        special: { label: 'Cataclisma', emoji: '🌊' }
    },
    arqueiro: {
        attack: { label: 'Flecha', emoji: '🏹' },
        heavy: { label: 'Chuva de Flechas', emoji: '🌪️' },
        defend: { label: 'Esquiva', emoji: '💨' },
        special: { label: 'Tiro Certeiro', emoji: '🎯' }
    },
    tanque: {
        attack: { label: 'Investida', emoji: '💪' },
        heavy: { label: 'Batida de Escudo', emoji: '🛡️' },
        defend: { label: 'Fortificar', emoji: '🔒' },
        special: { label: 'Muralha', emoji: '🏔️' }
    },
    healer: {
        attack: { label: 'Toque Sagrado', emoji: '✨' },
        heavy: { label: 'Onda de Luz', emoji: '🌟' },
        defend: { label: 'Bênção', emoji: '💚' },
        special: { label: 'Renascimento', emoji: '💊' }
    },
    guerreiro: {
        attack: { label: 'Corte', emoji: '⚔️' },
        heavy: { label: 'Golpe Brutal', emoji: '💥' },
        defend: { label: 'Bloqueio', emoji: '🛡️' },
        special: { label: 'Fúria', emoji: '😈' }
    },
    assassino: {
        attack: { label: 'Punhalada', emoji: '🗡️' },
        heavy: { label: 'Combo Sombrio', emoji: '🌑' },
        defend: { label: 'Sombra', emoji: '💨' },
        special: { label: 'Assassinato', emoji: '☠️' }
    }
};

const LANDSCAPES = [
    { id: 'sunset', name: 'Crepúsculo Carmesim', sky: ['#1a0a2e', '#ff6b35', '#f7c59f'], ground: '#2d1b0e', accent: '#ff8c42' },
    { id: 'frost', name: 'Tundra Glacial', sky: ['#0b1c2c', '#3d7ea6', '#c8e7ff'], ground: '#1e2a32', accent: '#7ec8e3' },
    { id: 'forest', name: 'Bosque Élfico', sky: ['#0d1f12', '#1b4332', '#95d5b2'], ground: '#1a2f1a', accent: '#52b788' },
    { id: 'void', name: 'Abismo Arcano', sky: ['#0a0014', '#3a0ca3', '#7209b7'], ground: '#12001f', accent: '#b5179e' },
    { id: 'desert', name: 'Dunas Douradas', sky: ['#1c1408', '#e9c46a', '#f4a261'], ground: '#3d2914', accent: '#e76f51' },
    { id: 'storm', name: 'Tempestade Elétrica', sky: ['#0a0a12', '#1d3557', '#457b9d'], ground: '#121820', accent: '#a8dadc' },
    { id: 'cherry', name: 'Jardim Sakura', sky: ['#1a0f14', '#ff8fab', '#ffc2d1'], ground: '#2a1520', accent: '#fb6f92' },
    { id: 'volcano', name: 'Cume Ígneo', sky: ['#1a0500', '#6a040f', '#dc2f02'], ground: '#1f0a00', accent: '#f48c06' }
];

function costsFor(classId) {
    return MANA_COST[classId] || MANA_COST.default;
}

function movesFor(classId) {
    return CLASS_MOVES[classId] || CLASS_MOVES.guerreiro;
}

function pickLandscape() {
    return LANDSCAPES[Math.floor(Math.random() * LANDSCAPES.length)];
}

function newId() {
    return crypto.randomBytes(6).toString('hex');
}

function publicFighter(f) {
    if (!f) return null;
    return {
        id: f.id,
        name: f.name,
        classId: f.classId,
        className: f.className || f.classId,
        emoji: f.emoji || '⚔️',
        photo: f.photo || null,
        hp: f.hp,
        maxHp: f.maxHp,
        mana: f.mana,
        maxMana: f.maxMana,
        defending: !!f.defending,
        specialCd: f.specialCd || 0,
        attrs: f.attrs || {},
        isBot: !!f.isBot
    };
}

function publicState(fight, viewerId) {
    if (!fight) return null;
    const turnId = fight.turn;
    const actor = turnId === fight.a.id ? fight.a : fight.b;
    const moves = movesFor(actor.classId);
    const costs = costsFor(actor.classId);
    return {
        id: fight.id,
        landscape: fight.landscape,
        a: publicFighter(fight.a),
        b: publicFighter(fight.b),
        turn: turnId,
        round: fight.round,
        over: !!fight.over,
        winnerId: fight.winnerId,
        lastLog: fight.lastLog || '',
        log: fight.log || [],
        bet: fight.bet || 0,
        yourTurn: viewerId ? String(viewerId) === String(turnId) && !fight.over : false,
        moves: Object.entries(moves).map(([key, m]) => ({
            key,
            label: m.label,
            emoji: m.emoji,
            cost: costs[key] || 0,
            disabled:
                fight.over ||
                (key === 'special' &&
                    (actor.specialCd > 0 ||
                        (actor.classId === 'mago'
                            ? actor.mana <= 100
                            : actor.mana < (costs.special || 0)))) ||
                (key !== 'special' &&
                    key !== 'defend' &&
                    actor.mana < (costs[key] || 0) &&
                    (costs[key] || 0) > 0)
        }))
    };
}

function calcDamage(attacker, defender, kind) {
    const atk = Number(attacker.attrs.forca || 5);
    const def = Number(defender.attrs.defesa || 5);
    const agi = Number(attacker.attrs.agilidade || 5);
    let base = atk * 2 + Math.floor(Math.random() * (6 + atk));
    if (kind === 'heavy') base = Math.floor(base * 1.55);
    if (kind === 'special') base = Math.floor(base * 2.1 + agi * 1.2);
    let mitigation = def + Math.floor(Math.random() * 4);
    if (defender.defending) mitigation = Math.floor(mitigation * 1.8);
    let dmg = Math.max(1, base - Math.floor(mitigation * 0.7));
    const crit = Math.random() < Math.min(0.35, 0.05 + agi * 0.008);
    if (crit) dmg = Math.floor(dmg * 1.6);
    let heal = 0;
    if (kind === 'special' && attacker.classId === 'healer') {
        heal = Math.floor(dmg * 0.85);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        dmg = Math.floor(dmg * 0.35);
    }
    return { dmg, crit, heal };
}

function canSpecial(actor) {
    if (actor.specialCd > 0) return false;
    const costs = costsFor(actor.classId);
    if (actor.classId === 'mago') return actor.mana > 100;
    return actor.mana >= (costs.special || 0);
}

function createArena({ a, b, bet = 0, channelId = null, guildId = null }) {
    const id = newId();
    const first =
        (a.attrs?.agilidade || 0) >= (b.attrs?.agilidade || 0) ? a.id : b.id;
    const fight = {
        id,
        a: { ...a },
        b: { ...b },
        turn: first,
        round: 1,
        bet: Number(bet) || 0,
        over: false,
        winnerId: null,
        rewarded: false,
        lastLog: 'A arena se abre. O mais ágil inicia!',
        log: ['A arena se abre. O mais ágil inicia!'],
        landscape: pickLandscape(),
        channelId,
        guildId,
        createdAt: Date.now()
    };
    arenas.set(id, fight);
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [k, f] of arenas) {
        if (f.createdAt < cutoff || (f.over && Date.now() - f.createdAt > 30 * 60 * 1000)) {
            arenas.delete(k);
        }
    }
    return fight;
}

function getArena(id) {
    return arenas.get(String(id)) || null;
}

function applyMove(fightId, playerId, kind) {
    const fight = getArena(fightId);
    if (!fight) return { ok: false, error: 'Arena não encontrada.' };
    if (fight.over) return { ok: false, error: 'Duelo já encerrou.' };

    const allowed = ['attack', 'heavy', 'defend', 'special'];
    if (!allowed.includes(kind)) return { ok: false, error: 'Movimento inválido.' };

    if (String(fight.turn) !== String(playerId)) {
        return { ok: false, error: 'Não é o seu turno.' };
    }

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    const target = actor === fight.a ? fight.b : fight.a;
    const costs = costsFor(actor.classId);
    const moves = movesFor(actor.classId);

    if (kind === 'defend') {
        const cost = costs.defend || 0;
        if (actor.mana < cost) return { ok: false, error: 'Mana insuficiente.' };
        actor.mana -= cost;
        actor.defending = true;
        fight.lastLog = `${moves.defend.emoji} **${actor.name}** se prepara — defesa elevada!`;
        fight.log.push(fight.lastLog);
    } else if (kind === 'special') {
        if (!canSpecial(actor)) {
            return { ok: false, error: 'Especial indisponível (cooldown ou mana).' };
        }
        actor.mana = Math.max(0, actor.mana - (costs.special || 0));
        actor.specialCd = 3;
        actor.defending = false;
        const { dmg, crit, heal } = calcDamage(actor, target, 'special');
        target.hp = Math.max(0, target.hp - dmg);
        target.defending = false;
        fight.lastLog =
            (crit ? '⚡ CRÍTICO! ' : '') +
            `${moves.special.emoji} **${actor.name}** usa **${moves.special.label}** em **${target.name}** (−${dmg} HP)` +
            (heal ? ` · +${heal} HP` : '');
        fight.log.push(fight.lastLog);
    } else {
        const cost = costs[kind] || 0;
        if (actor.mana < cost) return { ok: false, error: 'Mana insuficiente.' };
        actor.mana -= cost;
        actor.defending = false;
        const { dmg, crit, heal } = calcDamage(actor, target, kind);
        target.hp = Math.max(0, target.hp - dmg);
        target.defending = false;
        const mv = moves[kind];
        fight.lastLog =
            (crit ? '⚡ CRÍTICO! ' : '') +
            `${mv.emoji} **${actor.name}** → **${mv.label}** em **${target.name}** (−${dmg} HP)` +
            (heal ? ` · +${heal} HP` : '');
        fight.log.push(fight.lastLog);
    }

    if (fight.a.hp <= 0 || fight.b.hp <= 0) {
        fight.over = true;
        fight.winnerId = fight.a.hp <= 0 ? fight.b.id : fight.a.id;
        const wname = fight.winnerId === fight.a.id ? fight.a.name : fight.b.name;
        fight.lastLog += ` · 🏆 **${wname}** venceu!`;
        fight.log.push(`🏆 **${wname}** venceu o duelo!`);
        if (fight.bet > 0 && fight.winnerId && !fight.rewarded) {
            fight.rewarded = true;
            try {
                const eter = require('./eter');
                const w = fight.winnerId === fight.a.id ? fight.a : fight.b;
                if (!w.isBot) eter.add(fight.winnerId, fight.bet * 2, { reason: 'pvp_web_win' });
            } catch (_) {}
            try {
                const xp = require('./xp');
                const w = fight.winnerId === fight.a.id ? fight.a : fight.b;
                if (!w.isBot) xp.addXp(fight.winnerId, 40 + Math.floor(Math.random() * 40));
            } catch (_) {}
        }
        return { ok: true, state: publicState(fight, playerId), effect: kind };
    }

    actor.mana = Math.min(actor.maxMana, actor.mana + (actor.classId === 'mago' ? 6 : 4));
    if (actor.specialCd > 0) actor.specialCd -= 1;

    fight.turn = fight.turn === fight.a.id ? fight.b.id : fight.a.id;
    fight.round += 1;

    if (!fight.over) {
        const next = fight.turn === fight.a.id ? fight.a : fight.b;
        if (next.isBot) setTimeout(() => botMove(fight.id), 800);
    }

    return { ok: true, state: publicState(fight, playerId), effect: kind };
}

function botMove(fightId) {
    const fight = getArena(fightId);
    if (!fight || fight.over) return;
    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    if (!actor.isBot) return;

    let kind = 'attack';
    if (canSpecial(actor) && Math.random() < 0.25) kind = 'special';
    else if (actor.hp < actor.maxHp * 0.35 && Math.random() < 0.4) kind = 'defend';
    else if (actor.mana >= (costsFor(actor.classId).heavy || 0) && Math.random() < 0.35)
        kind = 'heavy';

    applyMove(fightId, actor.id, kind);
}

function panelBaseUrl() {
    const fromEnv =
        process.env.PUBLIC_URL ||
        process.env.PANEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        '';
    if (fromEnv) return String(fromEnv).replace(/\/$/, '');
    const redir = process.env.OAUTH_REDIRECT_URI || process.env.REDIRECT_URI || '';
    if (redir) {
        try {
            return new URL(redir).origin;
        } catch (_) {}
    }
    return 'https://aeternus-8hlu.onrender.com';
}

function fightUrl(fightId, playerId) {
    const base = panelBaseUrl();
    let url = base + '/pvp/' + fightId;
    if (playerId) url += '?as=' + encodeURIComponent(playerId);
    return url;
}

module.exports = {
    createArena,
    getArena,
    applyMove,
    publicState,
    movesFor,
    costsFor,
    panelBaseUrl,
    fightUrl,
    LANDSCAPES,
    CLASS_MOVES
};
