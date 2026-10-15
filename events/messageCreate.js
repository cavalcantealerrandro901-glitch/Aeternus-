const classAdvancement = require('../utils/classAdvancement');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrefix, getSettings } = require('../utils/settings');
const xp = require('../utils/xp');
const afk = require('../utils/afk');
const msgStats = require('../utils/msgStats');
const antispam = require('../utils/antispam');
const cmdLock = require('../utils/cmdLock');
const pending = require('../utils/converterPending');
const { rerollDrop } = require('../systems/drops');
const autoRepair = require('../utils/autoRepair');
const { announceLevel } = require('../systems/guildModules');
const dmPhoto = require('../utils/dmPhoto');
const aeternusCore = require('../systems/aeternusCore');
const gerenciar = require('../commands/gerenciar');

const xpCd = new Map();
const pendingPing = new Map();

function stripAccents(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function resolvePrefixMatch(message, client) {
    const content = String(message.content || '');
    if (!content) return null;

    const configured = message.guild
        ? String(getPrefix(message.guild.id) || 'O.')
        : 'O.';

    const lower = content.toLowerCase();
    const pref = configured.toLowerCase();
    if (pref && lower.startsWith(pref)) {
        return {
            prefix: content.slice(0, configured.length),
            rest: content.slice(configured.length)
        };
    }

    if (client && client.user && client.user.id) {
        const re = new RegExp('^<@!?' + client.user.id + '>\\s*');
        const m = content.match(re);
        if (m) {
            return { prefix: m[0], rest: content.slice(m[0].length) };
        }
    }
    return null;
}

function resolveCommand(client, name) {
    const raw = String(name || '').toLowerCase();
    const norm = stripAccents(raw);

    let cmd =
        client.commands.get(raw) ||
        client.commands.get(norm) ||
        client.commands.get(raw.replace(/[-_]/g, '')) ||
        client.commands.get(norm.replace(/[-_]/g, ''));

    if (cmd?.execute) return cmd;

    for (const [, c] of client.commands) {
        if (!c?.execute) continue;
        const aliases = Array.isArray(c.aliases) ? c.aliases : [];
        const names = [c.name, ...aliases].map(stripAccents);
        if (names.includes(norm)) return c;
    }
    return null;
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        // Comandos conversacionais da equipe no canal de autorreparo.
        try {
            if (await require('../utils/repairWorkflow').handleRepairChannelMessage(message)) return;
        } catch (e) {
            console.error('[repairWorkflow chat]', e.message);
        }

        // ── Aeternus Core: IA pública; gestão/GitHub só admin ────────────────
        try {
            const handled = await aeternusCore.handleOwnerMessage(message, client);
            if (handled) return;
        } catch (e) {
            console.error('[aeternusCore]', e.message);
        }

        if (!message.guild) {
            try {
                const ok = await dmPhoto.tryConsumePhotoMessage(message, client);
                if (ok) return;
            } catch (e) {
                console.error('[dm photo]', e.message);
            }
            try {
                const guildCmd = client.commands.get('guild');
                if (guildCmd?.handleGuildDm) {
                    const handled = await guildCmd.handleGuildDm(message);
                    if (handled) return;
                }
            } catch (e) {
                console.error('[guild dm]', e.message);
            }
            try {
                const pre = resolvePrefixMatch(message, client);
                if (pre) {
                    const parts = pre.rest.trim().split(/\s+/);
                    const name = parts.shift();
                    const cmd = resolveCommand(client, name);
                    if (cmd?.execute) {
                        await cmd.execute(message, parts, client);
                        try { const notice = classAdvancement.notifyCommand(message.author.id); if (notice) await message.channel.send(notice); } catch (_) {}
                    }
                }
            } catch (e) {
                console.error('[dm cmd]', e.message);
            }
            return;
        }

        try {
            if (
                message.author.bot &&
                cmdLock.isLocked(message.guild.id, message.channel.id)
            ) {
                const c = message.content || '';
                const isSystemNotice =
                    message.author.id === client.user.id &&
                    (c.startsWith('🔒') ||
                        c.startsWith('⚠️') ||
                        c.startsWith('🔇') ||
                        c.startsWith('🔨'));
                if (!isSystemNotice) {
                    await message.delete().catch(() => {});
                }
                return;
            }
        } catch (e) {
            console.error('[messageCreate] cmdLock bot:', e);
        }

        if (message.author.bot) return;

        try {
            const pre = resolvePrefixMatch(message, client);
            if (!pre) {
                const spam = antispam.check(message);
                if (spam.block) {
                    await antispam.apply(message, spam);
                    return;
                }
            }
        } catch (e) {
            console.error('[messageCreate] antispam:', e);
        }

        try {
            if (cmdLock.isLocked(message.guild.id, message.channel.id)) {
                const prefix = getPrefix(message.guild.id);
                if (cmdLock.looksLikeCommand(message.content, prefix)) {
                    if (
                        !message.member?.permissions?.has?.(
                            PermissionFlagsBits.ManageChannels
                        )
                    ) {
                        const isOurs = cmdLock.isAeternusCommand(
                            message.content,
                            prefix,
                            client.user.id
                        );
                        await message.delete().catch(() => {});
                        const hint = cmdLock.redirectHint(message.guild.id);
                        const text = isOurs
                            ? `🔒 ${message.author}, os **meus comandos** estão bloqueados neste chat.\n${hint}`
                            : `🔒 ${message.author}, comandos de bots estão bloqueados neste chat.\n${hint}`;
                        const w = await message.channel.send(text).catch(() => null);
                        if (w) setTimeout(() => w.delete().catch(() => {}), 8000);
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('[messageCreate] cmdLock:', e);
        }

        try {
            const now = Date.now();
            const last = pendingPing.get(message.author.id) || 0;
            if (now - last > 120000) {
                pendingPing.set(message.author.id, now);
                const rel = pending.releaseDue(message.author.id);
                if (rel.length) {
                    const sum = rel
                        .map(
                            (r) =>
                                `• ${Number(r.amount).toLocaleString('pt-BR')} → ${r.deposited}`
                        )
                        .join('\n');
                    message.channel
                        .send(`${message.author} 💼 **Câmbio liberado após 1 dia:**\n${sum}`)
                        .catch(() => {});
                }
            }
        } catch (_) {}

        try {
            // Toda mensagem de membro conta, inclusive mensagens com apenas anexos.
            msgStats.add(message.guild.id, message.author.id, 1);
        } catch (_) {}

        try {
            if (afk.has(message.author.id)) {
                const previousAfk = afk.get(message.author.id);
                afk.clear(message.author.id);

                const totalMs = Math.max(0, Date.now() - Number(previousAfk?.at || Date.now()));
                const totalMinutes = Math.floor(totalMs / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const duration = hours > 0
                    ? (minutes ? `${hours}h ${minutes}min` : `${hours}h`)
                    : (totalMinutes > 0 ? `${totalMinutes} min` : 'menos de 1 min');

                const returnMessage = [
                    '✦ **AETERNUS • CENTRAL DE PRESENÇA**',
                    '',
                    '✅ **MODO AUSENTE DESATIVADO**',
                    `👋 ${message.author}, você está de volta e seu status AFK foi removido.`,
                    `▸ **Tempo de ausência:** ${duration}`,
                    '',
                    '**Tudo certo!** Você voltará a receber as menções normalmente.',
                    '✧ *Aeternus • Sistema de utilidades*'
                ].join('\\n');

                message.reply({
                    content: returnMessage,
                    allowedMentions: { parse: [], repliedUser: false }
                }).catch(() => {});
            }
            for (const [id] of message.mentions.users) {
                if (id === message.author.id || !afk.has(id)) continue;

                const d = afk.get(id);
                const ms = Math.max(0, Date.now() - Number(d.at || Date.now()));
                const totalMin = Math.floor(ms / 60000);
                const hours = Math.floor(totalMin / 60);
                const mins = totalMin % 60;
                let duration;
                if (hours <= 0) {
                    duration = mins <= 0 ? 'menos de 1 min' : `${mins} min`;
                } else {
                    duration = mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
                }

                // Impede que um motivo de AFK provoque menções ou notificações em massa.
                const reason = String(d.reason || 'Não informado')
                    .replace(/@everyone/gi, '@ everyone')
                    .replace(/@here/gi, '@ here')
                    .slice(0, 180);
                const notice = new EmbedBuilder()
                    .setColor(0x8B5CF6)
                    .setAuthor({
                        name: 'AETERNUS • CENTRAL DE PRESENÇA',
                        iconURL: message.client.user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('💤 Aviso de ausência')
                    .setDescription(`<@${id}> está temporariamente ausente.`)
                    .addFields(
                        { name: '📝 Motivo', value: reason || 'Não informado' },
                        { name: '⏱️ Ausente há', value: duration, inline: true },
                        { name: '🛡️ Orientações', value: 'Evite repetir a menção ou cobrar resposta. Respeite a ausência; a pessoa responderá quando puder. Se for urgente, procure outro moderador ou membro disponível.' }
                    )
                    .setFooter({ text: 'Aviso automático • Aeternus' })
                    .setTimestamp();

                const sent = await message.reply({
                    embeds: [notice],
                    allowedMentions: { parse: [], repliedUser: false }
                }).catch(() => null);
                if (sent) {
                    setTimeout(() => {
                        sent.delete().catch(() => {});
                    }, 10000);
                }
            }
        } catch (_) {}

        try {
            const botMentioned =
                message.mentions.users.has(client.user.id) && !message.mentions.everyone;

            if (botMentioned) {
                const managed = await gerenciar.handleMention(message, client);
                if (managed) return;
                const isReply = Boolean(message.reference?.messageId);
                const prefix = getPrefix(message.guild.id);
                const startsWithPrefix = message.content
                    .toLowerCase()
                    .startsWith(prefix.toLowerCase());

                if (!isReply && !startsWithPrefix) {
                    const stripped = message.content
                        .replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '')
                        .trim();

                    const onlyMention =
                        stripped.length === 0 ||
                        /^(ol[aá]|oi|hey|help|ajuda|bot)\s*$/i.test(stripped);

                    if (onlyMention) {
                        const embed = new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL({ size: 64 })
                            })
                            .setTitle(`Olá, ${message.author.username}`)
                            .setDescription(
                                [
                                    `Eu sou o **${client.user.username}** — economia, jogos e utilidades.`,
                                    '',
                                    `**Prefixo:** \`${prefix}\``,
                                    `**Exemplos:** \`${prefix}ajuda\` · \`${prefix}saldo\` · \`${prefix}daily\``,
                                    '',
                                    `Digite \`${prefix}ajuda\` para a central completa.`
                                ].join('\n')
                            )
                            .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
                            .setFooter({ text: `${message.guild.name} · Aeternus` })
                            .setTimestamp();

                        await message.reply({ embeds: [embed] }).catch(() => {});
                        return;
                    }
                }
            }
        } catch (_) {}

        try {
            const conf = getSettings(message.guild.id).xp;
            if (conf.enabled !== false && message.content.length >= 3) {
                const key = `${message.guild.id}:${message.author.id}`;
                const now = Date.now();
                const cd = (conf.cooldownSec || 45) * 1000;
                if (!xpCd.has(key) || now - xpCd.get(key) > cd) {
                    xpCd.set(key, now);
                    const gain =
                        (conf.min || 30) +
                        Math.floor(
                            Math.random() * ((conf.max || 77) - (conf.min || 30) + 1)
                        );
                    const res = xp.addXp(message.author.id, gain);
                    if (res.leveled) {
                        const lvlRes = await announceLevel(message, res);
                        const lvlMsg = lvlRes?.message || lvlRes;
                        if (lvlMsg && !lvlRes?.sticky) {
                            setTimeout(() => lvlMsg.delete().catch(() => {}), 7000);
                        }
                    }
                }
            }
        } catch (_) {}

        const plainReroll = message.content.trim().match(/^reroll\s+(\d{15,25})$/i);
        if (plainReroll) {
            if (
                message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                message.member.permissions.has(PermissionFlagsBits.Administrator)
            ) {
                const result = await rerollDrop(client, plainReroll[1]);
                if (!result.ok) message.reply(`❌ ${result.error}`).catch(() => {});
                else message.reply(`✅ Reroll \`${plainReroll[1]}\` ok.`).catch(() => {});
            }
            return;
        }

        const matched = resolvePrefixMatch(message, client);
        if (!matched) return;

        const args = matched.rest.trim().split(/\s+/).filter(Boolean);
        const name = (args.shift() || '').toLowerCase();
        if (!name) return;

        const cmd = resolveCommand(client, name);
        if (!cmd || !cmd.execute) return;

        try {
            if (message.channel?.sendTyping) {
                await message.channel.sendTyping().catch(() => {});
            }
            await cmd.execute(message, args, client);
        } catch (e) {
            await autoRepair.handleCommandError({
                cmdName: cmd.name || name,
                error: e,
                context:
                    'prefix · ' +
                    (message.guild && message.guild.name ? message.guild.name : '?') +
                    ' · #' +
                    (message.channel && message.channel.name
                        ? message.channel.name
                        : message.channelId),
                message
            });
        }
    }
};
