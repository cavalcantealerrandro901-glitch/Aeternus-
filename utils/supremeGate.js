/**
 * SUPREME GATE — personalização de perfil (uma mensagem, várias etapas)
 * 1) Loading 3s → 2) Cargos paginados → 3) Regras paginadas → 4) Concluído
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

const ROLES_PER_PAGE = 5;
const RULES_PER_PAGE = 3;
const LOADING_MS = 3000;

/** @type {Map<string, object>} sessão em memória + persistência */
const sessions = new Map();

function readJson(file, fb = {}) {
    if (!fs.existsSync(file)) return fb;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fb;
    }
}
function writeJson(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sk(guildId, userId) {
    return `${guildId}:${userId}`;
}

function defaults() {
    return {
        enabled: false,
        channelId: null,
        logChannelId: null,
        color: '#7c3aed',
        visitorRoleId: null,
        verifiedRoleId: null,
        maxRoles: 10,
        // páginas de cargos: { title, roles: [{ label, roleId, emoji }] }
        rolePages: [
            {
                title: 'PERSONALIDADE',
                roles: [
                    { label: 'Explorador', roleId: '', emoji: '🌌' },
                    { label: 'Místico', roleId: '', emoji: '🔮' },
                    { label: 'Líder', roleId: '', emoji: '👑' },
                    { label: 'Guerreiro', roleId: '', emoji: '⚔️' },
                    { label: 'Estrategista', roleId: '', emoji: '🧠' }
                ]
            },
            {
                title: 'INTERESSES',
                roles: [
                    { label: 'Gamer', roleId: '', emoji: '🎮' },
                    { label: 'Anime', roleId: '', emoji: '🎭' },
                    { label: 'Música', roleId: '', emoji: '🎵' },
                    { label: 'Designer', roleId: '', emoji: '🎨' },
                    { label: 'Programador', roleId: '', emoji: '💻' }
                ]
            },
            {
                title: 'ENTRETENIMENTO',
                roles: [
                    { label: 'Filmes', roleId: '', emoji: '🎬' },
                    { label: 'Séries', roleId: '', emoji: '📺' },
                    { label: 'Livros', roleId: '', emoji: '📚' },
                    { label: 'Podcasts', roleId: '', emoji: '🎧' },
                    { label: 'Jogos', roleId: '', emoji: '🕹️' }
                ]
            },
            {
                title: 'NOTIFICAÇÕES',
                roles: [
                    { label: 'Sorteios', roleId: '', emoji: '🎁' },
                    { label: 'Eventos', roleId: '', emoji: '🎉' },
                    { label: 'Anúncios', roleId: '', emoji: '📢' },
                    { label: 'RPG', roleId: '', emoji: '⚔️' },
                    { label: 'Economia', roleId: '', emoji: '💰' }
                ]
            }
        ],
        rules: [
            { title: 'Respeito', text: 'Respeite todos os membros.' },
            { title: 'Proibições', text: 'Não pratique atividades proibidas pelas regras da plataforma.' },
            { title: 'Spam', text: 'Evite mensagens repetitivas ou perturbações.' },
            { title: 'Segurança', text: 'Não compartilhe informações pessoais.' },
            { title: 'Equipe', text: 'Respeite a equipe de moderação.' },
            { title: 'Conteúdo', text: 'Mantenha o conteúdo adequado aos canais.' }
        ],
        exploreChannelId: null
    };
}

function getConfig(guildId) {
    const g = settings.getGuild(guildId);
    const base = defaults();
    if (g.supremeGate && typeof g.supremeGate === 'object') {
        return { ...base, ...g.supremeGate, rolePages: g.supremeGate.rolePages || base.rolePages, rules: g.supremeGate.rules || base.rules };
    }
    // legado
    if (g.sgEnabled) base.enabled = g.sgEnabled === true || g.sgEnabled === 'true';
    if (g.sgChannel) base.channelId = g.sgChannel;
    if (g.sgLogChannel) base.logChannelId = g.sgLogChannel;
    if (g.sgVisitorRole) base.visitorRoleId = g.sgVisitorRole;
    if (g.sgVerifiedRole) base.verifiedRoleId = g.sgVerifiedRole;
    return base;
}

function setConfig(guildId, cfg) {
    settings.setKey(guildId, 'supremeGate', cfg);
    settings.setKey(guildId, 'sgEnabled', !!cfg.enabled);
    if (cfg.channelId) settings.setKey(guildId, 'sgChannel', cfg.channelId);
    if (cfg.logChannelId) settings.setKey(guildId, 'sgLogChannel', cfg.logChannelId);
    if (cfg.visitorRoleId) settings.setKey(guildId, 'sgVisitorRole', cfg.visitorRoleId);
    if (cfg.verifiedRoleId) settings.setKey(guildId, 'sgVerifiedRole', cfg.verifiedRoleId);
    return cfg;
}

function getSession(guildId, userId) {
    const key = sk(guildId, userId);
    if (sessions.has(key)) return sessions.get(key);
    const saved = readJson(DATA, {})[key] || {};
    const s = {
        step: saved.step || 'loading',
        rolePage: saved.rolePage || 0,
        rulesPage: saved.rulesPage || 0,
        selected: new Set(saved.selected || []),
        rulesAccepted: !!saved.rulesAccepted,
        messageId: saved.messageId || null,
        channelId: saved.channelId || null,
        finished: !!saved.finished
    };
    sessions.set(key, s);
    return s;
}

function saveSession(guildId, userId, s) {
    const key = sk(guildId, userId);
    sessions.set(key, s);
    const all = readJson(DATA, {});
    all[key] = {
        step: s.step,
        rolePage: s.rolePage,
        rulesPage: s.rulesPage,
        selected: [...s.selected],
        rulesAccepted: s.rulesAccepted,
        messageId: s.messageId,
        channelId: s.channelId,
        finished: s.finished,
        updatedAt: Date.now()
    };
    writeJson(DATA, all);
}

function bumpStat(guildId, key) {
    const all = readJson(STATS, {});
    if (!all[guildId]) all[guildId] = { joins: 0, leaves: 0, verified: 0 };
    all[guildId][key] = (all[guildId][key] || 0) + 1;
    writeJson(STATS, all);
}

function getStats(guildId) {
    return readJson(STATS, {})[guildId] || { joins: 0, leaves: 0, verified: 0 };
}

/** Flatten role pages → only entries with roleId */
function activePages(cfg) {
    const pages = (cfg.rolePages || []).map((p) => ({
        title: p.title || 'Cargos',
        roles: (p.roles || []).filter((r) => r.roleId)
    }));
    // garante páginas mesmo se vazias para UI (mín. 1)
    return pages.length ? pages : [{ title: 'Cargos', roles: [] }];
}

function color(cfg) {
    try {
        return cfg.color || 0x7c3aed;
    } catch {
        return 0x7c3aed;
    }
}

function embedLoading(member, cfg) {
    return new EmbedBuilder()
        .setColor(color(cfg))
        .setTitle('✦ PERSONALIZANDO SEU PERFIL')
        .setDescription(
            `Olá, ${member}.\n\n` +
                `Estamos preparando seu perfil para **${member.guild.name}**.\n\n` +
                `🔮 Carregando sistema de personalização...\n` +
                `Aguarde alguns segundos.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'SUPREME GATE · etapa 1/4' })
        .setTimestamp();
}

function embedRoles(member, cfg, session) {
    const pages = activePages(cfg);
    const total = Math.max(pages.length, 1);
    const page = Math.min(session.rolePage, total - 1);
    const p = pages[page] || { title: 'Cargos', roles: [] };
    const selected = [...session.selected];

    return new EmbedBuilder()
        .setColor(color(cfg))
        .setTitle('🛡️ PERSONALIZE SEU PERFIL')
        .setDescription(
            `Agora escolha os cargos que representam seus interesses.\n` +
                `Use o menu abaixo · **máx. ${cfg.maxRoles || 10}** cargos.\n\n` +
                `**✦ ${p.title}**\n` +
                `Selecionados: **${selected.length}**\n` +
                (selected.length
                    ? selected.map((id) => `<@&${id}>`).join(' ')
                    : '_Nenhum ainda_')
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `SUPREME GATE · Página ${page + 1}/${total} · etapa 2/4` })
        .setTimestamp();
}

function componentsRoles(cfg, session, guildId, userId) {
    const pages = activePages(cfg);
    const total = Math.max(pages.length, 1);
    const page = Math.min(session.rolePage, total - 1);
    const p = pages[page] || { title: 'Cargos', roles: [] };
    const rows = [];

    const roles = (p.roles || []).slice(0, ROLES_PER_PAGE);
    if (roles.length) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`sgj_roles_${guildId}_${userId}_${page}`)
            .setPlaceholder(`Escolha · ${p.title}`)
            .setMinValues(0)
            .setMaxValues(Math.min(roles.length, cfg.maxRoles || 10));

        for (const r of roles) {
            const opt = new StringSelectMenuOptionBuilder()
                .setLabel(String(r.label).slice(0, 100))
                .setValue(r.roleId)
                .setDefault(session.selected.has(r.roleId));
            if (r.emoji) {
                try {
                    opt.setEmoji(r.emoji);
                } catch (_) {}
            }
            menu.addOptions(opt);
        }
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sgj_rprev_${guildId}_${userId}`)
            .setLabel('ANTERIOR')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`sgj_rinfo_${guildId}_${userId}`)
            .setLabel(`${page + 1}/${total}`)
            .setEmoji('📄')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`sgj_rnext_${guildId}_${userId}`)
            .setLabel('PRÓXIMO')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
    );
    rows.push(nav);

    // Continuar só na última página (ou sempre disponível)
    const cont = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sgj_rgo_${guildId}_${userId}`)
            .setLabel('CONTINUAR')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
    );
    rows.push(cont);

    return rows;
}

function embedRulesIntro(member, cfg) {
    return new EmbedBuilder()
        .setColor(color(cfg))
        .setTitle('📜 ANTES DE CONTINUAR...')
        .setDescription(
            `Para finalizar a personalização do seu perfil, você precisa conhecer e aceitar as regras desta comunidade.\n\n` +
                `Leia atentamente todas as regras antes de continuar.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'SUPREME GATE · etapa 3/4' })
        .setTimestamp();
}

function componentsRulesIntro(guildId, userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sgj_read_${guildId}_${userId}`)
                .setLabel('LER REGRAS')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

function embedRulesPage(member, cfg, session) {
    const rules = cfg.rules || [];
    const totalPages = Math.max(1, Math.ceil(rules.length / RULES_PER_PAGE));
    const page = Math.min(session.rulesPage, totalPages - 1);
    const slice = rules.slice(page * RULES_PER_PAGE, page * RULES_PER_PAGE + RULES_PER_PAGE);
    const isLast = page >= totalPages - 1;

    let body = slice
        .map((r, i) => {
            const n = String(page * RULES_PER_PAGE + i + 1).padStart(2, '0');
            return `**${n}・${r.title}**\n${r.text}`;
        })
        .join('\n\n');

    if (isLast) {
        body +=
            '\n\n**🔐 CONFIRMAÇÃO**\nAo clicar abaixo, você confirma que leu e concorda com as regras da comunidade.';
    }

    return new EmbedBuilder()
        .setColor(color(cfg))
        .setTitle('📜 REGRAS DA COMUNIDADE')
        .setDescription(body || '_Sem regras configuradas._')
        .setFooter({ text: `SUPREME GATE · Regras ${page + 1}/${totalPages}` })
        .setTimestamp();
}

function componentsRulesPage(cfg, session, guildId, userId) {
    const rules = cfg.rules || [];
    const totalPages = Math.max(1, Math.ceil(rules.length / RULES_PER_PAGE));
    const page = Math.min(session.rulesPage, totalPages - 1);
    const isLast = page >= totalPages - 1;

    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sgj_uprev_${guildId}_${userId}`)
                .setLabel('ANTERIOR')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId(`sgj_uinfo_${guildId}_${userId}`)
                .setLabel(`${page + 1}/${totalPages}`)
                .setEmoji('📄')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`sgj_unext_${guildId}_${userId}`)
                .setLabel('PRÓXIMO')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(isLast)
        )
    ];

    if (isLast) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sgj_accept_${guildId}_${userId}`)
                    .setLabel('ACEITAR E CONTINUAR')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            )
        );
    }

    return rows;
}

function embedDone(member, cfg) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('👑 PERFIL CONFIGURADO')
        .setDescription(
            `✦ Tudo pronto, ${member}!\n\n` +
                `Seu perfil foi personalizado com sucesso.\n\n` +
                `🛡️ Cargos configurados.\n` +
                `📜 Regras aceitas.\n` +
                `🔐 Acesso liberado.\n\n` +
                `🌌 Sua jornada começa agora.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'SUPREME GATE · concluído' })
        .setTimestamp();
}

function componentsDone(cfg, guildId, userId) {
    const row = new ActionRowBuilder();
    if (cfg.exploreChannelId) {
        // Discord não permite link interno fácil; botão custom confirma
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`sgj_enter_${guildId}_${userId}`)
                .setLabel('ENTRAR NO SERVIDOR')
                .setEmoji('🌌')
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`sgj_enter_${guildId}_${userId}`)
                .setLabel('ENTRAR NO SERVIDOR')
                .setEmoji('🌌')
                .setStyle(ButtonStyle.Success)
        );
    }
    return [row];
}

async function render(message, member, cfg, session) {
    const guildId = member.guild.id;
    const userId = member.id;
    let embeds;
    let components;

    if (session.step === 'loading') {
        embeds = [embedLoading(member, cfg)];
        components = [];
    } else if (session.step === 'roles') {
        embeds = [embedRoles(member, cfg, session)];
        components = componentsRoles(cfg, session, guildId, userId);
    } else if (session.step === 'rules_intro') {
        embeds = [embedRulesIntro(member, cfg)];
        components = componentsRulesIntro(guildId, userId);
    } else if (session.step === 'rules') {
        embeds = [embedRulesPage(member, cfg, session)];
        components = componentsRulesPage(cfg, session, guildId, userId);
    } else {
        embeds = [embedDone(member, cfg)];
        components = componentsDone(cfg, guildId, userId);
    }

    await message.edit({ embeds, components, content: null }).catch(() => {});
}

async function sendLog(guild, cfg, text) {
    if (!cfg.logChannelId) return;
    const ch = await guild.channels.fetch(cfg.logChannelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    await ch
        .send({
            embeds: [
                new EmbedBuilder()
                    .setColor(color(cfg))
                    .setTitle('📋 SUPREME GATE')
                    .setDescription(text)
                    .setTimestamp()
            ]
        })
        .catch(() => {});
}

async function applySelectedRoles(member, session, cfg) {
    const allIds = new Set();
    for (const p of cfg.rolePages || []) {
        for (const r of p.roles || []) if (r.roleId) allIds.add(r.roleId);
    }
    for (const id of allIds) {
        if (session.selected.has(id)) {
            await member.roles.add(id).catch(() => {});
        } else if (member.roles.cache.has(id)) {
            await member.roles.remove(id).catch(() => {});
        }
    }
}

async function onMemberJoin(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled || !cfg.channelId) return;

    bumpStat(member.guild.id, 'joins');
    if (cfg.visitorRoleId) await member.roles.add(cfg.visitorRoleId).catch(() => {});

    const channel = await member.guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const session = getSession(member.guild.id, member.id);
    session.step = 'loading';
    session.rolePage = 0;
    session.rulesPage = 0;
    session.selected = new Set();
    session.rulesAccepted = false;
    session.finished = false;

    const msg = await channel.send({
        content: `${member}`,
        embeds: [embedLoading(member, cfg)],
        components: []
    });

    session.messageId = msg.id;
    session.channelId = channel.id;
    saveSession(member.guild.id, member.id, session);

    await sendLog(member.guild, cfg, `👋 **Entrada** · ${member} (\`${member.id}\`)`);

    // Após 3s → etapa de cargos (mesma mensagem)
    setTimeout(async () => {
        const s = getSession(member.guild.id, member.id);
        if (s.step !== 'loading') return;
        s.step = 'roles';
        saveSession(member.guild.id, member.id, s);
        const m = await channel.messages.fetch(msg.id).catch(() => null);
        if (m) await render(m, member, cfg, s);
    }, LOADING_MS);
}

async function onMemberLeave(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled) return;
    bumpStat(member.guild.id, 'leaves');
    await sendLog(
        member.guild,
        cfg,
        `🚪 **Saída** · **${member.user?.tag || member.id}** (\`${member.id}\`)`
    );
}

function onlyOwner(interaction, userId) {
    if (interaction.user.id !== userId) {
        interaction.reply({ content: 'Este portal não é seu.', ephemeral: true }).catch(() => {});
        return false;
    }
    return true;
}

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('sgj_')) return false;

    const parts = id.split('_');
    // sgj_ACTION_guildId_userId[...]
    const action = parts[1];
    const guildId = parts[2];
    const userId = parts[3];

    if (!onlyOwner(interaction, userId)) return true;
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Servidor inválido.', ephemeral: true });
        return true;
    }

    const cfg = getConfig(guildId);
    const member = interaction.member;
    const session = getSession(guildId, userId);

    // ——— Select cargos nesta página ———
    if (action === 'roles' && interaction.isStringSelectMenu()) {
        const pageRoles = activePages(cfg)[session.rolePage]?.roles || [];
        const pageIds = new Set(pageRoles.map((r) => r.roleId));
        // remove seleções desta página, aplica novas
        for (const rid of pageIds) session.selected.delete(rid);
        for (const v of interaction.values) {
            if (session.selected.size >= (cfg.maxRoles || 10) && !session.selected.has(v)) continue;
            session.selected.add(v);
        }
        // trim excess
        while (session.selected.size > (cfg.maxRoles || 10)) {
            const first = session.selected.values().next().value;
            session.selected.delete(first);
        }
        saveSession(guildId, userId, session);
        await applySelectedRoles(member, session, cfg);
        await interaction.update({
            embeds: [embedRoles(member, cfg, session)],
            components: componentsRoles(cfg, session, guildId, userId)
        });
        return true;
    }

    // Nav cargos
    if (action === 'rprev' || action === 'rnext') {
        const total = Math.max(activePages(cfg).length, 1);
        if (action === 'rprev') session.rolePage = Math.max(0, session.rolePage - 1);
        else session.rolePage = Math.min(total - 1, session.rolePage + 1);
        saveSession(guildId, userId, session);
        await interaction.update({
            embeds: [embedRoles(member, cfg, session)],
            components: componentsRoles(cfg, session, guildId, userId)
        });
        return true;
    }

    if (action === 'rgo') {
        session.step = 'rules_intro';
        saveSession(guildId, userId, session);
        await applySelectedRoles(member, session, cfg);
        await interaction.update({
            embeds: [embedRulesIntro(member, cfg)],
            components: componentsRulesIntro(guildId, userId)
        });
        await sendLog(
            interaction.guild,
            cfg,
            `🛡️ **Cargos** · ${member}\n${[...session.selected].map((id) => `<@&${id}>`).join(' ') || 'nenhum'}`
        );
        return true;
    }

    if (action === 'read') {
        session.step = 'rules';
        session.rulesPage = 0;
        saveSession(guildId, userId, session);
        await interaction.update({
            embeds: [embedRulesPage(member, cfg, session)],
            components: componentsRulesPage(cfg, session, guildId, userId)
        });
        return true;
    }

    if (action === 'uprev' || action === 'unext') {
        const total = Math.max(1, Math.ceil((cfg.rules || []).length / RULES_PER_PAGE));
        if (action === 'uprev') session.rulesPage = Math.max(0, session.rulesPage - 1);
        else session.rulesPage = Math.min(total - 1, session.rulesPage + 1);
        saveSession(guildId, userId, session);
        await interaction.update({
            embeds: [embedRulesPage(member, cfg, session)],
            components: componentsRulesPage(cfg, session, guildId, userId)
        });
        return true;
    }

    if (action === 'accept') {
        session.rulesAccepted = true;
        session.step = 'done';
        session.finished = true;
        saveSession(guildId, userId, session);
        bumpStat(guildId, 'verified');

        if (cfg.visitorRoleId) await member.roles.remove(cfg.visitorRoleId).catch(() => {});
        if (cfg.verifiedRoleId) await member.roles.add(cfg.verifiedRoleId).catch(() => {});

        await interaction.update({
            embeds: [embedDone(member, cfg)],
            components: componentsDone(cfg, guildId, userId)
        });

        await sendLog(
            interaction.guild,
            cfg,
            `🔐 **Verificado** · ${member} · <t:${Math.floor(Date.now() / 1000)}:F>`
        );
        return true;
    }

    if (action === 'enter') {
        let content = '🌌 Bem-vindo(a)! Explore o servidor.';
        if (cfg.exploreChannelId) content += ` Comece em <#${cfg.exploreChannelId}>.`;
        await interaction.reply({ content, ephemeral: true });
        return true;
    }

    return false;
}

async function sendTest(guild, user) {
    const cfg = getConfig(guild.id);
    if (!cfg.channelId) throw new Error('Configure o canal do portal');
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) throw new Error('Você precisa estar no servidor');
    // força join flow de teste
    const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel?.isTextBased()) throw new Error('Canal inválido');

    const session = getSession(guild.id, user.id);
    session.step = 'loading';
    session.rolePage = 0;
    session.rulesPage = 0;
    session.selected = new Set();
    session.finished = false;

    const msg = await channel.send({
        content: `🧪 Teste · ${member}`,
        embeds: [embedLoading(member, cfg)],
        components: []
    });
    session.messageId = msg.id;
    session.channelId = channel.id;
    saveSession(guild.id, user.id, session);

    setTimeout(async () => {
        const s = getSession(guild.id, user.id);
        s.step = 'roles';
        saveSession(guild.id, user.id, s);
        const m = await channel.messages.fetch(msg.id).catch(() => null);
        if (m) await render(m, member, cfg, s);
    }, LOADING_MS);

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
    getSession,
    saveSession
};
