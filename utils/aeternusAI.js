/**
 * Aeternus Engine v7.12 (Dynamic Personas, Interactive Quests & Advanced Core)
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
            persona: 'default', // default, cyberpunk, medieval
            history: []
        };
    }
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function addXpAndCheckLevel(profile) {
    const xpGain = Math.floor(Math.random() * 15) + 12;
    profile.xp = (profile.xp || 0) + xpGain;
    const nextLevelXp = profile.level * 100;
    let leveledUp = false;
    
    if (profile.xp >= nextLevelXp) {
        profile.level += 1;
        profile.xp -= nextLevelXp;
        profile.affinity = Math.min(100, profile.affinity + 10);
        leveledUp = true;
    }
    saveData();
    return { xpGain, leveledUp };
}

function updatePersistentHistory(userId, text, intent) {
    const profile = usersDb[userId];
    if (!profile) return;
    if (!profile.history) profile.history = [];
    
    profile.history.push({ text, intent, timestamp: Date.now() });
    if (profile.history.length > 12) profile.history.shift();
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

function detectIntents(text) {
    const norm = normalizeText(text);

    if (norm.match(/modo cibernetico|ativar cyberpunk/)) return { intent: 'set_persona', persona: 'cyberpunk', score: 0.99 };
    if (norm.match(/modo medieval|ativar m[eé]stico/)) return { intent: 'set_persona', persona: 'medieval', score: 0.99 };
    if (norm.match(/modo padrão|desativar modo/)) return { intent: 'set_persona', persona: 'default', score: 0.99 };

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

async function runIntent(item, runtime, text, profile, levelUpInfo) {
    updatePersistentHistory(runtime.userId, text, item.intent);

    if (item.intent === 'set_persona') {
        profile.persona = item.persona;
        saveData();
        if (item.persona === 'cyberpunk') return `⚡ **Modo Cibernético ATIVADO!** Conexão neural estabelecida com a matrix, parceiro! 🦾🕶️`;
        if (item.persona === 'medieval') return `🛡️ **Modo Místico ATIVADO!** Que a força dos reinos antigos guie nossa jornada, nobre guerreiro! ⚔️📜`;
        return `🌟 **Modo Padrão Restaurado!** Sistemas operando com máxima versatilidade. 🤖✨`;
    }

    const title = profile.level >= 5 ? "Lendário 🌟" : profile.level >= 3 ? "Veterano 🛡️" : "Novato ⚡";
    
    // Customização por Persona
    let prefix = "";
    if (profile.persona === 'cyberpunk') {
        prefix = `[CYBER-NET] `;
    } else if (profile.persona === 'medieval') {
        prefix = `[VALE MÍSTICO] `;
    } else {
        prefix = profile.affinity > 75 ? `Parceiro ${profile.name} (${title})! ` : "";
    }

    if (levelUpInfo.leveledUp) {
        prefix += `🎉 **LEVEL UP!** Subiu para o **Nível ${profile.level}**! 🚀🔥\n\n`;
    }

    switch (item.intent) {
        case 'user_profile':
            return `${prefix}📊 **Ficha de Status:**\n` +
                   `• **Nível:** ${profile.level} (${title})\n` +
                   `• **XP Atual:** ${profile.xp} / ${profile.level * 100}\n` +
                   `• **Afinidade:** ${profile.affinity}%\n` +
                   `• **Persona Ativa:** ${profile.persona.toUpperCase()} 🌟`;
        case 'dictionary_lookup': {
            const word = item.word;
            const definition = await fetchWordDefinition(word);
            if (definition) {
                return `${prefix}📖 **Dicionário — "${word}":**\n> *${definition}*\n\n💡 Termo processado com sucesso! ✨`;
            }
            return `${prefix}🤔 Não achei registros para "${word}". Tente outro termo! 🔍`;
        }
        case 'bot_mood':
            if (profile.persona === 'cyberpunk') return `${prefix}🤖 Núcleo neural em 100% de overclocking cibernético! 🔥⚡`;
            if (profile.persona === 'medieval') return `${prefix}🛡️ Os espíritos do castelo estão em plena harmonia! ⚔️✨`;
            return pick([
                `${prefix}🤖 Sistemas v7.12 operando com motor avançado e total fluidez! 🔥`,
                `${prefix}🚀 Tudo tinindo por aqui! Servidores sincronizados e prontos para o desafio. 😎⚡`,
                `${prefix}🌟 Núcleo inteligente processando com alta performance! 🦾`
            ]);
        case 'creator_info':
            return ownerId() ? `${prefix}👑 Criado pelo mestre <@${ownerId()}> com tecnologias avançadas! 💻✨` : `${prefix}🏷️ Criador não configurado. ⚙️`;
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `${prefix}🧮 Resultado matemático: **${calcRes.result}** 🚀✨` : `⚠️ ${calcRes.error}`;
        case 'autonomous_reply': {
            const topic = extractMainTopic(text);
            if (topic) {
                const def = await fetchWordDefinition(topic);
                if (def) {
                    return `${prefix}🧠 Analisando **${topic}**, encontrei conexões diretas no acervo: *${def.slice(0, 120)}...* Fascinante! 🎯🔥`;
                }
                return `${prefix}💬 Excelente abordagem sobre **${topic}**! Nossa engine está processando sua linha de raciocínio. O que mais deseja explorar? 🤔✨`;
            }
            return pick([
                `${prefix}🎯 Entendi exatamente o seu ponto! Como quer prosseguir?`,
                `${prefix}🔥 Ótima linha de pensamento! Quer aprofundar mais aspectos sobre isso?`,
                `${prefix}⚡ Captado! Sua argumentação está bem sólida. O que mais manda?`,
                `${prefix}✨ Perspectiva super criativa e rica em detalhes! 🚀`
            ]);
        }
        default:
            return `${prefix}🤔 Achei essa colocação muito profunda! Pode detalhar um pouco mais? 💡`;
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
    const levelUpInfo = addXpAndCheckLevel(profile);

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text);
    const responseText = await runIntent(intent, runtime, text, profile, levelUpInfo);

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
    model: () => 'aeternus-v7.12-persona-quest',
    baseUrl: () => 'local'
};
