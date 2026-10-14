const { PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('./settings');
const spamAllow = require('./spamAllow');

/** guild:user -> state */
const buckets = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function normalize(content) {
    return String(content || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function isCharFlood(content) {
    const c = String(content || '').replace(/\s/g, '');
    if (!c) return true;
    if (c.length <= 2) return true;
    if (/^(.)\1*$/u.test(c)) return true;
    const parts = String(content).split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => p === parts[0] && p.length <= 3)) {
        return true;
    }
    return false;
}

function getBucket(guildId, userId) {
    const k = key(guildId, userId);
    let b = buckets.get(k);
    if (!b) {
        b = {
            times: [],
            lastContent: '',
            repeats: 0,
            strikes: 0,
            lastStrikeAt: 0,
            recent: []
        };
        buckets.set(k, b);
    }
    // Strikes só resetam após 6 horas (mais rigoroso)
    if (b.strikes > 0 && Date.now() - b.lastStrikeAt > 6 * 3600_000) {
        b.strikes = 0;
    }
    return b;
}

function check(message) {
    if (!message.guild || message.author.bot) return { block: false };

    if (spamAllow.isAllowed(message.guild.id, message.channel.id)) {
        return { block: false };
    }

    const conf = getSettings(message.guild.id).automod || {};
    if (conf.enabled === false) return { block: false };
    if (conf.antiSpam === false) return { block: false };

    const maxDup = Math.max(1, Math.min(10, Number(conf.maxDuplicates) || 2));
    const maxMsgs = Number(conf.maxMessages) || 8;
    const windowMs = Number(conf.windowMs) || 7000;

    const b = getBucket(message.guild.id, message.author.id);
    const now = Date.now();
    b.times = b.times.filter((t) => now - t < windowMs);
    b.times.push(now);

    const content = normalize(message.content);
    let violated = false;
    let reason = '';

    if (b.times.length > maxMsgs) {
        violated = true;
        reason = `Spam rápido (mais de ${maxMsgs} msgs em ${Math.round(windowMs / 1000)}s)`;
    }

    if (!violated) {
        const short = isCharFlood(content);
        const prevShort = isCharFlood(b.lastContent);

        if (content && content === b.lastContent) {
            b.repeats += 1;
        } else if (short && (prevShort || b.repeats > 0)) {
            b.repeats += 1;
            b.lastContent = content;
        } else if (content) {
            b.lastContent = content;
            b.repeats = 1;
        } else {
            b.repeats += 1;
            b.lastContent = '';
        }

        b.recent.push(content || '(vazio)');
        if (b.recent.length > 8) b.recent.shift();
        const last3 = b.recent.slice(-3);
        if (last3.length === 3 && last3.every((x) => x === last3[0])) {
            violated = true;
            reason = `Repetição excessiva ("${String(last3[0]).slice(0, 24)}")`;
        }

        if (!violated && b.repeats > maxDup) {
            violated = true;
            reason = `Repetição excessiva ("${content.slice(0, 24) || 'vazio'}") — máx. ${maxDup}x`;
        }
    }

    if (
        !violated &&
        conf.antiInvite &&
        /(discord\.gg|discord(?:app)?\.com\/invite)\//i.test(message.content || '')
    ) {
        return { block: true, reason: 'Convites bloqueados', punish: 'delete' };
    }

    if (!violated) return { block: false };

    b.strikes += 1;
    b.lastStrikeAt = now;
    b.repeats = 0;
    b.recent = [];

    // 1-2: aviso | 3: mute 1h | 4+: ban
    if (b.strikes <= 2) {
        return {
            block: true,
            reason,
            punish: 'warn',
            strike: b.strikes,
            maxWarns: 2
        };
    }
    if (b.strikes === 3) {
        return { block: true, reason, punish: 'mute', strike: b.strikes };
    }
    return { block: true, reason, punish: 'ban', strike: b.strikes };
}

async function resolveMember(message) {
    let member = message.member;
    if (!member && message.guild) {
        try {
            member = await message.guild.members.fetch(message.author.id);
        } catch (e) {
            console.warn('[antispam] fetch member falhou:', e.message);
        }
    }
    return member;
}

function botCanModerate(guild, member) {
    if (!guild || !member) return { ok: false, why: 'sem guild/member' };
    const me = guild.members.me;
    if (!me) return { ok: false, why: 'bot sem member cache' };

    if (!me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return { ok: false, why: 'bot sem permissão Moderate Members' };
    }
    if (member.id === guild.ownerId) {
        return { ok: false, why: 'não pode moderar o dono' };
    }
    if (member.roles.highest.position >= me.roles.highest.position) {
        return { ok: false, why: 'cargo do alvo >= cargo do bot' };
    }
    return { ok: true };
}

function botCanBan(guild, member) {
    if (!guild || !member) return { ok: false, why: 'sem guild/member' };
    const me = guild.members.me;
    if (!me) return { ok: false, why: 'bot sem member cache' };

    if (!me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return { ok: false, why: 'bot sem permissão Ban Members' };
    }
    if (member.id === guild.ownerId) {
        return { ok: false, why: 'não pode banir o dono' };
    }
    if (member.roles.highest.position >= me.roles.highest.position) {
        return { ok: false, why: 'cargo do alvo >= cargo do bot' };
    }
    return { ok: true };
}

async function apply(message, result) {
    if (!result?.block) return;

    const user = message.author;
    const punish = result.punish || 'delete';
    const member = await resolveMember(message);

    // Sempre tenta apagar a mensagem ofensiva
    try {
        if (message.deletable !== false) {
            await message.delete().catch((e) => {
                console.warn('[antispam] delete falhou:', e.message);
            });
        }
    } catch (e) {
        console.warn('[antispam] delete:', e.message);
    }

    try {
        if (punish === 'delete') return;

        if (punish === 'warn') {
            const n = result.strike || 1;
            const maxW = result.maxWarns || 2;
            const left = Math.max(0, maxW - n);
            const next =
                left > 0
                    ? `Aviso **${n}/${maxW}**. Restam **${left}** antes do mute de 1 hora.`
                    : `Aviso **${n}/${maxW}**. **Próxima: mute de 1 hora.** Depois: ban.`;
            const w = await message.channel
                .send(
                    `⚠️ ${user}, pare de repetir mensagens/letras/números.\n` +
                        `Motivo: **${result.reason}**\n` +
                        next
                )
                .catch((e) => {
                    console.warn('[antispam] warn msg:', e.message);
                    return null;
                });
            if (w) setTimeout(() => w.delete().catch(() => {}), 12_000);
            console.log(
                `[antispam] warn ${n}/${maxW} · ${user.tag} · ${message.guild?.name}`
            );
            return;
        }

        if (punish === 'mute') {
            const can = botCanModerate(message.guild, member);
            let muted = false;

            if (can.ok && member) {
                try {
                    await member.timeout(
                        60 * 60 * 1000,
                        `Anti-spam: ${result.reason}`
                    );
                    muted = true;
                    console.log(`[antispam] mute OK · ${user.tag}`);
                } catch (e) {
                    console.warn('[antispam] timeout falhou:', e.message);
                }
            } else {
                console.warn(
                    `[antispam] não dá para mutar ${user.tag}: ${can.why}`
                );
            }

            // Fallback: se não conseguiu timeout, tenta ban (última opção)
            if (!muted) {
                const canBan = botCanBan(message.guild, member);
                if (canBan.ok && member) {
                    try {
                        await member.ban({
                            reason: `Anti-spam (mute falhou → ban): ${result.reason}`,
                            deleteMessageSeconds: 0
                        });
                        muted = true; // tratado
                        console.log(`[antispam] ban fallback (mute impossível) · ${user.tag}`);
                        const w = await message.channel
                            .send(
                                `🔨 **${user.tag}** foi **banido** (não foi possível mutar: ${can.why}).\n` +
                                    `Motivo: **${result.reason}**`
                            )
                            .catch(() => null);
                        if (w) setTimeout(() => w.delete().catch(() => {}), 20_000);
                        return;
                    } catch (e) {
                        console.warn('[antispam] ban fallback falhou:', e.message);
                    }
                }
            }

            const msg = muted
                ? `🔇 ${user} recebeu **mute de 1 hora** por spam/repetição.\nSe continuar: **ban**.`
                : `⚠️ Não consegui mutar ${user} (${can.why}).\nColoque o cargo do bot **acima** do alvo e dê **Moderar Membros**.`;
            const w = await message.channel.send(msg).catch(() => null);
            if (w) setTimeout(() => w.delete().catch(() => {}), 15_000);
            return;
        }

        if (punish === 'ban') {
            const can = botCanBan(message.guild, member);
            let banned = false;

            if (can.ok && member) {
                try {
                    await member.ban({
                        reason: `Anti-spam (após avisos): ${result.reason}`,
                        deleteMessageSeconds: 0
                    });
                    banned = true;
                    console.log(`[antispam] ban OK · ${user.tag}`);
                } catch (e) {
                    console.warn('[antispam] ban falhou:', e.message);
                }
            } else {
                console.warn(
                    `[antispam] não dá para banir ${user.tag}: ${can.why}`
                );
            }

            // Se ban falhou, tenta pelo menos mutar longo
            if (!banned) {
                const canMute = botCanModerate(message.guild, member);
                if (canMute.ok && member) {
                    try {
                        await member.timeout(
                            24 * 60 * 60 * 1000,
                            `Anti-spam (ban falhou → mute 24h): ${result.reason}`
                        );
                        console.log(`[antispam] mute 24h fallback · ${user.tag}`);
                        const w = await message.channel
                            .send(
                                `🔇 **${user.tag}** recebeu **mute de 24h** (ban falhou: ${can.why}).\n` +
                                    `Motivo: **${result.reason}**`
                            )
                            .catch(() => null);
                        if (w) setTimeout(() => w.delete().catch(() => {}), 20_000);
                        return;
                    } catch (e) {
                        console.warn('[antispam] mute fallback falhou:', e.message);
                    }
                }
            }

            const msg = banned
                ? `🔨 **${user.tag}** foi banido por ignorar avisos de anti-spam.`
                : `⚠️ Não consegui banir ${user} (${can.why}).\nColoque o cargo do bot **acima** do alvo e dê **Banir Membros**.`;
            const w = await message.channel.send(msg).catch(() => null);
            if (w) setTimeout(() => w.delete().catch(() => {}), 15_000);
        }
    } catch (e) {
        console.error('[antispam] apply:', e);
    }
}

module.exports = { check, apply };
