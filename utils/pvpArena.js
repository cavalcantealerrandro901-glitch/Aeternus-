const crypto = require('crypto');

/** @type {Map<string, any>} */
const arenas = new Map();

const LANDSCAPES = ['floresta', 'vulcao', 'gelo', 'deserto', 'ruinas', 'abismo'];

const CLASS_MOVES = {
    mago: {
        attack: { label: 'Projétil Arcano', emoji: '🔮' },
        heavy: { label: 'Explosão', emoji: '💥' },
        defend: { label: 'Barreira', emoji: '🔷' },
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
        heavy: { label: 'Punição', emoji: '✝️' },
        defend: { label: 'Bênção', emoji: '🙏' },
        special: { label: 'Cura Total', emoji: '💚' }
    },
    guerreiro: {
        attack: { label: 'Corte', emoji: '⚔️' },
        heavy: { label: 'Golpe Pesado', emoji: '🪓' },
        defend: { label: 'Guarda', emoji: '🛡️' },
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

function newId() {
    return crypto.randomBytes(6).toString('hex');
}

function pickLandscape() {
    return LANDSCAPES[Math.floor(Math.random() * LANDSCAPES.length)];
}

function movesFor(classId) {
    return CLASS_MOVES[classId] || CLASS_MOVES.guerreiro;
}

function costsFor(classId) {
    return MANA_COST[classId] || MANA_COST.default;
}

function publicFighter(f) {
    if (!f) return null;
    return {
        id: f.id,
        name: f.name,
        level: f.level || 0,
        classId: f.classId,
        className: f.className,
        emoji: f.emoji,
        photo: f.photo || null,
        battleAvatar: f.battleAvatar || null,
        hp: f.hp,
        maxHp: f.maxHp,
        mana: f.mana,
        maxMana: f.maxMana,
        defending: !!f.defending,
        specialCd: f.specialCd || 0,
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
    const fight = getArena(fightId);
    if (!fight) return { ok: false, error: 'Arena não encontrada.' };
    if (fight.over) return { ok: false, error: 'Batalha já terminou.' };
    if (String(fight.turn) !== String(playerId)) {
        return { ok: false, error: 'Não é a sua vez.' };
    }

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    const target = actor === fight.a ? fight.b : fight.a;
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
    } else if (moveKey === 'special' && actor.classId === 'healer') {
        const heal = Math.floor(20 + (actor.attrs.espirito || 5) * 4);
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
        actor.specialCd = 3;
        fight.lastDamage = -heal;
        fight.lastLog =
            moves.special.emoji +
            ' **' +
            actor.name +
            '** recupera **' +
            heal +
            '** de HP!';
    } else {
        const dmg = calcDamage(actor, target, moveKey);
        target.hp = Math.max(0, target.hp - dmg);
        fight.lastDamage = dmg;
        const m = moves[moveKey];
        fight.lastLog =
            m.emoji +
            ' **' +
            actor.name +
            '** usou **' +
            m.label +
            '** em **' +
            target.name +
            '** — **' +
            dmg +
            '** de dano!';
        if (moveKey === 'special') actor.specialCd = 3;
    }

    if (actor.specialCd > 0 && moveKey !== 'special') {
        actor.specialCd = Math.max(0, actor.specialCd - 1);
    }

    if (target.hp <= 0) {
        fight.over = true;
        fight.winnerId = actor.id;
        fight.lastLog += '\n🏆 **' + actor.name + '** venceu!';
        return { ok: true, state: publicState(fight, playerId) };
    }

    fight.turn = target.id;
    return { ok: true, state: publicState(fight, playerId) };
}

function fightUrl(id, as) {
    const base =
        String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '')
            .replace(/\/$/, '') || 'https://aeternus-8hlu.onrender.com';
    return base + '/pvp/' + id + (as ? '?as=' + encodeURIComponent(as) : '');
}

module.exports = {
    createArena,
    getArena,
    applyMove,
    publicState,
    fightUrl,
    arenas
};
