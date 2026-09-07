/**
 * Cargos por reação (VIP e outros)
 * Config: O.cargoreacao / /cargo-reacao
 */
const { PermissionFlagsBits } = require('discord.js');
const rr = require('../utils/reactionRoles');

function emojiMatch(reaction, stored) {
    const name = reaction.emoji?.name || '';
    const id = reaction.emoji?.id || null;
    const str = reaction.emoji?.toString?.() || name;
    if (!stored) return false;
    if (id && String(stored).includes(String(id))) return true;
    if (stored === str || stored === name) return true;
    return false;
}

async function resolveEntry(cfg, reaction) {
    if (!cfg?.roles?.length) return null;
    return cfg.roles.find((r) => emojiMatch(reaction, r.emoji)) || null;
}

async function handleAdd(client, reaction, user) {
    if (user.bot) return;
    try {
        if (reaction.partial) await reaction.fetch().catch(() => null);
        const message = reaction.message;
        if (!message?.guild) return;

        const cfg = rr.get(message.guild.id);
        if (!cfg.enabled || !cfg.messageId) return;
        if (message.id !== cfg.messageId) return;

        const entry = await resolveEntry(cfg, reaction);
        if (!entry) return;

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const role = message.guild.roles.cache.get(entry.roleId);
        if (!role) return;

        const me = message.guild.members.me;
        if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return;
        if (role.position >= me.roles.highest.position) return;

        if (!cfg.allowMultiple) {
            for (const r of cfg.roles) {
                if (r.roleId === entry.roleId) continue;
                if (member.roles.cache.has(r.roleId)) {
                    await member.roles.remove(r.roleId).catch(() => {});
                }
            }
        }

        if (!member.roles.cache.has(entry.roleId)) {
            await member.roles.add(entry.roleId, 'Cargo por reação VIP');
        }
    } catch (e) {
        console.warn('[reactionRoles] add:', e.message);
    }
}

async function handleRemove(client, reaction, user) {
    if (user.bot) return;
    try {
        if (reaction.partial) await reaction.fetch().catch(() => null);
        const message = reaction.message;
        if (!message?.guild) return;

        const cfg = rr.get(message.guild.id);
        if (!cfg.enabled || !cfg.messageId) return;
        if (message.id !== cfg.messageId) return;

        const entry = await resolveEntry(cfg, reaction);
        if (!entry) return;

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;
        if (!member.roles.cache.has(entry.roleId)) return;

        await member.roles.remove(entry.roleId, 'Removeu reação VIP').catch(() => {});
    } catch (e) {
        console.warn('[reactionRoles] remove:', e.message);
    }
}

function setup(client) {
    client.on('messageReactionAdd', (reaction, user) => {
        handleAdd(client, reaction, user).catch(() => {});
    });
    client.on('messageReactionRemove', (reaction, user) => {
        handleRemove(client, reaction, user).catch(() => {});
    });
    console.log('[reactionRoles] cargos por reação ativos');
}

module.exports = { setup };
