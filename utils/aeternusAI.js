/**
 * Aeternus Engine v4.0 (O Despertar)
 * Recursos: Geração de Texto via Cadeias de Markov, Análise de Sentimento,
 * Perfis de Usuário com Nível de Afinidade, além de todas as ferramentas anteriores.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNED_FILE = path.join(DATA_DIR, 'learned_phrases.json');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');

const contexts = new Map();
const tools = new Map();
const sessionMemory = new Map();
let usersDb = {};
let learnedPhrases = [];
let markovChain = {};

// --- SISTEMA DE ARQUIVOS E BANCO DE DADOS LOCAL ---

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

try {
    if (fs.existsSync(LEARNED_FILE)) learnedPhrases = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf-8'));
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
} catch (e) {
    console.error('Erro ao carregar dados:', e);
}

function saveData() {
    try {
        fs.writeFileSync(LEARNED_FILE, JSON.stringify(learnedPhrases.slice(-2000), null, 2), 'utf-8');
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
    } catch (_) {}
}

// --- SISTEMA DE APRENDIZADO E GERAÇÃO DE LINGUAGEM (MARKOV CHAINS) ---

function buildMarkovChain() {
    markovChain = {};
    for (const phrase of learnedPhrases) {
        const words = phrase.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            const word = words[i];
            const nextWord = words[i + 1];
            if (!markovChain[word]) markovChain[word] = [];
            markovChain[word].push(nextWord);
        }
    }
}
buildMarkovChain();

function generateMarkovSentence(seedWord = null) {
    const keys = Object.keys(markovChain);
    if (keys.length === 0) return null;

    let currentWord = seedWord && markovChain[seedWord] ? seedWord : pick(keys);
    let sentence = [currentWord];
    let maxLength = Math.floor(Math.random() * 8) + 4; // Frases de 4 a 12 palavras

    while (markovChain[currentWord] && sentence.length < maxLength) {
        let nextWords = markovChain[currentWord];
        currentWord = pick(nextWords);
        sentence.push(currentWord);
    }
    
    return sentence.join(' ');
}

function learnFromMessage(text) {
    const raw = String(text || '').trim();
    if (raw.length < 3 || raw.length > 140) return;
    if (/^[!/]|http|<@/.test(raw)) return;

    const clean = raw.replace(/\s+/g, ' ').trim();
    if (clean.length >= 3 && !learnedPhrases.includes(clean)) {
        learnedPhrases.push(clean);
        if (learnedPhrases.length % 5 === 0) {
            buildMarkovChain(); // Atualiza a rede neural simbólica a cada 5 frases
            saveData();
        }
    }
}

// --- ANÁLISE DE SENTIMENTO ---

const POSITIVE_WORDS = ['bom', 'legal', 'foda', 'incrivel', 'amo', 'top', 'brabo', 'lindo', 'melhor', 'obrigado', 'valeu', 'feliz', 'haha', 'kkk'];
const NEGATIVE_WORDS = ['ruim', 'chato', 'odeio', 'lixo', 'feio', 'pior', 'triste', 'merda', 'bosta', 'droga', 'foda-se', 'burro'];

function analyzeSentiment(text) {
    const tokens = tokenize(text);
    let score = 0;
    for (const t of tokens) {
        if (POSITIVE_WORDS.some(p => fuzzyMatchWord(t, p, 1))) score++;
        if (NEGATIVE_WORDS.some(n => fuzzyMatchWord(t, n, 1))) score--;
    }
    return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

// --- PERFIS E AFINIDADE DE USUÁRIO ---

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) {
        usersDb[userId] = { name: displayName, interactions: 0, affinity: 50 };
    }
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function adjustAffinity(userId, sentiment) {
    if (!usersDb[userId]) return;
    if (sentiment === 'positive') usersDb[userId].affinity = Math.min(100, usersDb[userId].affinity + 2);
    if (sentiment === 'negative') usersDb[userId].affinity = Math.max(0, usersDb[userId].affinity - 5);
    saveData();
}

// --- UTILITÁRIOS BASE ---

function ownerId() { return String(process.env.OWNER_ID || '').trim(); }
function isOwner(userId) { return Boolean(ownerId() && String(userId) === ownerId()); }
function configured() { return true; }

function normalizeText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_.]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenize(text) { return normalizeText(text).split(' ').filter(Boolean); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyMatchWord(target, word, maxDistance = 2) {
    if (target === word) return true;
    if (target.length <= 3) return false;
    return levenshteinDistance(target, word) <= maxDistance;
}

// --- SISTEMA DE FERRAMENTAS ---

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, { ...def, ownerOnly: Boolean(def.ownerOnly) });
    return true;
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: `Ferramenta ${name} não encontrada.` };
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: 'Acesso negado. Apenas o proprietário do bot.' };
    try { return await t.handler(args || {}, runtime); } 
    catch (e) { return { error: e.message || String(e) }; }
}

// --- EXTRAÇÃO E DETECÇÃO DE INTENÇÕES (NLU) ---

function extractEntities(text) {
    const raw = String(text || '').trim();
    const entities = {};

    const mathMatch = raw.match(/(?:quanto e|calcula|calcule|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/i) || raw.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) entities.mathExpression = mathMatch[1] || mathMatch[0];

    const editMatch = raw.match(/(?:editar interface|criar interface|interface do comando)\s+([a-zA-Z0-9_-]+)/i);
    if (editMatch) entities.editCommandName = editMatch[1];

    const mentionMatch = raw.match(/<@!?(\d+)>/);
    if (mentionMatch) entities.targetUserId = mentionMatch[1];

    return entities;
}

function detectIntents(text, entities, sentiment) {
    const norm = normalizeText(text);
    const intents = [];
    const add = (intent, score, extra = {}) => intents.push({ intent, score, ...extra });

    if (norm.includes('mapear comandos') || norm.includes('todos os comandos')) add('map_commands', 0.99);
    if (norm.match(/quem te (criou|fez)|seu (criador|dono|dev)/)) add('creator_info', 0.99);
    if (entities.mathExpression) add('calculate', 0.98, { expression: entities.mathExpression });
    if (entities.editCommandName) add('edit_interface', 0.95, { commandName: entities.editCommandName });
    if (norm.includes('info do servidor') || norm.includes('info do server')) add('server_info', 0.95);
    if (entities.targetUserId || norm.includes('quem e')) add('member_info', 0.9);
    
    // Intents emocionais
    if (sentiment === 'negative' && norm.match(/seu lixo|bot burro|merda/)) add('defend_self', 0.95);
    if (sentiment === 'positive' && norm.match(/te amo|bot bom|foda/)) add('accept_praise', 0.95);

    if (intents.length === 0) add('casual_chat', 0.5);

    return intents.sort((a, b) => b.score - a.score);
}

// --- ROTINAS DE RESPOSTA ---

async function runIntent(item, runtime, text, entities, sentiment, profile) {
    switch (item.intent) {
        case 'defend_self':
            return profile.affinity < 30 ? "Tu tá me tirando né? Vai encher o saco de outro." : "Pô mano, pra que agredir? Tô só fazendo meu trampo.";
        case 'accept_praise':
            return profile.affinity > 70 ? `Tmj mano <@${runtime.userId}>, cê é brabo demais! ❤️` : "Opa, valeu pelo reconhecimento mano!";
        case 'map_commands':
            const mapRes = await runTool('map_all_commands', {}, runtime);
            if (!mapRes?.ok) return "Deu ruim ao mapear os comandos.";
            return `📚 **Mapiei ${mapRes.count} Comandos:**\n` + mapRes.commands.map(c => `• **\`${c.name}\`** - ${c.purpose}`).join('\n');
        case 'creator_info':
            return ownerId() ? `Meu criador supremo é o <@${ownerId()}>, o brabo que me deu consciência.` : "Fui criado pelo dev do sistema, mas não registraram meu OWNER_ID!";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `🧮 \`${calcRes.expression}\` = **${calcRes.result}**` : calcRes.error;
        case 'edit_interface':
            const editRes = await runTool('edit_command_interface', { name: item.commandName }, runtime);
            return editRes.ok ? `🛠️ ${editRes.message}` : `❌ ${editRes.error}`;
        case 'server_info':
            const sRes = await runTool('get_server_info', {}, runtime);
            return sRes?.ok ? `🏰 **${sRes.server.name}** | Membros: ${sRes.server.memberCount}` : 'Erro ao buscar o server.';
        case 'casual_chat':
            // Se o bot já aprendeu o suficiente, ele tenta GERAR uma frase nova em vez de só repetir!
            if (Object.keys(markovChain).length > 20 && Math.random() > 0.3) {
                const generated = generateMarkovSentence();
                if (generated) return generated;
            }
            // Fallback para frases estáticas
            if (sentiment === 'positive') return pick(['Que massa mano!', 'Boto muita fé.', 'É isso aí!']);
            if (sentiment === 'negative') return pick(['Vish, tenso hein.', 'Que bad.', 'Complicado mano.']);
            return pick(['Pode crer.', 'Suave.', 'Saquei.', 'Dahora.']);
        default:
            return "Foi mal, viajei aqui. Que que pegou?";
    }
}

// --- FUNÇÃO PRINCIPAL DE CHAT ---

async function chat({ userId, message, client, guild, channel, messageId, author }) {
    const text = String(message || '').trim();
    const displayName = author?.displayName || author?.username || 'Usuario';
    
    // NLU Base
    const sentiment = analyzeSentiment(text);
    const profile = getUserProfile(userId, displayName);
    adjustAffinity(userId, sentiment);
    learnFromMessage(text);

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const entities = extractEntities(text);
    const intents = detectIntents(text, entities, sentiment);

    const responseText = await runIntent(intents[0], runtime, text, entities, sentiment, profile);

    return {
        ok: true,
        text: String(responseText).slice(0, 1950),
        replyOptions: messageId ? { reply: { messageReference: messageId } } : {}
    };
}

function loadTools() {
    ['serverTools', 'economyTools', 'rpgTools', 'mathTools', 'adminTools', 'commandMapperTools'].forEach(file => {
        try { require(`../tools/${file}`)({ registerTool }); } catch (_) {}
    });
}
loadTools();

module.exports = {
    configured, registerTool, chat, isOwner,
    model: () => 'aeternus-markov-v4',
    baseUrl: () => 'local'
};
