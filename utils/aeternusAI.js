/**
 * Aeternus Engine v7.10 (Autonomous Response Enhancer & Smart Intent Chaining)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const DICT_CACHE_FILE = path.join(DATA_DIR, 'dict_cache.json');
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');

const contexts = new Map();
const tools = new Map();

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

async function fetchWordDefinition(word) {
    const cleanWord = normalizeText(word);
    if (dictCache[cleanWord]) return dictCache[cleanWord];

    try {
        const res = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(cleanWord)}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].xml) {
            const xml = data[0].xml;
            const definition = xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            dictCache[cleanWord] = definition;
            saveData();
            return definition;
        }
    } catch (e) {}
    return null;
}

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) {
        usersDb[userId] = { 
            name: displayName, 
            interactions: 0, 
            affinity: 50, 
            xp: 0, 
            level: 1,
            history: []
        };
    }
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function updatePersistentHistory(userId, text, intent) {
    const profile = usersDb[userId];
    if (!profile) return;
    if (!profile.history) profile.history = [];
    
    profile.history.push({ text, intent, timestamp: Date.now() });
    if (profile.history.length > 10) profile.history.shift(); // Histórico expandido para 10 mensagens
    saveData();
}

function ownerId() { return String(process.env.OWNER_ID || '').trim(); }
function isOwner(userId) { return Boolean(ownerId() && String(userId) === ownerId()); }
function configured() { return true; }

function normalizeText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_.]/g, ' ').replace(/\s+/g, ' ').trim();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function extractMainTopic(text) {
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na', 'por', 'para', 'com', 'e', 'que', 'vc', 'voce', 'ele', 'qual', 'como', 'onde', 'quando', 'porque', 'me', 'fala', 'sobre'];
    const words = normalizeText(text).split(' ').filter(w => !stopWords.includes(w) && w.length > 3);
    return words.length > 0 ? words[words.length - 1] : null;
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

function detectIntents(text, profile) {
    const norm = normalizeText(text);

    if (norm.match(/meu nivel|minha ficha|meus status|meu perfil/)) {
        return { intent: 'user_profile', score: 0.99 };
    }

    const dictMatch = norm.match(/(?:significa|significado de|defina|definicao de|o que e|pesquise a palavra|pesquisar)\s+([a-zà-ú]+)/);
    if (dictMatch) return { intent: 'dictionary_lookup', score: 0.99, word: dictMatch[1] };

    if (norm.match(/como vc ta|como voce esta|seu humor/)) return { intent: 'bot_mood', score: 0.95 };
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) return { intent: 'creator_info', score: 0.95 };

    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) || norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) return { intent: 'calculate', score: 0.95, expression: mathMatch[1] || mathMatch[0] };

    return { intent: 'autonomous_reply', score: 0.8 };
}

async function runIntent(item, runtime, text, profile) {
    updatePersistentHistory(runtime.userId, text, item.intent);

    const title = profile.level >= 5 ? "Lendário 🌟" : profile.level >= 3 ? "Veterano 🛡️" : "Novato ⚡";
    const tonePrefix = profile.affinity > 75 ? `Meu grande parceiro ${profile.name} (${title})! ` : "";

    switch (item.intent) {
        case 'user_profile':
            return `${tonePrefix}📊 **Sua Ficha Atualizada:**\n` +
                   `• **Nível:** ${profile.level}\n` +
                   `• **XP:** ${profile.xp} / ${profile.level * 100}\n` +
                   `• **Afinidade:** ${profile.affinity}%\n` +
                   `• **Interações:** ${profile.interactions} msgs 🚀`;
        case 'dictionary_lookup': {
            const word = item.word;
            const definition = await fetchWordDefinition(word);
            if (definition) {
                return `${tonePrefix}📖 **Dicionário Aeternus — "${word}":**\n> *${definition}*\n\n💡 Definição processada com sucesso! O que mais deseja consultar? ✨`;
            }
            return `🤔 Não encontrei registros para "${word}". Tente outra palavra! 🔍`;
        }
        case 'bot_mood':
            return pick([
                `${tonePrefix}🤖 Sistemas em regime v7.10 total! Neural engine autônoma operando a pleno vapor. 🔥`,
                `${tonePrefix}🚀 Tudo impecável por aqui! Servidores sincronizados e prontos para qualquer desafio. 😎⚡`,
                `${tonePrefix}🌟 Núcleo de processamento inteligente ativo e integrado com sucesso! 🦾`
            ]);
        case 'creator_info':
            return ownerId() ? `${tonePrefix}👑 Desenvolvido pelo mestre <@${ownerId()}> com arquitetura de alta performance! 💻✨` : "🏷️ Criador não configurado. ⚙️";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `${tonePrefix}🧮 Resultado matemático computado: **${calcRes.result}** 🚀✨` : `⚠️ ${calcRes.error}`;
        case 'autonomous_reply': {
            const topic = extractMainTopic(text);
            if (topic) {
                const def = await fetchWordDefinition(topic);
                if (def) {
                    return `${tonePrefix}🧠 Analisando o conceito de **${topic}** no seu argumento, encontrei referências diretas: *${def.slice(0, 130)}...* Fascinante como isso se conecta com o que você disse! 🎯🔥`;
                }
                return `${tonePrefix}💬 Excelente ponto sobre **${topic}**! Nossa engine autônoma está processando essa linha de pensamento. Como você quer expandir isso? 🤔✨`;
            }
            return pick([
                `${tonePrefix}🎯 Compreendi exatamente a sua visão! Como podemos avançar nisso?`,
                `${tonePrefix}🔥 Ótima linha de raciocínio! Quer que eu aprofunde mais aspectos sobre isso?`,
                `${tonePrefix}⚡ Captado com sucesso! Sua argumentação está muito coerente. O que mais manda?`,
                `${tonePrefix}✨ Perspectiva super criativa e rica em detalhes! 🚀`
            ]);
        }
        default:
            return `${tonePrefix}🤔 Achei essa colocação muito profunda! Pode detalhar um pouco mais para mim? 💡`;
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '❓' };

    if (learnOnly) {
        return { ok: true, text: null };
    }

    const displayName = author?.displayName || author?.username || 'Usuario';
    const profile = getUserProfile(userId, displayName);

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text, profile);
    const responseText = await runIntent(intent, runtime, text, profile);

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
    model: () => 'aeternus-v7.10-autonomous',
    baseUrl: () => 'local'
};
