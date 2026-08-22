/**
 * SUPREME GATE — processo de personalização de perfil
 * Etapa 1 loading → 2 cargos (páginas) → 3 regras → 4 concluído
 * Uma única mensagem atualizada por usuário
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

/** Sessões em memória: key guildId:userId */
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
        welcome: {
            enabled: true,
            channelId: null,
            color: '#7c3aed',
            ping: true
        },
        leave: {
            enabled: true,
            channelId: null,
            title: '🌙 UMA JORNADA CHEGOU AO FIM',
            description:
                '**{username}** deixou **{server}**.\n👥 Membros: **{memberCount}**',
            color: '#64748b',
            footer: 'SUPREME GATE'
        },
        roles: {
            visitorId: null,
            verifiedId: null,
            maxSelect: 15,
            /** páginas de cargos: { title, items:[{label,roleId,emoji}] } */
            pages: [
                {
                    title: 'PERSONALIDADE',
                    items: [
                        { label: 'Explorador', roleId: '', emoji: '🌌' },
                        { label: 'Místico', roleId: '', emoji: '🔮' },
                        { label: 'Líder', roleId: '', emoji: '👑' },
                        { label: 'Guerreiro', roleId: '', emoji: '⚔️' },
                        { label: 'Estrategista', roleId: '', emoji: '🧠' }
                    ]
                },
                {
                    title: 'INTERESSES',
                    items: [
                        { label: 'Gamer', roleId: '', emoji: '🎮' },
                        { label: 'Anime', roleId: '', emoji: '🎭' },
                        { label: 'Música', roleId: '', emoji: '🎵' },
                        { label: 'Designer', roleId: '', emoji: '🎨' },
                        { label: 'Programador', roleId: '', emoji: '💻' }
                    ]
                },
                {
                    title: 'ENTRETENIMENTO',
                    items: [
                        { label: 'Filmes', roleId: '', emoji: '🎬' },
                        { label: 'Séries', roleId: '', emoji: '📺' },
                        { label: 'Livros', roleId: '', emoji: '📚' },
                        { label: 'Podcasts', roleId: '', emoji: '🎧' },
                        { label: 'Jogos', roleId: '', emoji: '🕹️' }
                    ]
                },
                {
                    title: 'NOTIFICAÇÕES',
                    items: [
                        { label: 'Sorteios', roleId: '', emoji: '🎁' },
                        { label: 'Eventos', roleId: '', emoji: '🎉' },
                        { label: 'Anúncios', roleId: '', emoji: '📢' },
                        { label: 'RPG', roleId: '', emoji: '⚔️' },
                        { label: 'Economia', roleId: '', emoji: '💰' }
                    ]
                }
            ]
        },
        rules: {
            color: '#38bdf8',
            items: [
                { title: 'Respeito', text: 'Respeite todos os membros.' },
                { title: 'Proibições', text: 'Não pratique atividades proibidas pela plataforma.' },
                { title: 'Spam', text: 'Evite mensagens repetitivas ou perturbações.' },
                { title: 'Segurança', text: 'Não compartilhe informações pessoais.' },
                { title: 'Equipe', text: 'Respeite a equipe de moderação.' },
                { title: 'Canais', text: 'Use cada canal conforme sua finalidade.' }
            ]
        },
        logs: {
            channelId: null,
            join: true,
            leave: true,
            rules: true,
            roles: true,
            verify: true
        }
    };
}

function deepMerge(a, b) {
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b || {})) {
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
            out[k] = deepMerge(a[k] || {}, b[k]);
        } else {
            out[k] = b[k];
        }
    }
    return out;
}

function getConfig(guildId) {
    const g = settings.getGuild(guildId);
    let base = defaults();
    if (g.supremeGate && typeof g.supremeGate === 'object') {
        base = deepMerge(base, g.supremeGate);
    }
    // legado
    if (g.sgEnabled === true || g.sgEnabled === 'true') base.enabled = true;
    if (g.sgChannel) base.welcome.channelId = g.sgChannel;
    if (g.sgLogChannel) base.logs.channelId = g.sgLogChannel;
    if (g.sgVisitorRole) base.roles.visitorId = g.sgVisitorRole;
    if (g.sgVerifiedRole) base.roles.verifiedId = g.sgVerifiedRole;
    return base;
}

function setConfig(guildId, cfg) {
    settings.setKey(guildId, 'supremeGate', cfg);
    settings.setKey(guildId, 'sgEnabled', !!cfg.enabled);
    if (cfg.welcome?.channelId) settings.setKey(guildId, 'sgChannel', cfg.welcome.channelId);
    if (cfg.logs?.channelId) settings.setKey(guildId, 'sgLogChannel', cfg.logs.channelId);
    if (cfg.roles?.visitorId) settings.setKey(guildId, 'sgVisitorRole', cfg.roles.visitorId);
    if (cfg.roles?.verifiedId) settings.setKey(guildId, 'sgVerifiedRole', cfg.roles.verifiedId);
    return getConfig(guildId);
}

function replaceVars(str, member, guild) {
    if (!str) return '';
    const u = member?.user || member || {};
    const g = guild || member?.guild || {};
    const created = u.createdTimestamp ? Math.floor(u.createdTimestamp / 1000) : null;
    return String(str)
        .replace(/{user}/g, u.id ? `<@${u.id}>` : '')
        .replace(/{username}/g, u.username || '')
        .replace(/{displayName}/g, member?.displayName || u.username || '')
        .replace(/{userId}/g, u.id || '')
        .replace(/{server}/g, g.name || '')
        .replace(/{memberCount}/g, String(g.memberCount ?? ''));
}

function colorInt(hex) {
    if (!hex) return 0x7c3aed;
    const h = String(hex).replace('#', '');
    const n = parseInt(h, 16);
    return Number.isFinite(n) ? n : 0x7c3aed;
}

/** Lista plana de cargos válidos a partir das páginas */
function flatRoles(cfg) {
    const pages = cfg.roles?.pages || [];
    const out = [];
    for (const p of pages) {
        for (const it of p.items || []) {
            if (it.roleId) out.push({ ...it, pageTitle: p.title || '' });
        }
    }
    return out;
}

/** Páginas efetivas (só com roleId ou placeholders para demo UI) */
function rolePages(cfg) {
    const pages = cfg.roles?.pages || [];
    // garante pelo menos estrutura de páginas; itens sem roleId não entram no select
    return pages.map((p) => ({
        title: p.title || 'Cargos',
        items: (p.items || []).filter((i) => i.roleId).slice(0, ROLES_PER_PAGE)
    })).filter((p) => p.items.length > 0);
}

function getSession(guildId, userId) {
    const key = sk(guildId, userId);
    if (!sessions.has(key)) {
        const saved = readJson(DATA, {})[key] || {};
        sessions.set(key, {
            step: 'loading', // loading | roles | rules_intro | rules | done
            rolePage: 0,
            rulesPage: 0,
            selected: new Set(saved.selected || []),
            accepted: !!saved.accepted,
            messageId: null,
            channelId: null,
            startedAt: Date.now()
        });
    }
    return sessions.get(key);
}

function persistSession(guildId, userId, sess) {
    const all = readJson(DATA, {});
    all[sk(guildId, userId)] = {
        selected: [...sess.selected],
        accepted: sess.accepted,
        finishedAt: sess.finishedAt || null,
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

async function sendLog(guild, cfg, type, text) {
    if (!cfg.logs?.channelId || cfg.logs[type] === false) return;
    const ch = await guild.channels.fetch(cfg.logs.channelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const colors = { join: 0x22c55e, leave: 0x64748b, rules: 0x38bdf8, roles: 0xf59e0b, verify: 0xa78bfa };
    await ch
        .send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors[type] || 0x7c3aed)
                    .setTitle(`📋 GATE · ${type}`)
                    .setDescription(text)
                    .setTimestamp()
            ]
        })
        .catch(() => {});
}

/* ───────── UI builders ───────── */

function embedLoading(member, cfg) {
    return new EmbedBuilder()
        .setColor(colorInt(cfg.welcome?.color))
        .setTitle('✦ PERSONALIZANDO SEU PERFIL')
        .setDescription(
            `Olá, ${member}.\n\n` +
                `Estamos preparando seu perfil para este servidor.\n\n` +
                `🔮 Carregando sistema de personalização...\n` +
                `Aguarde alguns segundos.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `SUPREME GATE · ${member.guild.name}` })
        .setTimestamp();
}

function embedRoles(member, cfg, sess) {
    const pages = rolePages(cfg);
    const total = Math.max(pages.length, 1);
    const page = Math.min(sess.rolePage, total - 1);
    const cur = pages[page] || { title: 'Cargos', items: [] };
    const selectedCount = sess.selected.size;

    return new EmbedBuilder()
        .setColor(colorInt(cfg.welcome?.color))
        .setTitle('🛡️ PERSONALIZE SEU PERFIL')
        .setDescription(
            `Agora escolha os cargos que representam seus interesses.\n\n` +
                `**${cur.title}** · Página **${page + 1}/${total}**\n` +
                `Selecionados: **${selectedCount}**` +
                (cfg.roles.maxSelect ? ` / máx. ${cfg.roles.maxSelect}` : '') +
                `\n\nUse o menu abaixo e navegue com os botões.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: `✦ Página ${page + 1}/${total} · SUPREME GATE` });
}

function componentsRoles(guildId, userId, cfg, sess) {
    const pages = rolePages(cfg);
    const total = Math.max(pages.length, 1);
    const page = Math.min(sess.rolePage, total - 1);
    const cur = pages[page] || { items: [] };
    const rows = [];

    if (cur.items.length) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`sgx_role_${guildId}_${userId}_${page}`)
            .setPlaceholder(`Escolha nesta página (${cur.items.length})`)
            .setMinValues(0)
            .setMaxValues(Math.min(cur.items.length, 5));

        for (const it of cur.items) {
            const opt = new StringSelectMenuOptionBuilder()
                .setLabel(String(it.label).slice(0, 100))
                .setValue(it.roleId)
                .setDefault(sess.selected.has(it.roleId));
            if (it.emoji) {
                try {
                    opt.setEmoji(it.emoji);
                } catch (_) {}
            }
            menu.addOptions(opt);
        }
        rows.push(new ActionRowBuilder().addComponents(menu));
    }

    const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sgx_prev_${guildId}_${userId}`)
            .setLabel('ANTERIOR')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`sgx_page_${guildId}_${userId}`)
            .setLabel(`📄 ${page + 1}/${total}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`sgx_next_${guildId}_${userId}`)
            .setLabel('PRÓXIMO')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
    );
    rows.push(nav);

    // Continuar só na última página
    if (page >= total - 1) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sgx_continue_${guildId}_${userId}`)
                    .setLabel('CONTINUAR')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            )
        );
    }

    return rows;
}

function embedRulesIntro(member) {
    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('📜 ANTES DE CONTINUAR...')
        .setDescription(
            `Para finalizar a personalização do seu perfil, você precisa conhecer e aceitar as regras desta comunidade.\n\n` +
                `Leia atentamente todas as regras antes de continuar.`
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }));
}

function componentsRulesIntro(guildId, userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sgx_readrules_${guildId}_${userId}`)
                .setLabel('LER REGRAS')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

function embedRulesPage(member, cfg, sess) {
    const items = cfg.rules?.items || [];
    const total = Math.max(Math.ceil(items.length / RULES_PER_PAGE), 1);
    const page = Math.min(sess.rulesPage, total - 1);
    const slice = items.slice(page * RULES_PER_PAGE, page * RULES_PER_PAGE + RULES_PER_PAGE);

    let body = slice
        .map((r, i) => {
            const n = String(page * RULES_PER_PAGE + i + 1).padStart(2, '0');
            return `**${n}・${r.title}**\n${r.text}`;
        })
        .join('\n\n');

    if (page >= total - 1) {
        body +=
            `\n\n───\n**🔐 CONFIRMAÇÃO**\n` +
            `Ao clicar abaixo, você confirma que leu e concorda com as regras.`;
    }

    return new EmbedBuilder()
        .setColor(colorInt(cfg.rules?.color || '#38bdf8'))
        .setTitle('📜 REGRAS DA COMUNIDADE')
        .setDescription(body || '_Nenhuma regra configurada._')
        .setFooter({ text: `📄 ${page + 1}/${total}` });
}

function componentsRulesPage(guildId, userId, cfg, sess) {
    const items = cfg.rules?.items || [];
    const total = Math.max(Math.ceil(items.length / RULES_PER_PAGE), 1);
    const page = Math.min(sess.rulesPage, total - 1);
    const rows = [];

    const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sgx_rprev_${guildId}_${userId}`)
            .setLabel('ANTERIOR')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`sgx_rpage_${guildId}_${userId}`)
            .setLabel(`📄 ${page + 1}/${total}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`sgx_rnext_${guildId}_${userId}`)
            .setLabel('PRÓXIMO')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1)
    );
    rows.push(nav);

    if (page >= total - 1) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sgx_accept_${guildId}_${userId}`)
                    .setLabel('ACEITAR E CONTINUAR')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            )
        );
    }
    return rows;
}

function embedDone(member) {
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
        .setTimestamp();
}

function componentsDone(guildId, userId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sgx_enter_${guildId}_${userId}`)
                .setLabel('ENTRAR NO SERVIDOR')
                .setEmoji('🌌')
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

async function editSessionMessage(client, sess, payload) {
    if (!sess.messageId || !sess.channelId) return;
    const ch = await client.channels.fetch(sess.channelId).catch(() => null);
    if (!ch) return;
    const msg = await ch.messages.fetch(sess.messageId).catch(() => null);
    if (!msg) return;
    await msg.edit(payload).catch(() => {});
}

async function applyRoleSelection(member, cfg, selectedSet) {
    const allIds = flatRoles(cfg).map((r) => r.roleId);
    for (const id of allIds) {
        if (member.roles.cache.has(id) && !selectedSet.has(id)) {
            await member.roles.remove(id).catch(() => {});
        }
    }
    for (const id of selectedSet) {
        if (!member.roles.cache.has(id)) {
            await member.roles.add(id).catch(() => {});
        }
    }
}

/* ───────── Join / Leave ───────── */

async function onMemberJoin(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled || !cfg.welcome?.channelId) return;

    bumpStat(member.guild.id, 'joins');

    if (cfg.roles?.visitorId) {
        await member.roles.add(cfg.roles.visitorId).catch(() => {});
    }

    const channel = await member.guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const sess = getSession(member.guild.id, member.id);
    sess.step = 'loading';
    sess.rolePage = 0;
    sess.rulesPage = 0;
    // recupera seleções salvas se houver
    const saved = readJson(DATA, {})[sk(member.guild.id, member.id)];
    if (saved?.selected?.length) sess.selected = new Set(saved.selected);

    const msg = await channel.send({
        content: cfg.welcome.ping !== false ? `${member}` : undefined,
        embeds: [embedLoading(member, cfg)],
        components: []
    });

    sess.messageId = msg.id;
    sess.channelId = channel.id;

    await sendLog(
        member.guild,
        cfg,
        'join',
        `👋 **Entrada**\n${member} (\`${member.id}\`) · personalização iniciada`
    );

    // Após 3s → etapa cargos
    setTimeout(async () => {
        try {
            const s = getSession(member.guild.id, member.id);
            if (s.step !== 'loading') return;
            s.step = 'roles';
            await msg.edit({
                content: cfg.welcome.ping !== false ? `${member}` : null,
                embeds: [embedRoles(member, cfg, s)],
                components: componentsRoles(member.guild.id, member.id, cfg, s)
            });
        } catch (e) {
            console.error('[GATE loading→roles]', e.message);
        }
    }, LOADING_MS);
}

async function onMemberLeave(member) {
    const cfg = getConfig(member.guild.id);
    if (!cfg.enabled) return;
    bumpStat(member.guild.id, 'leaves');

    if (cfg.leave?.enabled && cfg.leave.channelId) {
        const ch = await member.guild.channels.fetch(cfg.leave.channelId).catch(() => null);
        if (ch?.isTextBased()) {
            const e = new EmbedBuilder()
                .setColor(colorInt(cfg.leave.color))
                .setTitle(replaceVars(cfg.leave.title, member, member.guild))
                .setDescription(replaceVars(cfg.leave.description, member, member.guild))
                .setTimestamp();
            await ch.send({ embeds: [e] }).catch(() => {});
        }
    }
    await sendLog(
        member.guild,
        cfg,
        'leave',
        `🚪 **Saída**\n**${member.user?.tag || member.id}** (\`${member.id}\`)`
    );
}

/* ───────── Interactions ───────── */

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('sgx_')) return false;

    const parts = id.split('_');
    // sgx_ACTION_guildId_userId[_extra]
    const action = parts[1];
    const guildId = parts[2];
    const userId = parts[3];

    if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'Esta personalização não é sua.', ephemeral: true }).catch(() => {});
        return true;
    }
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Servidor inválido.', ephemeral: true }).catch(() => {});
        return true;
    }

    const cfg = getConfig(guildId);
    const member = interaction.member;
    const sess = getSession(guildId, userId);

    // ── Select cargos ──
    if (action === 'role' && interaction.isStringSelectMenu()) {
        const pageIdx = parseInt(parts[4], 10) || 0;
        const pages = rolePages(cfg);
        const pageItems = pages[pageIdx]?.items || [];
        const pageIds = pageItems.map((i) => i.roleId);

        // remove seleções desta página e aplica novas
        for (const rid of pageIds) sess.selected.delete(rid);
        for (const rid of interaction.values) {
            if (cfg.roles.maxSelect && sess.selected.size >= cfg.roles.maxSelect) break;
            sess.selected.add(rid);
        }

        await applyRoleSelection(member, cfg, sess.selected);
        persistSession(guildId, userId, sess);

        await interaction.update({
            embeds: [embedRoles(member, cfg, sess)],
            components: componentsRoles(guildId, userId, cfg, sess)
        });

        await sendLog(
            interaction.guild,
            cfg,
            'roles',
            `🛡️ **Cargos** · ${member}\n${[...sess.selected].map((x) => `<@&${x}>`).join(' ') || '—'}`
        );
        return true;
    }

    // ── Navegação cargos ──
    if (action === 'prev' || action === 'next') {
        const pages = rolePages(cfg);
        const total = Math.max(pages.length, 1);
        if (action === 'prev') sess.rolePage = Math.max(0, sess.rolePage - 1);
        else sess.rolePage = Math.min(total - 1, sess.rolePage + 1);

        await interaction.update({
            embeds: [embedRoles(member, cfg, sess)],
            components: componentsRoles(guildId, userId, cfg, sess)
        });
        return true;
    }

    if (action === 'continue') {
        sess.step = 'rules_intro';
        await interaction.update({
            embeds: [embedRulesIntro(member)],
            components: componentsRulesIntro(guildId, userId)
        });
        return true;
    }

    if (action === 'readrules') {
        sess.step = 'rules';
        sess.rulesPage = 0;
        await interaction.update({
            embeds: [embedRulesPage(member, cfg, sess)],
            components: componentsRulesPage(guildId, userId, cfg, sess)
        });
        return true;
    }

    if (action === 'rprev' || action === 'rnext') {
        const items = cfg.rules?.items || [];
        const total = Math.max(Math.ceil(items.length / RULES_PER_PAGE), 1);
        if (action === 'rprev') sess.rulesPage = Math.max(0, sess.rulesPage - 1);
        else sess.rulesPage = Math.min(total - 1, sess.rulesPage + 1);

        await interaction.update({
            embeds: [embedRulesPage(member, cfg, sess)],
            components: componentsRulesPage(guildId, userId, cfg, sess)
        });
        return true;
    }

    if (action === 'accept') {
        sess.accepted = true;
        sess.finishedAt = Date.now();
        sess.step = 'done';
        persistSession(guildId, userId, sess);
        bumpStat(guildId, 'verified');

        if (cfg.roles.visitorId) await member.roles.remove(cfg.roles.visitorId).catch(() => {});
        if (cfg.roles.verifiedId) await member.roles.add(cfg.roles.verifiedId).catch(() => {});

        await interaction.update({
            embeds: [embedDone(member)],
            components: componentsDone(guildId, userId)
        });

        await sendLog(
            interaction.guild,
            cfg,
            'verify',
            `🔐 **Verificado**\n${member} aceitou as regras · ${new Date().toLocaleString('pt-BR')}`
        );
        return true;
    }

    if (action === 'enter') {
        await interaction.reply({
            content: `🌌 Bem-vindo(a) a **${interaction.guild.name}**! Explore os canais e aproveite.`,
            ephemeral: true
        });
        return true;
    }

    return false;
}

async function sendTest(guild, user) {
    const cfg = getConfig(guild.id);
    if (!cfg.welcome?.channelId) throw new Error('Configure o canal do portal');
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) throw new Error('Você precisa estar no servidor');
    // reutiliza fluxo de join
    await onMemberJoin(member);
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
    rolePages,
    ROLES_PER_PAGE
};
