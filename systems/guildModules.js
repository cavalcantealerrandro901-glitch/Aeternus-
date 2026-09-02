/**
 * Sistemas configuráveis pelo painel (não-economia).
 * Lê getSettings(guildId) e reage a eventos.
 */
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getSettings, setSettings } = require('../utils/settings');

const stickyCount = new Map(); // channelId -> msgs since last sticky
const stickyMsgId = new Map();
const lastCounter = new Map(); // channelId -> last userId (counting)
const antinukeHits = new Map(); // guildId:action -> { n, at }

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

function setup(client) {
    // ── Entrada / saída ─────────────────────────────────
    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        const s = getSettings(member.guild.id);

        // autorole
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

        // welcome canal
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

        // DM welcome
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

    // ── Mensagens: contagem, sticky, auto-react, auto-thread, menções ──
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot) return;
        const s = getSettings(message.guild.id);

        // mention guard
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
                const expected = (Number(ct.current) || 0) + 1;
                const num = Number(message.content.trim());
                const sameUser = lastCounter.get(message.channel.id) === message.author.id;
                if (
                    !Number.isInteger(num) ||
                    num !== expected ||
                    (!ct.allowSameUser && sameUser)
                ) {
                    await message.delete().catch(() => {});
                    return;
                }
                lastCounter.set(message.channel.id, message.author.id);
                setSettings(message.guild.id, {
                    counting: { ...ct, current: expected }
                });
                await message.react('✅').catch(() => {});
            }
        } catch (_) {}

        // sticky
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

        // auto-react
        try {
            const rx = s.autoReact;
            if (rx?.enabled && rx.channelId === message.channel.id) {
                const emojis = Array.isArray(rx.emojis) ? rx.emojis : ['👍'];
                for (const e of emojis.slice(0, 5)) {
                    await message.react(e).catch(() => {});
                }
            }
        } catch (_) {}

        // auto-thread
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

        // auto-publish (canais de anúncio)
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

    // ── Starboard ───────────────────────────────────────
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

            // evita duplicar: procura embed com footer msg id
            const recent = await board.messages.fetch({ limit: 30 }).catch(() => null);
            const already = recent?.find(
                (m) =>
                    m.author.id === client.user.id &&
                    m.embeds?.[0]?.footer?.text?.includes(message.id)
            );
            if (already) {
                const emb = EmbedBuilder.from(already.embeds[0]).setTitle(
                    `${emoji} ${count}`
                );
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

    // ── Verificação (botão) ───────────────────────────────
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

    // ── Voice hub (canal temporário) ─────────────────────────
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

    // ── Anti-nuke leve ────────────────────────────────────
    client.on('guildBanAdd', async (ban) => {
        try {
            const s = getSettings(ban.guild.id).antinuke;
            if (!s?.enabled) return;
            if (antinukeCheck(ban.guild.id, 'ban', s.maxBans, s.windowSec)) {
                const log = getSettings(ban.guild.id).logs;
                if (log?.enabled && log.channelId) {
                    const ch = await ban.guild.channels.fetch(log.channelId).catch(() => null);
                    await ch
                        ?.send(
                            `🚨 **Anti-nuke:** muitos bans em pouco tempo neste servidor.`
                        )
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

/** Anúncio de level-up (usado pelo messageCreate) */
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
