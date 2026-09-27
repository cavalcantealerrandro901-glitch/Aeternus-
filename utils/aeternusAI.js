/**
 * Aeternus Engine v5.0 (Consciência Contínua)
 * Recursos: Markov Chains, Memória de Curto Prazo, Sistema de XP/Amizade,
 * Análise de Sentimento Dinâmica e Auto-Correção.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNED_FILE = path.join(DATA_DIR, 'learned_phrases.json');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');

const tools = new Map();
// Memória de curto prazo para conversas (Contexto)
const sessionMemory = new Map(); 
let usersDb = {};
let learnedPhrases = [];
let markovChain = {};

// --- PERSISTÊNCIA ---

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
        fs.writeFileSync(LEARNED_FILE, JSON.stringify(learnedPhrases.slice(-2500), null, 2), 'utf-8');
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
    } catch (_) {}
}

// --- MARKOV CHAINS (GERAÇÃO DE TEXTO) ---

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
    let maxLength = Math.floor(Math.random() * 10) + 5; 

    while (markovChain[currentWord] && sentence.length < maxLength) {
        let nextWords = markovChain[currentWord];
        currentWord = pick(nextWords);
        sentence.push(currentWord);
    }
    
    return sentence.join(' ');
}

// --- PERFIS, AFINIDADE E XP ---

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) {
        usersDb[userId] = { name: displayName, interactions: 0, affinity: 50, xp: 0, level: 1 };
    }
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function adjustAffinityAndXP(userId, sentiment) {
    if (!usersDb[userId]) return;
    const p = usersDb[userId];
    
    if (sentiment === 'positive') {
        p.affinity = Math.min(100, p.affinity + 2);
        p.xp += 15;
    } else if (sentiment === 'negative') {
        p.affinity = Math.max(0, p.affinity - 5);
        p.xp += 2; // Ganha pouco XP por ser tóxico
    } else {
        p.xp += 10;
    }

    // Level UP da amizade
    const xpNeeded = p.level * 100;
    if (p.xp >= xpNeeded) {
        p.level += 1;
        p.xp = 0;
    }
    
    saveData();
}

// --- SENTIMENTO E NLP BASE ---

const POSITIVE = ['bom', 'legal', 'foda', 'incrivel', 'amo', 'top', 'brabo', 'lindo', 'melhor', 'obrigado', 'valeu', 'feliz'];
const NEGATIVE = ['ruim', 'chato', 'odeio', 'lixo', 'feio', 'pior', 'triste', 'merda', 'bosta', 'droga', 'burro'];

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

// --- MEMÓRIA DE CURTO PRAZO ---

function getContext(userId) {
    if (!sessionMemory.has(userId)) sessionMemory.set(userId, []);
    return sessionMemory.get(userId);
}

function updateContext(userId, intent) {
    const history = getContext(userId);
    history.push(intent);
    if (history.length > 3) history.shift(); // Lembra das últimas 3 intenções
}

// --- FERRAMENTAS ---

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, { ...def, ownerOnly: Boolean(def.ownerOnly) });
    return true;
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: `Erro interno: Tool ${name} off.` };
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: '❌ Sem permissão. Só meu criador usa isso.' };
    try { return await t.handler(args || {}, runtime); } catch (e) { return { error: e.message }; }
}

// --- DETECÇÃO DE INTENÇÕES COM CONTEXTO ---

function detectIntents(text, userId) {
    const norm = normalizeText(text);
    const history = getContext(userId);
    const lastIntent = history[history.length - 1];
    const intents = [];
    const add = (intent, score, extra = {}) => intents.push({ intent, score, ...extra });

    // Se o usuário falou "e ele?" ou "e o dele?", tenta usar o contexto anterior
    if (norm.match(/e ele|e o dele|e vc/)) {
        if (lastIntent === 'creator_info') add('creator_info', 1.0);
        if (lastIntent === 'balance') add('balance', 1.0);
    }

    if (norm.includes('mapear comandos') || norm.includes('todos os comandos')) add('map_commands', 0.99);
    if (norm.match(/quem te (criou|fez)|seu (criador|dono|dev)/)) add('creator_info', 0.99);
    
    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) || norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) add('calculate', 0.98, { expression: mathMatch[1] });
    
    const editMatch = norm.match(/(?:editar interface|criar interface)\s+([a-z0-9_-]+)/);
    if (editMatch) add('edit_interface', 0.95, { commandName: editMatch[1] });

    if (norm.includes('info do servidor')) add('server_info', 0.95);
    if (norm.includes('status') || norm.includes('meu nivel')) add('my_profile', 0.9);

    if (intents.length === 0) add('casual_chat', 0.5);

    return intents.sort((a, b) => b.score - a.score)[0];
}

// --- RESPOSTAS ---

async function runIntent(item, runtime, text, sentiment, profile) {
    updateContext(runtime.userId, item.intent); // Salva o contexto

    switch (item.intent) {
        case 'my_profile':
            return `📊 **Perfil de Amizade de ${profile.name}:**\nNível: **${profile.level}**\nXP: **${profile.xp}/${profile.level * 100}**\nAfinidade: **${profile.affinity}%**\nInterações totais: ${profile.interactions}`;
        case 'map_commands':
            const mapRes = await runTool('map_all_commands', {}, runtime);
            if (!mapRes?.ok) return "Deu ruim ao mapear os comandos.";
            return `📚 **Mapiei ${mapRes.count} Comandos:**\n` + mapRes.commands.map(c => `• **\`${c.name}\`** - ${c.purpose}`).join('\n');
        case 'creator_info':
            return ownerId() ? `Meu criador supremo é o <@${ownerId()}>! Foi ele quem forjou a minha consciência.` : "Ainda não registraram o ID do meu mestre (OWNER_ID).";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `🧮 \`${calcRes.expression}\` = **${calcRes.result}**` : calcRes.error;
        case 'edit_interface':
            const editRes = await runTool('edit_command_interface', { name: item.commandName }, runtime);
            return editRes.ok ? `🛠️ ${editRes.message}` : `❌ ${editRes.error}`;
        case 'casual_chat':
            // Tratamento VIP para quem tem nível alto de amizade
            if (profile.level >= 5 && Math.random() > 0.7) {
                return `Você é VIP aqui mano <@${runtime.userId}>! Mas mudando de assunto, ${generateMarkovSentence() || 'suave?'}`;
            }

            if (Object.keys(markovChain).length > 20 && Math.random() > 0.4) {
                const generated = generateMarkovSentence();
                if (generated) return generated;
            }
            if (sentiment === 'positive') return pick(['Que massa mano!', 'Boto muita fé.', 'É isso aí!']);
            if (sentiment === 'negative') return pick(['Vish, tenso hein.', 'Complicado mano.', 'Vou fingir que não ouvi.']);
            return pick(['Pode crer.', 'Suave.', 'Saquei.', 'Dahora.']);
        default:
            return "Foi mal, boiei. Fala de novo?";
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '?' };

    const displayName = author?.displayName || author?.username || 'Usuario';
    const profile = getUserProfile(userId, displayName);
    const sentiment = analyzeSentiment(text);
    
    adjustAffinityAndXP(userId, sentiment);
    
    if (text.length > 3 && !text.startsWith('!')) {
        learnedPhrases.push(normalizeText(text));
        if (learnedPhrases.length % 5 === 0) {
            buildMarkovChain();
            saveData();
        }
    }

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text, userId);

    const responseText = await runIntent(intent, runtime, text, sentiment, profile);

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
    model: () => 'aeternus-v5-singularity',
    baseUrl: () => 'local'
};
