/**
 * Consciência e Motor de PLN Local do Aeternus (v3.0 - Aprimorado)
 * Arquitetura Nativa: Aprendizado Social, Reconhecimento do Criador, 
 * Cálculos Matemáticos, Administração de Interface e Memória de Contexto.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNED_FILE = path.join(DATA_DIR, 'learned_phrases.json');

const contexts = new Map();
const tools = new Map();
/** @type {Map<string, { lastIntents: string[], lastEntities: Record<string, any>, turns: number, updatedAt: number }> } */
const memory = new Map();

// --- PERSISTÊNCIA E APRENDIZADO SOCIAL ---

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

let learnedPhrases = [];
try {
    if (fs.existsSync(LEARNED_FILE)) {
        learnedPhrases = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf-8'));
    }
} catch (_) {
    learnedPhrases = [];
}

function saveLearnedPhrases() {
    try {
        fs.writeFileSync(LEARNED_FILE, JSON.stringify(learnedPhrases.slice(-1500), null, 2), 'utf-8');
    } catch (_) {}
}

function learnFromMessage(text) {
    const raw = String(text || '').trim();
    if (raw.length < 3 || raw.length > 140) return;
    if (raw.startsWith('O.j') || raw.startsWith('!') || raw.startsWith('/') || raw.includes('http')) return;

    const clean = raw.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim();
    if (clean.length >= 3 && !learnedPhrases.includes(clean)) {
        learnedPhrases.push(clean);
        if (learnedPhrases.length > 1500) learnedPhrases.shift();
        saveLearnedPhrases();
    }
}

// --- UTILITÁRIOS DE AMBIENTE & PLN ---

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}

function isOwner(userId) {
    const o = ownerId();
    return Boolean(o && String(userId) === o);
}

function configured() {
    return true;
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(text) {
    return normalizeText(text).split(' ').filter(Boolean);
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyMatchWord(target, word, maxDistance = 2) {
    if (target === word) return true;
    if (target.length <= 3) return false;
    return levenshteinDistance(target, word) <= maxDistance;
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- GERENCIAMENTO DE FERRAMENTAS E CONTEXTO ---

function registerContext(id, { description, get }) {
    if (!id || typeof get !== 'function') return false;
    contexts.set(String(id), { description: String(description || id), get });
    return true;
}

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, {
        name: def.name,
        description: String(def.description || def.name),
        handler: def.handler,
        ownerOnly: Boolean(def.ownerOnly)
    });
    return true;
}

function listContexts() {
    return [...contexts.entries()].map(([id, c]) => ({ id, description: c.description }));
}

function listTools() {
    return [...tools.values()].map((t) => ({
        name: t.name,
        description: t.description,
        ownerOnly: t.ownerOnly
    }));
}

function clearHistory(userId) {
    memory.delete(String(userId));
}

function getMemory(userId) {
    const key = String(userId);
    const now = Date.now();

    if (memory.has(key)) {
        const entry = memory.get(key);
        if (now - entry.updatedAt > 20 * 60 * 1000) {
            memory.delete(key);
        }
    }

    if (!memory.has(key)) {
        memory.set(key, { lastIntents: [], lastEntities: {}, turns: 0, updatedAt: now });
    }

    const entry = memory.get(key);
    entry.updatedAt = now;
    return entry;
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: `Ferramenta desconhecida: ${name}` };
    if (t.ownerOnly && !isOwner(runtime.userId)) {
        return { error: 'Apenas o proprietário do bot possui autorização para este recurso.' };
    }
    try {
        return await t.handler(args || {}, runtime);
    } catch (e) {
        return { error: e.message || String(e) };
    }
}

// --- EXTRAÇÃO DE ENTIDADES & RECONHECIMENTO DE INTENÇÕES ---

function extractEntities(text, catalog) {
    const tokens = tokenize(text);
    const raw = String(text || '').trim();
    const entities = {};

    // Expressões matemáticas avançadas
    const mathMatch = raw.match(/(?:quanto e|calcula|calcule|quanto da|conta|resultado de)\s+([0-9+\-*/%().^\s]+)/i) ||
                      raw.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) {
        entities.mathExpression = mathMatch[1] || mathMatch[0];
    }

    // Edição de interface/comandos
    const editMatch = raw.match(/(?:editar interface|edite interface|criar interface|interface do comando)\s+([a-zA-Z0-9_-]+)/i);
    if (editMatch) {
        entities.editCommandName = editMatch[1];
    }

    // Marcação e busca de membros
    const mentionMatch = raw.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        entities.targetUserId = mentionMatch[1];
    } else {
        const idMatch = raw.match(/\b\d{17,19}\b/);
        if (idMatch) {
            entities.targetUserId = idMatch[0];
        }
    }

    const memberQueryMatch = raw.match(/(?:quem e|quem e o|quem e a|membro|usuario|sobre o|sobre a|user)\s+([a-zA-Z0-9_\.\-]{2,32})/i);
    if (memberQueryMatch && !entities.targetUserId) {
        entities.targetQuery = memberQueryMatch[1];
    }

    if (catalog) {
        for (const cat of catalog.listCategories()) {
            for (const cmd of cat.commands) {
                if (tokens.some((token) => fuzzyMatchWord(token, cmd.name, 1))) {
                    entities.commandName = cmd.name;
                    break;
                }
            }
            if (entities.commandName) break;
        }
    }

    return entities;
}

function detectIntents(text, userMem, entities) {
    const tokens = tokenize(text);
    const norm = normalizeText(text);
    const intents = [];

    const addIntent = (intent, score, extra = {}) => {
        intents.push({ intent, score, ...extra });
    };

    // Criador/Desenvolvedor
    if (
        norm.includes('quem te criou') ||
        norm.includes('quem e seu criador') ||
        norm.includes('quem te fez') ||
        norm.includes('seu criador') ||
        norm.includes('seu dono') ||
        norm.includes('quem e seu dono') ||
        norm.includes('seu desenvolvedor') ||
        norm.includes('seu dev')
    ) {
        addIntent('creator_info', 0.99);
    }

    // Cálculos
    if (entities.mathExpression) {
        addIntent('calculate', 0.98, { expression: entities.mathExpression });
    }

    // Edição de Interface (Exclusivo Dono)
    if (entities.editCommandName || norm.includes('editar interface')) {
        addIntent('edit_interface', 0.95, { commandName: entities.editCommandName });
    }

    // Servidor
    if (
        norm.includes('info do servidor') ||
        norm.includes('info do server') ||
        norm.includes('sobre o servidor') ||
        norm.includes('detalhes do server') ||
        norm.includes('membros do server')
    ) {
        addIntent('server_info', 0.95);
    }

    // Membro
    if (
        entities.targetUserId ||
        norm.includes('quem e') ||
        norm.includes('info de') ||
        norm.includes('perfil de') ||
        norm.includes('sobre o usuario')
    ) {
        addIntent('member_info', 0.9);
    }

    // Economia & RPG
    if (tokens.some((t) => ['saldo', 'carteira', 'eter', 'dinheiro', 'banco'].includes(t))) {
        addIntent('balance', 0.88);
    }

    if (tokens.some((t) => fuzzyMatchWord('sonho', t) || fuzzyMatchWord('sonhos', t) || t === 'loritta')) {
        addIntent('loritta', 0.88);
    }

    if (tokens.some((t) => ['perfil', 'personagem', 'atributo', 'nivel', 'level'].includes(t))) {
        addIntent('player', 0.85);
    }

    // Saudações e Despedidas
    if (tokens.some((t) => ['oi', 'ola', 'hey', 'eae', 'eai', 'salve', 'opa', 'suave', 'sussa'].includes(t))) {
        addIntent('greet', 0.92);
    }

    if (tokens.some((t) => ['obrigado', 'valeu', 'vlw', 'thanks', 'tmj'].includes(t))) {
        addIntent('thanks', 0.9);
    }

    if (tokens.some((t) => ['tchau', 'flw', 'bye', 'fui'].includes(t))) {
        addIntent('bye', 0.9);
    }

    if (intents.length === 0) {
        addIntent('casual_chat', 0.5);
    }

    return intents.sort((a, b) => b.score - a.score);
}

// --- RESPOSTAS CONVERSACIONAIS ---

function respondCasualChat(text) {
    const norm = normalizeText(text);

    if (learnedPhrases.length > 0 && Math.random() < 0.6) {
        const learnedSample = pick(learnedPhrases);
        const connectors = ['mano', 'po', 'slk', 'vish', 'kkkk', 'nmr', 'dahora', 'pior que'];
        return Math.random() > 0.5 ? `${pick(connectors)} ${learnedSample.toLowerCase()}` : learnedSample;
    }

    if (norm.includes('kkk') || norm.includes('hah') || norm.includes('massa')) {
        return pick(['kkkkkkkk', 'slk engraçado dms', 'tanko nao kkkk', 'kkkk boto fe']);
    }

    return pick([
        'suave mano, e vc?',
        'boto fe demais',
        'slk, pior ne',
        'tmj mano, precisar tamo ai',
        'dahora dms',
        'po mano kkkk',
        'tranquilo por aqui, e com vc?'
    ]);
}

async function respondCreator(runtime) {
    const oId = ownerId();
    if (!oId) {
        return 'meu criador e o desenvolvedor do sistema, mas o `OWNER_ID` ainda nao foi configurado no arquivo .env!';
    }

    return pick([
        `meu criador e o <@${oId}> mano! foi ele que me programou e mantem tudo rodando por aqui.`,
        `quem me criou e me gerencia e o <@${oId}>!`,
        `o brabo que me desenvolveu foi o <@${oId}> mano!`
    ]);
}

async function runIntent(item, runtime, text, entities) {
    switch (item.intent) {
        case 'creator_info':
            return respondCreator(runtime);
        case 'calculate': {
            const res = await runTool('calculate_math', { expression: item.expression }, runtime);
            if (!res.ok) return res.error;
            return `🧮 **Resultado:** \`${res.expression}\` = **${res.result}**`;
        }
        case 'edit_interface': {
            if (!isOwner(runtime.userId)) {
                return '❌ Apenas o dono do bot pode editar a interface dos comandos.';
            }
            const res = await runTool('edit_command_interface', { name: item.commandName || 'novo_comando' }, runtime);
            if (!res.ok) return `❌ ${res.error}`;
            return `🛠️ **Interface Atualizada:** ${res.message}`;
        }
        case 'server_info': {
            const res = await runTool('get_server_info', {}, runtime);
            if (!res?.ok) return 'Não consegui pegar as informações do servidor agora!';
            const s = res.server;
            return `🏰 **${s.name}** | **Membros:** ${fmt(s.memberCount)} | **Canais:** ${fmt(s.channelCount)}`;
        }
        case 'member_info': {
            const target = entities?.targetUserId || entities?.targetQuery || runtime.userId;
            const res = await runTool('get_member_info', { target }, runtime);
            if (!res?.ok) return `Membro \`${target}\` não encontrado no servidor.`;
            const m = res.member;
            return `👤 **${m.displayName}** (\`${m.tag}\`)\n• ID: \`${m.id}\` | Entrou: ${m.joinedAt}`;
        }
        case 'balance': {
            const res = await runTool('get_eter_balance', {}, runtime);
            return `✨ teu saldo de Éter e: **${fmt(res.eter || 0)}**`;
        }
        case 'loritta': {
            const res = await runTool('get_loritta_sonhos', {}, runtime);
            if (!res?.ok) return `não consegui consultar os sonhos: ${res?.error || 'erro na API'}`;
            return `💤 tu tem **${fmt(res.sonhos)}** sonhos na Loritta!`;
        }
        case 'greet': {
            return pick(['salve mano! suave?', 'eae, de boa?', 'opa! suaveee?']);
        }
        case 'thanks': {
            return pick(['tmj mano!', 'valeuuu', 'nois!', 'de nada bro!']);
        }
        case 'bye': {
            return pick(['flw mano!', 'ate mais!', 'fui, ate dps!']);
        }
        default:
            return respondCasualChat(text);
    }
}

async function chat({ userId, message, client, guild, channel, messageId }) {
    const runtime = {
        userId: String(userId),
        client,
        guild,
        channel,
        messageId,
        isOwner: isOwner(userId)
    };

    const text = String(message || '').trim();
    learnFromMessage(text);

    const userMem = getMemory(userId);
    userMem.turns += 1;

    let catalog = null;
    try { catalog = require('./commandCatalog'); } catch (_) {}

    const entities = extractEntities(text, catalog);
    const intents = detectIntents(text, userMem, entities);

    const topIntent = intents[0] || { intent: 'casual_chat' };
    const responseText = await runIntent(topIntent, runtime, text, entities);

    return {
        ok: true,
        text: String(responseText).slice(0, 1950),
        replyOptions: messageId ? { reply: { messageReference: messageId } } : {}
    };
}

function loadTools() {
    const toolFiles = ['serverTools', 'economyTools', 'rpgTools', 'mathTools', 'adminTools'];
    for (const file of toolFiles) {
        try {
            const registerFn = require(`../tools/${file}`);
            registerFn({ registerTool });
        } catch (_) {}
    }
}

loadTools();

module.exports = {
    configured,
    registerContext,
    registerTool,
    listContexts,
    listTools,
    chat,
    clearHistory,
    isOwner,
    model: () => 'aeternus-native-v3',
    baseUrl: () => 'local'
};
