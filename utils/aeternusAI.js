/**
 * Aeternus Engine v7.4 (Modo Fixo e Limpo - Sem Aprendizado de Chat)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');

const contexts = new Map();
const tools = new Map();
const sessionMemory = new Map(); 

let usersDb = {};
let botState = { globalMood: 0 };

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

try {
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (fs.existsSync(BOT_STATE_FILE)) botState = JSON.parse(fs.readFileSync(BOT_STATE_FILE, 'utf-8'));
} catch (e) {
    console.error('Erro ao carregar dados:', e);
}

function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
        fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(botState, null, 2), 'utf-8');
    } catch (_) {}
}

function handleGeneralQuestion(text) {
    const norm = normalizeText(text);

    if (norm.includes('por que') || norm.includes('porque')) {
        return "Essa é uma excelente questão. No fundo, envolve uma série de fatores complexos que moldam a dinâmica do que estamos discutindo.";
    }
    if (norm.includes('como') && (norm.includes('funciona') || norm.includes('faz'))) {
        return "Para entender o funcionamento disso, é preciso analisar a estrutura base e a forma como os elementos interagem entre si.";
    }
    if (norm.includes('o que e') || norm.includes('quem foi')) {
        return "Trata-se de um conceito ou entidade de grande relevância dentro do seu contexto prático.";
    }
    if (norm.includes('qual') && (norm.includes('melhor') || norm.includes('maior'))) {
        return "Isso costuma variar bastante dependendo dos critérios que você adota, mas geralmente envolve eficiência e impacto.";
    }

    return null;
}

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) usersDb[userId] = { name: displayName, interactions: 0, affinity: 50, xp: 0, level: 1 };
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function adjustAffinityAndMood(userId, sentiment) {
    if (!usersDb[userId]) return;
    const p = usersDb[userId];
    
    if (sentiment === 'positive') {
        p.affinity = Math.min(100, p.affinity + 3);
        p.xp += 20;
        botState.globalMood = Math.min(100, botState.globalMood + 2);
    } else if (sentiment === 'negative') {
        p.affinity = Math.max(0, p.affinity - 5);
        p.xp += 2;
        botState.globalMood = Math.max(-100, botState.globalMood - 5);
    } else {
        p.xp += 10;
    }

    if (p.xp >= p.level * 100) {
        p.level += 1;
        p.xp = 0;
    }
    saveData();
}

const POSITIVE = ['bom', 'legal', 'foda', 'incrivel', 'amo', 'top', 'brabo', 'lindo', 'melhor', 'obrigado', 'valeu', 'feliz', 'perfeito'];
const NEGATIVE = ['ruim', 'chato', 'odeio', 'lixo', 'feio', 'pior', 'triste', 'merda', 'bosta', 'droga', 'burro', 'inutil', 'cala'];

function analyzeSentiment(text) {
    const tokens = normalizeText(text).split(' ');
    let score = 0;
    for (const t of tokens) {
        if (POSITIVE.includes(t)) score++;
        if (NEGATIVE.includes(t)) score--;
    }
    return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
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

function detectIntents(text, userId) {
    const norm = normalizeText(text);
    const history = getContext(userId);
    const lastIntent = history[history.length - 1];
    const intents = [];
    const add = (intent, score, extra = {}) => intents.push({ intent, score, ...extra });

    if (norm.match(/e ele|e o dele|e vc/)) {
        if (lastIntent === 'creator_info') add('creator_info', 1.0);
        if (lastIntent === 'bot_mood') add('bot_mood', 1.0);
    }

    if (norm.includes('info do servidor') || norm.includes('sobre o servidor') || norm.includes('dados do servidor')) {
        const otherServerMatch = norm.match(/(?:outro|outros|servidor|server)\s+([a-zA-Z0-9\s_-]+)/);
        if (otherServerMatch && !norm.includes('atual') && !norm.includes('este')) {
            add('other_server_info', 0.98, { query: otherServerMatch[1] });
        } else {
            add('server_info', 0.98);
        }
    }

    if (norm.match(/como vc ta|como voce esta|seu humor|seu estado/)) add('bot_mood', 0.99);
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) add('creator_info', 0.99);
    
    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) || norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) add('calculate', 0.98, { expression: mathMatch[1] });

    if (norm.includes('meu nivel')) add('my_profile', 0.9);

    if (norm.match(/^(o que|quem|como|onde|quando|por que|qual|quanto|sabe)\b/)) {
        add('universal_question', 0.85);
    }

    if (intents.length === 0) add('casual_chat', 0.5);

    return intents.sort((a, b) => b.score - a.score)[0];
}

async function runIntent(item, runtime, text, sentiment, profile) {
    updateContext(runtime.userId, item.intent);

    switch (item.intent) {
        case 'universal_question': {
            const reasoned = handleGeneralQuestion(text);
            if (reasoned) return reasoned;
            return "É uma excelente pergunta, e envolve diversos aspectos que merecem ser analisados com calma.";
        }
        case 'server_info': {
            const res = await runTool('get_server_info', {}, runtime);
            if (!res?.ok) return "Não consegui carregar os dados deste servidor no momento.";
            const s = res.server;
            return `🏰 **Informações do Servidor:**\n` +
                   `• **Nome:** ${s.name} (\`${s.id}\`)\n` +
                   `• **Dono(a):** <@${s.ownerId}>\n` +
                   `• **Membros Totais:** ${Number(s.memberCount).toLocaleString('pt-BR')}\n` +
                   `• **Canais:** ${s.channelCount} | **Cargos:** ${s.roleCount}`;
        }
        case 'other_server_info': {
            const guildsRes = await runTool('list_bot_guilds', { limit: 20 }, runtime);
            const query = normalizeText(item.query || '');
            const found = guildsRes?.guilds?.find(g => normalizeText(g.name).includes(query) || g.id === query);
            
            if (!found) {
                return `Não consegui encontrar nenhum outro servidor cadastrado com esse nome ou ID "${item.query}".`;
            }
            return `🌐 Encontrei este outro servidor:\n• **Nome:** ${found.name} (\`${found.id}\`)\n• **Membros:** ${Number(found.members).toLocaleString('pt-BR')}`;
        }
        case 'bot_mood':
            return "Tô de boa levando a vida em bits, administrando os sistemas e conversando com a galera por aqui. 🤖";
        case 'my_profile':
            return `📊 **Ficha de ${profile.name}:**\nNível: **${profile.level}**\nXP: **${profile.xp}/${profile.level * 100}**\nAfinidade: **${profile.affinity}%**`;
        case 'creator_info':
            return ownerId() ? `Fui desenvolvido pelo mestre <@${ownerId()}>.` : "O ID do meu criador não foi configurado.";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `🧮 O resultado é **${calcRes.result}**.` : calcRes.error;
        case 'casual_chat':
            if (sentiment === 'positive') return pick(['Que massa ver essa energia por aqui!', 'Boto muita fé nisso aí.', 'Concordo plenamente com você.']);
            if (sentiment === 'negative') return pick(['Vish, que situação chata, mas relaxa que melhora.', 'Complicado quando isso acontece.', 'Te entendo perfeitamente.']);
            return pick(['Saquei qual é a ideia, faz todo sentido.', 'Hmm, interessante ver por essa perspectiva.', 'Dahora demais, sempre bom trocar ideia.']);
        default:
            return "Fiquei meio perdido agora, tenta reformular a pergunta.";
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '?' };

    const displayName = author?.displayName || author?.username || 'Usuario';
    const profile = getUserProfile(userId, displayName);
    const sentiment = analyzeSentiment(text);
    
    adjustAffinityAndMood(userId, sentiment);
    
    // Removido o salvamento e aprendizado automático de frases de usuários.

    if (learnOnly) {
        return { ok: true, text: null };
    }

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text, userId);
    const responseText = await runIntent(intent, runtime, text, sentiment, profile);

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
    model: () => 'aeternus-v7.4-clean',
    baseUrl: () => 'local'
};
