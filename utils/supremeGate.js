/**
 * SUPREME GATE — módulo profissional de entrada
 * Boas-vindas · Saída · Regras · Verificação · Cargos · Logs
 */
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

const DATA = path.join(__dirname, '..', 'data', 'supremeGate.json');
const STATS = path.join(__dirname, '..', 'data', 'sgStats.json');

const BUTTON_STYLES = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger
};

function readJson(file, fallback = {}) {
    if (!fs.existsSync(file)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJson(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/** Config padrão por servidor */
function defaults() {
    return {
        enabled: false,
        theme: 'arcano',
        // Boas-vindas
        welcome: {
            enabled: true,
            channelId: null,
            title: '🌌 UMA NOVA PRESENÇA CHEGOU',
            description:
                'Seja muito bem-vindo(a), {user}!\n\n✦ Você acaba de entrar em **{server}**.\n👥 Somos agora **{memberCount}** membros.\n\nEsperamos que você aproveite sua jornada por aqui.',
            color: '#7c3aed',
            footer: 'SUPREME GATE · {server}',
            thumbnail: 'avatar',
            image: '',
            author: '',
            ping: true,
            buttons: [
                { label: '📜 Regras', style: 'secondary', action: 'rules' },
                { label: '🛡️ Cargos', style: 'primary', action: 'roles' }
            ]
        },
        // Saída
        leave: {
            enabled: true,
            channelId: null,
            title: '🌙 UMA JORNADA CHEGOU AO FIM',
            description:
                '**{username}** deixou **{server}**.\n\n👥 Membros atuais: **{memberCount}**\n\nEsperamos que nossos caminhos se cruzem novamente.',
            color: '#64748b',
            footer: 'SUPREME GATE'
        },
        // Regras
        rules: {
            channelId: null,
            title: '📜 CÓDIGO DE CONDUTA',
            color: '#38bdf8',
            items: [
                { emoji: '⚖️', title: 'Respeito', text: 'Trate todos os membros com respeito.' },
                { emoji: '🚫', title: 'Proibições', text: 'Não utilize o servidor para atividades proibidas.' },
                { emoji: '🛡️', title: 'Segurança', text: 'Nunca compartilhe informações pessoais.' },
                { emoji: '👑', title: 'Moderação', text: 'Respeite a equipe responsável pela comunidade.' }
            ],
            acceptLabel: '✅ ACEITAR REGRAS',
            acceptDm: true
        },
        // Cargos
        roles: {
            visitorId: null,
            verifiedId: null,
            interests: [
                { label: 'Gamer', roleId: '', emoji: '🎮' },
                { label: 'Anime', roleId: '', emoji: '🎭' },
                { label: 'Programador', roleId: '', emoji: '💻' },
                { label: 'Designer', roleId: '', emoji: '🎨' },
                { label: 'Música', roleId: '', emoji: '🎵' },
                { label: 'Tecnologia', roleId: '', emoji: '🤖' }
            ],
            notifications: [
                { label: 'Sorteios', roleId: '', emoji: '🎁' },
                { label: 'Eventos', roleId: '', emoji: '🎉' },
                { label: 'Anúncios', roleId: '', emoji: '📢' },
                { label: 'Economia', roleId: '', emoji: '💰' }
            ],
            interestMin: 0,
            interestMax: 6,
            notifyMin: 0,
            notifyMax: 6
        },
        // Logs
        logs: {
            channelId: null,
            join: true,
            leave: true,
            rules: true,
            roles: true,
            verify: true,
            errors: true
        }
    };
}

function getConfig(guildId) {
    const g = settings.getGuild(guildId);
    const base = defaults();
    // merge legado sg*
    if (g.sgEnabled) base.enabled = g.sgEnabled === true || g.sgEnabled === 'true';
    if (g.sgChannel) base.welcome.channelId = g.sgChannel;
    if (g.sgLogChannel) base.logs.channelId = g.sgLogChannel;
    if (g.sgVisitorRole) base.roles.visitorId = g.sgVisitorRole;
    if (g.sgVerifiedRole) base.roles.verifiedId = g.sgVerifiedRole;
    if (g.sgTitle) base.welcome.title = g.sgTitle;
    if (g.sgMessage) base.welcome.description = g.sgMessage;
    if (g.sgColor) base.welcome.color = g.sgColor;
    if (g.sgRulesText) {
        base.rules.items = [{ emoji: '📜', title: 'Regras', text: g.sgRulesText }];
    }
    if (g.supremeGate && typeof g.supremeGate === 'object') {
        return deepMerge(base, g.supremeGate);
    }
    return base;
}

function setConfig(guildId, cfg) {
    return settings.setKey(guildId, 'supremeGate', cfg);
}

function deepMerge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b || {})) {
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
            out[k] = deepMerge(a[k] || {}, b[k]);
        } else {
            out[k] = b[k];
        }
    }
    return out;
}

function replaceVars(str, member, guild) {
    if (!str) return '';
    const u = member?.user || member || {};
    const g = guild || member?.guild || {};
    const created = u.createdTimestamp ? Math.floor(u.createdTimestamp / 1000) : null;
    const joined = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    return String(str)
        .replace(/{user}/g, u.id ? `<@${u.id}>` : '')
        .replace(/{username}/g, u.username || '')
        .replace(/{displayName}/g, member?.displayName || u.username || '')
        .replace(/{userId}/g, u.id || '')
        .replace(/{server}/g, g.name || '')
        .replace(/{serverId}/g, g.id || '')
        .replace(/{memberCount}/g, String(g.memberCount ?? ''))
        .replace(/{userAvatar}/g, u.displayAvatarURL?.({ size: 256 }) || '')
        .replace(/{serverIcon}/g, g.iconURL?.({ size: 256 }) || '')
        .replace(/{createdAt}/g, created ? `<t:${created}:D>` : '')
        .replace(/{joinedAt}/g, joined ? `<t:${joined}:D>` : '');
}

function buildEmbed(opts, member, guild) {
    const e = new EmbedBuilder().setColor(opts.color || '#7c3aed');
    if (opts.title) e.setTitle(replaceVars(opts.title, member, guild));
    if (opts.description) e.setDescription(replaceVars(opts.description, member, guild));
    if (opts.footer) e.setFooter({ text: replaceVars(opts.footer, member, guild).slice(0, 2048) });
    if (opts.author) e.setAuthor({ name: replaceVars(opts.author, member, guild).slice(0, 256) });
    if (opts.image) e.setImage(replaceVars(opts.image, member, guild));
    if (opts.thumbnail === 'avatar' && member?.user) {
        e.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
    } else if (opts.thumbnail && opts.thumbnail !== 'avatar') {
        e.setThumbnail(replaceVars(opts.thumbnail, member, guild));
    }
    e.setTimestamp();
    return e;
}

function buildWelcomeButtons(guildId, buttons) {
    if (!buttons?.length) return [];
    const row = new ActionRowBuilder();
    for (const b of buttons.slice(0, 5)) {
        const btn = new ButtonBuilder()
            .setLabel((b.label || 'Botão').slice(0, 80))
            .setStyle(BUTTON_STYLES[b.style] || ButtonStyle.Secondary);

        if (b.emoji) {
            try {
                btn.setEmoji(b.emoji);
            } catch (_) {}
        }

        if (b.action === 'url' && b.url) {
            btn.setStyle(ButtonStyle.Link).setURL(b.url);
        } else {
            const act = b.action || 'rules';
            btn.setCustomId(`sgv2_${act}_${guildId}`);
        }
        row.addComponents(btn);
    }
    return [row];
}

function rulesEmbed(cfg, member, guild) {
    const items = cfg.rules.items || [];
    const body = items
        .map((r, i) => `**${r.emoji || '✦'} ${r.title || `Regra ${i + 1}`}**\n${r.text || ''}`)
        .join('\n\n');
    return new EmbedBuilder()
        .setColor(cfg.rules.color || '#38bdf8')
        .setTitle(cfg.rules.title || '📜 CÓDIGO DE CONDUTA')
        .setDescription(body || 'Sem regras configuradas.')
        .setFooter({ text: replaceVars('{server}', member, guild) })
        .setTimestamp();
}

function acceptRow(guildId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sgv2_accept_${guildId}`)
            .setLabel('✅ ACEITAR REGRAS')
            .setStyle(ButtonStyle.Success)
    );
}

function rolesPanel(cfg, guildId) {
    const rows = [];
    const interests = (cfg.roles.interests || []).filter((r) => r.roleId);
    const notifs = (cfg.roles.notifications || []).filter((r) => r.roleId);

    if (interests.length) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`sgv2_int_${guildId}`)
            .setPlaceholder('🎮 Escolha seus interesses')
            .setMinValues(cfg.roles.interestMin || 0)
            .setMaxValues(Math.min(cfg.roles.interestMax || interests.length, interests.length, 25));
        interests.slice(0, 25).forEach((r) => {
            const o = new StringSelectMenuOptionBuilder().setLabel(r.label.slice(0, 100)).setValue(r.roleId);
            if (r.emoji) o.setEmoji(r.emoji);
            menu.addOptions(o);
        });
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    if (notifs.length) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`sgv2_ntf_${guildId}`)
            .setPlaceholder('🔔 Notificações')
            .setMinValues(cfg.roles.notifyMin || 0)
            .setMaxValues(Math.min(cfg.roles.notifyMax || notifs.length, notifs.length, 25));
        notifs.slice(0, 25).forEach((r) => {
            const o = new StringSelectMenuOptionBuilder().setLabel(r.label.slice(0, 100)).setValue(r.roleId);
            if (r.emoji) o.setEmoji(r.emoji);
            menu.addOptions(o);
        });
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    return rows;
}

function bumpStat(guildId, key) {
    const all = readJson(STATS, {});
    if (!all[guildId]) all[guildId] = { joins: 0, leaves: 0, verified: 0 };
    all[guildId][key] = (all[guildId][key] || 0) + 1;
    writeJson(STATS, all);
}

function getStats(guildId) {
    const all = readJson(STATS, {});
    return all[guildId] || { joins: 0, leaves: 0, verified: 0 };
}

function markAccepted(guildId, userId) {
    const all = readJson(DATA, {});
    const k = `${guildId}:${userId}`;
    all[k] = { ...(all[k] || {}), rules: true, verified: true, at: Date.now() };
    writeJson(DATA, all);
}

function hasAccepted(guildId, userId) {
    const all = readJson(DATA, {});
    return !!all[`${guildId}:${userId}`]?.rules;
}

async function sendLog(guild, cfg, type, description) {
    if (!cfg.logs?.channelId) return;
    if (cfg.logs[type] === false) return;
    const ch = await guild.channels.fetch(cfg.logs.channelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const colors = {
        join: 0x22c55e,
        leave: 0x64748b,
        rules: 0x38bdf8,
        roles: 0xf59e0b,
        verify: 0xa78bfa,
        errors: 0xef4444
    };
    await ch
        .send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors[type] || 0x7c3aed)
                    .setTitle(`📋 GATE · ${type}`)
                    .setDescription(description)
                    .setTimestamp()
            ]
        })
        .catch(() => {});
}

async function onMemberJoin(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled) return;

    bumpStat(member.guild.id, 'joins');

    if (cfg.roles.visitorId) {
        await member.roles.add(cfg.roles.visitorId).catch(() => {});
    }

    if (cfg.welcome?.enabled && cfg.welcome.channelId) {
        const ch = await member.guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
        if (ch?.isTextBased()) {
            const embed = buildEmbed(cfg.welcome, member, member.guild);
            const components = buildWelcomeButtons(member.guild.id, cfg.welcome.buttons);
            await ch
                .send({
                    content: cfg.welcome.ping ? `${member}` : undefined,
                    embeds: [embed],
                    components
                })
                .catch((e) => console.error('[GATE welcome]', e.message));
        }
    }

    await sendLog(
        member.guild,
        cfg,
        'join',
        `👋 **Entrada**\n${member} (\`${member.id}\`)\nConta: ${replaceVars('{createdAt}', member, member.guild)}`
    );
}

async function onMemberLeave(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled) return;

    bumpStat(member.guild.id, 'leaves');

    if (cfg.leave?.enabled && cfg.leave.channelId) {
        const ch = await member.guild.channels.fetch(cfg.leave.channelId).catch(() => null);
        if (ch?.isTextBased()) {
            const embed = buildEmbed(cfg.leave, member, member.guild);
            await ch.send({ embeds: [embed] }).catch(() => {});
        }
    }

    await sendLog(
        member.guild,
        cfg,
        'leave',
        `🚪 **Saída**\n**${member.user?.tag || member.id}** (\`${member.id}\`)`
    );
}

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('sgv2_')) return false;

    const parts = id.split('_');
    // sgv2_action_guildId
    const action = parts[1];
    const guildId = parts[2] || interaction.guildId;

    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Servidor inválido.', ephemeral: true }).catch(() => {});
        return true;
    }

    const cfg = getConfig(guildId);
    const member = interaction.member;

    if (action === 'rules') {
        await interaction.reply({
            embeds: [rulesEmbed(cfg, member, interaction.guild)],
            components: [acceptRow(guildId)],
            ephemeral: true
        });
        return true;
    }

    if (action === 'roles') {
        const rows = rolesPanel(cfg, guildId);
        if (!rows.length) {
            await interaction.reply({
                content: 'Nenhum cargo de interesse/notificação configurado.',
                ephemeral: true
            });
            return true;
        }
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#7c3aed')
                    .setTitle('🛡️ ESCOLHA SEU CAMINHO')
                    .setDescription('Selecione interesses e notificações nos menus abaixo.')
            ],
            components: rows,
            ephemeral: true
        });
        return true;
    }

    if (action === 'accept') {
        markAccepted(guildId, interaction.user.id);
        bumpStat(guildId, 'verified');

        if (cfg.roles.visitorId) await member.roles.remove(cfg.roles.visitorId).catch(() => {});
        if (cfg.roles.verifiedId) await member.roles.add(cfg.roles.verifiedId).catch(() => {});

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('✅ REGRAS ACEITAS')
                    .setDescription(
                        'Você confirmou que leu e concorda com as regras.\n🔓 Seu acesso foi atualizado.'
                    )
            ],
            ephemeral: true
        });

        if (cfg.rules.acceptDm) {
            await interaction.user
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle(`✅ Verificado em ${interaction.guild.name}`)
                            .setDescription('Regras aceitas. Bem-vindo(a)!')
                    ]
                })
                .catch(() => {});
        }

        await sendLog(
            interaction.guild,
            cfg,
            'verify',
            `🔐 **Verificação**\n${member} aceitou as regras.`
        );
        return true;
    }

    if (action === 'int' && interaction.isStringSelectMenu()) {
        const selected = interaction.values;
        const list = (cfg.roles.interests || []).map((r) => r.roleId).filter(Boolean);
        for (const roleId of list) {
            if (member.roles.cache.has(roleId) && !selected.includes(roleId)) {
                await member.roles.remove(roleId).catch(() => {});
            }
        }
        for (const roleId of selected) {
            await member.roles.add(roleId).catch(() => {});
        }
        await interaction.reply({
            content: `🎮 Interesses: **${selected.length}** cargo(s).`,
            ephemeral: true
        });
        await sendLog(
            interaction.guild,
            cfg,
            'roles',
            `🛡️ **Interesses** · ${member}\n${selected.map((id) => `<@&${id}>`).join(' ') || '—'}`
        );
        return true;
    }

    if (action === 'ntf' && interaction.isStringSelectMenu()) {
        const selected = interaction.values;
        const list = (cfg.roles.notifications || []).map((r) => r.roleId).filter(Boolean);
        for (const roleId of list) {
            if (member.roles.cache.has(roleId) && !selected.includes(roleId)) {
                await member.roles.remove(roleId).catch(() => {});
            }
        }
        for (const roleId of selected) {
            await member.roles.add(roleId).catch(() => {});
        }
        await interaction.reply({
            content: `🔔 Notificações: **${selected.length}** cargo(s).`,
            ephemeral: true
        });
        await sendLog(
            interaction.guild,
            cfg,
            'roles',
            `🔔 **Notificações** · ${member}\n${selected.map((id) => `<@&${id}>`).join(' ') || '—'}`
        );
        return true;
    }

    return false;
}

/** Teste: envia preview no canal de boas-vindas */
async function sendTest(guild, user) {
    const cfg = getConfig(guild.id);
    const member =
        guild.members.cache.get(user.id) ||
        (await guild.members.fetch(user.id).catch(() => null));
    if (!member) throw new Error('Membro não encontrado');
    if (!cfg.welcome.channelId) throw new Error('Configure o canal de boas-vindas');
    const ch = await guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
    if (!ch?.isTextBased()) throw new Error('Canal inválido');

    const embed = buildEmbed(cfg.welcome, member, guild);
    embed.setFooter({ text: '🧪 MODO TESTE · SUPREME GATE' });
    const components = buildWelcomeButtons(guild.id, cfg.welcome.buttons);
    await ch.send({ content: `🧪 Teste por ${user}`, embeds: [embed], components });
    return true;
}

module.exports = {
    defaults,
    getConfig,
    setConfig,
    getStats,
    onMemberJoin,
    onMemberLeave,
    handleInteraction,
    sendTest,
    replaceVars,
    buildEmbed,
    rulesEmbed
};
