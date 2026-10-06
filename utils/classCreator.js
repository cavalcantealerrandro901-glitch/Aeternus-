const axios = require('axios');

const MODEL = process.env.AETERNUS_CLASS_MODEL || 'gpt-6-luna';
const API_URL = 'https://api.openai.com/v1/responses';

const ATTRS = ['forca', 'defesa', 'agilidade', 'vida', 'inteligencia', 'sorte', 'precisao', 'resistencia'];

const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'rarity', 'type', 'emoji', 'attributes', 'uniqueAbilities', 'activeAbilities', 'uniquePassives', 'passives', 'disadvantages', 'items'],
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        rarity: { type: 'string', enum: ['comum', 'incomum', 'rara', 'epica', 'lendaria', 'unica', 'mitica'] },
        type: { type: 'string', enum: ['melee', 'magic', 'ranged', 'support', 'tank'] },
        emoji: { type: 'string' },
        attributes: { type: 'object', additionalProperties: { type: 'number' } },
        uniqueAbilities: { type: 'array', minItems: 3, maxItems: 3, items: { $ref: '#/$defs/ability' } },
        activeAbilities: { type: 'array', minItems: 4, maxItems: 4, items: { $ref: '#/$defs/ability' } },
        uniquePassives: { type: 'array', minItems: 3, maxItems: 3, items: { $ref: '#/$defs/passive' } },
        passives: { type: 'array', minItems: 5, maxItems: 5, items: { $ref: '#/$defs/passive' } },
        disadvantages: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['name', 'description', 'attributes'], properties: { name: {type:'string'}, description:{type:'string'}, attributes:{type:'object', additionalProperties:{type:'number'}} } } },
        items: { type: 'array', minItems: 3, maxItems: 3, items: { $ref: '#/$defs/item' } }
    },
    $defs: {
        ability: {
            type: 'object', additionalProperties: false,
            required: ['name', 'description', 'attributes'],
            properties: { name:{type:'string'}, description:{type:'string'}, attributes:{type:'object', additionalProperties:{type:'number'}} }
        },
        passive: {
            type: 'object', additionalProperties: false,
            required: ['name', 'description', 'attributes'],
            properties: { name:{type:'string'}, description:{type:'string'}, attributes:{type:'object', additionalProperties:{type:'number'}} }
        },
        item: {
            type: 'object', additionalProperties: false,
            required: ['name', 'emoji', 'category', 'rarity', 'description', 'effects', 'uniqueAbility'],
            properties: {
                name:{type:'string'}, emoji:{type:'string'},
                category:{type:'string', enum:['armadura','acessorio','consumivel']},
                rarity:{type:'string', enum:['comum','incomum','rara','epica','lendaria','mitica']},
                description:{type:'string'},
                effects:{type:'object', additionalProperties:{type:'number'}},
                uniqueAbility:{type:'object', additionalProperties:false, required:['name','description','attributes'], properties:{name:{type:'string'},description:{type:'string'},attributes:{type:'object',additionalProperties:{type:'number'}}}}
            }
        }
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
    for (const [k, v] of Object.entries(src)) {
        if (typeof k === 'string' && k.length <= 32) out[k] = clampNumber(v, -1000, 1000);
    }
    return out;
}

function slugify(value) {
    return String(value || 'item')
        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'item';
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
        category: ['armadura','acessorio','consumivel'].includes(String(item?.category || '').toLowerCase()) ? String(item.category).toLowerCase() : 'acessorio',
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
    if (!data.name || !data.description || !data.emoji) throw new Error('A IA retornou dados básicos incompletos.');
}

async function generateClass(description) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada. Configure a chave da OpenAI no ambiente do Aeternus.');

    const instructions = [
        'Você é o gerador oficial de classes do jogo Aeternus.',
        'Transforme a descrição do usuário em uma classe completa e coerente.',
        'Não invente campos fora do schema.',
        'Os efeitos são apenas dados de jogo e devem ser numéricos, equilibrados e coerentes com a raridade.',
        'Cada habilidade, passiva, desvantagem e item DEVE ter atributos numéricos.',
        'Use os atributos principais: forca, defesa, agilidade, vida, inteligencia, sorte, precisao, resistencia.',
        'A descrição do usuário tem prioridade para tema, fantasia, estilo, nome e conceito.',
        'Gere exatamente 3 habilidades únicas, 4 ativas, 3 passivas únicas, 5 passivas e 3 itens exclusivos.',
        'Os três itens devem ser equipamentos fictícios não relacionados a armas reais; use somente armadura, acessório ou consumível.',
        'Não copie classes existentes literalmente.',
        'Retorne somente o JSON estruturado.'
    ].join(' ');

    const response = await axios.post(API_URL, {
        model: MODEL,
        instructions,
        input: [{ role: 'user', content: [{ type: 'input_text', text: String(description).slice(0, 12000) }] }],
        text: { format: { type: 'json_schema', name: 'aeternus_class', strict: true, schema } },
        max_output_tokens: 12000
    }, {
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        timeout: 90000
    });

    const raw = response.data?.output_text;
    if (!raw) throw new Error('A OpenAI não retornou o JSON da classe.');
    let data;
    try { data = JSON.parse(raw); } catch (_) { throw new Error('A resposta da IA não veio em JSON válido.'); }
    validateGenerated(data);

    data.attributes = normalizeAttributes(data.attributes);
    data.uniqueAbilities = data.uniqueAbilities.map(normalizeAbility);
    data.activeAbilities = data.activeAbilities.map(normalizeAbility);
    data.uniquePassives = data.uniquePassives.map(normalizeAbility);
    data.passives = data.passives.map(normalizeAbility);
    data.disadvantages = data.disadvantages.map((d) => ({
        name: String(d.name || 'Desvantagem'),
        description: String(d.description || ''),
        attributes: normalizeEffectAttributes(d.attributes)
    }));
    data.items = data.items.map(normalizeItem);
    return data;
}

module.exports = { generateClass, ATTRS, MODEL };