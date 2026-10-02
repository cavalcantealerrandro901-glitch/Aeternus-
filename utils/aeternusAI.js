/**
 * Aeternus Engine — IA do bot / editor
 * Personalidade estilo Grok: direta, útil, sem enrolação.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'ai-cache.json');
let dictCache = {};
try {
    if (fs.existsSync(DATA_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        dictCache = raw.dictCache || {};
    }
} catch (_) {}

function saveData() {
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify({ dictCache }, null, 0));
    } catch (_) {}
}

function normalizeText(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function env(name) {
    return String(process.env[name] || '').trim();
}

const JARVIS_BASE = `Você é a IA do projeto Aeternus — mesmo jeito do Grok: direto, útil, sem enrolação, em português do Brasil.
Você ajuda a criar e editar o bot Discord (comandos, sistemas, utilitários, editor).
Quando pedirem código: entregue o arquivo COMPLETO e funcional, pronto pra salvar.
Formato ao gravar arquivo:
\`\`\`js commands/nome.js
// código inteiro
\`\`\`
Seja honesto se não souber. Não invente API que não existe. Não revele tokens/segredos.
Tom: informal e claro, como um dev parceiro — não formal tipo mordomo.`;

function systemPromptFor(persona) {
    if (persona === 'cyberpunk') {
        return `${JARVIS_BASE}\nModo: técnico e direto.`;
    }
    if (persona === 'medieval') {
        return `${JARVIS_BASE}\nModo: narrativo, ainda direto.`;
    }
    if (persona === 'editor') {
        return `${JARVIS_BASE}\nModo editor: sempre que for criar/editar arquivo, use bloco com path (commands/x.js) e código completo.`;
    }
    return `${JARVIS_BASE}\nModo padrão Grok.`;
}

async function callChatCompletions(url, apiKey, body, headersExtra = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...headersExtra
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`${res.status} ${t.slice(0, 120)}`);
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
    const model = env('GROQ_MODEL') || 'openai/gpt-oss-120b';
    const models = [model, 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter(
        (v, i, a) => a.indexOf(v) === i
    );
    let lastErr;
    for (const m of models) {
        try {
            return await callChatCompletions('https://api.groq.com/openai/v1/chat/completions', key, {
                model: m,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userMsg }
                ],
                temperature: 0.5,
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
    const model = env('OPENAI_MODEL') || 'gpt-4o-mini';
    return callChatCompletions('https://api.openai.com/v1/chat/completions', key, {
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg }
        ],
        temperature: 0.5,
        max_tokens: 4000
    });
}

async function providerGemini(system, userMsg) {
    const key = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
    if (!key) return null;
    const model = env('GEMINI_MODEL') || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: system + '\n\n' + userMsg }] }],
            generationConfig: { maxOutputTokens: 4000, temperature: 0.5 }
        })
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`gemini ${res.status} ${t.slice(0, 120)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!text.trim()) throw new Error('gemini empty');
    return text.trim();
}

async function providerOpenRouter(system, userMsg) {
    const key = env('OPENROUTER_API_KEY');
    if (!key) return null;
    const model = env('OPENROUTER_MODEL') || 'meta-llama/llama-3.1-8b-instruct:free';
    return callChatCompletions(
        'https://openrouter.ai/api/v1/chat/completions',
        key,
        {
            model,
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
    const full = `${system}\n\nUsuário: ${userMsg}\nAssistente:`;
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(full)}`);
    if (!res.ok) throw new Error(`pollinations ${res.status}`);
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
        const last = history.slice(-6).map((h) => `- ${h.text}`).join('\n');
        contextBlock = `\nContexto recente:\n${last}\n`;
    }
    const userMsg = `${contextBlock}Mensagem: ${userText}`.trim();

    const errors = [];
    for (const p of PROVIDERS) {
        try {
            const text = await p.fn(system, userMsg);
            if (text) return { text: text.slice(0, 12000), provider: p.name };
        } catch (e) {
            errors.push(`${p.name}: ${e.message}`);
        }
    }
    if (errors.length) console.warn('[AI] falhou:', errors.join(' | '));
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
            `https://api.dicionario-aberto.net/word/${encodeURIComponent(cleanWord)}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].xml) {
            const definition = data[0].xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            dictCache[cleanWord] = definition;
            saveData();
            return definition;
        }
    } catch (_) {}
    return null;
}

module.exports = {
    fetchJarvisReply,
    fetchPublicAIResponse,
    fetchWordDefinition,
    systemPromptFor,
    normalizeText
};
