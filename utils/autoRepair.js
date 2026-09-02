/**
 * Sistema de auto-reparo de comandos
 * - Notifica o dono no DM quando um comando quebra
 * - Tenta recarregar o módulo até 3 vezes
 * - Avisa no DM se recuperou ou se falhou de vez
 */
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const MAX_ATTEMPTS = 3;
const DM_COOLDOWN_MS = 45_000;

/** @type {Map<string, { attempts: number, lastAt: number, lastError: string }>} */
const state = new Map();

/** @type {Map<string, number>} */
const dmCooldown = new Map();

let clientRef = null;

function setClient(client) {
    clientRef = client;
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
        if (app?.owner?.id) return [app.owner.id];
        if (app?.owner?.members) {
            return [...app.owner.members.keys()];
        }
    } catch (_) {}

    return [];
}

function commandsDir() {
    return path.join(__dirname, '..', 'commands');
}

function resolveCommandFile(cmdName) {
    const dir = commandsDir();
    if (!fs.existsSync(dir)) return null;

    const direct = path.join(dir, `${cmdName}.js`);
    if (fs.existsSync(direct)) return direct;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(dir, file);
            const resolved = require.resolve(full);
            if (require.cache[resolved]) delete require.cache[resolved];
            const mod = require(full);
            const names = [mod?.name, ...(Array.isArray(mod?.aliases) ? mod.aliases : [])]
                .filter(Boolean)
                .map((n) => String(n).toLowerCase());
            if (names.includes(String(cmdName).toLowerCase())) return full;
        } catch (_) {}
    }
    return null;
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
        if (cmd.data?.name) {
            clientRef.slash.set(cmd.data.name, cmd);
        }

        return { ok: true, cmd, file };
    } catch (e) {
        return { ok: false, error: e.message || String(e), file };
    }
}

async function dmOwners(embed) {
    const ids = ownerIds();
    if (!ids.length || !clientRef) {
        console.warn('[autoRepair] OWNER_ID não configurado — erro só no console.');
        return false;
    }

    let sent = false;
    for (const id of ids) {
        try {
            const user = await clientRef.users.fetch(id).catch(() => null);
            if (!user) continue;
            await user.send({ embeds: [embed] });
            sent = true;
        } catch (e) {
            console.warn(`[autoRepair] DM falhou para ${id}:`, e.message);
        }
    }
    return sent;
}

function canDm(key) {
    const now = Date.now();
    const last = dmCooldown.get(key) || 0;
    if (now - last < DM_COOLDOWN_MS) return false;
    dmCooldown.set(key, now);
    return true;
}

function errorEmbed({ cmdName, error, context, attempt, max, status }) {
    const colors = {
        error: 0xef4444,
        repair: 0xf59e0b,
        success: 0x22c55e,
        fail: 0x7f1d1d
    };

    const titles = {
        error: '🚨 Erro em comando',
        repair: '🔧 Tentando reparar…',
        success: '✅ Comando reparado',
        fail: '❌ Reparo falhou'
    };

    const stack =
        error?.stack
            ? String(error.stack).slice(0, 900)
            : String(error?.message || error || 'desconhecido').slice(0, 900);

    return new EmbedBuilder()
        .setColor(colors[status] || colors.error)
        .setTitle(titles[status] || titles.error)
        .setDescription(
            [
                `**Comando:** \`${cmdName || '?'}\``,
                context ? `**Contexto:** ${context}` : null,
                attempt != null ? `**Tentativa:** ${attempt}/${max || MAX_ATTEMPTS}` : null,
                '',
                '```js',
                stack,
                '```'
            ]
                .filter((x) => x != null)
                .join('\n')
        )
        .setFooter({ text: 'Aeternus · Auto-reparo' })
        .setTimestamp();
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

    console.error(`[autoRepair] ${name}:`, error);

    if (canDm(`err:${name}`)) {
        await dmOwners(
            errorEmbed({
                cmdName: name,
                error,
                context,
                attempt: st.attempts + 1,
                status: 'error'
            })
        );
    }

    try {
        if (message?.reply) {
            await message.reply('❌ Erro ao executar. O sistema de reparo já foi acionado.').catch(() => {});
        } else if (interaction) {
            const payload = {
                content: '❌ Erro na interação. O sistema de reparo já foi acionado.',
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    } catch (_) {}

    let repaired = false;
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
        st.attempts += 1;
        state.set(name, st);

        if (canDm(`try:${name}:${i}`)) {
            await dmOwners(
                errorEmbed({
                    cmdName: name,
                    error: { message: `Recarregando módulo (tentativa ${i}/${MAX_ATTEMPTS})…` },
                    context,
                    attempt: i,
                    status: 'repair'
                })
            );
        }

        const result = reloadCommand(name);
        if (result.ok) {
            repaired = true;
            st.attempts = 0;
            state.set(name, st);

            await dmOwners(
                errorEmbed({
                    cmdName: name,
                    error: {
                        message: `Módulo recarregado com sucesso.\nArquivo: ${result.file || '?'}`
                    },
                    context,
                    attempt: i,
                    status: 'success'
                })
            );
            console.log(`[autoRepair] ${name} reparado na tentativa ${i}`);
            break;
        }

        await new Promise((r) => setTimeout(r, 400 * i));

        if (i === MAX_ATTEMPTS) {
            await dmOwners(
                errorEmbed({
                    cmdName: name,
                    error: {
                        message:
                            `Não foi possível reparar após ${MAX_ATTEMPTS} tentativas.\n` +
                            `Último erro de reload: ${result.error}\n` +
                            `Erro original: ${errMsg}`
                    },
                    context,
                    attempt: i,
                    status: 'fail'
                })
            );
            console.error(`[autoRepair] ${name} falhou após ${MAX_ATTEMPTS} tentativas`);
        }
    }

    return { repaired, attempts: st.attempts };
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

module.exports = {
    setClient,
    handleCommandError,
    reloadCommand,
    ownerIds,
    getStatus,
    MAX_ATTEMPTS
};
