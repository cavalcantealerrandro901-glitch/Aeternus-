const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');
const { parseAmount } = require('../utils/parseAmount');

/** id da luta -> estado */
const fights = new Map();
const pending = new Map();
const COOLDOWN_MS = 12_000;
const lastFight = new Map();
const BOT_ACCEPT_MS = 1200;
const TURN_TIMEOUT_MS = 45_000;

function fightKey(a, b) {
    return [a, b].sort().join(':');
}

function loadFighter(userId, isBot) {
    if (isBot) {
        // stats médios do bot
        const attrs = { forca: 8, defesa: 8, agilidade: 8, vida: 12 };
        const max = 50 + attrs.vida * 8;
        return { id: userId, isBot: true, attrs, hp: max, maxHp: max, defending: false };
    }
    const attrs = xp.getAttrs(userId);
    const max = xp.maxHp(userId);
    return { id: userId, isBot: false, attrs, hp: max, maxHp: max, defending: false };
}

function bar(cur, max, size = 10) {
    const pct = Math.max(0, Math.min(1, cur / Math.max(1, max)));
    const filled = Math.round(pct * size);
    return `█`.repeat(filled) + `░`.repeat(size - filled);
}

function calcDamage(attacker, defender, kind) {
    const atk = attacker.attrs.forca;
    const def = defender.attrs.defesa;
    const agi = attacker.attrs.agilidade;

    let base = atk * 2 + Math.floor(Math.random() * (6 + atk));
    if (kind === 'heavy') base = Math.floor(base * 1.55);
    if (kind === 'special') base = Math.floor(base * 1.9 + agi);

    let mitigation = def + Math.floor(Math.random() * 4);
    if (defender.defending) mitigation = Math.floor(mitigation * 1.8);

    let dmg = Math.max(1, base - Math.floor(mitigation * 0.7));

    // crítico por agilidade
    const critChance = Math.min(0.35, 0.05 + agi * 0.008);
    const crit = Math.random() < critChance;
    if (crit) dmg = Math.floor(dmg * 1.6);

    // special pode falhar um pouco
    if (kind === 'special' && Math.random() < 0.12) dmg = Math.floor(dmg * 0.4);

    return { dmg, crit };
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
            .setEmoji('❌')
    );
}

function attackRow(fightId, enabled) {
    const mk = (act, label, emoji, style) =>
        new ButtonBuilder()
            .setCustomId(`pvp:act:${fightId}:${act}`)
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(style)
            .setDisabled(!enabled);

    return new ActionRowBuilder().addComponents(
        mk('attack', 'Ataque', '⚔️', ButtonStyle.Primary),
        mk('heavy', 'Pesado', '💥', ButtonStyle.Danger),
        mk('defend', 'Defender', '🛡️', ButtonStyle.Secondary),
        mk('special', 'Especial', '✨', ButtonStyle.Success)
    );
}

function disabledFightRow(fightId) {
    return attackRow(fightId, false);
}

function renderState(fight) {
    const a = fight.a;
    const b = fight.b;
    const turnId = fight.turn;
    const lines = [
        `⚔️ **PVP por turnos** · Rodada ${fight.round}`,
        `<@${a.id}> vs <@${b.id}>${b.isBot ? ' _(bot)_' : ''}`,
        '',
        `<@${a.id}> HP **${a.hp}/${a.maxHp}**`,
        `┌${bar(a.hp, a.maxHp)}┐`,
        `FOR ${a.attrs.forca} · DEF ${a.attrs.defesa} · AGI ${a.attrs.agilidade}`,
        '',
        `<@${b.id}> HP **${b.hp}/${b.maxHp}**`,
        `┌${bar(b.hp, b.maxHp)}┐`,
        `FOR ${b.attrs.forca} · DEF ${b.attrs.defesa} · AGI ${b.attrs.agilidade}`,
        '',
        fight.lastLog || '_Combate iniciado._',
        '',
        fight.over
            ? `🏆 **Vencedor:** <@${fight.winnerId}>`
            : `⏱️ Vez de <@${turnId}> — só **essa pessoa** pode usar os botões.`
    ];
    if (fight.bet > 0) {
        lines.push(`🎁 Aposta em jogo: **${eter.formatPlain(fight.bet)}** éter`);
    }
    return lines.join('\n');
}

function clearTurnTimer(fight) {
    if (fight.timer) {
        clearTimeout(fight.timer);
        fight.timer = null;
    }
}

function scheduleTurnTimeout(fight, channel) {
    clearTurnTimer(fight);
    if (fight.over) return;
    fight.timer = setTimeout(async () => {
        if (fight.over || !fights.has(fight.id)) return;
        // quem não jogou perde o turno (dano leve) ou auto-skip
        const actor = fight.turn === fight.a.id ? fight.a : fight.b;
        const other = actor === fight.a ? fight.b : fight.a;
        fight.lastLog = `⏰ <@${actor.id}> demorou demais e perdeu o turno!`;
        fight.turn = other.id;
        fight.round += 1;
        actor.defending = false;

        try {
            const msg = await channel.messages.fetch(fight.messageId).catch(() => null);
            if (msg) {
                await msg.edit({
                    content: renderState(fight),
                    components: [attackRow(fight.id, !isBotTurn(fight))]
                });
            }
            if (isBotTurn(fight)) {
                setTimeout(() => botPlay(fight, channel), 900);
            } else {
                scheduleTurnTimeout(fight, channel);
            }
        } catch (_) {}
    }, TURN_TIMEOUT_MS);
}

function isBotTurn(fight) {
    const cur = fight.turn === fight.a.id ? fight.a : fight.b;
    return !!cur.isBot;
}

async function endFight(fight, channel, reason) {
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

    // XP só — sem éter
    if (fight.winnerId && !String(fight.winnerId).startsWith('bot')) {
        try {
            xp.addXp(fight.winnerId, 40 + Math.floor(Math.random() * 40));
        } catch (_) {}
    }

    fights.delete(fight.id);

    const extra =
        fight.bet > 0
            ? fight.vsBot
                ? fight.winnerId === fight.humanId
                    ? `\n🎁 +**${eter.formatPlain(fight.bet * 2)}** éter`
                    : `\n💸 -**${eter.formatPlain(fight.bet)}** éter`
                : `\n🎁 Pot **${eter.formatPlain(fight.bet * 2)}** éter para <@${fight.winnerId}>`
            : '';

    try {
        const msg = await channel.messages.fetch(fight.messageId).catch(() => null);
        if (msg) {
            await msg.edit({
                content: renderState(fight) + extra + (reason ? `\n_${reason}_` : ''),
                components: [disabledFightRow(fight.id)]
            });
        }
    } catch (_) {}
}

function applyAction(fight, actor, target, kind) {
    actor.defending = false;

    if (kind === 'defend') {
        actor.defending = true;
        fight.lastLog = `🛡️ <@${actor.id}> entrou em **guarda**!`;
        return;
    }

    const { dmg, crit } = calcDamage(actor, target, kind);
    target.hp = Math.max(0, target.hp - dmg);
    target.defending = false;

    const kindName =
        kind === 'heavy' ? 'ataque pesado' : kind === 'special' ? 'golpe especial' : 'ataque';
    fight.lastLog =
        `${crit ? '⚡ **CRÍTICO!** ' : ''}<@${actor.id}> usou **${kindName}** em <@${target.id}> → **-${dmg}** HP`;
}

async function afterAction(fight, channel) {
    if (fight.a.hp <= 0 || fight.b.hp <= 0) {
        fight.winnerId = fight.a.hp <= 0 ? fight.b.id : fight.a.id;
        fight.lastLog += `\n🏆 <@${fight.winnerId}> venceu o duelo!`;
        await endFight(fight, channel);
        return;
    }

    // passa o turno
    const next = fight.turn === fight.a.id ? fight.b.id : fight.a.id;
    fight.turn = next;
    fight.round += 1;

    try {
        const msg = await channel.messages.fetch(fight.messageId).catch(() => null);
        if (msg) {
            await msg.edit({
                content: renderState(fight),
                components: [attackRow(fight.id, !isBotTurn(fight))]
            });
        }
    } catch (_) {}

    if (isBotTurn(fight)) {
        setTimeout(() => botPlay(fight, channel), 1000 + Math.random() * 800);
    } else {
        scheduleTurnTimeout(fight, channel);
    }
}

async function botPlay(fight, channel) {
    if (fight.over || !fights.has(fight.id)) return;
    if (!isBotTurn(fight)) return;

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    const target = actor === fight.a ? fight.b : fight.a;

    const roll = Math.random();
    let kind = 'attack';
    if (actor.hp < actor.maxHp * 0.35 && roll < 0.35) kind = 'defend';
    else if (roll < 0.2) kind = 'special';
    else if (roll < 0.45) kind = 'heavy';

    applyAction(fight, actor, target, kind);
    await afterAction(fight, channel);
}

async function startFight(channel, challengerId, targetId, bet, vsBot) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const a = loadFighter(challengerId, false);
    const b = loadFighter(targetId, vsBot);

    // quem começa: maior agilidade
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
        lastLog: `_Quem tem mais Agilidade começa · <@${first}>_`,
        messageId: null,
        timer: null
    };

    if (bet > 0) {
        if (vsBot) {
            if (eter.get(challengerId) < bet) return { error: '❌ Sem éter suficiente.' };
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
        } else {
            if (eter.get(challengerId) < bet || eter.get(targetId) < bet) {
                return { error: '❌ Alguém sem éter suficiente.' };
            }
            eter.remove(challengerId, bet, { reason: 'pvp_bet' });
            eter.remove(targetId, bet, { reason: 'pvp_bet' });
        }
    }

    fights.set(id, fight);

    const msg = await channel.send({
        content: renderState(fight),
        components: [attackRow(id, !isBotTurn(fight))]
    });
    fight.messageId = msg.id;

    if (isBotTurn(fight)) {
        setTimeout(() => botPlay(fight, channel), 1100);
    } else {
        scheduleTurnTimeout(fight, channel);
    }

    return { fight };
}

module.exports = {
    name: 'pvp',
    aliases: ['duelo', 'desafiar', 'luta'],
    description: 'PVP por turnos com botões de ataque (atributos do XP)',

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));

        if (!target) {
            return message.reply(
                'Uso: `O.pvp @usuário|@bot [aposta]`\nCombate por turnos com botões de ataque.'
            );
        }

        if (target.id === message.author.id) {
            return message.reply('Você não pode duelar consigo mesmo.');
        }

        const vsBot = !!target.bot;

        const betRaw = args.find((a) => !/^<@!?\d+>$/.test(a) && a !== target.id);
        let bet = 0;
        if (betRaw) {
            const amount = parseAmount(betRaw, eter.get(message.author.id));
            if (!Number.isFinite(amount) || amount < 0) {
                return message.reply('Aposta inválida.');
            }
            bet = Math.floor(amount);
        }

        if (bet > 0) {
            if (eter.get(message.author.id) < bet) {
                return message.reply('Sem éter suficiente.');
            }
            if (!vsBot && eter.get(target.id) < bet) {
                return message.reply(`${target} sem éter suficiente.`);
            }
        }

        const key = fightKey(message.author.id, target.id);
        const now = Date.now();
        if (pending.has(key) || [...fights.values()].some((f) => !f.over && (f.a.id === message.author.id || f.b.id === message.author.id))) {
            return message.reply('Você já tem um duelo pendente ou em andamento.');
        }
        if (now - (lastFight.get(key) || 0) < COOLDOWN_MS) {
            return message.reply('Aguarde um pouco antes de outro duelo.');
        }

        if (vsBot) {
            lastFight.set(key, now);
            const intro = await message.channel.send({
                content: [
                    `⚔️ **Desafio PVP**`,
                    `${message.author} vs ${target} _(bot)_`,
                    bet > 0
                        ? `Aposta: **${eter.formatPlain(bet)}** éter`
                        : 'Sem aposta.',
                    `🤖 Aceitação automática…`
                ].join('\n')
            });
            await new Promise((r) => setTimeout(r, BOT_ACCEPT_MS));
            await intro.edit({ content: `⚔️ ${target} aceitou! Iniciando turnos…` }).catch(() => {});

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

        pending.set(key, {
            challengerId: message.author.id,
            targetId: target.id,
            bet,
            at: now
        });
        setTimeout(() => {
            if (pending.get(key)?.at === now) pending.delete(key);
        }, 60_000);

        await message.channel.send({
            content: [
                `⚔️ **Desafio PVP (turnos)**`,
                `${message.author} desafiou ${target}!`,
                bet > 0
                    ? `Aposta: **${eter.formatPlain(bet)}** cada`
                    : 'Sem aposta.',
                '',
                `${target}, **Aceitar** para entrar no combate.`
            ].join('\n'),
            components: [challengeRow(message.author.id, target.id, bet)]
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('pvp:')) return;

        const parts = id.split(':');
        const action = parts[1];

        // pvp:act:fightId:kind
        if (action === 'act') {
            const fightId = parts[2];
            const kind = parts[3];
            const fight = fights.get(fightId);

            if (!fight || fight.over) {
                return interaction.reply({
                    content: 'Este duelo já acabou.',
                    ephemeral: true
                });
            }

            // só o jogador da vez
            if (interaction.user.id !== fight.turn) {
                return interaction.reply({
                    content: `Não é a sua vez. Aguarde <@${fight.turn}>.`,
                    ephemeral: true
                });
            }

            const actor = fight.turn === fight.a.id ? fight.a : fight.b;
            if (actor.isBot) {
                return interaction.reply({ content: 'Vez do bot.', ephemeral: true });
            }

            const target = actor === fight.a ? fight.b : fight.a;
            if (!['attack', 'heavy', 'defend', 'special'].includes(kind)) {
                return interaction.reply({ content: 'Ação inválida.', ephemeral: true });
            }

            clearTurnTimer(fight);
            applyAction(fight, actor, target, kind);

            await interaction.update({
                content: renderState(fight),
                components: [attackRow(fight.id, false)]
            }).catch(() => {});

            await afterAction(fight, interaction.channel);
            return;
        }

        if (action === 'decline') {
            const challengerId = parts[2];
            const targetId = parts[3];
            const key = fightKey(challengerId, targetId);
            if (interaction.user.id !== targetId && interaction.user.id !== challengerId) {
                return interaction.reply({
                    content: 'Só os envolvidos podem recusar.',
                    ephemeral: true
                });
            }
            pending.delete(key);
            return interaction.update({
                content: `❌ Desafio cancelado por ${interaction.user}.`,
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
                    content: 'Só quem foi desafiado pode aceitar.',
                    ephemeral: true
                });
            }

            if (!pending.has(key)) {
                return interaction.update({
                    content: '⏰ Desafio expirado.',
                    components: []
                });
            }

            pending.delete(key);
            lastFight.set(key, Date.now());

            await interaction.update({
                content: `⚔️ ${interaction.user} aceitou! Montando o campo…`,
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
