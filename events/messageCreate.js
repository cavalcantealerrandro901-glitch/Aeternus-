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

        // ── Aeternus Core: IA pública; gestão/GitHub só admin ────────────────
        try {
            const handled = await aeternusCore.handleOwnerMessage(message, client);
            if (handled) return;
        } catch (e) {
            console.error('[aeternusCore]', e.message);
        }

        // rest of file must remain intact - this push only if we have full file
        // FALLBACK: if truncated, don't use this approach
    }
};
