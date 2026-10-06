const { PermissionFlagsBits } = require('discord.js');
const msgStats = require('../utils/msgStats');

const ACTIVE_ROLE = 'Ativo';
const MASTER_ROLE = 'Ativo Master';
const TIME_ZONE = process.env.DAILY_ACTIVITY_TIMEZONE || 'America/Sao_Paulo';

let lastResetDay = getDayKey();

function getDayKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function getNextMidnightDelay() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now);

    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const currentMs =
        (((get('hour') * 60 + get('minute')) * 60 + get('second')) * 1000);

    return Math.max(1000, 24 * 60 * 60 * 1000 - currentMs);
}

async function getOrCreateRole(guild, name) {
    let role = guild.roles.cache.find((r) => r.name === name);
    if (role) return role;

    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
        console.warn(`[dailyActivityRoles] Sem permissão para criar o cargo ${name} em ${guild.name}`);
        return null;
    }

    try {
        role = await guild.roles.create({
            name,
            reason: 'Aeternus · cargos diários por mensagens'
        });
        return role;
    } catch (e) {
        console.warn(`[dailyActivityRoles] Falha ao criar ${name} em ${guild.name}: ${e.message}`);
        return null;
    }
}

async function giveRole(member, role) {
    if (!role || !member.manageable) return false;
    if (member.roles.cache.has(role.id)) return true;
    return member.roles.add(role, 'Aeternus · meta diária de mensagens').then(() => true).catch(() => false);
}

async function removeRole(member, role) {
    if (!role || !member.roles.cache.has(role.id)) return;
    await member.roles.remove(role, 'Aeternus · fim do ciclo diário').catch(() => {});
}

async function applyMilestone(message) {
    const guild = message.guild;
    if (!guild || message.author.bot) return;

    const stats = msgStats.getUser(guild.id, message.author.id);
    const count = Number(stats.today || 0);
    if (count !== 100 && count !== 500) return;

    const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    const active = await getOrCreateRole(guild, ACTIVE_ROLE);
    const master = await getOrCreateRole(guild, MASTER_ROLE);

    if (count >= 500) {
        const added = await giveRole(member, master);
        if (added) await removeRole(member, active);
    } else {
        await giveRole(member, active);
    }
}

async function resetGuild(guild) {
    const active = guild.roles.cache.find((r) => r.name === ACTIVE_ROLE);
    const master = guild.roles.cache.find((r) => r.name === MASTER_ROLE);
    if (!active && !master) return;

    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
        console.warn(`[dailyActivityRoles] Sem Manage Roles para resetar ${guild.name}`);
        return;
    }

    const members = await guild.members.fetch().catch(() => null);
    if (!members) return;

    for (const member of members.values()) {
        if (member.user.bot) continue;
        await removeRole(member, active);
        await removeRole(member, master);
    }
}

async function resetAllGuilds(client) {
    const today = getDayKey();
    if (today === lastResetDay) return;
    lastResetDay = today;

    for (const guild of client.guilds.cache.values()) {
        await resetGuild(guild);
    }

    console.log(`🕛 [dailyActivityRoles] Novo ciclo diário: ${today} (${TIME_ZONE})`);
}

function setup(client) {
    client.on('messageCreate', async (message) => {
        try {
            if (!message.guild || message.author.bot) return;
            await applyMilestone(message);
        } catch (e) {
            console.error('[dailyActivityRoles] message:', e.message);
        }
    });

    const check = setInterval(() => {
        resetAllGuilds(client).catch((e) => {
            console.error('[dailyActivityRoles] reset:', e.message);
        });
    }, 30 * 1000);

    // Garante reset também após um restart que atravesse a meia-noite.
    resetAllGuilds(client).catch(() => {});

    global.__aeternusDailyActivityTimer = check;
}

function destroy() {
    if (global.__aeternusDailyActivityTimer) {
        clearInterval(global.__aeternusDailyActivityTimer);
        global.__aeternusDailyActivityTimer = null;
    }
}

module.exports = { setup, destroy };
