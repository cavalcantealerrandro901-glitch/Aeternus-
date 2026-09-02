/**
 * Sistemas configuráveis pelo painel (não-economia).
 * Lê getSettings(guildId) e reage a eventos.
 */
const { EmbedBuilder, ChannelType } = require('discord.js');
const { getSettings, setSettings } = require('../utils/settings');

const stickyCount = new Map();
const stickyMsgId = new Map();
const lastCounter = new Map();
const antinukeHits = new Map();

function fmt(tpl, map) {
    let s = String(tpl || '');
    for (const [k, v] of Object.entries(map)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'gi'), String(v ?? ''));
    }
    return s;
}

async function updateMemberCounter(guild) {
    try {
        const s = getSettings(guild.id).memberCounter;
        if (!s?.enabled || !s.channelId) return;
        const ch = await guild.channels.fetch(s.channelId).catch(() => null);
        if (!ch) return;
        const name = fmt(s.format || '👥 Membros: {count}', {
            count: guild.memberCount,
            server: guild.name
        }).slice(0, 100);
        if (ch.name !== name) await ch.setName(name).catch(() => {});
    } catch (_) {}
}

function antinukeCheck(guildId, action, max, windowSec) {
    const key = `${guildId}:${action}`;
    const now = Date.now();
    let st = antinukeHits.get(key) || { n: 0, at: now };
    if (now - st.at > (windowSec || 30) * 1000) st = { n: 0, at: now };
    st.n += 1;
    st.at = now;
    antinukeHits.set(key, st);
    return st.n > (max || 3);
}

/** Mapeia dígitos de vários alfabetos → 0-9 */
const DIGIT_MAP = {
    // latim / fullwidth
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '０': 0, '１': 1, '２': 2, '３': 3, '４': 4, '５': 5, '６': 6, '７': 7, '８': 8, '９': 9,
    // árabe-índico
    '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
    // persa / urdu
    '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9,
    // devanágari
    '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9,
    // bengali
    '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9,
    // tailandês
    '๐': 0, '๑': 1, '๒': 2, '๓': 3, '๔': 4, '๕': 5, '๖': 6, '๗': 7, '๘': 8, '๙': 9,
    // myanmar
    '၀': 0, '၁': 1, '၂': 2, '၃': 3, '၄': 4, '၅': 5, '၆': 6, '၇': 7, '၈': 8, '၉': 9
};

/** Palavras → número (pt / en / es básico + chinês simples 1–10) */
const WORD_NUMBERS = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
    quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17,
    dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, hundred: 100,
    uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '零': 0
};

function digitsToInt(str) {
    let out = '';
    for (const ch of str) {
        if (DIGIT_MAP[ch] === undefined) return null;
        out += String(DIGIT_MAP[ch]);
    }
    if (!out.length) return null;
    const n = Number(out);
    if (!Number.isSafeInteger(n)) return null;
    return n;
}

/** Aceita dígitos latinos e de outras línguas, ou palavras (um, two, 一…) */
function parseCountMessage(content) {
    const raw = String(content || '').trim();
    if (!raw) return null;

    // só dígitos (qualquer script mapeado)
    const asDigits = digitsToInt(raw);
    if (asDigits !== null) return asDigits;

    // palavra única
    const key = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
    if (WORD_NUMBERS[raw] !== undefined) return WORD_NUMBERS[raw];
    if (WORD_NUMBERS[key] !== undefined) return WORD_NUMBERS[key];

    // chinês / caractere único já no mapa
    if (raw.length <= 3 && WORD_NUMBERS[raw] !== undefined) return WORD_NUMBERS[raw];

    return null;
}

async function failCounting(message, ct, expected, reason) {
    lastCounter.delete(message.channel.id);
    setSettings(message.guild.id, {
        counting: { ...ct, current: 0 }
    });

    await message.react('❌').catch(() => {});

    const emb = new EmbedBuilder()
        .setColor(0xf87171)
        .setTitle('🔢 Contagem errada')
        .setDescription(
            [
                `${message.author} errou a contagem.`,
                '',
                reason || 'Número incorreto.',
                `O número certo era **${expected}**.`,
                '',
                'A contagem **reiniciou**. O próximo número é **1**.'
            ].join('\n')
        )
        .setFooter({ text: message.guild.name })
        .setTimestamp();

    await message.channel.send({ embeds: [emb] }).catch(() => {});
}

function setup(client) {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        const s = getSettings(member.guild.id);

        try {
            if (s.autorole?.enabled && s.autorole.roleId) {
                const delay = Math.max(0, Number(s.autorole.delaySec) || 0) * 1000;
                const run = async () => {
                    await member.roles.add(s.autorole.roleId).catch(() => {});
                };
                if (delay) setTimeout(run, delay);
                else await run();
            }
        } catch (_) {}

        try {
            if (s.welcome?.enabled && s.welcome.channelId) {
                const ch = await member.guild.channels.fetch(s.welcome.channelId).catch(() => null);
                if (ch?.isTextBased()) {
                    const text = fmt(s.welcome.message || 'Bem-vindo {user}!', {
                        user: `${member}`,
                        server: member.guild.name,
                        memberCount: member.guild.memberCount
                    });
                    if (s.welcome.embed !== false) {
                        await ch
                            .send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor(0xa78bfa)
                                        .setDescription(text)
                                        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                                        .setTimestamp()
                                ]
                            })
                            .catch(() => {});
                    } else {
                        await ch.send(text).catch(() => {});
                    }
                }
            }
        } catch (_) {}

        try {
            if (s.dmWelcome?.enabled && s.dmWelcome.message) {
                const text = fmt(s.dmWelcome.message, {
                    user: member.user.username,
                    server: member.guild.name,
                    memberCount: member.guild.memberCount
                });
                await member.send(text).catch(() => {});
            }
        } catch (_) {}

        await updateMemberCounter(member.guild);
    });

    client.on('guildMemberRemove', async (member) => {
        const s = getSettings(member.guild.id);
        try {
            if (s.leave?.enabled && s.leave.channelId) {
                const ch = await member.guild.channels.fetch(s.leave.channelId).catch(() => null);
                if (ch?.isTextBased()) {
                    const text = fmt(s.leave.message || '{user} saiu.', {
                        user: member.user?.tag || member.id,
                        server: member.guild.name,
                        memberCount: member.guild.memberCount
                    });
                    await ch.send(text).catch(() => {});
                }
            }
        } catch (_) {}
        await updateMemberCounter(member.guild);
    });

    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;
        const s = getSettings(message.guild.id);

        try {
            if (s.mentionGuard?.enabled) {
                const max = s.mentionGuard.maxMentions ?? 5;
                const count =
                    message.mentions.users.size +
                    message.mentions.roles.size +
                    (message.mentions.everyone ? 5 : 0);
                if (count > max) {
                    if (s.mentionGuard.punish === 'timeout') {
                        await message.member
                            ?.timeout?.(60_000, 'Menções em excesso')
                            .catch(() => {});
                    }
                    await message.delete().catch(() => {});
                    return;
                }
            }
        } catch (_) {}

        // counting
        try {
            const ct = s.counting;
            if (ct?.enabled && ct.channelId === message.channel.id) {
                const num = parseCountMessage(message.content);

                // não é número (em nenhum idioma) → ignora, não apaga
                if (num === null) {
                    // segue sticky / react
                } else {
                    const expected = (Number(ct.current) || 0) + 1;
                    const sameUser =
                        lastCounter.get(message.channel.id) === message.author.id;

                    if (!ct.allowSameUser && sameUser) {
                        await failCounting(
                            message,
                            ct,
                            expected,
                            'A mesma pessoa não pode contar duas vezes seguidas.'
                        );
                        return;
                    }

                    if (num !== expected) {
                        await failCounting(
                            message,
                            ct,
                            expected,
                            `Você enviou **${num}**, mas o certo era **${expected}**.`
                        );
                        return;
                    }

                    lastCounter.set(message.channel.id, message.author.id);
                    setSettings(message.guild.id, {
                        counting: { ...ct, current: expected }
                    });
                    await message.react('✅').catch(() => {});
                }
            }
        } catch (_) {}

        try {
            const st = s.sticky;
            if (st?.enabled && st.channelId === message.channel.id && st.content) {
                const every = Math.max(2, Number(st.every) || 8);
                const n = (stickyCount.get(message.channel.id) || 0) + 1;
                stickyCount.set(message.channel.id, n);
                if (n >= every) {
                    stickyCount.set(message.channel.id, 0);
                    const oldId = stickyMsgId.get(message.channel.id);
                    if (oldId) {
                        await message.channel.messages.delete(oldId).catch(() => {});
                    }
                    const sent = await message.channel
                        .send({ content: st.content.slice(0, 2000) })
                        .catch(() => null);
                    if (sent) stickyMsgId.set(message.channel.id, sent.id);
                }
            }
        } catch (_) {}

        try {
            const rx = s.autoReact;
            if (rx?.enabled && rx.channelId === message.channel.id) {
                const emojis = Array.isArray(rx.emojis) ? rx.emojis : ['👍'];
                for (const e of emojis.slice(0, 5)) {
                    await message.react(e).catch(() => {});
                }
            }
        } catch (_) {}

        try {
            const at = s.autoThread;
            if (at?.enabled && at.channelId === message.channel.id && message.channel.isTextBased()) {
                const name = fmt(at.nameFormat || 'Discussão · {user}', {
                    user: message.author.username,
                    server: message.guild.name
                }).slice(0, 100);
                await message.startThread({ name, autoArchiveDuration: 1440 }).catch(() => {});
            }
        } catch (_) {}

        try {
            const ap = s.autoPublish;
            if (
                ap?.enabled &&
                Array.isArray(ap.channelIds) &&
                ap.channelIds.includes(message.channel.id) &&
                message.channel.type === ChannelType.GuildAnnouncement
            ) {
                await message.crosspost().catch(() => {});
            }
        } catch (_) {}
    });

    client.on('messageReactionAdd', async (reaction, user) => {
        try {
            if (user.bot) return;
            if (reaction.partial) await reaction.fetch().catch(() => null);
            const message = reaction.message;
            if (!message?.guild || message.partial) {
                await message?.fetch?.().catch(() => null);
            }
            if (!message?.guild) return;

            const s = getSettings(message.guild.id).starboard;
            if (!s?.enabled || !s.channelId) return;

            const emoji = s.emoji || '⭐';
            const name = reaction.emoji?.name || '';
            const id = reaction.emoji?.id;
            const match =
                name === emoji ||
                reaction.emoji?.toString?.() === emoji ||
                (id && emoji.includes(id));
            if (!match && emoji === '⭐' && name !== '⭐' && name !== 'star') return;
            if (!match && emoji !== '⭐') return;

            const min = s.minStars ?? 3;
            const count = reaction.count || 0;
            if (count < min) return;
            if (message.channel.id === s.channelId) return;

            const board = await message.guild.channels.fetch(s.channelId).catch(() => null);
            if (!board?.isTextBased()) return;

            const recent = await board.messages.fetch({ limit: 30 }).catch(() => null);
            const already = recent?.find(
                (m) =>
                    m.author.id === client.user.id &&
                    m.embeds?.[0]?.footer?.text?.includes(message.id)
            );
            if (already) {
                const emb = EmbedBuilder.from(already.embeds[0]).setTitle(`${emoji} ${count}`);
                await already.edit({ embeds: [emb] }).catch(() => {});
                return;
            }

            const emb = new EmbedBuilder()
                .setColor(0xfbbf24)
                .setAuthor({
                    name: message.author?.tag || 'Usuário',
                    iconURL: message.author?.displayAvatarURL?.({ size: 64 })
                })
                .setDescription(message.content?.slice(0, 1500) || '_sem texto_')
                .setTitle(`${emoji} ${count}`)
                .addFields({
                    name: 'Origem',
                    value: `[Ir à mensagem](${message.url}) · <#${message.channel.id}>`
                })
                .setFooter({ text: `ID ${message.id}` })
                .setTimestamp(message.createdAt);

            const img = message.attachments?.find((a) =>
                /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url)
            );
            if (img) emb.setImage(img.url);

            await board.send({ embeds: [emb] }).catch(() => {});
        } catch (_) {}
    });

    client.on('interactionCreate', async (interaction) => {
        try {
            if (!interaction.isButton()) return;
            if (interaction.customId !== 'verify:btn') return;
            const s = getSettings(interaction.guildId).verification;
            if (!s?.enabled || !s.roleId) {
                return interaction
                    .reply({ content: 'Verificação desativada.', ephemeral: true })
                    .catch(() => {});
            }
            await interaction.member.roles.add(s.roleId).catch(() => null);
            await interaction
                .reply({ content: '✅ Verificado!', ephemeral: true })
                .catch(() => {});
        } catch (_) {}
    });

    client.on('voiceStateUpdate', async (oldS, newS) => {
        try {
            const guild = newS.guild || oldS.guild;
            if (!guild) return;
            const s = getSettings(guild.id).voiceHub;
            if (!s?.enabled || !s.channelId || !s.createTemp) return;

            if (newS.channelId === s.channelId) {
                const ch = await guild.channels
                    .create({
                        name: `🎧 ${newS.member?.displayName || 'Sala'}`.slice(0, 100),
                        type: ChannelType.GuildVoice,
                        parent: newS.channel?.parentId || undefined,
                        reason: 'Voice hub temp'
                    })
                    .catch(() => null);
                if (ch) {
                    await newS.member?.voice?.setChannel(ch).catch(() => {});
                    ch.tempHub = true;
                }
            }

            if (oldS.channel && oldS.channelId !== s.channelId) {
                const ch = oldS.channel;
                if (
                    ch.type === ChannelType.GuildVoice &&
                    ch.members.size === 0 &&
                    (ch.tempHub || ch.name.startsWith('🎧'))
                ) {
                    await ch.delete('Hub vazio').catch(() => {});
                }
            }
        } catch (_) {}
    });

    client.on('guildBanAdd', async (ban) => {
        try {
            const s = getSettings(ban.guild.id).antinuke;
            if (!s?.enabled) return;
            if (antinukeCheck(ban.guild.id, 'ban', s.maxBans, s.windowSec)) {
                const log = getSettings(ban.guild.id).logs;
                if (log?.enabled && log.channelId) {
                    const ch = await ban.guild.channels.fetch(log.channelId).catch(() => null);
                    await ch
                        ?.send(`🚨 **Anti-nuke:** muitos bans em pouco tempo neste servidor.`)
                        .catch(() => {});
                }
            }
        } catch (_) {}
    });

    client.on('channelDelete', async (channel) => {
        try {
            if (!channel.guild) return;
            const s = getSettings(channel.guild.id).antinuke;
            if (!s?.enabled) return;
            if (antinukeCheck(channel.guild.id, 'channel', s.maxChannels, s.windowSec)) {
                const log = getSettings(channel.guild.id).logs;
                if (log?.enabled && log.channelId) {
                    const ch = await channel.guild.channels
                        .fetch(log.channelId)
                        .catch(() => null);
                    await ch
                        ?.send(`🚨 **Anti-nuke:** exclusão rápida de canais detectada.`)
                        .catch(() => {});
                }
            }
        } catch (_) {}
    });

    console.log('🧩 [guildModules] sistemas do painel ativos');
}

async function announceLevel(message, res) {
    try {
        const s = getSettings(message.guild.id).levels;
        if (s?.enabled === false) return null;
        const text = `✨ ${message.author} nível **${res.level}** · +✨ ${Number(
            res.reward || 0
        ).toLocaleString('pt-BR')} éter`;
        if (s?.announceChannelId) {
            const ch = await message.guild.channels.fetch(s.announceChannelId).catch(() => null);
            if (ch?.isTextBased()) return ch.send(text).catch(() => null);
        }
        return message.channel.send(text).catch(() => null);
    } catch {
        return null;
    }
}

module.exports = { setup, announceLevel, updateMemberCounter };
