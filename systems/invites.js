const invitesStore = require('../utils/invites');
const cache = new Map();

async function cacheGuild(guild) {
    try {
        const invites = await guild.invites.fetch();
        const map = new Map();
        for (const inv of invites.values()) map.set(inv.code, inv.uses ?? 0);
        cache.set(guild.id, map);
    } catch {
        cache.set(guild.id, new Map());
    }
}

function setup(client) {
    const ready = async () => {
        for (const g of client.guilds.cache.values()) await cacheGuild(g);
        console.log(`📩 Convites cacheados: ${cache.size} servidor(es)`);
    };
    if (client.isReady?.()) ready();
    else client.once('clientReady', ready);

    client.on('guildCreate', (g) => cacheGuild(g).catch(() => {}));
    client.on('inviteCreate', (inv) => {
        if (!inv.guild) return;
        const map = cache.get(inv.guild.id) || new Map();
        map.set(inv.code, inv.uses ?? 0);
        cache.set(inv.guild.id, map);
    });
    client.on('inviteDelete', (inv) => {
        if (!inv.guild) return;
        cache.get(inv.guild.id)?.delete(inv.code);
    });

    client.on('guildMemberAdd', async (member) => {
        if (member.user.bot) return;
        try {
            const oldMap = cache.get(member.guild.id) || new Map();
            const newInvites = await member.guild.invites.fetch().catch(() => null);
            if (!newInvites) return;
            let used = null;
            for (const inv of newInvites.values()) {
                if ((inv.uses ?? 0) > (oldMap.get(inv.code) ?? 0)) {
                    used = inv;
                    break;
                }
            }
            const map = new Map();
            for (const inv of newInvites.values()) map.set(inv.code, inv.uses ?? 0);
            cache.set(member.guild.id, map);
            if (used?.inviter) invitesStore.addInvite(member.guild.id, used.inviter.id, member, used.code);
        } catch (e) {
            console.error('[invites]', e.message);
        }
    });

    client.on('guildMemberRemove', (member) => {
        try { invitesStore.markLeft(member.guild.id, member.id); } catch (_) {}
    });
}

module.exports = { setup };
