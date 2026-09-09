/**
 * Loop de cargos temporários: aviso no DM + remoção ao expirar
 */
const tempRoles = require('../utils/tempRoles');

const TICK_MS = 30 * 1000;

async function processExpire(client, entry) {
    const guild = await client.guilds.fetch(entry.guildId).catch(() => null);
    if (!guild) {
        tempRoles.removeEntry(entry.guildId, entry.key);
        return;
    }
    const member = await guild.members.fetch(entry.userId).catch(() => null);
    const role = guild.roles.cache.get(entry.roleId);

    if (member && role && member.roles.cache.has(role.id)) {
        await member.roles
            .remove(role, 'Cargo temporário expirado')
            .catch((e) => console.warn('[tempRoles] remove:', e.message));
    }

    try {
        const msgs = tempRoles.getMessages(entry.guildId);
        const user = await client.users.fetch(entry.userId).catch(() => null);
        if (user) {
            const text = tempRoles.fillTemplate(msgs.expirado, {
                user: user.username,
                cargo: role?.name || 'cargo',
                servidor: guild.name,
                tempo: tempRoles.formatDuration(0),
                tempo_restante: '0',
                fim: new Date(entry.endsAt).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                })
            });
            await user.send({ content: text }).catch(() => {});
        }
    } catch (_) {}

    tempRoles.removeEntry(entry.guildId, entry.key);
}

async function processNotify(client, entry) {
    const guild = await client.guilds.fetch(entry.guildId).catch(() => null);
    if (!guild) return;
    const role = guild.roles.cache.get(entry.roleId);
    const user = await client.users.fetch(entry.userId).catch(() => null);
    if (!user) {
        tempRoles.markNotified(entry.guildId, entry.key);
        return;
    }
    const left = Math.max(0, entry.endsAt - Date.now());
    const msgs = tempRoles.getMessages(entry.guildId);
    const text = tempRoles.fillTemplate(msgs.aviso, {
        user: user.username,
        cargo: role?.name || 'cargo',
        servidor: guild.name,
        tempo: tempRoles.formatDuration(left),
        tempo_restante: tempRoles.formatDuration(left),
        fim: new Date(entry.endsAt).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
        })
    });
    await user.send({ content: text }).catch(() => {});
    tempRoles.markNotified(entry.guildId, entry.key);
}

async function tick(client) {
    const { notify, expire } = tempRoles.listDue();
    for (const e of notify) {
        try {
            await processNotify(client, e);
        } catch (err) {
            console.warn('[tempRoles] notify:', err.message);
        }
    }
    for (const e of expire) {
        try {
            await processExpire(client, e);
        } catch (err) {
            console.warn('[tempRoles] expire:', err.message);
        }
    }
}

function setup(client) {
    console.log('[tempRoles] ativo · checagem a cada 30s');
    setTimeout(() => tick(client).catch(() => {}), 5000);
    setInterval(() => tick(client).catch(() => {}), TICK_MS);
}

module.exports = { setup, tick };
