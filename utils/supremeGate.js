const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const settings = require('./settings');

const DATA_FILE = path.join(__dirname, '..', 'data', 'supremeGate.json');

function readProgress() {
    if (!fs.existsSync(DATA_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function writeProgress(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function progressKey(guildId, userId) {
    return `${guildId}:${userId}`;
}

function getProgress(guildId, userId) {
    const all = readProgress();
    return (
        all[progressKey(guildId, userId)] || {
            rules: false,
            verified: false,
            roles: false,
            interests: [],
            notifications: [],
            startedAt: null,
            finishedAt: null
        }
    );
}

function setProgress(guildId, userId, patch) {
    const all = readProgress();
    const k = progressKey(guildId, userId);
    all[k] = { ...getProgress(guildId, userId), ...patch };
    writeProgress(all);
    return all[k];
}

function cfg(guildId) {
    const g = settings.getGuild(guildId);
    return {
        enabled: g.sgEnabled === true || g.sgEnabled === 'true',
        channelId: g.sgChannel || g.welcomeChannel || null,
        logChannelId: g.sgLogChannel || null,
        visitorRoleId: g.sgVisitorRole || null,
        verifiedRoleId: g.sgVerifiedRole || null,
        color: g.sgColor || '#7c3aed',
        title: g.sgTitle || '🌌 UMA NOVA PRESENÇA SURGIU',
        message:
            g.sgMessage ||
            'Bem-vindo(a), **{username}**.\nVocê acaba de atravessar o **SUPREME GATE** de **{server}**.\nSomos **{memberCount}** presenças neste plano.',
        rulesText:
            g.sgRulesText ||
            '**⚖️ Conduta**\nRespeito e convivência.\n\n**🛡️ Segurança**\nProteja sua conta e a comunidade.\n\n**🚫 Proibições**\nSpam, abuso e conteúdo inadequado.\n\n**👑 Moderação**\nA equipe aplica as regras.\n\n**🌌 Comunidade**\nValorize o servidor e os membros.',
        // IDs separados por vírgula: label|roleId|emoji
        interestRoles: parseRoleList(g.sgInterestRoles),
        notifyRoles: parseRoleList(g.sgNotifyRoles)
    };
}

function parseRoleList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return String(raw)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('|').map((p) => p.trim());
            return {
                label: parts[0] || 'Cargo',
                roleId: parts[1] || '',
                emoji: parts[2] || undefined
            };
        })
        .filter((r) => r.roleId);
}

function vars(str, member) {
    const u = member.user || member;
    const g = member.guild;
    return String(str || '')
        .replace(/{user}/g, `<@${u.id}>`)
        .replace(/{username}/g, u.username)
        .replace(/{userId}/g, u.id)
        .replace(/{server}/g, g.name)
        .replace(/{memberCount}/g, String(g.memberCount))
        .replace(/{owner}/g, `<@${g.ownerId}>`);
}

async function log(guild, type, text) {
    const c = cfg(guild.id);
    if (!c.logChannelId) return;
    const ch = await guild.channels.fetch(c.logChannelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const colors = {
        join: 0x22c55e,
        rules: 0x38bdf8,
        verify: 0xa78bfa,
        roles: 0xf59e0b,
        leave: 0xef4444,
        error: 0xf43f5e
    };
    await ch
        .send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors[type] || 0x7c3aed)
                    .setTitle(`SUPREME GATE · ${type}`)
                    .setDescription(text)
                    .setTimestamp()
            ]
        })
        .catch(() => {});
}

function portalEmbed(member, c) {
    return new EmbedBuilder()
        .setColor(c.color)
        .setTitle(c.title)
        .setDescription(vars(c.message, member))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: '👤 Membro', value: `${member}`, inline: true },
            { name: '🏛️ Servidor', value: member.guild.name, inline: true },
            { name: '👥 Membros', value: String(member.guild.memberCount), inline: true }
        )
        .setFooter({ text: 'SUPREME GATE · clique para iniciar a jornada' })
        .setTimestamp();
}

function portalRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sg_start_${userId}`)
            .setLabel('INICIAR JORNADA')
            .setEmoji('✨')
            .setStyle(ButtonStyle.Primary)
    );
}

function rulesEmbed(member, c) {
    return new EmbedBuilder()
        .setColor(c.color)
        .setTitle('📜 CÓDIGO DE CONDUTA')
        .setDescription(vars(c.rulesText, member))
        .setFooter({ text: 'Leia com atenção antes de aceitar' });
}

function rulesRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sg_rules_${userId}`)
            .setLabel('LI E ACEITO AS REGRAS')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
    );
}

function pathEmbed() {
    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('🛡️ ESCOLHA SEU CAMINHO')
        .setDescription(
            'Sua jornada começa agora.\nEscolha os **interesses** que representam você.\nDepois configure suas **notificações**.'
        );
}

function interestSelect(userId, roles) {
    if (!roles.length) return null;
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`sg_int_${userId}`)
        .setPlaceholder('🎮 Interesses')
        .setMinValues(0)
        .setMaxValues(Math.min(roles.length, 25));
    roles.slice(0, 25).forEach((r) => {
        const opt = new StringSelectMenuOptionBuilder().setLabel(r.label.slice(0, 100)).setValue(r.roleId);
        if (r.emoji) opt.setEmoji(r.emoji);
        menu.addOptions(opt);
    });
    return new ActionRowBuilder().addComponents(menu);
}

function notifySelect(userId, roles) {
    if (!roles.length) return null;
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`sg_ntf_${userId}`)
        .setPlaceholder('🔔 Notificações')
        .setMinValues(0)
        .setMaxValues(Math.min(roles.length, 25));
    roles.slice(0, 25).forEach((r) => {
        const opt = new StringSelectMenuOptionBuilder().setLabel(r.label.slice(0, 100)).setValue(r.roleId);
        if (r.emoji) opt.setEmoji(r.emoji);
        menu.addOptions(opt);
    });
    return new ActionRowBuilder().addComponents(menu);
}

function continueRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sg_finish_${userId}`)
            .setLabel('CONCLUIR JORNADA')
            .setEmoji('👑')
            .setStyle(ButtonStyle.Primary)
    );
}

function doneEmbed(member) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('👑 ACESSO CONCEDIDO')
        .setDescription(
            `✦ Sua identidade foi registrada, **${member.user.username}**.\n\n` +
                `📜 Regras — **ACEITAS** ✅\n` +
                `🛡️ Cargos — **CONFIGURADOS** ✅\n` +
                `🔐 Verificação — **CONCLUÍDA** ✅\n` +
                `🌌 Acesso — **LIBERADO** ✅\n\n` +
                `Bem-vindo(a) à comunidade.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();
}

async function onMemberJoin(member) {
    const c = cfg(member.guild.id);
    if (!c.enabled || !c.channelId) return;

    if (c.visitorRoleId) {
        await member.roles.add(c.visitorRoleId).catch(() => {});
    }

    setProgress(member.guild.id, member.id, {
        rules: false,
        verified: false,
        roles: false,
        interests: [],
        notifications: [],
        startedAt: Date.now(),
        finishedAt: null
    });

    const channel = await member.guild.channels.fetch(c.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send({
        content: `${member}`,
        embeds: [portalEmbed(member, c)],
        components: [portalRow(member.id)]
    });

    await log(
        member.guild,
        'join',
        `🟢 **Entrada**\n${member} (\`${member.id}\`) entrou em **${member.guild.name}**.`
    );
}

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('sg_')) return false;

    const parts = id.split('_');
    const action = parts[1]; // start | rules | finish | int | ntf
    const userId = parts[2];

    if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'Este portal não é seu.', ephemeral: true }).catch(() => {});
        return true;
    }

    const member = interaction.member;
    const guild = interaction.guild;
    const c = cfg(guild.id);

    if (action === 'start') {
        await interaction.update({
            embeds: [rulesEmbed(member, c)],
            components: [rulesRow(userId)]
        });
        return true;
    }

    if (action === 'rules') {
        setProgress(guild.id, userId, { rules: true, verified: true });

        if (c.visitorRoleId) await member.roles.remove(c.visitorRoleId).catch(() => {});
        if (c.verifiedRoleId) await member.roles.add(c.verifiedRoleId).catch(() => {});

        await log(
            guild,
            'verify',
            `🔐 **Verificação**\n${member} aceitou as regras e foi verificado.`
        );

        const rows = [];
        const intRow = interestSelect(userId, c.interestRoles);
        const ntfRow = notifySelect(userId, c.notifyRoles);
        if (intRow) rows.push(intRow);
        if (ntfRow) rows.push(ntfRow);
        rows.push(continueRow(userId));

        await interaction.update({
            embeds: [pathEmbed()],
            components: rows
        });
        return true;
    }

    if (action === 'int' && interaction.isStringSelectMenu()) {
        const selected = interaction.values || [];
        const prev = getProgress(guild.id, userId);
        // remove old interest roles from config list
        for (const r of c.interestRoles) {
            if (prev.interests?.includes(r.roleId) && !selected.includes(r.roleId)) {
                await member.roles.remove(r.roleId).catch(() => {});
            }
        }
        for (const roleId of selected) {
            await member.roles.add(roleId).catch(() => {});
        }
        setProgress(guild.id, userId, { interests: selected, roles: true });
        await interaction.reply({ content: `🎮 Interesses atualizados (**${selected.length}**).`, ephemeral: true });
        await log(guild, 'roles', `🛡️ **Interesses**\n${member}: ${selected.map((id) => `<@&${id}>`).join(', ') || 'nenhum'}`);
        return true;
    }

    if (action === 'ntf' && interaction.isStringSelectMenu()) {
        const selected = interaction.values || [];
        const prev = getProgress(guild.id, userId);
        for (const r of c.notifyRoles) {
            if (prev.notifications?.includes(r.roleId) && !selected.includes(r.roleId)) {
                await member.roles.remove(r.roleId).catch(() => {});
            }
        }
        for (const roleId of selected) {
            await member.roles.add(roleId).catch(() => {});
        }
        setProgress(guild.id, userId, { notifications: selected });
        await interaction.reply({
            content: `🔔 Notificações atualizadas (**${selected.length}**).`,
            ephemeral: true
        });
        return true;
    }

    if (action === 'finish') {
        setProgress(guild.id, userId, { finishedAt: Date.now(), roles: true, verified: true, rules: true });
        await interaction.update({
            embeds: [doneEmbed(member)],
            components: []
        });
        await log(guild, 'verify', `👑 **Jornada concluída**\n${member} liberou o acesso completo.`);
        return true;
    }

    return false;
}

module.exports = {
    cfg,
    onMemberJoin,
    handleInteraction,
    getProgress,
    setProgress,
    log
};
