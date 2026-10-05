const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

const SLASH_NAME_MAP = {
    addmoney: 'adicionar-eter',
    removemoney: 'remover-eter',
    afk: 'ausente',
    ban: 'banir-membro',
    kick: 'expulsar-membro',
    mute: 'silenciar',
    unmute: 'dessilenciar',
    unban: 'desbanir',
    warn: 'advertir',
    warns: 'advertencias',
    lock: 'trancar',
    unlock: 'destrancar',
    slowmode: 'modo-lento',
    say: 'enviar-mensagem',
    saldo: 'ver-saldo',
    banco: 'ver-banco',
    depositar: 'depositar-eter',
    sacar: 'sacar-eter',
    beg: 'pedir',
    rob: 'roubar',
    pay: 'pagar',
    daily: 'diario',
    work: 'trabalho',
    crime: 'cometer-crime',
    slots: 'caca-niqueis',
    cara: 'cara-coroa',
    ppt: 'jokenpo',
    dado: 'apostar-dado',
    help: 'ajuda',
    ping: 'latencia',
    contagem: 'alterar-contador',
    limpar: 'limpar-chat',
    embed: 'criar-embed',
    painel: 'painel-web',
    verificar: 'verificacao',
    msg: 'mensagens',
    invites: 'convites',
    ranking: 'ranking-servidor',
    resgatar: 'resgatar-codigo',
    calc: 'calculadora',
    j: 'jogador',
    lockdown: 'bloqueio',
    cargo: 'cargo-membro',
    role: 'alternar-cargo',
    xp: 'nivel',
    blackjack: 'blackjack',
    minas: 'minas',
    quiz: 'quiz',
    pvp: 'pvp',
    rank: 'rank',
    drop: 'drop'
};

const PREFIX_ONLY = new Set([
    'abraco', 'beijo', 'tapa', 'carinho', 'cutucar', 'morder', 'bonk', 'highfive',
    'chorar', 'dancar', 'cafune', 'acenar', 'corar', 'sorrir', 'rir', 'maos',
    'lambida', 'yeet', 'matar', 'piscadela',
    'avatar', 'serverinfo', 'userinfo', 'reload', 'topxp', 'toptapa', 'classe'
]);

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');
const SYSTEMS_DIR = path.join(__dirname, '..', 'systems');
const EVENTS_DIR = path.join(__dirname, '..', 'events');

if (typeof global.__aeternusSystemHandles === 'undefined') {
    global.__aeternusSystemHandles = new Map();
}

function sanitizeSlashName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32);
}

function ensureSlashData(cmd) {
    if (PREFIX_ONLY.has(cmd.name) || cmd.slash === false || cmd.noSlash === true) {
        delete cmd.data;
        return;
    }

    if (cmd.data) {
        try {
            const rawName = cmd.data.name || '';
            const n = sanitizeSlashName(String(rawName).replace(/_/g, '-'));
            if (n && typeof cmd.data.setName === 'function' && n !== rawName) {
                cmd.data.setName(n);
            }
        } catch (_) {}
        cmd._stripArgs = true;
        return;
    }

    if (typeof cmd.executeSlash !== 'function') return;

    const n = sanitizeSlashName(SLASH_NAME_MAP[cmd.name] || cmd.name);
    if (!n || n.length < 1) return;
    try {
        cmd.data = new SlashCommandBuilder()
            .setName(n)
            .setDescription(String(cmd.description || cmd.name || n).slice(0, 100));
    } catch (_) {}
}

function unloadCommand(client, cmd) {
    if (!cmd) return;
    const mainName = String(cmd.name || '').toLowerCase().trim();
    if (mainName) client.commands.delete(mainName);
    if (Array.isArray(cmd.aliases)) {
        for (const a of cmd.aliases) {
            const al = String(a).toLowerCase().trim();
            if (al) client.commands.delete(al);
        }
    }
    if (cmd.data?.name) client.slash.delete(cmd.data.name);
}

function loadCommandFile(client, file, { quiet = false } = {}) {
    const full = path.isAbsolute(file) ? file : path.join(COMMANDS_DIR, file);
    if (!full.endsWith('.js') || !fs.existsSync(full)) {
        return { ok: false, error: 'arquivo não encontrado' };
    }

    try {
        try {
            const resolved = require.resolve(full);
            const old = require.cache[resolved]?.exports;
            if (old?.name) unloadCommand(client, old);
            delete require.cache[resolved];
        } catch (_) {}

        const cmd = require(full);
        if (!cmd?.name) return { ok: false, error: 'sem .name' };

        const mainName = String(cmd.name).toLowerCase().trim();
        cmd.name = mainName;

        if (PREFIX_ONLY.has(mainName) || cmd.slash === false || cmd.noSlash === true) {
            delete cmd.data;
        } else {
            ensureSlashData(cmd);
        }

        const MAX_SLASH = 95;
        if (cmd.data && client.slash.size >= MAX_SLASH && !client.slash.has(cmd.data.name)) {
            if (!quiet) console.warn(`[slash] teto ${MAX_SLASH} — /${cmd.data.name} não registrado`);
            delete cmd.data;
        }

        client.commands.set(mainName, cmd);
        if (Array.isArray(cmd.aliases)) {
            for (const a of cmd.aliases) {
                const al = String(a).toLowerCase().trim();
                if (al && !client.commands.has(al)) client.commands.set(al, cmd);
            }
        }

        if (cmd.data?.name) {
            const existing = client.slash.get(cmd.data.name);
            if (existing && existing.name !== cmd.name) {
                if (!quiet) {
                    console.warn(`[slash] duplicata /${cmd.data.name}: mantém "${existing.name}", ignora "${cmd.name}"`);
                }
                delete cmd.data;
            } else {
                client.slash.set(cmd.data.name, cmd);
                if (!quiet) console.log(`⚡ [SLASH] /${cmd.data.name}`);
            }
        }

        if (!quiet) console.log(`✨ [COMANDO] ${cmd.name}`);
        return { ok: true, name: mainName, slash: cmd.data?.name || null };
    } catch (e) {
        console.error(`Erro comando ${path.basename(full)}:`, e.message);
        return { ok: false, error: e.message };
    }
}

function loadCommands(client) {
    if (!fs.existsSync(COMMANDS_DIR)) return;
    client.commands.clear();
    client.slash.clear();
    let slashCount = 0;
    for (const file of fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js'))) {
        const r = loadCommandFile(client, file, { quiet: false });
        if (r.ok && r.slash) slashCount++;
    }
    console.log(`[slash] total preparados: ${slashCount} (sem opção args)`);
}

function loadEvents(client) {
    if (!fs.existsSync(EVENTS_DIR)) return;
    for (const file of fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.js'))) {
        try {
            const full = path.join(EVENTS_DIR, file);
            delete require.cache[require.resolve(full)];
            const ev = require(full);
            if (!ev?.name || !ev.execute) continue;
            if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
            else client.on(ev.name, (...args) => ev.execute(...args, client));
            console.log(`🔌 [EVENTO] ${ev.name}`);
        } catch (e) {
            console.error(`Erro evento ${file}:`, e.message);
        }
    }
}

function destroySystem(fileBase) {
    const handles = global.__aeternusSystemHandles.get(fileBase);
    if (!handles) return;
    if (Array.isArray(handles.intervals)) for (const id of handles.intervals) clearInterval(id);
    if (Array.isArray(handles.timeouts)) for (const id of handles.timeouts) clearTimeout(id);
    if (typeof handles.destroy === 'function') {
        try { handles.destroy(); } catch (e) { console.warn(`[hotReload] destroy ${fileBase}:`, e.message); }
    }
    global.__aeternusSystemHandles.delete(fileBase);
}

function loadSystemFile(client, file, { quiet = false } = {}) {
    const full = path.isAbsolute(file) ? file : path.join(SYSTEMS_DIR, file);
    const base = path.basename(full);
    if (!full.endsWith('.js') || !fs.existsSync(full)) return { ok: false, error: 'arquivo não encontrado' };
    if (base === 'hotReload.js') return { ok: false, error: 'hotReload não se auto-recarrega' };

    try {
        destroySystem(base);
        try { delete require.cache[require.resolve(full)]; } catch (_) {}
        const sys = require(full);
        if (typeof sys.setup !== 'function') return { ok: false, error: 'sem setup()' };

        const handles = { intervals: [], timeouts: [], destroy: null };
        const prevSetInterval = global.setInterval;
        const prevSetTimeout = global.setTimeout;
        const trackedIntervals = [];
        const trackedTimeouts = [];
        global.setInterval = function (...args) {
            const id = prevSetInterval(...args);
            trackedIntervals.push(id);
            return id;
        };
        global.setTimeout = function (...args) {
            const id = prevSetTimeout(...args);
            trackedTimeouts.push(id);
            return id;
        };
        try { sys.setup(client); } finally {
            global.setInterval = prevSetInterval;
            global.setTimeout = prevSetTimeout;
        }
        handles.intervals = trackedIntervals;
        handles.timeouts = trackedTimeouts;
        if (typeof sys.destroy === 'function') handles.destroy = () => sys.destroy(client);
        if (typeof sys.cleanup === 'function') handles.destroy = () => sys.cleanup(client);
        if (typeof sys.stop === 'function') handles.destroy = () => sys.stop(client);
        global.__aeternusSystemHandles.set(base, handles);
        if (!quiet) console.log(`🧩 [SISTEMA] ${base}`);
        return { ok: true, name: base };
    } catch (e) {
        console.error(`Erro sistema ${base}:`, e.message);
        return { ok: false, error: e.message };
    }
}

function loadSystems(client) {
    if (!fs.existsSync(SYSTEMS_DIR)) return;
    for (const key of [...global.__aeternusSystemHandles.keys()]) destroySystem(key);
    for (const file of fs.readdirSync(SYSTEMS_DIR).filter((f) => f.endsWith('.js'))) {
        if (file === 'hotReload.js') continue;
        loadSystemFile(client, file, { quiet: false });
    }
    if (fs.existsSync(path.join(SYSTEMS_DIR, 'hotReload.js'))) {
        loadSystemFile(client, 'hotReload.js', { quiet: false });
    }
}

function reloadCommand(client, nameOrFile) {
    const raw = String(nameOrFile || '').replace(/\.js$/i, '').toLowerCase().trim();
    if (!raw) return { ok: false, error: 'nome vazio' };
    let file = raw + '.js';
    if (!fs.existsSync(path.join(COMMANDS_DIR, file))) {
        const found = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js')).find((f) => {
            try { return String(require(path.join(COMMANDS_DIR, f))?.name || '').toLowerCase() === raw; }
            catch { return false; }
        });
        if (!found) return { ok: false, error: `comando "${raw}" não encontrado` };
        file = found;
    }
    return loadCommandFile(client, file);
}

function reloadSystem(client, nameOrFile) {
    const base = String(nameOrFile || '').replace(/\.js$/i, '').trim();
    if (!base) return { ok: false, error: 'nome vazio' };
    return loadSystemFile(client, base.endsWith('.js') ? base : base + '.js');
}

module.exports = {
    loadCommands, loadEvents, loadSystems, loadCommandFile, loadSystemFile,
    reloadCommand, reloadSystem, unloadCommand, destroySystem,
    PREFIX_ONLY, COMMANDS_DIR, SYSTEMS_DIR
};
