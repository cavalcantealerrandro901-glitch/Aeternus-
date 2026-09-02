const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrefix, getSettings } = require('../utils/settings');
const xp = require('../utils/xp');
const afk = require('../utils/afk');
const msgStats = require('../utils/msgStats');
const antispam = require('../utils/antispam');
const pending = require('../utils/converterPending');
const { rerollDrop } = require('../systems/drops');
const autoRepair = require('../utils/autoRepair');
const { announceLevel } = require('../systems/guildModules');

const xpCd = new Map();
const pendingPing = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        try {
            const spam = antispam.check(message);
            if (spam.block) {
                await antispam.apply(message, spam);
                return;
            }
        } catch (_) {}

        try {
            const now = Date.now();
            const last = pendingPing.get(message.author.id) || 0;
            if (now - last > 120000) {
                pendingPing.set(message.author.id, now);
                const rel = pending.releaseDue(message.author.id);
                if (rel.length) {
                    const sum = rel
                        .map((r) => `• ${Number(r.amount).toLocaleString('pt-BR')} → ${r.deposited}`)
                        .join('\n');
                    message.channel
                        .send(`${message.author} 💼 **Câmbio liberado após 1 dia:**\n${sum}`)
                        .catch(() => {});
                }
            }
        } catch (_) {}

        try {
            if (message.content && message.content.length >= 1) {
                msgStats.add(message.guild.id, message.author.id, 1);
            }
        } catch (_) {}

        try {
            if (afk.has(message.author.id)) {
                afk.clear(message.author.id);
                message.reply('👋 AFK removido.').catch(() => {});
            }
            for (const [id] of message.mentions.users) {
                if (afk.has(id)) {
                    const d = afk.get(id);
                    message.reply(`💤 <@${id}> está AFK: **${d.reason}**`).catch(() => {});
                }
            }
        } catch (_) {}

        // Resposta a @bot: só menção direta, NUNCA na "linha de resposta" (reply)
        try {
            const botMentioned =
                message.mentions.users.has(client.user.id) && !message.mentions.everyone;

            if (botMentioned) {
                // Discord coloca menção automática ao responder uma msg do bot
                const isReply = Boolean(message.reference?.messageId);
                const prefix = getPrefix(message.guild.id);
                const startsWithPrefix = message.content
                    .toLowerCase()
                    .startsWith(prefix.toLowerCase());

                // se é reply OU já é comando com prefixo → não manda o embed de "Olá"
                if (!isReply && !startsWithPrefix) {
                    const stripped = message.content
                        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
                        .trim();

                    // só se a mensagem for só a menção (ou oi/ola/help)
                    const onlyMention =
                        stripped.length === 0 ||
                        /^(ol[aá]|oi|hey|help|ajuda|bot)\s*$/i.test(stripped);

                    if (onlyMention) {
                        const embed = new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL({ size: 64 })
                            })
                            .setTitle(`Olá, ${message.author.username}`)
                            .setDescription(
                                [
                                    `Eu sou o **${client.user.username}** — economia, jogos e utilidades.`,
                                    '',
                                    `**Prefixo:** \`${prefix}\``,
                                    `**Exemplos:** \`${prefix}ajuda\` · \`${prefix}saldo\` · \`${prefix}daily\` · \`${prefix}bj\``,
                                    '',
                                    `Digite \`${prefix}ajuda\` para a central completa.`
                                ].join('\n')
                            )
                            .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
                            .setFooter({ text: `${message.guild.name} · Aeternus` })
                            .setTimestamp();

                        await message.reply({ embeds: [embed] }).catch(() => {});
                        return;
                    }
                }
            }
        } catch (_) {}

        try {
            const conf = getSettings(message.guild.id).xp;
            if (conf.enabled !== false && message.content.length >= 3) {
                const key = `${message.guild.id}:${message.author.id}`;
                const now = Date.now();
                const cd = (conf.cooldownSec || 45) * 1000;
                if (!xpCd.has(key) || now - xpCd.get(key) > cd) {
                    xpCd.set(key, now);
                    const gain =
                        (conf.min || 30) +
                        Math.floor(Math.random() * ((conf.max || 77) - (conf.min || 30) + 1));
                    const res = xp.addXp(message.author.id, gain);
                    if (res.leveled) {
                        const lvlMsg = await announceLevel(message, res);
                        if (lvlMsg) {
                            setTimeout(() => lvlMsg.delete().catch(() => {}), 7000);
                        }
                    }
                }
            }
        } catch (_) {}

        const plainReroll = message.content.trim().match(/^reroll\s+(\d{15,25})$/i);
        if (plainReroll) {
            if (
                message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                message.member.permissions.has(PermissionFlagsBits.Administrator)
            ) {
                const result = await rerollDrop(client, plainReroll[1]);
                if (!result.ok) message.reply(`❌ ${result.error}`).catch(() => {});
                else message.reply(`✅ Reroll \`${plainReroll[1]}\` ok.`).catch(() => {});
            }
            return;
        }

        const prefix = getPrefix(message.guild.id);
        if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const name = (args.shift() || '').toLowerCase();
        if (!name) return;

        const cmd = client.commands.get(name);
        if (!cmd?.execute) return;

        try {
            await cmd.execute(message, args, client);
        } catch (e) {
            await autoRepair.handleCommandError({
                cmdName: cmd.name || name,
                error: e,
                context: `prefix · ${message.guild?.name || '?'} · #${message.channel?.name || message.channelId}`,
                message
            });
        }
    }
};
