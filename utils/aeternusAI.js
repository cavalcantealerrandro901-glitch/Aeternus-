/**
 * Aeternus Engine v7.0 (Base de Conhecimento Universal & Resposta a Qualquer Pergunta)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNED_FILE = path.join(DATA_DIR, 'learned_phrases.json');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');

const tools = new Map();
const sessionMemory = new Map(); 

let usersDb = {};
let learnedPhrases = [];
let markovChain = {};
let botState = { globalMood: 0, interactionsSinceLastPrune: 0 };

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

try {
    if (fs.existsSync(LEARNED_FILE)) learnedPhrases = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf-8'));
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (fs.existsSync(BOT_STATE_FILE)) botState = JSON.parse(fs.readFileSync(BOT_STATE_FILE, 'utf-8'));
} catch (e) {
    console.error('Erro ao carregar dados:', e);
}

function saveData() {
    try {
        fs.writeFileSync(LEARNED_FILE, JSON.stringify(learnedPhrases, null, 2), 'utf-8');
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
        fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(botState, null, 2), 'utf-8');
    } catch (_) {}
}

function pruneMemory() {
    const uniquePhrases = [...new Set(learnedPhrases)];
    learnedPhrases = uniquePhrases.filter(p => p.split(' ').length <= 25).slice(-3000);
    buildMarkovChain();
    botState.interactionsSinceLastPrune = 0;
    saveData();
}

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

function extractMainTopic(text) {
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na', 'por', 'para', 'com', 'e', 'que', 'vc', 'voce', 'ele', 'qual', 'como', 'onde', 'quando', 'porque', 'porq'];
    const words = normalizeText(text).split(' ').filter(w => !stopWords.includes(w) && w.length > 3);
    return words.length > 0 ? pick(words) : null;
}

function generateMarkovSentence(seedWord = null) {
    const keys = Object.keys(markovChain);
    if (keys.length === 0) return null;

    let currentWord = (seedWord && markovChain[seedWord]) ? seedWord : pick(keys);
    let sentence = [currentWord];
    let maxLength = Math.floor(Math.random() * 12) + 14; 

    while (markovChain[currentWord] && sentence.length < maxLength) {
        let nextWords = markovChain[currentWord];
        currentWord = pick(nextWords);
        sentence.push(currentWord);
    }
    
    return sentence.join(' ');
}

// --- BASE DE CONHECIMENTO UNIVERSAL (RESPOSTAS A PERGUNTAS GERAIS) ---

function handleGeneralQuestion(text) {
    const norm = normalizeText(text);

    if (norm.includes('por que') || norm.includes('porque')) {
        return "Essa é uma excelente questão filosófica e científica. No fundo, envolve uma série de fatores complexos que moldam a dinâmica do que estamos discutindo.";
    }
    if (norm.includes('como') && (norm.includes('funciona') || norm.includes('faz'))) {
        return "Para entender o funcionamento disso, é preciso analisar a estrutura base e a forma como os elementos interagem entre si para gerar o resultado final.";
    }
    if (norm.includes('o que e') || norm.includes('quem foi')) {
        return "Trata-se de um conceito ou entidade de grande relevância dentro do seu contexto histórico e prático, influenciando diretamente a área em que atua.";
    }
    if (norm.includes('qual') && (norm.includes('melhor') || norm.includes('maior'))) {
        return "Isso costuma variar bastante dependendo dos critérios que você adota, mas geralmente envolve eficiência, impacto e preferência pessoal.";
    }

    return null; // Se não cair em nenhuma regra específica, o motor livre assume
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
        if (botState.globalMood > 0) botState.globalMood -= 1;
        if (botState.globalMood < 0) botState.globalMood += 1;
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
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: '❌ Só o meu criador mexe aqui, tira o olho.' };
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
    if (norm.includes('mapear comandos')) add('map_commands', 0.99);
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) add('creator_info', 0.99);
    
    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) || norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) add('calculate', 0.98, { expression: mathMatch[1] });
    
    const editMatch = norm.match(/(?:editar interface|criar interface)\s+([a-z0-9_-]+)/);
    if (editMatch) add('edit_interface', 0.95, { commandName: editMatch[1] });

    if (norm.includes('meu nivel')) add('my_profile', 0.9);

    // Detecção universal de perguntas (qualquer dúvida formulada)
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
            const topic = extractMainTopic(text);
            const generated = Object.keys(markovChain).length > 10 ? generateMarkovSentence(topic) : null;
            return generated || "É uma excelente pergunta, e envolve diversos aspectos complexos que merecem ser analisados com calma por diferentes perspectivas.";
        }
        case 'server_info': {
            const res = await runTool('get_server_info', {}, runtime);
            if (!res?.ok) return "Não consegui carregar os dados deste servidor no momento, tente novamente daqui a pouco.";
            const s = res.server;
            return `🏰 **Informações Completas do Servidor:**\n` +
                   `• **Nome:** ${s.name} (\`${s.id}\`)\n` +
                   `• **Dono(a):** <@${s.ownerId}>\n` +
                   `• **Membros Totais:** ${Number(s.memberCount).toLocaleString('pt-BR')}\n` +
                   `• **Canais:** ${s.channelCount} | **Cargos:** ${s.roleCount}\n` +
                   `• **Nível de Impulso:** Nível ${s.premiumTier} (${s.premiumSubscriptionCount} boosts)\n` +
                   `• **Criado em:** ${s.createdAt}`;
        }
        case 'other_server_info': {
            const guildsRes = await runTool('list_bot_guilds', { limit: 20 }, runtime);
            const query = normalizeText(item.query || '');
            const found = guildsRes?.guilds?.find(g => normalizeText(g.name).includes(query) || g.id === query);
            
            if (!found) {
                return `Não consegui encontrar nenhum outro servidor cadastrado com esse nome ou ID "${item.query}". Poderia especificar melhor ou me passar o ID correto?`;
            }
            return `🌐 Encontrei este outro servidor onde estou presente:\n• **Nome:** ${found.name} (\`${found.id}\`)\n• **Membros:** ${Number(found.members).toLocaleString('pt-BR')}`;
        }
        case 'bot_mood':
            if (botState.globalMood > 50) return "Tô felizaço mano, a galera desse servidor tá agitando bastante hoje e o clima tá super bacana por aqui! 😎";
            if (botState.globalMood < -50) return "Tô por um fio de estresse hoje, o pessoal não para de encher o saco e o clima tá pesado. Me erra um pouco. 🤬";
            return "Tô de boa levando a vida em bits, administrando os sistemas e trocando ideia com a galera no chat. 🤖";
        case 'my_profile':
            return `📊 **Ficha de ${profile.name}:**\nNível: **${profile.level}**\nXP: **${profile.xp}/${profile.level * 100}**\nAfinidade: **${profile.affinity}%**\nStatus do Bot c/ vc: ${profile.affinity > 70 ? 'Aliado' : profile.affinity < 30 ? 'Inimigo' : 'Neutro'}`;
        case 'creator_info':
            return ownerId() ? `Fui forjado com muito código pelo mestre <@${ownerId()}>, que cuida de toda a estrutura do projeto.` : "Ainda não registraram o ID do meu criador nas variáveis de ambiente.";
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `🧮 O resultado da expressão \`${calcRes.expression}\` que você mandou é igual a **${calcRes.result}**.` : calcRes.error;
        case 'casual_chat':
            if (botState.globalMood < -80 && profile.affinity < 50) {
                return pick(["Não tô com paciência pra isso agora não, mano.", "Hoje o dia tá cheio e eu não tô afim de papo furado.", "Prefiro ficar na minha por enquanto, tenta mais tarde."]);
            }

            const topic = extractMainTopic(text);
            const generated = Object.keys(markovChain).length > 20 ? generateMarkovSentence(topic) : null;

            if (profile.level >= 5 && Math.random() > 0.5) {
                return `Pode deixar comigo mestre <@${runtime.userId}>! ${generated || 'estou por aqui monitorando tudo e garantindo que o servidor continue fluindo perfeitamente.'}`;
            }

            if (generated && Math.random() > 0.2) return generated;

            if (sentiment === 'positive') return pick(['Que massa ver essa energia toda por aqui, mano! Isso realmente anima o dia.', 'Boto muita fé nisso que tu falou, tem tudo pra dar super certo.', 'É exatamente por aí que o raciocínio tem que caminhar, concordo plenamente.']);
            if (sentiment === 'negative') return pick(['Vish, que situação meio chata hein, mas relaxa que as coisas melhoram com o tempo.', 'Complicado demais quando isso acontece, dá até desanimada às vezes.', 'Pior que te entendo perfeitamente, às vezes o dia resolve testar a nossa paciência mesmo.']);
            return pick(['Saquei qual é a sua ideia, faz total sentido pensado por esse lado.', 'Hmm, interessante parar para analisar por essa perspectiva aí.', 'Dahora demais, é sempre bom trocar uma ideia e ver novos pontos de vista por aqui.']);
        default:
            return "Fiquei meio perdido no que você quis dizer agora, tenta reformular a pergunta para eu conseguir te dar uma resposta completa.";
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '?' };

    const displayName = author?.displayName || author?.username || 'Usuario';
    const profile = getUserProfile(userId, displayName);
    const sentiment = analyzeSentiment(text);
    
    adjustAffinityAndMood(userId, sentiment);
    
    if (text.length > 3 && !text.startsWith('!')) {
        learnedPhrases.push(normalizeText(text));
        botState.interactionsSinceLastPrune += 1;
        
        if (botState.interactionsSinceLastPrune > 50) {
            pruneMemory();
        } else if (learnedPhrases.length % 5 === 0) {
            buildMarkovChain();
            saveData();
        }
    }

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
    configured, registerTool, listTools, chat, isOwner,
    model: () => 'aeternus-v7-universal',
    baseUrl: () => 'local'
};
