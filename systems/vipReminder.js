/**
 * Notificações automáticas de VIP
 * - DM para o usuário (avisos + expiração)
 * - DM para staff com o cargo VIP_ADMIN_ROLE_ID
 * - Ao expirar: remove o registro (some do O.vervip)
 *
 * ENV:
 *   VIP_REMINDER=off          → desliga
 *   VIP_ADMIN_ROLE_ID=id      → cargo(s) que recebem aviso (vários: id1,id2)
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const vip = require('../utils/vip');

const CHECK_MS = 5 * 60 * 1000;
const BATCH_DELAY_MS = 600;
const COLOR = 0xa78bfa;
const COLOR_END = 0xf43f5e;

const MARKS = [
    { key: '7d', ms: 7 * 864e5, label: '7 dias' },
    { key: '3d', ms: 3 * 864e5, label: '3 dias' },
    { key: '1d', ms: 1 * 864e5, label: '1 dia' },
    { key: '12h', ms: 12 * 3600e3, label: '12 horas' },
    { key: 'expired', ms: 0, label: 'expirado' }
];

function isEnabled() {
    const v = String(process.env.VIP_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function adminRoleIds() {
    const raw = String(process.env.VIP_ADMIN_ROLE_ID || process.env.VIP_STAFF_ROLE_ID || '').trim();
    if (!raw) return [];
    return raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{16,20}$/.test(s));
}

function notifiedMap() {
    return store.load('vip_reminders.json', {});
}

function saveNotified(data) {
    store.save('vip_reminders.json', data);
}

function allVipEntries() {
    const all = store.load('vips.json', {});
    const out = [];
    for (const [guildId, map] of Object.entries(all || {})) {
        for (const [userId, rec] of Object.entries(map || {})) {
            out.push({ guildId, userId, ...rec });
        }
    }
    return out;
}

function markKey(guildId, userId, mark) {
    return `${guildId}:${userId}:${mark}`;
}

function alreadySent(map, guildId, userId, mark, registeredAt) {
    const k = markKey(guildId, userId, mark);
    const prev = map[k];
    if (!prev) return false;
    return Number(prev) >= Number(registeredAt || 0);
}

function markSent(map, guildId, userId, mark, registeredAt) {
    map[markKey(guildId, userId, mark)] = Number(registeredAt || Date.now());
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildUserExpiring(user, rec, markLabel, leftLabel) {
    const name = user?.username || 'membro';
    const label = vip.vipLabel(rec);
    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(pick(['✦ Seu VIP está acabando', '⏳ VIP perto do fim']))
        .setDescription(
            [
                `**${name}**, o seu **${label}** termina em breve.`,
                '',
                `⏱ Resta aproximadamente **${leftLabel}**.`,
                rec.expiresAt ? `📅 Expira em <t:${Math.floor(rec.expiresAt / 1000)}:F>` : '',
                '',
                'Renove com a staff do servidor para continuar com os benefícios.'
            ]
                .filter(Boolean)
                .join('\n')
        )
        .addFields(
            { name: 'VIP', value: `**${label}**`, inline: true },
            { name: 'Aviso', value: markLabel, inline: true }
        )
        .setFooter({ text: 'Aeternus · notificação de VIP' });
}

function buildUserExpired(user, rec) {
    const name = user?.username || 'membro';
    const label = vip.vipLabel(rec);
    return new EmbedBuilder()
        .setColor(COLOR_END)
        .setTitle('VIP expirado')
        .setDescription(
            [
                `**${name}**, o seu **${label}** chegou ao fim.`,
                '',
                'Os benefícios deste plano não estão mais ativos.',
                'Para renovar, fale com a moderação do servidor.'
            ].join('\n')
        )
        .addFields({ name: 'VIP', value: `**${label}**`, inline: true })
        .setFooter({ text: 'Aeternus · notificação de VIP' });
}

function buildStaffExpiring(userTag, userId, rec, leftLabel, guildName) {
    const label = vip.vipLabel(rec);
    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Aviso VIP · staff')
        .setDescription(
            [
                `O VIP de **${userTag}** (<@${userId}>) está acabando.`,
                '',
                `**Plano:** ${label}`,
                `**Resta:** ${leftLabel}`,
                rec.expiresAt ? `**Expira:** <t:${Math.floor(rec.expiresAt / 1000)}:F>` : '',
                guildName ? `**Servidor:** ${guildName}` : ''
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: 'Aeternus · staff VIP' });
}

function buildStaffExpired(userTag, userId, rec, guildName) {
    const label = vip.vipLabel(rec);
    return new EmbedBuilder()
        .setColor(COLOR_END)
        .setTitle('VIP expirado · registro removido')
        .setDescription(
            [
                `O VIP de **${userTag}** (<@${userId}>) **expirou**.`,
                '',
                `**Plano:** ${label}`,
                'O registro foi **removido** do sistema (não aparece mais em `O.vervip`).',
                guildName ? `**Servidor:** ${guildName}` : ''
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: 'Aeternus · staff VIP' });
}

async function staffMembers(client, guildId) {
    const roleIds = adminRoleIds();
    if (!roleIds.length) return [];

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return [];

    try {
        await guild.members.fetch();
    } catch (_) {}

    const seen = new Set();
    const members = [];
    for (const rid of roleIds) {
        const role = guild.roles.cache.get(rid);
        if (!role) continue;
        for (const m of role.members.values()) {
            if (m.user.bot || seen.has(m.id)) continue;
            seen.add(m.id);
            members.push(m);
        }
    }
    return members;
}

async function dmStaff(client, guildId, embed) {
    const staff = await staffMembers(client, guildId);
    for (const m of staff) {
        try {
            await m.send({ embeds: [embed] });
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        } catch (e) {
            console.warn(`[vipReminder] staff DM ${m.id}:`, e.message);
        }
    }
    return staff.length;
}

async function processEntry(client, entry, map) {
    const { guildId, userId, expiresAt, registeredAt } = entry;
    if (!expiresAt) return;

    const left = Number(expiresAt) - Date.now();
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const guildName = guild?.name || guildId;

    for (const mark of MARKS) {
        if (mark.key === 'expired') {
            if (left > 0) continue;
        } else if (left > mark.ms) {
            continue;
        }

        if (alreadySent(map, guildId, userId, mark.key, registeredAt)) continue;

        const user = await client.users.fetch(userId).catch(() => null);
        const userTag = user?.tag || userId;

        try {
            if (mark.key === 'expired') {
                if (user && !user.bot) {
                    try {
                        await user.send({ embeds: [buildUserExpired(user, entry)] });
                    } catch (_) {}
                }
                await dmStaff(
                    client,
                    guildId,
                    buildStaffExpired(userTag, userId, entry, guildName)
                );
                vip.remove(guildId, userId);
                console.log(`[vipReminder] expirado e removido · ${userTag}`);
            } else {
                const leftLabel = vip.timeLeft(expiresAt);
                if (user && !user.bot) {
                    try {
                        await user.send({
                            embeds: [buildUserExpiring(user, entry, mark.label, leftLabel)]
                        });
                    } catch (_) {}
                }
                await dmStaff(
                    client,
                    guildId,
                    buildStaffExpiring(userTag, userId, entry, leftLabel, guildName)
                );
                console.log(`[vipReminder] ${mark.key} · ${userTag} · resta ${leftLabel}`);
            }
        } catch (e) {
            console.warn(`[vipReminder] erro ${userId}:`, e.message);
        }

        markSent(map, guildId, userId, mark.key, registeredAt);
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
}

async function tick(client) {
    if (!isEnabled()) return;
    const entries = allVipEntries().filter((e) => e.expiresAt);
    if (!entries.length) return;

    const map = notifiedMap();
    for (const entry of entries) {
        await processEntry(client, entry, map);
    }
    saveNotified(map);

    const cut = Date.now() - 90 * 864e5;
    let dirty = false;
    for (const [k, ts] of Object.entries(map)) {
        if (Number(ts) < cut) {
            delete map[k];
            dirty = true;
        }
    }
    if (dirty) saveNotified(map);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[vipReminder] desligado (VIP_REMINDER=off)');
        return;
    }
    const roles = adminRoleIds();
    console.log(
        `[vipReminder] ativo · avisos 7d/3d/1d/12h/expirado` +
            (roles.length
                ? ` · staff role(s): ${roles.join(', ')}`
                : ' · defina VIP_ADMIN_ROLE_ID para avisar a staff')
    );

    const run = () => tick(client).catch((e) => console.error('[vipReminder]', e.message));
    setTimeout(run, 20_000);
    setInterval(run, CHECK_MS);
}

module.exports = { setup };
