const crypto = require('crypto');

/** @type {Map<string, any>} */
const arenas = new Map();

const LANDSCAPES = [
    { id: 'ruins', ground: '#1a1230', sky: 'radial-gradient(ellipse at 50% 0%,#2a1650 0%,#0a0618 45%,#02010a 100%)' },
    { id: 'ember', ground: '#2a1210', sky: 'radial-gradient(ellipse at 50% 0%,#4a1810 0%,#1a0808 50%,#080204 100%)' },
    { id: 'frost', ground: '#0f1a28', sky: 'radial-gradient(ellipse at 50% 0%,#1a3a5c 0%,#0a1528 45%,#030810 100%)' },
    { id: 'grove', ground: '#102418', sky: 'radial-gradient(ellipse at 50% 0%,#1a4030 0%,#0a2018 50%,#04100c 100%)' },
    { id: 'void', ground: '#14101c', sky: 'radial-gradient(ellipse at 50% 0%,#2a1040 0%,#10081a 50%,#050208 100%)' }
];

const CLASS_MOVES = {
    mago: {
        attack: { label: 'Projétil Arcano', emoji: '🔮' },
        heavy: { label: 'Explosão Mística', emoji: '💥' },
        defend: { label: 'Barreira Mágica', emoji: '🛡️' },
        special: { label: 'Tempestade Elemental', emoji: '⛈️' }
    },
    arqueiro: {
        attack: { label: 'Tiro Rápido', emoji: '🏹' },
        heavy: { label: 'Chuva de Flechas', emoji: '🎯' },
        defend: { label: 'Esquiva', emoji: '💨' },
        special: { label: 'Tiro Penetrante', emoji: '☄️' }
    },
    tanque: {
        attack: { label: 'Escudo-Baque', emoji: '🛡️' },
        heavy: { label: 'Investida', emoji: '🦏' },
        defend: { label: 'Fortificar', emoji: '🧱' },
        special: { label: 'Provocar', emoji: '💢' }
    },
    healer: {
        attack: { label: 'Orbe Sagrado', emoji: '✨' },
        heavy: { label: 'Julgamento', emoji: '✝️' },
        defend: { label: 'Bênção', emoji: '🙏' },
        special: { label: 'Cura Total', emoji: '💚' }
    },
    guerreiro: {
        attack: { label: 'Corte', emoji: '⚔️' },
        heavy: { label: 'Golpe Pesado', emoji: '🗡️' },
        defend: { label: 'Postura', emoji: '🛡️' },
        special: { label: 'Fúria', emoji: '🔥' }
    },
    assassino: {
        attack: { label: 'Punhalada', emoji: '🗡️' },
        heavy: { label: 'Golpe Sombrio', emoji: '🌑' },
        defend: { label: 'Véu', emoji: '👤' },
        special: { label: 'Executar', emoji: '💀' }
    }
};

const MANA_COST = {
    default: { attack: 0, heavy: 15, defend: 5, special: 35 },
    mago: { attack: 8, heavy: 22, defend: 10, special: 100 }
};

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
    const attrs = f.attrs || {};
    return {
        id: f.id,
        name: f.name,
        level: Number(f.level || 0),
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
        attrs: {
            forca: Number(attrs.forca || 0),
            agilidade: Number(attrs.agilidade || 0),
            constituicao: Number(attrs.constituicao || attrs.vida || attrs.defesa || 0),
            inteligencia: Number(attrs.inteligencia || 0),
            espirito: Number(attrs.espirito || 0),
            sorte: Number(attrs.sorte || 0)
        },
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
        over: !!fight.over,
        winnerId: fight.winnerId || null,
        turn: turnId,
        lastLog: fight.lastLog || '',
        lastDamage: fight.lastDamage || 0,
        bet: fight.bet || 0,
        landscape: fight.landscape,
        a: publicFighter(fight.a),
        b: publicFighter(fight.b),
        yourTurn: viewerId ? String(viewerId) === String(turnId) && !fight.over : false,
        moves: Object.entries(moves).map(([key, m]) => ({
            key,
            label: m.label,
            emoji: m.emoji,
            cost: costs[key] || 0,
            disabled:
                key === 'special'
                    ? actor.specialCd > 0 ||
                      (actor.classId === 'mago'
                          ? actor.mana <= 100
                          : actor.mana < (costs.special || 0))
                    : actor.mana < (costs[key] || 0)
        }))
    };
}

function calcDamage(attacker, defender, kind) {
    const atk = Number(attacker.attrs.forca || 5);
    const def = Number(defender.attrs.defesa || defender.attrs.constituicao || 5);
    const agi = Number(attacker.attrs.agilidade || 5);
    const intel = Number(attacker.attrs.inteligencia || 5);
    const sort = Number(attacker.attrs.sorte || 5);
    let base = 8 + atk * 2.2;
    if (kind === 'heavy') base *= 1.65;
    if (kind === 'special') base *= 2.4 + intel * 0.05;
    if (kind === 'attack' && attacker.classId === 'mago') base += intel * 1.2;
    const mitigation = def * 1.1;
    let dmg = Math.max(1, Math.floor(base - mitigation * 0.35 + Math.random() * (6 + agi * 0.3)));
    if (Math.random() < 0.08 + sort * 0.004) dmg = Math.floor(dmg * 1.5);
    if (defender.defending) dmg = Math.max(1, Math.floor(dmg * 0.45));
    return dmg;
}

function createArena({ a, b, bet = 0, channelId = null, guildId = null }) {
    const id = newId();
    const turn =
        (a.attrs?.agilidade || 0) >= (b.attrs?.agilidade || 0) ? a.id : b.id;
    const fight = {
        id,
        a: { ...a },
        b: { ...b },
        bet: Math.max(0, Math.floor(bet || 0)),
        channelId,
        guildId,
        turn,
        over: false,
        winnerId: null,
        lastLog: 'Arena aberta — o duelo começa!',
        lastDamage: 0,
        landscape: pickLandscape(),
        createdAt: Date.now()
    };
    arenas.set(id, fight);
    setTimeout(() => arenas.delete(id), 60 * 60 * 1000);
    return fight;
}

function getArena(id) {
    return arenas.get(id) || null;
}

function applyMove(fightId, playerId, kind) {
    const fight = arenas.get(fightId);
    if (!fight) return { ok: false, error: 'Arena não encontrada ou expirou.' };
    if (fight.over) return { ok: false, error: 'Duelo já encerrou.' };
    if (String(fight.turn) !== String(playerId))
        return { ok: false, error: 'Não é o seu turno.' };

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    const target = fight.turn === fight.a.id ? fight.b : fight.a;
    const moves = movesFor(actor.classId);
    const costs = costsFor(actor.classId);
    const moveKey = String(kind || '');
    if (!moves[moveKey]) return { ok: false, error: 'Movimento inválido.' };

    if (moveKey === 'special' && actor.specialCd > 0) {
        return { ok: false, error: 'Golpe especial em cooldown.' };
    }
    const cost = costs[moveKey] || 0;
    if (moveKey === 'special' && actor.classId === 'mago' && actor.mana <= 100) {
        return { ok: false, error: 'Mago precisa de mais de 100 de mana no especial.' };
    }
    if (actor.mana < cost) return { ok: false, error: 'Mana insuficiente.' };

    actor.mana = Math.max(0, actor.mana - cost);
    actor.defending = false;

    if (moveKey === 'defend') {
        actor.defending = true;
        fight.lastDamage = 0;
        fight.lastLog =
            moves.defend.emoji + ' **' + actor.name + '** se prepara — defesa elevada!';
    } else {
        let dmg = calcDamage(actor, target, moveKey);
        if (moveKey === 'special') {
            actor.specialCd = 3;
            if (actor.classId === 'healer') {
                const heal = Math.floor(dmg * 0.55);
                actor.hp = Math.min(actor.maxHp, actor.hp + heal);
                fight.lastLog =
                    moves.special.emoji +
                    ' **' +
                    actor.name +
                    '** cura **' +
                    heal +
                    '** e fere **' +
                    target.name +
                    '** em **' +
                    dmg +
                    '**!';
            } else {
                fight.lastLog =
                    moves.special.emoji +
                    ' **' +
                    actor.name +
                    '** usa especial em **' +
                    target.name +
                    '** — **' +
                    dmg +
                    '** de dano!';
            }
        } else if (moveKey === 'heavy') {
            fight.lastLog =
                moves.heavy.emoji +
                ' **' +
                actor.name +
                '** acerta pesado em **' +
                target.name +
                '** (**' +
                dmg +
                '**)!';
        } else {
            fight.lastLog =
                moves.attack.emoji +
                ' **' +
                actor.name +
                '** ataca **' +
                target.name +
                '** (**' +
                dmg +
                '**)!';
        }
        target.hp = Math.max(0, target.hp - dmg);
        fight.lastDamage = dmg;
        target.defending = false;
    }

    if (actor.specialCd > 0 && moveKey !== 'special') actor.specialCd -= 1;

    if (target.hp <= 0) {
        fight.over = true;
        fight.winnerId = actor.id;
        fight.lastLog += '\n🏆 **' + actor.name + '** venceu o duelo!';
    } else {
        fight.turn = target.id;
    }

    return { ok: true, state: publicState(fight, playerId) };
}

function panelBaseUrl() {
    return String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
        /\/$/,
        ''
    );
}

function fightUrl(fightId, playerId) {
    const base = panelBaseUrl() || 'https://aeternus-8hlu.onrender.com';
    return base + '/pvp/' + fightId + '?as=' + encodeURIComponent(playerId);
}

module.exports = {
    arenas,
    createArena,
    getArena,
    applyMove,
    publicState,
    publicFighter,
    panelBaseUrl,
    fightUrl,
    LANDSCAPES,
    CLASS_MOVES
};
