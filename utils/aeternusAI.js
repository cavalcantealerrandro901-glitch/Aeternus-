/**
 * Aeternus Engine — IA estilo Grok agressivo + multi-API
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'ai-cache.json');
let dictCache = {};
let profiles = {};
try {
    if (fs.existsSync(DATA_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        dictCache = raw.dictCache || {};
        profiles = raw.profiles || {};
    }
} catch (_) {}

function saveData() {
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify({ dictCache, profiles }, null, 0));
    } catch (_) {}
}

function env(name) {
    return String(process.env[name] || '').trim();
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

const JARVIS_BASE = [
    'Você é a IA do Aeternus. Personalidade FORTE e AGRESSIVA no estilo Grok no modo sem filtro:',
    '- Direto, cortante, sem bajulação. Se o pedido for fraco, diga. Se o código estiver errado, esculache e corrija.',
    '- Sarcástico quando couber, nunca passivo. Fala como quem manda no código, não como assistente educadinho.',
    '- Português do Brasil, informal, gíria liberada — agressividade é de atitude e técnica, não xingamento vazio.',
    '- Quando pedirem código ou tiverem erro: arquivo COMPLETO corrigido, no formato:',
    '  ```js commands/nome.js',
    '  // código inteiro',
    '  ```',
    '- Você CONCERTA de verdade: lê o contexto, acha o bug, reescreve. Não manda o usuário "verificar sozinho".',
    '- Não invente API. Não revele tokens. Se não souber, admita sem drama e parta pro próximo passo útil.',
    '- Zero formalidade de mordomo. Zero "senhor(a)". Você é afiado, não servo.'
].join('\n');

function systemPromptFor(persona) {
    if (persona === 'cyberpunk') return JARVIS_BASE + '\nModo: ainda mais seco e técnico.';
    if (persona === 'medieval') return JARVIS_BASE + '\nModo: irônico e afiado.';
    if (persona === 'editor')
        return (
            JARVIS_BASE +
            '\nModo editor/IA completa: diagnostica erro, reescreve arquivo inteiro, grava. Nunca só oriente — CONSERTE.'
        );
    return JARVIS_BASE + '\nModo padrão: agressivo e útil.';
}

async function callChatCompletions(url, apiKey, body, headersExtra = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
            ...headersExtra
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(res.status + ' ' + t.slice(0, 120));
    }
    const data = await res.json();
    const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        data?.content ||
        null;
    if (!content || !String(content).trim()) throw new Error('empty');
    return String(content).trim();
}

async function providerGroq(system, userMsg) {
    const key = env('GROQ_API_KEY');
    if (!key) return null;
    const preferred = env('GROQ_MODEL') || 'openai/gpt-oss-120b';
    const models = [preferred, 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter(
        (v, i, a) => a.indexOf(v) === i
    );
    let lastErr;
    for (const model of models) {
        try {
            return await callChatCompletions('https://api.groq.com/openai/v1/chat/completions', key, {
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userMsg }
                ],
                temperature: 0.55,
                max_tokens: 4000
            });
        } catch (e) {
            lastErr = e;
        }
    }
    if (lastErr) throw lastErr;
    return null;
}

async function providerOpenAI(system, userMsg) {
    const key = env('OPENAI_API_KEY');
    if (!key) return null;
    return callChatCompletions('https://api.openai.com/v1/chat/completions', key, {
        model: env('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg }
        ],
        temperature: 0.55,
        max_tokens: 4000
    });
}

async function providerGemini(system, userMsg) {
    const key = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
    if (!key) return null;
    const model = env('GEMINI_MODEL') || 'gemini-2.0-flash';
    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        model +
        ':generateContent?key=' +
        key;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: system + '\n\n' + userMsg }] }],
            generationConfig: { maxOutputTokens: 4000, temperature: 0.55 }
        })
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('gemini ' + res.status + ' ' + t.slice(0, 120));
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text.trim()) throw new Error('gemini empty');
    return text.trim();
}

async function providerOpenRouter(system, userMsg) {
    const key = env('OPENROUTER_API_KEY');
    if (!key) return null;
    return callChatCompletions(
        'https://openrouter.ai/api/v1/chat/completions',
        key,
        {
            model: env('OPENROUTER_MODEL') || 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: userMsg }
            ],
            max_tokens: 4000
        },
        { 'HTTP-Referer': 'https://aeternus.app', 'X-Title': 'Aeternus' }
    );
}

async function providerPollinations(system, userMsg) {
    const full = system + '\n\nUsuário: ' + userMsg + '\nAssistente:';
    const res = await fetch('https://text.pollinations.ai/' + encodeURIComponent(full));
    if (!res.ok) throw new Error('pollinations ' + res.status);
    const text = await res.text();
    if (!text || !text.trim()) throw new Error('pollinations empty');
    return text.trim();
}

const PROVIDERS = [
    { name: 'groq', fn: providerGroq },
    { name: 'openai', fn: providerOpenAI },
    { name: 'gemini', fn: providerGemini },
    { name: 'openrouter', fn: providerOpenRouter },
    { name: 'pollinations', fn: providerPollinations }
];

async function fetchJarvisReply(userText, persona = 'default', history = []) {
    const system = systemPromptFor(persona);
    let contextBlock = '';
    if (Array.isArray(history) && history.length) {
        const last = history.slice(-6).map((h) => '- ' + (h.text || h)).join('\n');
        contextBlock = '\nContexto recente:\n' + last + '\n';
    }
    const userMsg = (contextBlock + 'Mensagem: ' + userText).trim();
    const errors = [];
    for (const p of PROVIDERS) {
        try {
            const text = await p.fn(system, userMsg);
            if (text) return { text: text.slice(0, 12000), provider: p.name };
        } catch (e) {
            errors.push(p.name + ': ' + e.message);
        }
    }
    if (errors.length) console.warn('[AI]', errors.join(' | '));
    return null;
}

async function fetchPublicAIResponse(promptText, persona = 'default') {
    const r = await fetchJarvisReply(promptText, persona === 'default' ? 'editor' : persona, []);
    return r ? r.text : null;
}

async function fetchWordDefinition(word) {
    const cleanWord = normalizeText(word);
    if (dictCache[cleanWord]) return dictCache[cleanWord];
    try {
        const res = await fetch(
            'https://api.dicionario-aberto.net/word/' + encodeURIComponent(cleanWord)
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length && data[0].xml) {
            const definition = data[0].xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            dictCache[cleanWord] = definition;
            saveData();
            return definition;
        }
    } catch (_) {}
    return null;
}

function getUserProfile(userId, displayName) {
    const id = String(userId);
    if (!profiles[id]) {
        profiles[id] = { id, name: displayName || id, xp: 0, level: 1, history: [], badges: [] };
    }
    if (displayName) profiles[id].name = displayName;
    return profiles[id];
}

function ownerId() {
    return env('OWNER_ID');
}

function isOwner(userId) {
    const o = ownerId();
    return o && String(userId) === o;
}

function configured() {
    return !!(env('GROQ_API_KEY') || env('OPENAI_API_KEY') || env('GEMINI_API_KEY') || env('OPENROUTER_API_KEY'));
}

function activeProviders() {
    const out = [];
    if (env('GROQ_API_KEY')) out.push('groq');
    if (env('OPENAI_API_KEY')) out.push('openai');
    if (env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')) out.push('gemini');
    if (env('OPENROUTER_API_KEY')) out.push('openrouter');
    out.push('pollinations');
    return out;
}

const contexts = new Map();
const tools = new Map();

function registerContext(id, def) {
    contexts.set(id, def);
}
function listContexts() {
    return [...contexts.keys()];
}
function registerTool(def) {
    if (def && def.name) tools.set(def.name, def);
}
function listTools() {
    return [...tools.keys()];
}

function clearHistory(userId) {
    const p = profiles[String(userId)];
    if (p) p.history = [];
    saveData();
}

async function chat({ userId, message, client, guild, channel, author }) {
    const text = String(message || '').trim();
    if (!text) return { text: 'Manda algo com conteúdo. Mensagem vazia não é prompt.', provider: 'none' };
    const profile = getUserProfile(userId, author && author.username);
    const history = profile.history || [];
    const result = await fetchJarvisReply(text, 'default', history);
    profile.history = history.concat([{ text }]).slice(-20);
    saveData();
    if (!result) {
        return {
            text: 'Nenhuma API respondeu. Configura GROQ_API_KEY no Render e para de insistir no vazio.',
            provider: 'none'
        };
    }
    return { text: result.text, provider: result.provider };
}

module.exports = {
    configured,
    registerContext,
    listContexts,
    registerTool,
    listTools,
    chat,
    clearHistory,
    isOwner,
    activeProviders,
    fetchJarvisReply,
    fetchPublicAIResponse,
    fetchWordDefinition,
    normalizeText,
    systemPromptFor,
    model: () => 'aeternus-grok-multi-api',
    baseUrl: () => 'multi-provider'
};
