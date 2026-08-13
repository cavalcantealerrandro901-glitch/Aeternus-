const db = require('../../database/db');
const { decrypt } = require('./cryptoSecrets');
const { buildLiveFacts, getCreatorInfo } = require('./aiContext');

const history = new Map();
const MAX_HISTORY = 6;
const MAX_REPLY = 500;

async function resolveApiConfig() {
    let apiKey =
        process.env.AI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.XAI_API_KEY ||
        process.env.GROK_API_KEY ||
        null;

    let baseUrl = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || null;
    let model = process.env.AI_MODEL || process.env.OPENAI_MODEL || null;

    if (!apiKey) {
        try {
            const doc = await db.getEditorConfig();
            const secrets = doc.secrets || [];
            const pick = (names) => {
                for (const n of names) {
                    const s = secrets.find((x) => x.name === n);
                    if (s) return decrypt(s.valueEnc);
                }
                return null;
            };
            apiKey = pick(['AI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY']);
            if (!baseUrl) baseUrl = pick(['AI_BASE_URL', 'OPENAI_BASE_URL']);
            if (!model) model = pick(['AI_MODEL', 'OPENAI_MODEL']);
        } catch {}
    }

    if (!baseUrl) {
        if (process.env.GROQ_API_KEY || (apiKey && String(apiKey).startsWith('gsk_'))) {
            baseUrl = 'https://api.groq.com/openai/v1';
        } else if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
            baseUrl = 'https://api.x.ai/v1';
        } else {
            baseUrl = 'https://api.openai.com/v1';
        }
    }
    baseUrl = String(baseUrl).replace(/\/$/, '');

    if (!model) {
        if (baseUrl.includes('groq.com')) model = 'llama-3.1-8b-instant';
        else if (baseUrl.includes('x.ai')) model = 'grok-3';
        else model = 'gpt-4o-mini';
    }

    return { apiKey, baseUrl, model };
}

function historyKey(userId, guildId) {
    return `${guildId || 'dm'}:${userId}`;
}

function getHistory(userId, guildId) {
    return history.get(historyKey(userId, guildId)) || [];
}

function pushHistory(userId, guildId, role, content) {
    const key = historyKey(userId, guildId);
    const list = history.get(key) || [];
    list.push({ role, content: String(content).slice(0, 800) });
    while (list.length > MAX_HISTORY) list.shift();
    history.set(key, list);
}

function clearHistory(userId, guildId) {
    history.delete(historyKey(userId, guildId));
}

function buildSystemPrompt(context = {}, liveFacts = '') {
    const name = context.botName || 'Aeternus';
    const user = context.username || 'usuário';
    const creator = getCreatorInfo();

    return (
        `Você é ${name}, assistente no Discord.\n` +
        `Responda SEMPRE em português do Brasil.\n` +
        `REGRA PRINCIPAL: respostas CURTAS — no máximo 1 a 2 frases. Sem listas longas. Sem rodeios.\n` +
        `Se for saldo: diga só o número. Se for clima: só temperatura e condição. Se for comandos: no máximo 5 itens.\n` +
        `Tom neutro. Sem RPG.\n` +
        `Use só os FATOS AO VIVO para números (saldo, membros, clima).\n` +
        `Não invente ações (ban/kick/pay).\n` +
        `Moeda: Almas. Criador: ${creator.name}. Usuário: ${user}.\n\n` +
        `FATOS:\n${liveFacts || '—'}`
    );
}

async function chat(userMessage, context = {}) {
    const { apiKey, baseUrl, model } = await resolveApiConfig();

    if (!apiKey) {
        return {
            ok: false,
            error: 'IA não configurada. Defina AI_API_KEY ou GROQ_API_KEY no Render.'
        };
    }

    const userId = context.userId || 'anon';
    const guildId = context.guildId || null;

    let liveFacts = '';
    try {
        liveFacts = await buildLiveFacts(userMessage, context.guild || null, {
            userId,
            client: context.client || null
        });
    } catch (err) {
        console.error('buildLiveFacts:', err.message);
        liveFacts = 'Fatos indisponíveis.';
    }

    const messages = [
        { role: 'system', content: buildSystemPrompt(context, liveFacts) },
        ...getHistory(userId, guildId),
        { role: 'user', content: String(userMessage).slice(0, 1500) }
    ];

    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.4,
                max_tokens: context.maxTokens || 120
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const msg = data?.error?.message || data?.error || res.statusText || 'Falha na API';
            console.error('AI API error:', res.status, msg);
            return { ok: false, error: String(msg) };
        }

        let reply = data?.choices?.[0]?.message?.content?.trim() || 'Sem resposta.';
        if (reply.length > MAX_REPLY) reply = reply.slice(0, MAX_REPLY - 1) + '…';

        if (!context.skipHistory) {
            pushHistory(userId, guildId, 'user', userMessage);
            pushHistory(userId, guildId, 'assistant', reply);
        }

        return { ok: true, reply, model };
    } catch (err) {
        console.error('AI chat falhou:', err);
        return { ok: false, error: err.message || 'Erro de conexão com a IA' };
    }
}

async function flavor(prompt, fallback = '', opts = {}) {
    const timeoutMs = opts.timeoutMs || 2000;
    try {
        const work = (async () => {
            const { apiKey, baseUrl, model } = await resolveApiConfig();
            if (!apiKey) return null;
            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.6,
                    max_tokens: opts.maxTokens || 40,
                    messages: [
                        {
                            role: 'system',
                            content: 'Uma frase bem curta em português. Máximo 12 palavras. Sem RPG.'
                        },
                        { role: 'user', content: String(prompt).slice(0, 300) }
                    ]
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return null;
            const text = data?.choices?.[0]?.message?.content?.trim();
            return text ? text.replace(/^["']|["']$/g, '').slice(0, 100) : null;
        })();

        const result = await Promise.race([
            work,
            new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
        ]);
        return result || fallback;
    } catch {
        return fallback;
    }
}

module.exports = {
    chat,
    flavor,
    clearHistory,
    getHistory,
    resolveApiConfig
};
