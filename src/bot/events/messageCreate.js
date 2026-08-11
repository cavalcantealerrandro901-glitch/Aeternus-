const { Events, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

// Anti-spam: userId -> { count, lastMsg, content }
const spamMap = new Map();

async function applyPunishment(message, action, duration, reason) {
    const member = message.member;
    if (!member) return;

    // Não pune quem tem permissão de moderar
    if (member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
        member.permissions.has(PermissionFlagsBits.Administrator)) {
        return false;
    }

    try {
        await message.delete().catch(() => {});

        const fullReason = reason || 'Moderação automática — Aeternus';

        switch (action) {
            case 'delete':
                // só apaga
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
                if (member.kickable) {
                    await member.kick(fullReason);
                }
                break;
            case 'ban':
                if (member.bannable) {
                    await member.ban({ reason: fullReason, deleteMessageSeconds: 0 });
                }
                break;
        }
        return true;
    } catch (err) {
        console.error('Erro ao aplicar punição automod:', err.message);
        return false;
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild || message.author.bot) return;

        const config = db.getGuildConfig(message.guild.id);
        const automod = config.automod || {};
        if (!automod.enabled) return;

        const content = message.content || '';
        const lower = content.toLowerCase();

        // —— Palavras proibidas ——
        const badWords = automod.badWords || {};
        if (badWords.enabled && Array.isArray(badWords.words) && badWords.words.length) {
            const found = badWords.words.find(w => w && lower.includes(String(w).toLowerCase()));
            if (found) {
                await applyPunishment(
                    message,
                    badWords.action || 'timeout',
                    badWords.duration || 10,
                    badWords.reason || `Palavra proibida detectada: ${found}`
                );
                return;
            }
        }

        // —— Convites do Discord ——
        const invites = automod.invites || {};
        if (invites.enabled) {
            const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;
            if (inviteRegex.test(content)) {
                await applyPunishment(
                    message,
                    invites.action || 'timeout',
                    invites.duration || 10,
                    invites.reason || 'Envio de convite do Discord não permitido'
                );
                return;
            }
        }

        // —— Links ——
        const links = automod.links || {};
        if (links.enabled) {
            const linkRegex = /https?:\/\/|www\./i;
            if (linkRegex.test(content)) {
                await applyPunishment(
                    message,
                    links.action || 'delete',
                    links.duration || 5,
                    links.reason || 'Envio de links não permitido'
                );
                return;
            }
        }

        // —— Menções em massa ——
        const massMention = automod.massMention || {};
        if (massMention.enabled) {
            const limit = massMention.limit || 5;
            const mentionCount = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
            if (mentionCount >= limit) {
                await applyPunishment(
                    message,
                    massMention.action || 'timeout',
                    massMention.duration || 15,
                    massMention.reason || `Menções em massa (${mentionCount})`
                );
                return;
            }
        }

        // —— Spam (mesma mensagem repetida) ——
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
                    await applyPunishment(
                        message,
                        spam.action || 'timeout',
                        spam.duration || 10,
                        spam.reason || 'Spam detectado'
                    );
                    return;
                }
            } else {
                spamMap.set(key, { content, count: 1, lastMsg: now });
            }

            // Limpa entradas antigas
            if (spamMap.size > 500) {
                for (const [k, v] of spamMap) {
                    if (now - v.lastMsg > 15000) spamMap.delete(k);
                }
            }
        }
    }
};
