const { Events, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

const spamMap = new Map();

async function applyPunishment(message, action, duration, reason) {
    const member = message.member;
    if (!member) return false;

    if (member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
        member.permissions.has(PermissionFlagsBits.Administrator)) {
        return false;
    }

    try {
        await message.delete().catch(() => {});
        const fullReason = reason || 'Moderação automática — Aeternus';

        switch (action) {
            case 'delete':
                break;
            case 'warn':
                await message.channel.send({
                    content: `⚠️ ${member} recebeu um aviso.\n**Motivo:** ${fullReason}`
                }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
                break;
            case 'timeout': {
                const minutes = duration || 10;
                if (member.moderatable) {
                    await member.timeout(minutes * 60 * 1000, fullReason);
                    await message.channel.send({
                        content: `🔇 ${member} foi silenciado por **${minutes} min**.\n**Motivo:** ${fullReason}`
                    }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
                }
                break;
            }
            case 'kick':
                if (member.kickable) await member.kick(fullReason);
                break;
            case 'ban':
                if (member.bannable) await member.ban({ reason: fullReason, deleteMessageSeconds: 0 });
                break;
        }
        return true;
    } catch (err) {
        console.error('Erro ao aplicar punição automod:', err.message);
        return false;
    }
}

async function runAutomod(message, automod) {
    if (!automod?.enabled) return;

    const content = message.content || '';
    const lower = content.toLowerCase();

    const badWords = automod.badWords || {};
    if (badWords.enabled && Array.isArray(badWords.words) && badWords.words.length) {
        const found = badWords.words.find(w => w && lower.includes(String(w).toLowerCase()));
        if (found) {
            await applyPunishment(message, badWords.action || 'timeout', badWords.duration || 10,
                badWords.reason || `Palavra proibida detectada: ${found}`);
            return true;
        }
    }

    const invites = automod.invites || {};
    if (invites.enabled) {
        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
        if (inviteRegex.test(content)) {
            await applyPunishment(message, invites.action || 'timeout', invites.duration || 10,
                invites.reason || 'Envio de convite do Discord não permitido');
            return true;
        }
    }

    const links = automod.links || {};
    if (links.enabled) {
        if (/https?:\/\/|www\./i.test(content)) {
            await applyPunishment(message, links.action || 'delete', links.duration || 5,
                links.reason || 'Envio de links não permitido');
            return true;
        }
    }

    const massMention = automod.massMention || {};
    if (massMention.enabled) {
        const limit = massMention.limit || 5;
        const mentionCount = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
        if (mentionCount >= limit) {
            await applyPunishment(message, massMention.action || 'timeout', massMention.duration || 15,
                massMention.reason || `Menções em massa (${mentionCount})`);
            return true;
        }
    }

    const spam = automod.spam || {};
    if (spam.enabled) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        const entry = spamMap.get(key);

        if (entry && entry.content === content && now - entry.lastMsg < 7000) {
            entry.count += 1;
            entry.lastMsg = now;
            if (entry.count >= (spam.limit || 4)) {
                spamMap.delete(key);
                await applyPunishment(message, spam.action || 'timeout', spam.duration || 10,
                    spam.reason || 'Spam detectado');
                return true;
            }
        } else {
            spamMap.set(key, { content, count: 1, lastMsg: now });
        }

        if (spamMap.size > 500) {
            for (const [k, v] of spamMap) {
                if (now - v.lastMsg > 15000) spamMap.delete(k);
            }
        }
    }

    return false;
}

async function runPrefixCommand(message, client, config) {
    const prefix = config.prefix || '!';
    const content = message.content || '';

    if (!content.startsWith(prefix)) return false;

    const withoutPrefix = content.slice(prefix.length).trim();
    if (!withoutPrefix) return false;

    const args = withoutPrefix.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Busca por nome ou aliases
    let command = client.commands.get(commandName);
    if (!command) {
        command = client.commands.find(cmd =>
            Array.isArray(cmd.aliases) && cmd.aliases.map(a => a.toLowerCase()).includes(commandName)
        );
    }

    if (!command) return false;

    try {
        // Preferência: executePrefix (comandos dual slash+prefix)
        if (typeof command.executePrefix === 'function') {
            await command.executePrefix(message, args, client);
            return true;
        }

        // Fallback: alguns comandos só têm execute (slash) — não forçar
        return false;
    } catch (err) {
        console.error(`Erro no comando prefixo ${commandName}:`, err);
        await message.reply('⚠️ Erro ao executar este comando.').catch(() => {});
        return true;
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        const config = db.getGuildConfig(message.guild.id);

        // 1) Comandos em prefixo (sempre, mesmo com automod off)
        const usedCommand = await runPrefixCommand(message, client || message.client, config);
        if (usedCommand) return;

        // 2) AutoMod
        await runAutomod(message, config.automod || {});
    }
};
