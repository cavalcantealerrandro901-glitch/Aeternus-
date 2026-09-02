/**
 * Sistema de auto-reparo de comandos
 * - Notifica o dono no DM quando um comando quebra
 * - Tenta recarregar o módulo até 3 vezes
 * - Avisa no DM se recuperou ou se falhou de vez
 */
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');

const MAX_ATTEMPTS = 3;
const DM_COOLDOWN_MS = 45_000; // evita flood no DM do mesmo comando

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

    // fallback: application owner (quando disponível)
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

    // nome direto
    const direct = path.join(dir, `${cmdName}.js`);
    if (fs.existsSync(direct)) return direct;

    // procura pelo name/aliases dentro dos arquivos
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(dir, file);
            delete require.cache[require.resolve(full)];
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

/**
 * Recarrega o arquivo do comando e re-registra no client
 * @returns {{ ok: boolean, error?: string, cmd?: object }}
 */
function reloadCommand(cmdName) {
    if (!clientRef) return { ok: false, error: 'Client não inicializado' };

    const file = resolveCommandFile(cmdName);
    if (!file) return { ok: false, error: `Arquivo não encontrado para \