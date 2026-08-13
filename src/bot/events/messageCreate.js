const { Events, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { chat, clearHistory } = require('../utils/ai');

const spamMap = new Map();

async function applyPunishment(message, action, duration, reason) {
    const member = message.member;
    if (!member) return false;
    if (
        member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return false;
    }
    try {
        await message.delete().catch(() => {});
        const fullReason = reason || 'Moderação automática — Aeternus';
        switch (action) {
            case 'delete':
                break;
            case 'warn':
                await message.channel
                    .send({ content: `⚠️ ${member} recebeu um aviso.\n**Motivo:** ${fullReason}` })
                    .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000));
                break;
            case 'timeout': {
                const minutes = duration || 10;
                if (member.moderatable) {
                    await member.timeout(minutes * 60 * 1000, fullReason);
                    await message.channel
                        .send({
                            content: `🔇 ${member} foi silenciado por **${minutes} min**.\n**Motivo:** ${fullReason}`
                        })
                        .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000));
                }
                break;
            }
            case 'kick':
                if (member.kickable) await member.kick(fullReason);
                break;
            case 'ban':
                if (member.bannable)
                    await member.ban({ reason: fullReason, deleteMessageSeconds: 0 });
                break;
        }
        return true;
    } catch (err) {
        console.error('Erro automod:', err.message);
        return false;
    }
}

async function runAutomod(message, automod) {
    if (!automod?.enabled) return;
    const content = message.content || '';
    const lower = content.toLowerCase();

    const badWords = automod.badWords || {};
    if (badWords.enabled && Array.isArray(badWords.words) && badWords.words.length) {
        const found = badWords.words.find((w) => w && lower.includes(String(w).toLowerCase()));
        if (found) {
            await applyPunishment(
                message,
                badWords.action || 'timeout',
                badWords.duration || 10,
                badWords.reason || `Palavra proibida: ${found}`
            );
            return true;
        }
    }

    const invites = automod.invites || {};
    if (invites.enabled) {
        if (/(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i.test(content)) {
            await applyPunishment(
                message,
                invites.action || 'timeout',
                invites.duration || 10,
                invites.reason || 'Convite não permitido'
            );
            return true;
        }
    }

    const links = automod.links || {};
    if (links.enabled && /https?:\/\/|www\./i.test(content)) {
        await applyPunishment(
            message,
            links.action || 'delete',
            links.duration || 5,
            links.reason || 'Links não permitidos'
        );
        return true;
    }

    const massMention = automod.massMention || {};
    if (massMention.enabled) {
        const limit = massMention.limit || 5;
        const mentionCount =
            (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
        if (mentionCount >= limit) {
            await applyPunishment(
                message,
                massMention.action || 'timeout',
                massMention.duration || 15,
                massMention.reason || `Menções em massa (${mentionCount})`
            );
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
                await applyPunishment(
                    message,
                    spam.action || 'timeout',
                    spam.duration || 10,
                    spam.reason || 'Spam detectado'
                );
                return true;
            }
        } else {
            spamMap.set(key, { content, count: 1, lastMsg: now });
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
    let command = client.commands.get(commandName);
    if (!command) {
        command = client.commands.find(
            (cmd) =>
                Array.isArray(cmd.aliases) &&
                cmd.aliases.map((a) => a.toLowerCase()).includes(commandName)
        );
    }
    if (!command || typeof command.executePrefix !== 'function') return false;
    try {
        await command.executePrefix(message, args, client);
        return true;
    } catch (err) {
        console.error(`Erro prefixo ${commandName}:`, err);
        await message.reply('⚠️ Erro ao executar este comando.').catch(() => {});
        return true;
    }
}

async function runAiMention(message, client) {
    const content = message.content || '';
    const botId = client.user.id;
    const mentioned = message.mentions.users.has(botId);
    const isReplyToBot =
        message.reference?.messageId &&
        (await message.channel.messages
            .fetch(message.reference.messageId)
            .then((m) => m.author?.id === botId)
            .catch(() => false));

    if (!mentioned && !isReplyToBot) return false;

    let prompt = content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
    if (!prompt && isReplyToBot) prompt = content.trim() || 'continue';
    if (!prompt) {
        await message.reply('Pergunte algo. Ex: meu saldo, comandos, clima em SP.');
        return true;
    }

    if (/^(reset|limpar|esquecer)$/i.test(prompt)) {
        clearHistory(message.author.id, message.guild?.id);
        await message.reply('Memória desta conversa apagada.');
        return true;
    }

    await message.channel.sendTyping().catch(() => {});

    const result = await chat(prompt, {
        userId: message.author.id,
        guildId: message.guild?.id,
        username: message.author.username,
        guildName: message.guild?.name,
        botName: client.user.username,
        guild: message.guild || null,
        client
    });

    if (!result.ok) {
        await message.reply(`⚠️ ${result.error}`);
        return true;
    }

    const text = result.reply.length > 2000 ? result.reply.slice(0, 1990) + '…' : result.reply;
    await message.reply({ content: text });
    return true;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;
        const config = db.getGuildConfig(message.guild.id);
        const c = client || message.client;
        if (await runPrefixCommand(message, c, config)) return;
        if (await runAiMention(message, c)) return;
        await runAutomod(message, config.automod || {});
    }
};
