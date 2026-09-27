/**
 * Aeternus Engine v7.5 (Com Consulta a Dicionário e Sem Aprendizado Poluído)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const DICT_CACHE_FILE = path.join(DATA_DIR, 'dict_cache.json');
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');

const contexts = new Map();
const tools = new Map();
const sessionMemory = new Map(); 

let usersDb = {};
let dictCache = {};
let botState = { globalMood: 0 };

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

try {
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (fs.existsSync(DICT_CACHE_FILE)) dictCache = JSON.parse(fs.readFileSync(DICT_CACHE_FILE, 'utf-8'));
    if (fs.existsSync(BOT_STATE_FILE)) botState = JSON.parse(fs.readFileSync(BOT_STATE_FILE, 'utf-8'));
} catch (e) {
    console.error('Erro ao carregar dados:', e);
}

function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
        fs.writeFileSync(DICT_CACHE_FILE, JSON.stringify(dictCache, null, 2), 'utf-8');
        fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(botState, null, 2), 'utf-8');
    } catch (_) {}
}

// Função para buscar significado usando API pública de dicionário em português
async function fetchWordDefinition(word) {
    const cleanWord = normalizeText(word);
    if (dictCache[cleanWord]) {
        return dictCache[cleanWord];
    }

    try {
        // Usando a API pública do Dicionário Aberto
        const res = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(cleanWord)}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].xml) {
            // Extrai o texto limpo do XML básico retornado pela API
            const xml = data[0].xml;
            const definition = xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            
            dictCache[cleanWord] = definition;
            saveData();
            return definition;
        }
    } catch (e) {
        console.error('Erro na API de dicionário:', e);
    }
    return null;
}

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) usersDb[userId] = { name: displayName, interactions: 0, affinity: 50, xp: 0, level: 1 };
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function ownerId() { return String(process.env.OWNER_ID || '').trim(); }
function isOwner(userId) { return Boolean(ownerId() && String(userId) === ownerId()); }
function configured() { return true; }

function normalizeText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_.]/g, ' ').replace(/\s+/g, ' ').trim();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getContext(userId) {
    if (!sessionMemory.has(userId)) sessionMemory.set(userId, []);
    return sessionMemory.get(userId);
}

function updateContext(userId, intent) {
    const history = getContext(userId);
    history.push(intent);
    if (history.length > 3) history.shift();
}

function registerContext(id, { description, get }) {
    if (!id || typeof get !== 'function') return false;
    contexts.set(String(id), { description: String(description || id), get });
    return true;
}

function listContexts() {
    return [...contexts.entries()].map(([id, c]) => ({ id, description: c.description }));
}

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, { ...def, ownerOnly: Boolean(def.ownerOnly) });
    return true;
}

function listTools() {
    return [...tools.values()].map((t) => ({
        name: t.name,
        description: t.description,
        ownerOnly: t.ownerOnly
    }));
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: `Erro: Tool ${name} não existe.` };
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: '❌ Só o meu criador mexe aqui.' };
    try { return await t.handler(args || {}, runtime); } catch (e) { return { error: e.message }; }
}

function detectIntents(text) {
    const norm = normalizeText(text);

    // Detecta pedidos de significado (ex: "o que significa X", "defina X", "pesquise a palavra X")
    const dictMatch = norm.match(/(?:significa|significado de|defina|definicao de|o que e|pesquise a palavra|pesquisar)\s+([a-zà-ú]+)/);
    if (dictMatch) {
        return { intent: 'dictionary_lookup', score: 0.99, word: dictMatch[1] };
    }

    if (norm.match(/como vc ta|como voce esta|seu humor/)) return { intent: 'bot_mood', score: 0.95 };
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) return { intent: 'creator_info', score: 0.95 };

    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/);
    if (mathMatch) return { intent: 'calculate', score: 0.95, expression: mathMatch[1] };

    return { intent: 'casual_chat', score: 0.5 };
}

async function runIntent(item, runtime, text) {
    updateContext(runtime.userId, item.intent);

    switch (item.intent) {
        case 'dictionary_lookup': {
            const word = item.word;
            const definition = await fetchWordDefinition(word);
            if (definition) {
                return `📖 **Significado de "${word}":**\n${definition}`;
            }
            return `Não consegui encontrar o significado da palavra "${word}" no meu dicionário.`;
        }
        case 'bot_mood':
            return "Tô de boa operando com os sistemas limpos e atualizados. 🤖";
        case 'creator_info':
            return ownerId() ? `Fui desenvolvido pelo mestre <@${ownerId()}>.` : "Criador não configurado.";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `🧮 O resultado é **${calcRes.result}**.` : calcRes.error;
        case 'casual_chat':
            return pick(['Entendido. Como posso te ajudar hoje?', 'Interessante. Quer que eu pesquise algo no dicionário?', 'Tô de olho, pode mandar sua dúvida.']);
        default:
            return "Fiquei meio perdido agora, tenta reformular.";
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '?' };

    if (learnOnly) {
        return { ok: true, text: null }; // Ignora aprendizado automático de chat público
    }

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text);
    const responseText = await runIntent(intent, runtime, text);

    return { ok: true, text: String(responseText).slice(0, 1950), replyOptions: messageId ? { reply: { messageReference: messageId } } : {} };
}

function loadTools() {
    ['serverTools', 'economyTools', 'rpgTools', 'mathTools', 'adminTools', 'commandMapperTools'].forEach(file => {
        try { require(`../tools/${file}`)({ registerTool }); } catch (_) {}
    });
}
loadTools();

module.exports = {
    configured,
    registerContext,
    listContexts,
    registerTool,
    listTools,
    chat,
    isOwner,
    model: () => 'aeternus-v7.5-dictionary',
    baseUrl: () => 'local'
};
