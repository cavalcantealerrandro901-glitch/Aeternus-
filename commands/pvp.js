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

const MANA_COST = { attack: 0, heavy: 8, defend: 3, special: 14 };

function fightKey(a, b) {
    return [a, b].sort().join(':');
}

function bar(cur, max, size = 10) {
    const pct = Math.max(0, Math.min(1, cur / Math.max(1, max)));
    const filled = Math.round(pct * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function loadFighter(userId, isBot) {
    if (isBot) {
        const attrs = { forca: 8, defesa: 8, agilidade: 8, vida: 12 };
        const maxHp = 50 + attrs.vida * 8;
        const maxMana = 40;
        return {
            id: userId,
            isBot: true,
            name: 'Bot',
            attrs,
            hp: maxHp,
            maxHp,
            mana: maxMana,
            maxMana,
            defending: false
        };
    }
    const attrs = xp.getAttrs(userId);
    const maxHp = xp.maxHp(userId);
    const maxMana = xp.maxMana(userId);
    const prof = player.get(userId);
    return {
        id: userId,
        isBot: false,
        name: prof?.name || 'Jogador',
        attrs,
        hp: maxHp,
        maxHp,
        mana: maxMana,
        maxMana,
        defending: false
    };
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
    const crit = Math.random() < Math.min(0.35, 0.05 + agi * 0.008);
    if (crit) dmg = Math.floor(dmg * 1.6);
    if (kind === 'special' && Math.random() < 0.12) dmg = Math.floor(dmg * 0.4);
    return { dmg, crit };
}

function fightEmbed(fight) {
    const a = fight.a;
    const b = fight.b;
    const turnName = fight.turn === a.id ? a.name : b.name;

    const block = (f) =>
        [
            `**${f.name}** <@${f.id}>`,
            `❤️ HP  ┌${bar(f.hp, f.maxHp)}┐ **${f.hp}/${f.maxHp}**`,
            `🔵 Mana ┌${bar(f.mana, f.maxMana)}┐ **${f.mana}/${f.maxMana}**`,
            `FOR ${f.attrs.forca} · DEF ${f.attrs.defesa} · AGI ${f.attrs.agilidade}`
        ].join('\n');

    return new EmbedBuilder()
        .setColor(fight.over ? 0xfbbf24 : 0xa78bfa)
        .setTitle(`⚔️ PVP · Rodada ${fight.round}`)
        .setDescription(
            [
                block(a),
                '',
                block(b),
                '',
                fight.lastLog || '_Combate iniciado._',
                '',
                fight.over
                    ? `🏆 **Vencedor:** <@${fight.winnerId}>`
                    : `⏱️ **Vez de <@${fight.turn}>** (${turnName}) — só essa pessoa usa os botões.`
            ].join('\n')
        )
        .setFooter({
            text:
                fight.bet > 0
                    ? `Aposta ${eter.formatPlain(fight.bet)} éter · Ataque 0 · Pesado ${MANA_COST.heavy} · Def ${MANA_COST.defend} · Esp ${MANA_COST.special} mana`
                    : `Mana: Ataque 0 · Pesado ${MANA_COST.heavy} · Def ${MANA_COST.defend} · Esp ${MANA_COST.special}`
        })
        .setTimestamp();
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

function scheduleTurnTimeout(fight, channel) {
    clearTurnTimer(fight);
    if (fight.over) return;
    fight.timer = setTimeout(async () => {
        if (fight.over || !fights.has(fight.id)) return;
        const actor = fight.turn === fight.a.id ? fight.a : fight.b;
        const other = actor === fight.a ? fight.b : fight.a;
        fight.lastLog = `⏰ <@${actor.id}> perdeu o turno por tempo.`;
        actor.defending = false;
        // regen leve de mana no fim do turno
        actor.mana = Math.min(actor.maxMana, actor.mana + 2);
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
            embeds: [fightEmbed(fight)],
            components: [attackRow(fight.id, !!buttonsOn && !fight.over)]
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
    if (fight.winnerId && !String(fight.winnerId).includes('botfake')) {
        try {
            const w = fight.a.id === fight.winnerId ? fight.a : fight.b;
            if (!w.isBot) xp.addXp(fight.winnerId, 40 + Math.floor(Math.random() * 40));
        } catch (_) {}
    }
    fights.delete(fight.id);
    await pushState(fight, channel, false);
}

function applyAction(fight, actor, target, kind) {
    const cost = MANA_COST[kind] || 0;
    if (actor.mana < cost) {
        fight.lastLog = `❌ <@${actor.id}> sem mana para isso (precisa **${cost}**).`;
        return false;
    }
    actor.mana -= cost;
    actor.defending = false;

    if (kind === 'defend') {
        actor.defending = true;
        fight.lastLog = `🛡️ **${actor.name}** entrou em guarda! (-${cost} mana)`;
        return true;
    }

    const { dmg, crit } = calcDamage(actor, target, kind);
    target.hp = Math.max(0, target.hp - dmg);
    target.defending = false;
    const kindName =
        kind === 'heavy' ? 'ataque pesado' : kind === 'special' ? 'golpe especial' : 'ataque';
    fight.lastLog = `${crit ? '⚡ **CRÍTICO!** ' : ''}**${actor.name}** usou **${kindName}** em **${target.name}** → **-${dmg}** HP${cost ? ` (-${cost} mana)` : ''}`;
    return true;
}

async function afterAction(fight, channel) {
    if (fight.a.hp <= 0 || fight.b.hp <= 0) {
        fight.winnerId = fight.a.hp <= 0 ? fight.b.id : fight.a.id;
        fight.lastLog += `\n🏆 <@${fight.winnerId}> venceu!`;
        await endFight(fight, channel);
        return;
    }

    const actor = fight.turn === fight.a.id ? fight.a : fight.b;
    actor.mana = Math.min(actor.maxMana, actor.mana + 3);

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
    const roll = Math.random();
    let kind = 'attack';
    if (actor.hp < actor.maxHp * 0.35 && actor.mana >= MANA_COST.defend && roll < 0.35)
        kind = 'defend';
    else if (actor.mana >= MANA_COST.special && roll < 0.22) kind = 'special';
    else if (actor.mana >= MANA_COST.heavy && roll < 0.5) kind = 'heavy';
    if (!applyAction(fight, actor, target, kind)) {
        applyAction(fight, actor, target, 'attack');
    }
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
        lastLog: `_Maior Agilidade começa · <@${first}>_`,
        messageId: null,
        timer: null
    };
    fights.set(id, fight);

    const msg = await channel.send({
        embeds: [fightEmbed(fight)],
        components: [attackRow(id, !isBotTurn(fight))]
    });
    fight.messageId = msg.id;

    if (isBotTurn(fight)) setTimeout(() => botPlay(fight, channel), 1100);
    else scheduleTurnTimeout(fight, channel);
    return { fight };
}

module.exports = {
    name: 'pvp',
    aliases: ['duelo', 'desafiar', 'luta'],
    description: 'PVP por turnos com embed, mana e botões',

    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && (await message.client.users.fetch(args[0]).catch(() => null)));

        if (!target) {
            return message.reply('Uso: `O.pvp @usuário|@bot [aposta]`');
        }
        if (target.id === message.author.id) {
            return message.reply('Não pode duelar consigo mesmo.');
        }

        if (!player.has(message.author.id)) {
            return message.reply(
                'Crie seu perfil antes: `O.j criar` (recebe o PV de criação).'
            );
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

        if (vsBot) {
            lastFight.set(key, now);
            const intro = await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22d3ee)
                        .setDescription(
                            `${message.author} vs ${target} _(bot)_\nAceitação automática…`
                        )
                ]
            });
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

        pending.set(key, { challengerId: message.author.id, targetId: target.id, bet, at: now });
        setTimeout(() => {
            if (pending.get(key)?.at === now) pending.delete(key);
        }, 60_000);

        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('⚔️ Desafio PVP')
                    .setDescription(
                        `${message.author} desafiou ${target}!\n${bet > 0 ? `Aposta: **${eter.formatPlain(bet)}** cada` : 'Sem aposta.'}\n\n${target}, **Aceitar** para entrar.`
                    )
            ],
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
                    components: [attackRow(fight.id, true)]
                });
                scheduleTurnTimeout(fight, interaction.channel);
                return;
            }
            await interaction.update({
                embeds: [fightEmbed(fight)],
                components: [attackRow(fight.id, false)]
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
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x94a3b8)
                        .setDescription(`❌ Cancelado por ${interaction.user}.`)
                ],
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
                    content: 'Só o desafiado aceita.',
                    ephemeral: true
                });
            }
            if (!pending.has(key)) {
                return interaction.update({
                    embeds: [
                        new EmbedBuilder().setDescription('⏰ Expirou.').setColor(0x94a3b8)
                    ],
                    components: []
                });
            }
            pending.delete(key);
            lastFight.set(key, Date.now());
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setDescription(`⚔️ ${interaction.user} aceitou!`)
                ],
                components: []
            });
            const started = await startFight(
                interaction.channel,
                challengerId,
                targetId,
                bet,
                false
            );
            if (started.error) await interaction.channel.send(started.error).catch(() => {});
        }
    }
};
