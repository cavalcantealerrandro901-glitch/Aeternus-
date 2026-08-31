const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrefix, getSettings } = require('../utils/settings');
const xp = require('../utils/xp');
const afk = require('../utils/afk');
const msgStats = require('../utils/msgStats');
const antispam = require('../utils/antispam');
const pending = require('../utils/converterPending');
const { rerollDrop } = require('../systems/drops');

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

        // ── Menção ao bot → apresentação + prefixo do servidor ──────
        try {
            if (message.mentions.has(client.user) && !message.mentions.everyone) {
                const onlyMention =
                    message.content.replace(/<@!?\d+>/g, '').trim().length === 0 ||
                    /^(ol[aá]|oi|hey|help|ajuda)\s*$/i.test(
                        message.content.replace(/<@!?\d+>/g, '').trim()
                    );

                if (onlyMention || message.mentions.users.has(client.user.id)) {
                    // evita responder se for comando com menção no meio
                    const prefix = getPrefix(message.guild.id);
                    const startsWithPrefix = message.content
                        .toLowerCase()
                        .startsWith(prefix.toLowerCase());

                    if (!startsWithPrefix) {
                        const embed = new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL({ size: 64 })
                            })
                            .setTitle(`Olá, ${message.author.username}`)
                            .setDescription(
                                [
                                    `Eu sou o **${client.user.username}** — economia, jogos e utilidades para o seu servidor.`,
                                    '',
                                    `**Prefixo neste servidor:** \`${prefix}\``,
                                    `**Exemplos:** \`${prefix}ajuda\` · \`${prefix}saldo\` · \`${prefix}daily\``,
                                    '',
                                    'Também respondo a comandos **/** (slash).',
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
                        const lvlMsg = await message.channel
                            .send(
                                `✨ ${message.author} nível **${res.level}** · +❄️ ${res.reward.toLocaleString('pt-BR')}`
                            )
                            .catch(() => null);
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
            console.error(`[${name}]`, e);
            message.reply('❌ Erro ao executar.').catch(() => {});
        }
    }
};
