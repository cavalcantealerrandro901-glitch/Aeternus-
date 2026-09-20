const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('./eter');
const xp = require('./xp');
const player = require('./player');
const { parseAmount } = require('./parseAmount');
const pvpArena = require('./pvpArena');

const pending = new Map();
const lastFight = new Map();
const COOLDOWN_MS = 12_000;
const BOT_ACCEPT_MS = 1200;

function fightKey(a, b) {
    return [a, b].sort().join(':');
}

function loadFighter(userId, isBot) {
    if (isBot) {
        const attrs = {
            forca: 12,
            agilidade: 10,
            constituicao: 12,
            inteligencia: 8,
            espirito: 8,
            sorte: 8,
            defesa: 12,
            vida: 12
        };
        const maxHp = 50 + attrs.constituicao * 40 + Math.floor(attrs.forca * 2);
        const maxMana =
            40 +
            Math.floor(attrs.inteligencia * 12) +
            Math.floor(attrs.espirito * 10) +
            Math.floor(attrs.agilidade * 2);
        const cls = player.getClass('guerreiro');
        return {
            id: userId,
            isBot: true,
            name: 'Bot',
            level: 10,
            classId: 'guerreiro',
            className: cls?.name || 'Guerreiro',
            emoji: cls?.emoji || '⚔️',
            photo: null,
            attrs,
            hp: maxHp,
            maxHp,
            mana: maxMana,
            maxMana,
            defending: false,
            specialCd: 0
        };
    }
    const st = xp.get(userId);
    const base = xp.getAttrs(userId);
    const bonus =
        typeof player.getEquipmentBonuses === 'function'
            ? player.getEquipmentBonuses(userId)
            : {};
    const con =
        (base.constituicao || base.vida || base.defesa || 0) +
        (bonus.constituicao || bonus.vida || bonus.defesa || 0);
    const attrs = {
        forca: (base.forca || 0) + (bonus.forca || 0),
        agilidade: (base.agilidade || 0) + (bonus.agilidade || 0),
        constituicao: con,
        inteligencia: (base.inteligencia || 0) + (bonus.inteligencia || 0),
        espirito: (base.espirito || 0) + (bonus.espirito || 0),
        sorte: (base.sorte || 0) + (bonus.sorte || 0),
        defesa: con,
        vida: con
    };
    const maxHp = 50 + attrs.constituicao * 40 + Math.floor(attrs.forca * 2);
    let maxMana =
        40 +
        Math.floor(attrs.inteligencia * 12) +
        Math.floor(attrs.espirito * 10) +
        Math.floor(attrs.agilidade * 2) +
        (bonus.mana || 0);
    const prof = player.get(userId);
    const classId = prof?.classId || 'guerreiro';
    const cls = player.getClass(classId);
    if (classId === 'mago') maxMana = Math.max(maxMana, 120);
    return {
        id: userId,
        isBot: false,
        name: prof?.name || 'Jogador',
        level: Number(st.level || 0),
        classId,
        className: cls?.name || classId,
        emoji: cls?.emoji || '⚔️',
        photo: prof?.photoUrl || null,
        attrs,
        hp: maxHp,
        maxHp,
        mana: maxMana,
        maxMana,
        defending: false,
        specialCd: 0
    };
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

async function startFight(channel, challengerId, targetId, bet, vsBot) {
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

    const webFight = pvpArena.createArena({
        a,
        b,
        bet,
        channelId: channel.id,
        guildId: channel.guild?.id || null
    });

    const linkA = pvpArena.fightUrl(webFight.id, a.id);
    const linkB = pvpArena.fightUrl(webFight.id, b.id);

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🎮 Arena PVP · Aeternus')
        .setDescription(
            [
                `**${a.name}** ${a.emoji || '⚔️'}  vs  ${b.emoji || '⚔️'} **${b.name}**`,
                '',
                'A batalha acontece no **painel web**.',
                bet > 0
                    ? `\n💰 Aposta: **${Number(bet).toLocaleString('pt-BR')}** éter.`
                    : ''
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus Arena' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel((a.name + ' — Entrar na arena').slice(0, 80))
            .setURL(linkA)
            .setEmoji('⚔️'),
        new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel((b.name + ' — Entrar na arena').slice(0, 80))
            .setURL(linkB)
            .setEmoji('🗡️')
    );

    await channel.send({ embeds: [emb], components: [row] });
    return { webId: webFight.id };
}

module.exports = {
    name: 'pvp',
    aliases: ['duelo', 'desafiar', 'luta', 'rpg', 'arena'],
    description: 'RPG / PVP — hub web, salas, chat e duelos',
    loadFighter,

    async execute(message, args) {
        const rpgHub = require('./rpgHub');
        const target =
            message.mentions.users.first() ||
            (args[0] && !/^[a-f0-9]{6}$/i.test(args[0])
                ? await message.client.users.fetch(args[0]).catch(() => null)
                : null);

        if (!target) {
            const codeArg = args[0] && /^[a-f0-9]{6}$/i.test(args[0]) ? args[0] : null;
            const hub = codeArg
                ? rpgHub.roomUrl(codeArg, message.author.id)
                : rpgHub.hubUrl(message.author.id);
            const emb = new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('🎮 Aeternus RPG')
                .setDescription(
                    [
                        'Mundo RPG no painel: **salas**, **chat**, **personagem** e **duelos**.',
                        '',
                        codeArg
                            ? 'Entrar na sala **' + codeArg + '**:'
                            : 'Abra o hub, crie uma sala e convide amigos.',
                        '',
                        '• `O.pvp @user` — desafiar no Discord',
                        '• `O.rpg <código>` — entrar numa sala',
                        '• Perfil: `O.j atributos` · Inventário: `O.inventario`'
                    ].join('\n')
                )
                .setFooter({ text: 'Aeternus RPG Hub' });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel(codeArg ? 'Entrar na sala' : 'Abrir RPG Hub')
                    .setURL(hub)
                    .setEmoji('⚔️')
            );
            return message.reply({ embeds: [emb], components: [row] });
        }

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
        if (betRaw && !/^[a-f0-9]{6}$/i.test(betRaw)) {
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
        if (pending.has(key)) {
            return message.reply('Você já tem duelo pendente.');
        }
        if (now - (lastFight.get(key) || 0) < COOLDOWN_MS) {
            return message.reply('Aguarde um pouco.');
        }

        const me = player.get(message.author.id);
        const myName = me?.name || message.author.username;

        if (vsBot) {
            lastFight.set(key, now);
            const intro = await message.channel.send(
                `⚔️ **${myName}** desafiou ${target} _(bot)_ — abrindo arena…`
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
                ? `Aposta: **${Number(bet).toLocaleString('pt-BR')}** éter cada.`
                : 'Duelo sem aposta.';

        await message.channel.send({
            content: [
                `⚔️ **${myName}** desafiou **${theirName}** (${target})!`,
                betLine,
                '',
                `${target}, clique em **Aceitar** (60s).`
            ].join('\n'),
            components: [challengeRow(message.author.id, target.id, bet)]
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('pvp:')) return;
        const parts = id.split(':');
        const action = parts[1];

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
                    components: []
                });
            }

            pending.delete(key);
            lastFight.set(key, Date.now());

            await interaction.update({
                content: `⚔️ ${interaction.user} **aceitou**! Abrindo a arena…`,
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
