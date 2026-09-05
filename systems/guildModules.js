/**
 * Sistemas configuráveis pelo painel (não-economia).
 */
const { EmbedBuilder, ChannelType } = require('discord.js');
const { getSettings, setSettings } = require('../utils/settings');
const { ATTR_LABEL } = require('../utils/xp');
const { parseCountMessage } = require('../utils/countParse');

const stickyCount = new Map();
const stickyMsgId = new Map();
const countRuntime = new Map();
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

function getCountState(channelId, settingsCurrent) {
    if (!countRuntime.has(channelId)) {
        countRuntime.set(channelId, {
            current: Math.max(0, Math.floor(Number(settingsCurrent) || 0)),
            lastUser: null
        });
    }
    return countRuntime.get(channelId);
}

function persistCount(guildId, ct, state) {
    countRuntime.set(String(ct.channelId), state);
    try {
        setSettings(guildId, {
            counting: {
                enabled: ct.enabled !== false,
                channelId: ct.channelId,
                current: state.current,
                allowSameUser: !!ct.allowSameUser
            }
        });
    } catch (_) {}
}

async function failCounting(message, ct, state, expected, reason) {
    state.current = 0;
    state.lastUser = null;
    persistCount(message.guild.id, ct, state);
    await message.react('❌').catch(() => {});
    await message.channel
        .send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf87171)
                    .setTitle('🔢 Contagem errada')
                    .setDescription(
                        `${message.author} errou.\n${reason || ''}\nEsperado: **${expected}**. A contagem voltou para **1**.`
                    )
            ]
        })
        .catch(() => {});
}

function setup(client) {
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        const s = getSettings(member.guild.id);
        try {
            if (s.autorole?.enabled && s.autorole.roleId) {
                const delay = Math.max(0, Number(s.autorole.delaySec) || 0) * 1000;
                const run = async () => member.roles.add(s.autorole.roleId).catch(() => {});
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
                                ]
                            })
                            .catch(() => {});
                    } else await ch.send(text).catch(() => {});
                }
            }
        } catch (_) {}
        try {
            if (s.dmWelcome?.enabled && s.dmWelcome.message) {
                await member
                    .send(
                        fmt(s.dmWelcome.message, {
                            user: member.user.username,
                            server: member.guild.name,
                            memberCount: member.guild.memberCount
                        })
                    )
                    .catch(() => {});
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
                    await ch
                        .send(
                            fmt(s.leave.message || '{user} saiu.', {
                                user: member.user?.tag || member.id,
                                server: member.guild.name,
                                memberCount: member.guild.memberCount
                            })
                        )
                        .catch(() => {});
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
                        await message.member?.timeout?.(60_000, 'Menções').catch(() => {});
                    }
                    await message.delete().catch(() => {});
                    return;
                }
            }
        } catch (_) {}

        try {
            const ct = s.counting;
            if (ct?.enabled && String(ct.channelId) === String(message.channel.id)) {
                const num = parseCountMessage(message.content);
                if (num !== null) {
                    const state = getCountState(message.channel.id, ct.current);
                    const expected = state.current + 1;
                    if (!ct.allowSameUser && state.lastUser === message.author.id) {
                        await failCounting(
                            message,
                            ct,
                            state,
                            expected,
                            'Mesma pessoa não conta duas vezes.'
                        );
                        return;
                    }
                    if (num !== expected) {
                        await failCounting(
                            message,
                            ct,
                            state,
                            expected,
                            `Você enviou **${num}**.`
                        );
                        return;
                    }
                    state.current = expected;
                    state.lastUser = message.author.id;
                    persistCount(message.guild.id, ct, state);
                    await message.react('✅').catch(() => {});
                }
            }
        } catch (e) {
            console.error('[counting]', e);
        }

        try {
            const st = s.sticky;
            if (st?.enabled && st.channelId === message.channel.id && st.content) {
                const every = Math.max(2, Number(st.every) || 8);
                const n = (stickyCount.get(message.channel.id) || 0) + 1;
                stickyCount.set(message.channel.id, n);
                if (n >= every) {
                    stickyCount.set(message.channel.id, 0);
                    const oldId = stickyMsgId.get(message.channel.id);
                    if (oldId) await message.channel.messages.delete(oldId).catch(() => {});
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
                for (const e of (Array.isArray(rx.emojis) ? rx.emojis : ['👍']).slice(0, 5)) {
                    await message.react(e).catch(() => {});
                }
            }
        } catch (_) {}

        try {
            const at = s.autoThread;
            if (at?.enabled && at.channelId === message.channel.id && message.channel.isTextBased()) {
                await message
                    .startThread({
                        name: fmt(at.nameFormat || 'Discussão · {user}', {
                            user: message.author.username,
                            server: message.guild.name
                        }).slice(0, 100),
                        autoArchiveDuration: 1440
                    })
                    .catch(() => {});
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
            if (!message?.guild || message.partial) await message?.fetch?.().catch(() => null);
            if (!message?.guild) return;
            const s = getSettings(message.guild.id).starboard;
            if (!s?.enabled || !s.channelId) return;
            const emoji = s.emoji || '⭐';
            const name = reaction.emoji?.name || '';
            const match =
                name === emoji ||
                reaction.emoji?.toString?.() === emoji ||
                (reaction.emoji?.id && emoji.includes(reaction.emoji.id));
            if (!match && emoji === '⭐' && name !== '⭐' && name !== 'star') return;
            if (!match && emoji !== '⭐') return;
            if ((reaction.count || 0) < (s.minStars ?? 3)) return;
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
                await already
                    .edit({
                        embeds: [EmbedBuilder.from(already.embeds[0]).setTitle(`${emoji} ${reaction.count}`)]
                    })
                    .catch(() => {});
                return;
            }
            const emb = new EmbedBuilder()
                .setColor(0xfbbf24)
                .setAuthor({
                    name: message.author?.tag || 'Usuário',
                    iconURL: message.author?.displayAvatarURL?.({ size: 64 })
                })
                .setDescription(message.content?.slice(0, 1500) || '_sem texto_')
                .setTitle(`${emoji} ${reaction.count}`)
                .addFields({
                    name: 'Origem',
                    value: `[Ir](${message.url}) · <#${message.channel.id}>`
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
            if (!interaction.isButton() || interaction.customId !== 'verify:btn') return;
            const s = getSettings(interaction.guildId).verification;
            if (!s?.enabled || !s.roleId) {
                return interaction.reply({ content: 'Verificação desativada.', ephemeral: true });
            }
            await interaction.member.roles.add(s.roleId).catch(() => null);
            await interaction.reply({ content: '✅ Verificado!', ephemeral: true });
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
                    await ch?.send('🚨 **Anti-nuke:** muitos bans.').catch(() => {});
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
                    const ch = await channel.guild.channels.fetch(log.channelId).catch(() => null);
                    await ch?.send('🚨 **Anti-nuke:** exclusão rápida de canais.').catch(() => {});
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

        const gains = Array.isArray(res.attrGains) ? res.attrGains : [];
        const gainText = gains.length
            ? gains
                  .map((g) => `+${g.amount} ${g.label || ATTR_LABEL[g.key] || g.key}`)
                  .join(' · ')
            : 'atributos reforçados';

        const items = Array.isArray(res.items) ? res.items : [];
        const itemText = items.length
            ? '\n🎁 Item: ' + items.map((i) => `${i.emoji || ''} **${i.name}**`).join(', ')
            : '';

        const text = `⭐ ${message.author} nível **${res.level}**!\n💪 ${gainText}${itemText}`;

        if (s?.announceChannelId) {
            const ch = await message.guild.channels.fetch(s.announceChannelId).catch(() => null);
            if (ch?.isTextBased()) return ch.send(text).catch(() => null);
        }
        return message.channel.send(text).catch(() => null);
    } catch {
        return null;
    }
}

function setCountingNumber(guildId, n, { resetLastUser = true } = {}) {
    const s = getSettings(guildId);
    const ct = s.counting;
    if (!ct || ct.enabled === false) {
        return { ok: false, error: 'Contagem desativada neste servidor. Ative no painel.' };
    }
    if (!ct.channelId) {
        return { ok: false, error: 'Nenhum canal de contagem configurado no painel.' };
    }
    const next = Math.max(1, Math.floor(Number(n)));
    if (!Number.isFinite(next) || next < 1) {
        return { ok: false, error: 'Número inválido. Use um inteiro >= 1.' };
    }
    if (next > 1_000_000_000) {
        return { ok: false, error: 'Número muito grande.' };
    }
    const current = next - 1;
    const state = getCountState(String(ct.channelId), current);
    state.current = current;
    if (resetLastUser) state.lastUser = null;
    persistCount(guildId, { ...ct, enabled: true }, state);
    return {
        ok: true,
        current: state.current,
        next,
        channelId: String(ct.channelId)
    };
}

module.exports = { setup, announceLevel, updateMemberCounter, setCountingNumber, getCountState };
