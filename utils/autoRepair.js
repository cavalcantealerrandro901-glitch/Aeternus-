/**
 * Auto-reparo + aviso de erros no DM do dono
 */
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const MAX_ATTEMPTS = 3;
const DM_COOLDOWN_MS = 45_000;
const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['commands', 'utils', 'systems', 'events', 'bot', 'web'];

/** @type {Map<string, { attempts: number, lastAt: number, lastError: string }>} */
const state = new Map();
/** @type {Map<string, number>} */
const dmCooldown = new Map();

let clientRef = null;
let hooksInstalled = false;

function setClient(client) {
    clientRef = client;
    installGlobalHooks();
}

function ownerIds() {
    const fromEnv = [
        process.env.OWNER_ID,
        process.env.OWNER_IDS,
        process.env.BOT_OWNER,
        process.env.ADMIN_ID
    ]
        .filter(Boolean)
        .flatMap((v) => String(v).split(/[,\s]+/))
        .map((s) => s.trim())
        .filter((s) => /^\d{15,25}$/.test(s));

    const unique = [...new Set(fromEnv)];
    if (unique.length) return unique;

    try {
        const app = clientRef?.application;
        const owner = app?.owner;
        if (owner?.id) return [String(owner.id)];
        if (owner?.members) return [...owner.members.keys()].map(String);
    } catch (_) {}
    return [];
}

function canDm(key) {
    const now = Date.now();
    const last = dmCooldown.get(key) || 0;
    if (now - last < DM_COOLDOWN_MS) return false;
    dmCooldown.set(key, now);
    return true;
}

async function dmOwners(embed) {
    const ids = ownerIds();
    if (!ids.length || !clientRef) {
        console.warn('[autoRepair] OWNER_ID não configurado — só log no console.');
        return false;
    }

    // Bot ainda não pronto (client.user null) → não tenta DM
    if (!clientRef.user?.id) {
        console.warn('[autoRepair] client ainda não ready — DM adiado.');
        return false;
    }

    let sent = false;
    for (const id of ids) {
        try {
            const user = await clientRef.users.fetch(String(id)).catch(() => null);
            if (!user?.id) continue;
            await user.send({ embeds: [embed] });
            sent = true;
        } catch (e) {
            console.warn(`[autoRepair] DM falhou ${id}:`, e?.message || e);
        }
    }
    return sent;
}

function walkJsFiles(dir, acc = [], depth = 0) {
    if (depth > 6) return acc;
    if (!fs.existsSync(dir)) return acc;
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return acc;
    }
    for (const ent of entries) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === 'data')
            continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walkJsFiles(full, acc, depth + 1);
        else if (ent.isFile() && ent.name.endsWith('.js')) acc.push(full);
    }
    return acc;
}

function searchProject(cmdName, error) {
    const needle = String(cmdName || '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');
    const errText = String(error?.stack || error?.message || error || '').toLowerCase();
    const pathFromErr = [];
    const re = /([\w./\\-]+\.js):(\d+)/g;
    let m;
    const stack = String(error?.stack || '');
    while ((m = re.exec(stack))) {
        pathFromErr.push(m[1].replace(/\\/g, '/'));
    }

    const files = [];
    for (const d of SCAN_DIRS) {
        walkJsFiles(path.join(ROOT, d), files);
    }

    const hits = [];
    for (const file of files) {
        const base = path.basename(file, '.js').toLowerCase();
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        let score = 0;
        const reasons = [];

        if (needle && base === needle) {
            score += 100;
            reasons.push('nome do arquivo = módulo');
        } else if (needle && base.includes(needle)) {
            score += 40;
            reasons.push('nome parcial');
        }

        for (const p of pathFromErr) {
            if (p.endsWith(rel) || rel.endsWith(p) || p.includes(base + '.js')) {
                score += 80;
                reasons.push('stack aponta para o arquivo');
                break;
            }
        }

        if (errText.includes(rel.toLowerCase()) || errText.includes(base + '.js')) {
            score += 30;
            reasons.push('erro menciona o arquivo');
        }

        if (score < 50 && needle && file.includes(`${path.sep}commands${path.sep}`)) {
            try {
                const raw = fs.readFileSync(file, 'utf8');
                if (
                    raw.includes(`name: '${needle}'`) ||
                    raw.includes(`name: "${needle}"`) ||
                    new RegExp(`aliases:[^\]]*['"]${needle}['"]`, 'i').test(raw)
                ) {
                    score += 90;
                    reasons.push('name/aliases no código');
                }
            } catch (_) {}
        }

        if (score > 0) hits.push({ file, rel, score, reason: reasons.join(', ') });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, 8);
}

function resolveCommandFile(cmdName) {
    const hits = searchProject(cmdName, null);
    const cmdHit = hits.find((h) => h.rel.startsWith('commands/'));
    if (cmdHit) return cmdHit.file;

    const direct = path.join(ROOT, 'commands', `${cmdName}.js`);
    if (fs.existsSync(direct)) return direct;
    return hits[0]?.file || null;
}

function sanitizeSlashName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32);
}

function ensureSlashData(cmd) {
    if (cmd.data) return;
    const n = sanitizeSlashName(cmd.name);
    if (!n) return;
    try {
        cmd.data = new SlashCommandBuilder()
            .setName(n)
            .setDescription(String(cmd.description || cmd.name || n).slice(0, 100))
            .addStringOption((o) =>
                o
                    .setName('args')
                    .setDescription('Argumentos do comando (opcional)')
                    .setRequired(false)
            );
    } catch (_) {}
}

function reloadCommand(cmdName) {
    if (!clientRef) return { ok: false, error: 'Client não inicializado' };

    const file = resolveCommandFile(cmdName);
    if (!file) return { ok: false, error: `Arquivo não encontrado para "${cmdName}"` };

    try {
        const resolved = require.resolve(file);
        delete require.cache[resolved];
        const cmd = require(file);
        if (!cmd?.name) return { ok: false, error: 'Módulo sem export name', file };
        if (typeof cmd.execute !== 'function' && typeof cmd.executeSlash !== 'function') {
            return { ok: false, error: 'Módulo sem execute/executeSlash', file };
        }

        ensureSlashData(cmd);

        for (const [key, val] of clientRef.commands.entries()) {
            if (val?.name === cmd.name) clientRef.commands.delete(key);
        }
        clientRef.commands.set(cmd.name, cmd);
        if (Array.isArray(cmd.aliases)) {
            for (const a of cmd.aliases) {
                clientRef.commands.set(String(a).toLowerCase(), cmd);
            }
        }
        if (cmd.data?.name) clientRef.slash.set(cmd.data.name, cmd);

        return { ok: true, cmd, file };
    } catch (e) {
        return { ok: false, error: e.message || String(e), file };
    }
}

function errorEmbed({ cmdName, error, context, searchHits, status, extra }) {
    const colors = { error: 0xef4444, success: 0x22c55e, fail: 0x7f1d1d, info: 0xf59e0b };
    const titles = {
        error: '🚨 Erro detectado',
        success: '✅ Módulo recarregado',
        fail: '❌ Falha ao recarregar',
        info: '🔍 Aviso do sistema'
    };

    const stack = String(error?.stack || error?.message || error || 'desconhecido').slice(0, 900);

    const searchLines =
        searchHits?.length > 0
            ? searchHits
                  .slice(0, 5)
                  .map((h, i) => `${i + 1}. \`${h.rel}\` (score ${h.score}) — ${h.reason}`)
            : ['_Nenhum arquivo correspondente._'];

    return new EmbedBuilder()
        .setColor(colors[status] || colors.error)
        .setTitle(titles[status] || titles.error)
        .setDescription(
            [
                `**Origem:** \`${cmdName || '?'}\``,
                context ? `**Contexto:** ${context}` : null,
                extra || null,
                '',
                '**Busca automática**',
                ...searchLines,
                '',
                '**Erro**',
                '```js',
                stack,
                '```'
            ]
                .filter((x) => x != null)
                .join('\n')
        )
        .setTimestamp();
}

async function reportError({ source = 'system', error, context = '', tryReload = false } = {}) {
    const name = String(source || 'system').toLowerCase().slice(0, 40);
    const errMsg = error?.message || String(error || 'erro');

    // ignora warnings inofensivos
    if (/DeprecationWarning|DEP0\d+|ExperimentalWarning/i.test(errMsg)) return { repaired: false };

    const key = `${name}:${errMsg.slice(0, 80)}`;

    console.error(`[autoRepair:${name}]`, error?.stack || errMsg);

    const searchHits = searchProject(name, error);

    if (canDm(`any:${key}`)) {
        await dmOwners(
            errorEmbed({
                cmdName: name,
                error,
                context: context || 'sistema / global',
                searchHits,
                status: 'error'
            })
        );
    }

    if (tryReload) {
        let repaired = false;
        let lastReload = null;
        for (let i = 1; i <= MAX_ATTEMPTS; i++) {
            lastReload = reloadCommand(name);
            if (lastReload.ok) {
                repaired = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 250 * i));
        }
        if (canDm(`res:${name}`)) {
            await dmOwners(
                errorEmbed({
                    cmdName: name,
                    error: {
                        message: repaired
                            ? `Recarregado: ${lastReload?.file || '?'}`
                            : `Não recarregou. ${lastReload?.error || ''}`
                    },
                    context,
                    searchHits,
                    status: repaired ? 'success' : 'fail'
                })
            );
        }
        return { repaired, searchHits };
    }

    return { repaired: false, searchHits };
}

async function handleCommandError({ cmdName, error, context, message, interaction }) {
    const name = String(cmdName || 'unknown').toLowerCase();
    const errMsg = error?.message || String(error);
    const now = Date.now();

    let st = state.get(name) || { attempts: 0, lastAt: 0, lastError: '' };
    if (now - st.lastAt > 10 * 60_000) st.attempts = 0;
    st.lastAt = now;
    st.lastError = errMsg;
    state.set(name, st);

    const result = await reportError({
        source: name,
        error,
        context: context || 'comando',
        tryReload: true
    });

    try {
        if (message?.reply) {
            await message.reply('❌ Erro ao executar. O dono foi avisado.').catch(() => {});
        } else if (interaction) {
            const payload = {
                content: '❌ Erro na interação. O dono foi avisado.',
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    } catch (_) {}

    return result;
}

function installGlobalHooks() {
    if (hooksInstalled) return;
    hooksInstalled = true;

    process.on('unhandledRejection', (err) => {
        reportError({
            source: 'unhandledRejection',
            error: err,
            context: 'Promise rejeitada sem catch'
        }).catch(() => {});
    });

    process.on('uncaughtException', (err) => {
        reportError({
            source: 'uncaughtException',
            error: err,
            context: 'Exceção não capturada (processo)'
        }).catch(() => {});
    });

    const originalError = console.error.bind(console);
    console.error = (...args) => {
        originalError(...args);
        try {
            const text = args
                .map((a) => (a instanceof Error ? a.stack || a.message : String(a)))
                .join(' ');
            if (text.includes('[autoRepair')) return;
            if (/DeprecationWarning|DEP0\d+|ExperimentalWarning/i.test(text)) return;
            if (
                /error|erro|cannot|failed|exception|undefined|null/i.test(text) &&
                text.length > 15
            ) {
                const src =
                    text.match(
                        /\[(music|counting|player|guildModules|interaction|Jio|SoundCloud|Audio)[^\]]*\]/i
                    )?.[0] || 'console';
                reportError({
                    source: String(src).replace(/[[\]]/g, '').slice(0, 32) || 'console',
                    error: { message: text.slice(0, 500), stack: text.slice(0, 900) },
                    context: 'console.error (sistema)'
                }).catch(() => {});
            }
        } catch (_) {}
    };

    console.log('[autoRepair] hooks globais instalados (DM em qualquer erro)');
}

function getStatus() {
    const out = [];
    for (const [name, st] of state.entries()) {
        out.push({
            name,
            attempts: st.attempts,
            lastAt: st.lastAt,
            lastError: st.lastError
        });
    }
    return out.sort((a, b) => b.lastAt - a.lastAt);
}

function scanAll(query) {
    return searchProject(query || '', null);
}

module.exports = {
    setClient,
    handleCommandError,
    reportError,
    reloadCommand,
    searchProject,
    scanAll,
    ownerIds,
    getStatus,
    installGlobalHooks,
    MAX_ATTEMPTS
};
