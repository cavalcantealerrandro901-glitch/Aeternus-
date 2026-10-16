const axios = require('axios');

const MODEL = process.env.AETERNUS_CLASS_MODEL || 'openai/gpt-oss-120b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ATTRS = ['forca', 'defesa', 'agilidade', 'vida', 'inteligencia', 'sorte', 'precisao', 'resistencia'];

/** Schema plano (sem $ref/$defs) — Groq structured outputs é mais estável assim */
const abilitySchema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'attributes'],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        attributes: {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(ATTRS.map((k) => [k, { type: 'number' }])),
            required: ATTRS
        }
    }
};

const itemSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'emoji', 'category', 'rarity', 'description', 'effects', 'uniqueAbility'],
    properties: {
        name: { type: 'string' },
        emoji: { type: 'string' },
        category: { type: 'string', enum: ['armadura', 'acessorio', 'consumivel'] },
        rarity: { type: 'string', enum: ['comum', 'incomum', 'rara', 'epica', 'lendaria', 'mitica'] },
        description: { type: 'string' },
        effects: {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(ATTRS.map((k) => [k, { type: 'number' }])),
            required: ATTRS
        },
        uniqueAbility: abilitySchema
    }
};

const schema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'name',
        'description',
        'rarity',
        'type',
        'emoji',
        'attributes',
        'uniqueAbilities',
        'activeAbilities',
        'uniquePassives',
        'passives',
        'disadvantages',
        'items'
    ],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        rarity: {
            type: 'string',
            enum: ['comum', 'incomum', 'rara', 'epica', 'lendaria', 'unica', 'mitica']
        },
        type: {
            type: 'string',
            enum: ['melee', 'magic', 'ranged', 'support', 'tank']
        },
        emoji: { type: 'string' },
        attributes: {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(ATTRS.map((k) => [k, { type: 'number' }])),
            required: ATTRS
        },
        uniqueAbilities: { type: 'array', minItems: 3, maxItems: 3, items: abilitySchema },
        activeAbilities: { type: 'array', minItems: 4, maxItems: 4, items: abilitySchema },
        uniquePassives: { type: 'array', minItems: 3, maxItems: 3, items: abilitySchema },
        passives: { type: 'array', minItems: 5, maxItems: 5, items: abilitySchema },
        disadvantages: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: abilitySchema
        },
        items: { type: 'array', minItems: 3, maxItems: 3, items: itemSchema }
    }
};

function clampNumber(v, min = -1000, max = 1000) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
}

function normalizeAttributes(value) {
    const src = value && typeof value === 'object' ? value : {};
    const out = {};
    for (const key of ATTRS) out[key] = clampNumber(src[key], -1000, 1000);
    return out;
}

function normalizeEffectAttributes(value) {
    const src = value && typeof value === 'object' ? value : {};
    const out = {};
    for (const key of ATTRS) {
        if (src[key] != null) out[key] = clampNumber(src[key], -1000, 1000);
    }
    for (const [k, v] of Object.entries(src)) {
        if (!ATTRS.includes(k) && typeof k === 'string' && k.length <= 32) {
            out[k] = clampNumber(v, -1000, 1000);
        }
    }
    return out;
}

function slugify(value) {
    return (
        String(value || 'item')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 48) || 'item'
    );
}

function normalizeAbility(a) {
    return {
        name: String(a?.name || 'Habilidade'),
        description: String(a?.description || ''),
        attributes: normalizeEffectAttributes(a?.attributes)
    };
}

function normalizeItem(item) {
    return {
        id: slugify(item?.name),
        name: String(item?.name || 'Item de Classe'),
        emoji: String(item?.emoji || '🎒'),
        category: ['armadura', 'acessorio', 'consumivel'].includes(
            String(item?.category || '').toLowerCase()
        )
            ? String(item.category).toLowerCase()
            : 'acessorio',
        rarity: String(item?.rarity || 'comum').toLowerCase(),
        description: String(item?.description || ''),
        effects: normalizeEffectAttributes(item?.effects),
        uniqueAbility: normalizeAbility(item?.uniqueAbility)
    };
}

function validateGenerated(data) {
    const counts = [
        ['uniqueAbilities', 3],
        ['activeAbilities', 4],
        ['uniquePassives', 3],
        ['passives', 5],
        ['items', 3]
    ];
    for (const [key, expected] of counts) {
        if (!Array.isArray(data[key]) || data[key].length !== expected) {
            throw new Error('A IA não retornou a quantidade correta em ' + key + '.');
        }
    }
    if (!data.name || !data.description || !data.emoji) {
        throw new Error('A IA retornou dados básicos incompletos.');
    }
}

function formatApiError(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    let detail = '';
    if (data) {
        if (typeof data === 'string') detail = data.slice(0, 400);
        else if (data.error?.message) detail = String(data.error.message).slice(0, 400);
        else if (data.message) detail = String(data.message).slice(0, 400);
        else {
            try {
                detail = JSON.stringify(data).slice(0, 400);
            } catch (_) {}
        }
    }
    if (status === 400) {
        return (
            'Groq rejeitou a requisição (400)' +
            (detail ? ': ' + detail : '. Verifique modelo/schema/API key.')
        );
    }
    if (status === 401 || status === 403) {
        return 'Groq negou acesso (' + status + '). Verifique GROQ_API_KEY.';
    }
    if (status === 429) {
        return 'Groq rate limit (429). Tente novamente em instantes.';
    }
    return err?.message || String(err);
}

async function generateClass(description) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error(
            'GROQ_API_KEY não configurada. Configure a chave da Groq no ambiente do Aeternus.'
        );
    }

    const system = [
        'Você é o gerador oficial de classes do jogo Aeternus.',
        'Transforme a descrição do usuário em uma classe completa e coerente.',
        'Não invente campos fora do schema.',
        'Os efeitos são apenas dados de jogo e devem ser numéricos, equilibrados e coerentes com a raridade.',
        'Cada habilidade, passiva, desvantagem e item DEVE ter atributos numéricos nos campos forca, defesa, agilidade, vida, inteligencia, sorte, precisao, resistencia (use 0 se não se aplicar).',
        'A descrição do usuário tem prioridade para tema, fantasia, estilo, nome e conceito.',
        'Gere exatamente 3 habilidades únicas, 4 ativas, 3 passivas únicas, 5 passivas e 3 itens exclusivos.',
        'Os três itens devem ser equipamentos fictícios não relacionados a armas reais; use somente armadura, acessório ou consumível.',
        'Não copie classes existentes literalmente.',
        'Retorne somente o JSON estruturado.'
    ].join(' ');

    let response;
    try {
        response = await axios.post(
            API_URL,
            {
                model: MODEL,
                messages: [
                    { role: 'system', content: system },
                    {
                        role: 'user',
                        content: String(description).slice(0, 12000)
                    }
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'aeternus_class',
                        strict: true,
                        schema
                    }
                },
                temperature: 0.7,
                max_tokens: 12000
            },
            {
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            }
        );
    } catch (err) {
        console.error('[classCreator] groq error', err?.response?.status, err?.response?.data || err.message);
        throw new Error(formatApiError(err));
    }

    const raw = response.data?.choices?.[0]?.message?.content;
    if (!raw) throw new Error('A Groq não retornou o JSON da classe.');

    let data;
    try {
        data = JSON.parse(raw);
    } catch (_) {
        throw new Error('A resposta da IA não veio em JSON válido.');
    }
    validateGenerated(data);

    data.attributes = normalizeAttributes(data.attributes);
    data.uniqueAbilities = data.uniqueAbilities.map(normalizeAbility);
    data.activeAbilities = data.activeAbilities.map(normalizeAbility);
    data.uniquePassives = data.uniquePassives.map(normalizeAbility);
    data.passives = data.passives.map(normalizeAbility);
    data.disadvantages = (data.disadvantages || []).map((d) => ({
        name: String(d.name || 'Desvantagem'),
        description: String(d.description || ''),
        attributes: normalizeEffectAttributes(d.attributes)
    }));
    data.items = data.items.map(normalizeItem);
    return data;
}

module.exports = { generateClass, ATTRS, MODEL };
