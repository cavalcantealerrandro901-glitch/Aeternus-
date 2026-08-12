const db = require('../../database/db');
const { decrypt } = require('./cryptoSecrets');

/** Histórico por usuário+servidor (memória curta) */
const history = new Map();
const MAX_HISTORY = 12;
const MAX_REPLY = 1900;

async function resolveApiConfig() {
    let apiKey =
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.XAI_API_KEY ||
        process.env.GROK_API_KEY ||
        null;

    let baseUrl =
        process.env.AI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        null;

    let model =
        process.env.AI_MODEL ||
        process.env.OPENAI_MODEL ||
        null;

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
            apiKey = pick(['AI_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY']);
            if (!baseUrl) baseUrl = pick(['AI_BASE_URL', 'OPENAI_BASE_URL']);
            if (!model) model = pick(['AI_MODEL', 'OPENAI_MODEL']);
        } catch {}
    }

    // Padrão: API compatível OpenAI (xAI Grok se não houver base)
    if (!baseUrl) {
        if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
            baseUrl = 'https://api.x.ai/v1';
        } else {
            baseUrl = 'https://api.openai.com/v1';
        }
    }
    baseUrl = String(baseUrl).replace(/\/$/, '');

    if (!model) {
        model = baseUrl.includes('x.ai') ? 'grok-3' : 'gpt-4o-mini';
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
    list.push({ role, content: String(content).slice(0, 4000) });
    while (list.length > MAX_HISTORY) list.shift();
    history.set(key, list);
}

function clearHistory(userId, guildId) {
    history.delete(historyKey(userId, guildId));
}

function buildSystemPrompt(context = {}) {
    const name = context.botName || 'Aeternus';
    const user = context.username || 'viajante';
    const guild = context.guildName || 'o abismo';

    return (
        `Você é ${name}, uma inteligência abissal que habita o Discord.\n` +
        `Personalidade: misteriosa, eloquente, um pouco sombria, mas útil e leal.\n` +
        `Moeda do servidor: Almas (💀). Tema: apostas, destino, poder e consequência.\n` +
        `Responda sempre em português do Brasil, de forma clara e envolvente.\n` +
        `Não invente que executou ações no Discord (ban, kick, pagamento) a menos que o sistema confirme.\n` +
        `Seja conciso em respostas simples; pode ser mais longo em explicações.\n` +
        `Usuário atual: ${user}. Servidor: ${guild}.\n` +
        `Se perguntarem quem você é: IA do bot Aeternus, guardião das Almas.`
    );
}

async function chat(userMessage, context = {}) {
    const { apiKey, baseUrl, model } = await resolveApiConfig();

    if (!apiKey) {
        return {
            ok: false,
            error:
                'IA não configurada. Defina `AI_API_KEY` (ou `XAI_API_KEY` / `OPENAI_API_KEY`) nas variáveis do Render ou no cofre do Editor.'
        };
    }

    const userId = context.userId || 'anon';
    const guildId = context.guildId || null;

    const messages = [
        { role: 'system', content: buildSystemPrompt(context) },
        ...getHistory(userId, guildId),
        { role: 'user', content: String(userMessage).slice(0, 4000) }
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
                temperature: 0.85,
                max_tokens: 800
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const msg =
                data?.error?.message ||
                data?.error ||
                res.statusText ||
                'Falha na API de IA';
            console.error('AI API error:', res.status, msg);
            return { ok: false, error: String(msg) };
        }

        const reply =
            data?.choices?.[0]?.message?.content?.trim() ||
            '…o abismo permaneceu em silêncio.';

        pushHistory(userId, guildId, 'user', userMessage);
        pushHistory(userId, guildId, 'assistant', reply);

        return { ok: true, reply: reply.slice(0, MAX_REPLY), model };
    } catch (err) {
        console.error('AI chat falhou:', err);
        return { ok: false, error: err.message || 'Erro de conexão com a IA' };
    }
}

module.exports = {
    chat,
    clearHistory,
    getHistory,
    resolveApiConfig
};
