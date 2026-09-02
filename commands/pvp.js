const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');
const player = require('../utils/player');
const { parseAmount } = require('../utils/parseAmount');

const fights = new Map();
const pending = new Map();
const lastFight = new Map();
const COOLDOWN_MS = 12_000;
const BOT_ACCEPT_MS = 1200;
const TURN_TIMEOUT_MS = 45_000;
const SPECIAL_COOLDOWN_TURNS = 3;

/** custos base (mago: especial exige mana atual > 100) */
const MANA_COST = {
    default: { attack: 0, heavy: 8, defend: 3, special: 14 },
    mago: { attack: 5, heavy: 12, defend: 4, special: 100 }
};

/** rótulos dos botões por classe */
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

/** várias artes de batalha por classe (nunca repete a última) */
const BATTLE_ART = {
    mago: [
        'https://placehold.co/600x280/4c1d95/e9d5ff/png?text=%F0%9F%A7%99+MAGO+EM+BATALHA+1&font=roboto',
        'https://placehold.co/600x280/5b21b6/ddd6fe/png?text=%E2%9A%A1+RAIO+ARCANO+2&font=roboto',
        'https://placehold.co/600x280/6d28d9/f5f3ff/png?text=%F0%9F%94%A5+INFERNO+MAGICO+3&font=roboto',
        'https://placehold.co/600x280/7c3aed/ede9fe/png?text=%F0%9F%94%AE+ORB+DE+MANA+4&font=roboto'
    ],
    arqueiro: [
        'https://placehold.co/600x280/14532d/bbf7d0/png?text=%F0%9F%8F%B9+ARQUEIRO+1&font=roboto',
        'https://placehold.co/600x280/166534/86efac/png?text=%F0%9F%8C%B2+FLORESTA+2&font=roboto',
        'https://placehold.co/600x280/15803d/dcfce7/png?text=%F0%9F%8C%AF+TIRO+CERTEIRO+3&font=roboto',
        'https://placehold.co/600x280/16a34a/f0fdf4/png?text=%E2%98%81+CHUVA+DE+FLECHAS+4&font=roboto'
    ],
    tanque: [
        'https://placehold.co/600x280/334155/e2e8f0/png?text=%F0%9F%9B%A1+TANQUE+1&font=roboto',
        'https://placehold.co/600x280/475569/f1f5f9/png?text=%F0%9F%9B%A1+ESCUDO+2&font=roboto',
        'https://placehold.co/600x280/1e293b/cbd5e1/png?text=%F0%9F%8F%94+MURALHA+3&font=roboto',
        'https://placehold.co/600x280/0f172a/94a3b8/png?text=%F0%9F%94%92+FORTALEZA+4&font=roboto'
    ],
    healer: [
        'https://placehold.co/600x280/9d174d/fce7f3/png?text=%F0%9F%92%8A+HEALER+1&font=roboto',
        'https://placehold.co/600x280/be185d/fdf2f8/png?text=%E2%9C%A8+LUZ+SAGRADA+2&font=roboto',
        'https://placehold.co/600x280/db2777/fce7f3/png?text=%F0%9F%92%9A+BENCAO+3&font=roboto',
        'https://placehold.co/600x280/ec4899/fdf2f8/png?text=%F0%9F%8C%9F+CURA+4&font=roboto'
    ],
    guerreiro: [
        'https://placehold.co/600x280/7f1d1d/fecaca/png?text=%E2%9A%94+GUERREIRO+1&font=roboto',
        'https://placehold.co/600x280/991b1b/fee2e2/png?text=%F0%9F%92%A5+CAMPO+DE+BATALHA+2&font=roboto',
        'https://placehold.co/600x280/b91c1c/fef2f2/png?text=%F0%9F%94%AA+ESPADA+3&font=roboto',
        'https://placehold.co/600x280/dc2626/fff1f2/png?text=%F0%9F%98%88+FURIA+4&font=roboto'
    ],
    assassino: [
        'https://placehold.co/600x280/1e1b4b/c7d2fe/png?text=%F0%9F%97%A1+ASSASSINO+1&font=roboto',
        'https://placehold.co/600x280/312e81/e0e7ff/png?text=%F0%9F%8C%91+SOMBRAS+2&font=roboto',
        'https://placehold.co/600x280/3730a3/eef2ff/png?text=%E2%98%A0+VENENO+3&font=roboto',
        'https://placehold.co/600x280/4338ca/e0e7ff/png?text=%F0%9F%92%A8+EMBOSCADA+4&font=roboto'
    ]
};

function fightKey(a, b) {
    return [a, b].sort().join(':');
}

function bar(cur, max, size = 10) {
    const pct = Math.max(0, Math.min(1, cur / Math.max(1, max)));
    const filled = Math.round(pct * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function costsFor(classId) {
    return MANA_COST[classId] || MANA_COST.default;
}

function movesFor(classId) {
    return CLASS_MOVES[classId] || CLASS_MOVES.guerreiro;
}

function pickBattleArt(classId, lastUrl) {
    const pool = BATTLE_ART[classId] || BATTLE_ART.guerreiro;
    const options = pool.filter((u) => u !== lastUrl);
    const list = options.length ? options : pool;
    return list[Math.floor(Math.random() * list.length)];
}

function loadFighter(userId, isBot) {
    if (isBot) {
        const attrs = { forca: 8, defesa: 8, agilidade: 8, vida: 12 };
        const maxHp = 50 + attrs.vida * 8;
        const maxMana = 50;
        const cls = player.getClass('guerreiro');
        return {
            id: userId,
            isBot: true,
            name: 'Bot',
            classId: 'guerreiro',
            cls,
            photo: null,
            attrs,
            hp: maxHp,
            maxHp,
            mana: maxMana,
            maxMana,
            defending: false,
            specialCd: 0,
            lastArt: null
        };
    }
    const attrs = xp.getAttrs(userId);
    const maxHp = xp.maxHp(userId);
    let maxMana = xp.maxMana(userId);
    const prof = player.get(userId);
    const classId = prof?.classId || 'guerreiro';
    const cls = player.getClass(classId);
    // magos precisam poder ultrapassar 100 de mana no especial
    if (classId === 'mago') {
        maxMana = Math.max(maxMana, 120);
    }
    return {
        id: userId,
        isBot: false,
        name: prof?.name || 'Jogador',
        classId,
        cls,
        photo: prof?.photoUrl || null,
        attrs,
        hp: maxHp,
        maxHp,
        mana: maxMana,
        maxMana,
        defending: false,
        specialCd: 0,
        lastArt: null
    };
}

function calcDamage(attacker, defender, kind) {
    const atk = attacker.attrs.forca;
    const def = defender.attrs.defesa;
    const agi = attacker.attrs.agilidade;
    let base = atk * 2 + Math.floor(Math.random() * (6 + atk));
    if (kind === 'heavy') base = Math.floor(base * 1.55);
    if (kind === 'special') base = Math.floor(base * 2.1 + agi * 1.2);
    let mitigation = def + Math.floor(Math.random() * 4);
    if (defender.defending) mitigation = Math.floor(mitigation * 1.8);
    let dmg = Math.max(1, base - Math.floor(mitigation * 0.7));
    const crit = Math.random() < Math.min(0.35, 0.05 + agi * 0.008);
    if (crit) dmg = Math.floor(dmg * 1.6);
    if (kind === 'special' && Math.random() < 0.1) dmg = Math.floor(dmg * 0.5);
    // healer special: heal self instead of pure damage
    if (kind === 'special' && attacker.classId === 'healer') {
        const heal = Math.floor(dmg * 0.85);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        dmg = Math.floor(dmg * 0.35);
        return { dmg, crit, heal };
    }
    return { dmg, crit, heal: 0 };
}

function canUseSpecial(actor) {
    if (actor.specialCd > 0) {
        return { ok: false, reason: `⏳ Especial em cooldown (**${actor.specialCd}** turno(s)).` };
    }
    const costs = costsFor(actor.classId);
    if (actor.classId === 'mago') {
        if (actor.mana <= 100) {
            return {
                ok: false,
                reason: `🧙 Mago precisa de **mais de 100** de mana (tem **${actor.mana}**).`
            };
        }
    } else if (actor.mana < costs.special) {
        return {
            ok: false,
            reason: `❌ Sem mana para o especial (precisa **${costs.special}**).`
        };
    }
    return { ok: true };
}

function fightEmbed(fight) {
    const a = fight.a;
    const b = fight.b;
    const turnF = fight.turn === a.id ? a : b;
    const color = fight.over
        ? 0xfbbf24
        : turnF.cls?.color || a.cls?.color || 0xa78bfa;

    const block = (f) => {
        const cd =
            f.specialCd > 0 ? ` · especial CD **${f.specialCd}**` : '';
        return [
            `**${f.cls?.emoji || '⚔️'} ${f.name}** · ${f.cls?.name || '?'}`,
            `<@${f.id}>`,
            `❤️ HP  ┌${bar(f.hp, f.maxHp)}┐ **${f.hp}/${f.maxHp}**`,
            `🔵 Mana ┌${bar(f.mana, f.maxMana)}┐ **${f.mana}/${f.maxMana}**${cd}`,
            `FOR ${f.attrs.forca} · DEF ${f.attrs.defesa} · AGI ${f.attrs.agilidade}`
        ].join('\n');
    };

    const emb = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⚔️ ${a.name} vs ${b.name} · R${fight.round}`)
        .setDescription(
            [
                block(a),
                '',
                '━'.repeat(18),
                '',
                block(b),
                '',
                fight.lastLog || '_Combate iniciado._',
                '',
                fight.over
                    ? `🏆 **Vencedor:** <@${fight.winnerId}>`
                    : `⏱️ **Vez de ${turnF.name}** (${turnF.cls?.emoji || ''} ${turnF.cls?.name || ''}) — só <@${fight.turn}> usa os botões.`
            ].join('\n')
        )
        .setFooter({
            text: fight.over
                ? 'Duelo encerrado'
                : turnF.classId === 'mago'
                  ? 'Mago: especial exige >100 mana + cooldown'
                  : `Especial: cooldown ${SPECIAL_COOLDOWN_TURNS} turnos após uso`
        })
        .setTimestamp();

    // arte de batalha da classe da vez (sempre sorteia outra)
    const focus = fight.over ? (fight.winnerId === a.id ? a : b) : turnF;
    const art = pickBattleArt(focus.classId, focus.lastArt);
    focus.lastArt = art;
    emb.setImage(art);

    if (turnF.photo) emb.setThumbnail(turnF.photo);
    else if (a.photo) emb.setThumbnail(a.photo);

    return emb;
}

function attackRow(fight, enabled) {
    const turnF = fight.turn === fight.a.id ? fight.a : fight.b;
    const moves = movesFor(turnF.classId);
    const costs = costsFor(turnF.classId);
    const fightId = fight.id;

    const specialOk = canUseSpecial(turnF).ok;
    const specialDisabled = !enabled || !specialOk;

    const mk = (act, meta, style, disabled) =>
        new ButtonBuilder()
            .setCustomId(`pvp:act:${fightId}:${act}`)
            .setLabel(meta.label.slice(0, 80))
            .setEmoji(meta.emoji)
            .setStyle(style)
            .setDisabled(!!disabled);

    return new ActionRowBuilder().addComponents(
        mk('attack', moves.attack, ButtonStyle.Primary, !enabled),
        mk('heavy', moves.heavy, ButtonStyle.Danger, !enabled),
        mk('defend', moves.defend, ButtonStyle.Secondary, !enabled),
        mk(
            'special',
            {
                ...moves.special,
                label:
                    turnF.specialCd > 0
                        ? `${moves.special.label} (${turnF.specialCd})`
                        : turnF.classId === 'mago'
                          ? `${moves.special.label} (>100)`
                          : moves.special.label
            },
            ButtonStyle.Success,
            specialDisabled
        )
    );
}

function challengeRow(challengerId, targetId, bet) {
    const betPart = String(Math.max(0, Math.floor(bet || 0)));
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pvp:accept:${challengerId}:${targetId}:${betPart}`)
            .setLabel('Aceitar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⚔️'),
        new ButtonBuilder()
            .setCustomId(`pvp:decline:${challengerId}:${targetId}:${betPart}`)
            .setLabel('Recusar')
            .setStyle(ButtonStyle.Danger)
    );
}

function isBotTurn(fight) {
    return (fight.turn === fight.a.id ? fight.a : fight.b).isBot;
}

function clearTurnTimer(fight) {
    if (fight.timer) {
        clearTimeout(fight.timer);
        fight.timer = null;
    }
}

function tickCooldowns(fighter) {
    if (fighter.specialCd > 0) fighter.specialCd -= 1;
}

function scheduleTurnTimeout(fight, channel) {
    clearTurnTimer(fight);
    if (fight.over) return;
    fight.timer = setTimeout(async () => {
        if (fight.over || !fights.has(fight.id)) return;
        const actor = fight.turn === fight.a.id ? fight.a : fight.b;
        const other = actor === fight.a ? fight.b : fight.a;
        fight.lastLog = `⏰ **${actor.name}** perdeu o turno por tempo.`;
        actor.defending = false;
        actor.mana = Math.min(actor.maxMana, actor.mana + 2);
        tickCooldowns(actor);
        fight.turn = other.id;
        fight.round += 1;
        await pushState(fight, channel, !isBotTurn(fight));
        if (isBotTurn(fight)) setTimeout(() => botPlay(fight, channel), 900);
        else scheduleTurnTimeout(fight, channel);
    }, TURN_TIMEOUT_MS);
}

async function pushState(fight, channel, buttonsOn) {
    try {
        const msg = await channel.messages.fetch(fight.messageId).catch(() => null);
        if (!msg) return;
        await msg.edit({
            content: null,
            embeds: [fightEmbed(fight)],
            components: [attackRow(fight, !!buttonsOn && !fight.over)]
        });
    } catch (_) {}
}

async function endFight(fight, channel) {
    fight.over = true;
    clearTurnTimer(fight);
    if (fight.bet > 0 && fight.winnerId) {
        if (fight.vsBot) {
            if (fight.winnerId === fight.humanId) {
                eter.add(fight.humanId, fight.bet * 2, { reason: 'pvp_win' });
            }
        } else {
            eter.add(fight.winnerId, fight.bet * 2, { reason: 'pvp_win' });
        }
    }
    if (fight.winnerId) {
        try {
            const w = fight.a.id === fight.winnerId ? fight.a : fight.b;
            if (!w.isBot) xp.addXp(fight.winnerId, 40 + Math.floor(Math.random() * 40));
        } catch (_) {}
    }
    fights.delete(fight.id);
    await pushState(fight, channel, false);
}

function applyAction(fight, actor, target, kind) {
    const costs = costsFor(actor.classId);
    const moves = movesFor(actor.classId);

    if (kind === 'special') {
        const check = canUseSpecial(actor);
        if (!check.ok) {
            fight.lastLog = check.reason;
            return false;
        }
    }

    const cost =
        kind === 'special' && actor.classId === 'mago'
            ? Math.min(actor.mana, Math.max(101, costs.special))
            : costs[kind] || 0;

    if (actor.mana < cost && kind !== 'special') {
        fight.lastLog = `❌ **${actor.name}** sem mana (precisa **${cost}**).`;
        return false;
    }
    if (kind === 'special' && actor.classId === 'mago' && actor.mana <= 100) {
        fight.lastLog = `🧙 Precisa de **mais de 100** de mana.`;
        return false;
    }

    if (kind === 'special' && actor.classId === 'mago') {
        // consome quase toda a mana acima de 100
        actor.mana = Math.max(0, actor.mana - Math.max(100, costs.special));
    } else {
        actor.mana = Math.max(0, actor.mana - cost);
    }

    actor.defending = false;

    if (kind === 'defend') {
        actor.defending = true;
        fight.lastLog = `${moves.defend.emoji} **${actor.name}** usou **${moves.defend.label}**!`;
        return true;
    }

    if (kind === 'special') {
        actor.specialCd = SPECIAL_COOLDOWN_TURNS;
    }

    const { dmg, crit, heal } = calcDamage(actor, target, kind);
    target.hp = Math.max(0, target.hp - dmg);
    target.defending = false;

    const moveName = moves[kind]?.label || kind;
    let log = `${crit ? '⚡ **CRÍTICO!** ' : ''}${moves[kind]?.emoji || ''} **${actor.name}** → **${moveName}** em **${target.name}** (**-${dmg}** HP)`;
    if (heal) log += ` · curou **+${heal}** HP`;
    fight.lastLog = log;
    return true;
}

async function afterAction(fight, channel) {
    if (fight.a.hp <= 0 || fight.b.hp <= 0) {
        fight.winnerId = fight.a.hp <= 0 ? fight.b.id : fight.a.id;
        const wname = fight.winnerId === fight.a.id ? fight.a.name : fight.b.name;
        fight.lastLog += `\n🏆 **${wname}** venceu o duelo!`;
        await endFight(fight, channel);
        return;
    }

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    actor.mana = Math.min(actor.maxMana, actor.mana + (actor.classId === 'mago' ? 6 : 4));
    tickCooldowns(actor);

    fight.turn = fight.turn === fight.a.id ? fight.b.id : fight.a.id;
    fight.round += 1;

    await pushState(fight, channel, !isBotTurn(fight));
    if (isBotTurn(fight)) setTimeout(() => botPlay(fight, channel), 1000);
    else scheduleTurnTimeout(fight, channel);
}

async function botPlay(fight, channel) {
    if (fight.over || !fights.has(fight.id) || !isBotTurn(fight)) return;
    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    const target = actor === fight.a ? fight.b : fight.a;
    const costs = costsFor(actor.classId);
    const roll = Math.random();
    let kind = 'attack';
    if (actor.hp < actor.maxHp * 0.35 && actor.mana >= costs.defend && roll < 0.35)
        kind = 'defend';
    else if (canUseSpecial(actor).ok && roll < 0.2) kind = 'special';
    else if (actor.mana >= costs.heavy && roll < 0.5) kind = 'heavy';
    if (!applyAction(fight, actor, target, kind)) applyAction(fight, actor, target, 'attack');
    await afterAction(fight, channel);
}

async function startFight(channel, challengerId, targetId, bet, vsBot) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const a = loadFighter(challengerId, false);
    const b = loadFighter(targetId, vsBot);

    if (bet > 0) {
        if (vsBot) {
            if (eter.get(challengerId) < bet) return { error: '❌ Sem éter.' };
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
        } else {
            if (eter.get(challengerId) < bet || eter.get(targetId) < bet)
                return { error: '❌ Éter insuficiente.' };
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
            eter.remove(targetId, bet, { reason: 'pvp_bet' });
        }
    }

    const first =
        a.attrs.agilidade === b.attrs.agilidade
            ? Math.random() < 0.5
                ? a.id
                : b.id
            : a.attrs.agilidade > b.attrs.agilidade
              ? a.id
              : b.id;

    const fight = {
        id,
        a,
        b,
        turn: first,
        round: 1,
        bet,
        vsBot,
        humanId: challengerId,
        over: false,
        winnerId: null,
        lastLog: `_Maior Agilidade começa · **${first === a.id ? a.name : b.name}**_`,
        messageId: null,
        timer: null
    };
    fights.set(id, fight);

    const msg = await channel.send({
        embeds: [fightEmbed(fight)],
        components: [attackRow(fight, !isBotTurn(fight))]
    });
    fight.messageId = msg.id;

    if (isBotTurn(fight)) setTimeout(() => botPlay(fight, channel), 1100);
    else scheduleTurnTimeout(fight, channel);
    return { fight };
}

module.exports = {
    name: 'pvp',
    aliases: ['duelo', 'desafiar', 'luta'],
    description: 'PVP por turnos — habilidades e artes por classe',

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));

        if (!target) return message.reply('Uso: `O.pvp @usuário|@bot [aposta]`');
        if (target.id === message.author.id)
            return message.reply('Não pode duelar consigo mesmo.');

        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil antes: `O.j criar`.');
        }

        const vsBot = !!target.bot;
        if (!vsBot && !player.has(target.id)) {
            return message.reply(`${target} ainda não tem perfil de jogador.`);
        }

        const betRaw = args.find((a) => !/^<@!?\d+>$/.test(a) && a !== target.id);
        let bet = 0;
        if (betRaw) {
            const amount = parseAmount(betRaw, eter.get(message.author.id));
            if (!Number.isFinite(amount) || amount < 0)
                return message.reply('Aposta inválida.');
            bet = Math.floor(amount);
        }

        if (bet > 0) {
            if (eter.get(message.author.id) < bet) return message.reply('Sem éter.');
            if (!vsBot && eter.get(target.id) < bet)
                return message.reply(`${target} sem éter.`);
        }

        const key = fightKey(message.author.id, target.id);
        const now = Date.now();
        if (
            pending.has(key) ||
            [...fights.values()].some(
                (f) =>
                    !f.over &&
                    (f.a.id === message.author.id || f.b.id === message.author.id)
            )
        ) {
            return message.reply('Você já tem duelo pendente/em andamento.');
        }
        if (now - (lastFight.get(key) || 0) < COOLDOWN_MS) {
            return message.reply('Aguarde um pouco.');
        }

        const me = player.get(message.author.id);
        const myName = me?.name || message.author.username;

        if (vsBot) {
            lastFight.set(key, now);
            const intro = await message.channel.send(
                `⚔️ **${myName}** desafiou ${target} _(bot)_ — aceitação automática…`
            );
            await new Promise((r) => setTimeout(r, BOT_ACCEPT_MS));
            await intro.delete().catch(() => {});
            const started = await startFight(
                message.channel,
                message.author.id,
                target.id,
                bet,
                true
            );
            if (started.error) return message.reply(started.error);
            return;
        }

        const their = player.get(target.id);
        const theirName = their?.name || target.username;

        pending.set(key, {
            challengerId: message.author.id,
            targetId: target.id,
            bet,
            at: now
        });
        setTimeout(() => {
            if (pending.get(key)?.at === now) pending.delete(key);
        }, 60_000);

        const betLine =
            bet > 0
                ? `Aposta: **${eter.formatPlain(bet)}** éter cada.`
                : 'Duelo sem aposta.';

        await message.channel.send({
            content: [
                `⚔️ **${myName}** desafiou **${theirName}** (${target}) para um PVP!`,
                betLine,
                '',
                `${target}, clique em **Aceitar** se quiser lutar (60s).`
            ].join('\n'),
            components: [challengeRow(message.author.id, target.id, bet)]
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('pvp:')) return;
        const parts = id.split(':');
        const action = parts[1];

        if (action === 'act') {
            const fightId = parts[2];
            const kind = parts[3];
            const fight = fights.get(fightId);
            if (!fight || fight.over) {
                return interaction.reply({ content: 'Duelo encerrado.', ephemeral: true });
            }
            if (interaction.user.id !== fight.turn) {
                return interaction.reply({
                    content: `Não é sua vez. Aguarde <@${fight.turn}>.`,
                    ephemeral: true
                });
            }
            const actor = fight.turn === fight.a.id ? fight.a : fight.b;
            if (actor.isBot) {
                return interaction.reply({ content: 'Vez do bot.', ephemeral: true });
            }
            const target = actor === fight.a ? fight.b : fight.a;
            clearTurnTimer(fight);
            const ok = applyAction(fight, actor, target, kind);
            if (!ok) {
                await interaction.update({
                    embeds: [fightEmbed(fight)],
                    components: [attackRow(fight, true)]
                });
                scheduleTurnTimeout(fight, interaction.channel);
                return;
            }
            await interaction.update({
                embeds: [fightEmbed(fight)],
                components: [attackRow(fight, false)]
            });
            await afterAction(fight, interaction.channel);
            return;
        }

        if (action === 'decline') {
            const challengerId = parts[2];
            const targetId = parts[3];
            const key = fightKey(challengerId, targetId);
            if (interaction.user.id !== targetId && interaction.user.id !== challengerId) {
                return interaction.reply({ content: 'Só os envolvidos.', ephemeral: true });
            }
            pending.delete(key);
            return interaction.update({
                content: `❌ Desafio cancelado por ${interaction.user}.`,
                embeds: [],
                components: []
            });
        }

        if (action === 'accept') {
            const challengerId = parts[2];
            const targetId = parts[3];
            const bet = Math.max(0, Math.floor(Number(parts[4]) || 0));
            const key = fightKey(challengerId, targetId);

            if (interaction.user.id !== targetId) {
                return interaction.reply({
                    content: 'Só o desafiado pode aceitar.',
                    ephemeral: true
                });
            }
            if (!pending.has(key)) {
                return interaction.update({
                    content: '⏰ Este desafio expirou.',
                    embeds: [],
                    components: []
                });
            }

            pending.delete(key);
            lastFight.set(key, Date.now());

            await interaction.update({
                content: `⚔️ ${interaction.user} **aceitou** o duelo! Abrindo o combate…`,
                embeds: [],
                components: []
            });

            const started = await startFight(
                interaction.channel,
                challengerId,
                targetId,
                bet,
                false
            );
            if (started.error) {
                await interaction.channel.send(started.error).catch(() => {});
            }
        }
    }
};
