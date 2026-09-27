/**
 * Aeternus AI — assistente integrado ao bot.
 *
 * Env:
 *   AETERNUS_AI_API_KEY | OPENAI_API_KEY | GROQ_API_KEY | XAI_API_KEY
 *   AETERNUS_AI_BASE_URL  (padrão OpenAI; Groq: https://api.groq.com/openai/v1 ; xAI: https://api.x.ai/v1)
 *   AETERNUS_AI_MODEL     (ex: gpt-4o-mini, llama-3.3-70b-versatile, grok-2-latest)
 *   OWNER_ID              (dono: propostas de comando/sistema)
 *
 * Módulos novos podem se registrar:
 *   const ai = require('./aeternusAI');
 *   ai.registerContext('meu_modulo', { description: '...', get: async (ctx) => ({ ... }) });
 *   ai.registerTool({ name, description, parameters, handler });
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const contexts = new Map();
const tools = new Map();
const history = new Map(); // userId -> [{role,content}]
const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 4;

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}

function isOwner(userId) {
    const o = ownerId();
    return o && String(userId) === o;
}

function apiKey() {
    return (
        process.env.AETERNUS_AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.XAI_API_KEY ||
        ''
    ).trim();
}

function baseUrl() {
    const raw = (
        process.env.AETERNUS_AI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        ''
    ).trim();
    if (raw) return raw.replace(/\/$/, '');
    if (process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
        return 'https://api.groq.com/openai/v1';
    }
    if (process.env.XAI_API_KEY && !process.env.OPENAI_API_KEY) {
        return 'https://api.x.ai/v1';
    }
    return 'https://api.openai.com/v1';
}

function model() {
    return (
        process.env.AETERNUS_AI_MODEL ||
        process.env.OPENAI_MODEL ||
        (process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini')
    ).trim();
}

function configured() {
    return Boolean(apiKey());
}

function registerContext(id, { description, get }) {
    if (!id || typeof get !== 'function') return false;
    contexts.set(String(id), {
        description: String(description || id),
        get
    });
    return true;
}

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, {
        name: def.name,
        description: String(def.description || def.name),
        parameters: def.parameters || { type: 'object', properties: {} },
        handler: def.handler,
        ownerOnly: !!def.ownerOnly
    });
    return true;
}

function listContexts() {
    return [...contexts.entries()].map(([id, c]) => ({ id, description: c.description }));
}

function listTools() {
    return [...tools.values()].map((t) => ({
        name: t.name,
        description: t.description,
        ownerOnly: t.ownerOnly
    }));
}

function pushHistory(userId, role, content) {
    const key = String(userId);
    const arr = history.get(key) || [];
    arr.push({ role, content: String(content || '').slice(0, 4000) });
    while (arr.length > MAX_HISTORY) arr.shift();
    history.set(key, arr);
}

function clearHistory(userId) {
    history.delete(String(userId));
}

async function gatherContext(runtime) {
    const out = {};
    for (const [id, c] of contexts) {
        try {
            out[id] = await c.get(runtime);
        } catch (e) {
            out[id] = { error: e.message || String(e) };
        }
    }
    return out;
}

function openaiTools() {
    return [...tools.values()].map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description + (t.ownerOnly ? ' (somente dono do bot)' : ''),
            parameters: t.parameters
        }
    }));
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: 'Ferramenta desconhecida: ' + name };
    if (t.ownerOnly && !isOwner(runtime.userId)) {
        return { error: 'Esta ferramenta só pode ser usada pelo dono do bot.' };
    }
    try {
        return await t.handler(args || {}, runtime);
    } catch (e) {
        return { error: e.message || String(e) };
    }
}

function systemPrompt(runtime, ctxSnapshot) {
    const botName = runtime.client?.user?.username || 'Aeternus';
    return [
        `Você é a IA oficial do bot Discord **${botName}** (Aeternus).`,
        'Responda em português do Brasil, de forma clara e objetiva.',
        'Você conhece economia (éter), RPG (classes, habilidades, arena), moderação, jogos e o painel web.',
        'Use as ferramentas quando precisar de dados reais (saldo, sonhos Loritta, servidores, comandos).',
        'Não invente saldos nem resultados de ferramentas.',
        'Para criar/editar sistemas ou comandos: só descreva ou gere rascunho se o usuário for o dono; nunca finja ter alterado o código em produção sem a ferramenta adequada.',
        'Ajude a projetar classes de RPG (stats, habilidades ativas/passivas, equipamentos) quando pedido.',
        '',
        'Contexto atual (JSON resumido):',
        JSON.stringify(ctxSnapshot).slice(0, 12000)
    ].join('\n');
}

async function chat({ userId, message, client, guild, channel }) {
    if (!configured()) {
        return {
            ok: false,
            error:
                'IA não configurada. Defina `AETERNUS_AI_API_KEY` (ou OPENAI/GROQ/XAI) e opcionalmente `AETERNUS_AI_MODEL` / `AETERNUS_AI_BASE_URL`.'
        };
    }

    const runtime = { userId: String(userId), client, guild, channel, isOwner: isOwner(userId) };
    const ctxSnapshot = await gatherContext(runtime);

    pushHistory(userId, 'user', message);

    const messages = [
        { role: 'system', content: systemPrompt(runtime, ctxSnapshot) },
        ...(history.get(String(userId)) || [])
    ];

    const url = baseUrl() + '/chat/completions';
    const headers = {
        Authorization: 'Bearer ' + apiKey(),
        'Content-Type': 'application/json'
    };

    let finalText = '';
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
        rounds += 1;
        const body = {
            model: model(),
            messages,
            temperature: 0.5,
            max_tokens: 1200
        };
        const toolDefs = openaiTools();
        if (toolDefs.length) {
            body.tools = toolDefs;
            body.tool_choice = 'auto';
        }

        const res = await axios.post(url, body, {
            headers,
            timeout: 60000,
            validateStatus: () => true
        });

        if (res.status < 200 || res.status >= 300) {
            const err =
                res.data?.error?.message ||
                res.data?.message ||
                `HTTP ${res.status}`;
            return { ok: false, error: 'Falha na API de IA: ' + err };
        }

        const choice = res.data?.choices?.[0];
        const msg = choice?.message;
        if (!msg) return { ok: false, error: 'Resposta vazia da IA.' };

        if (msg.tool_calls && msg.tool_calls.length) {
            messages.push(msg);
            for (const tc of msg.tool_calls) {
                const fname = tc.function?.name;
                let args = {};
                try {
                    args = JSON.parse(tc.function?.arguments || '{}');
                } catch (_) {}
                const result = await runTool(fname, args, runtime);
                messages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(result).slice(0, 8000)
                });
            }
            continue;
        }

        finalText = String(msg.content || '').trim();
        break;
    }

    if (!finalText) finalText = 'Não consegui montar uma resposta agora. Tente de novo.';
    pushHistory(userId, 'assistant', finalText);
    return { ok: true, text: finalText.slice(0, 1900) };
}

/* ---------- ferramentas padrão ---------- */

function installDefaultTools() {
    registerContext('bot', {
        description: 'Identidade do bot e horário',
        get: async ({ client }) => ({
            tag: client?.user?.tag || null,
            id: client?.user?.id || null,
            guildCount: client?.guilds?.cache?.size || 0,
            now: new Date().toISOString()
        })
    });

    registerContext('user', {
        description: 'Usuário que conversa',
        get: async ({ userId, isOwner }) => ({ userId, isOwner })
    });

    registerContext('guild', {
        description: 'Servidor atual',
        get: async ({ guild }) => {
            if (!guild) return { inGuild: false };
            return {
                inGuild: true,
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId
            };
        }
    });

    registerTool({
        name: 'get_eter_balance',
        description: 'Consulta o saldo de éter (Aeternus) de um usuário por ID.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Discord user ID (vazio = quem pergunta)' }
            }
        },
        handler: async (args, rt) => {
            const eter = require('./eter');
            const id = String(args.userId || rt.userId);
            return { userId: id, eter: eter.get(id) };
        }
    });

    registerTool({
        name: 'get_loritta_sonhos',
        description: 'Consulta sonhos na API da Loritta para um user ID.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Discord user ID (vazio = quem pergunta)' }
            }
        },
        handler: async (args, rt) => {
            const loritta = require('./loritta');
            const id = String(args.userId || rt.userId);
            if (!loritta.configured()) {
                return { ok: false, error: 'LORITTA_API_TOKEN não configurado (lorixp_...).' };
            }
            try {
                const u = await loritta.getUser(id);
                return {
                    ok: true,
                    userId: id,
                    sonhos: u.sonhos ?? u.money ?? null,
                    rawKeys: Object.keys(u || {}).slice(0, 20)
                };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });

    registerTool({
        name: 'explain_command',
        description: 'Explica um comando do Aeternus pelo nome.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nome ou alias do comando' }
            },
            required: ['name']
        },
        handler: async (args) => {
            const catalog = require('./commandCatalog');
            const found = catalog.findCommand(args.name);
            if (!found) return { ok: false, error: 'Comando não encontrado no catálogo.' };
            return {
                ok: true,
                name: found.name,
                desc: found.desc,
                usage: found.usage,
                example: found.example,
                about: found.about,
                category: found.category?.label
            };
        }
    });

    registerTool({
        name: 'list_command_categories',
        description: 'Lista categorias e nomes de comandos do catálogo.',
        parameters: { type: 'object', properties: {} },
        handler: async () => {
            const catalog = require('./commandCatalog');
            return catalog.listCategories().map((c) => ({
                id: c.id,
                label: c.label,
                commands: c.commands.map((x) => x.name)
            }));
        }
    });

    registerTool({
        name: 'list_bot_guilds',
        description: 'Lista servidores em que o bot está (nome, id, membros).',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Máximo (padrão 25)' }
            }
        },
        handler: async (args, rt) => {
            const limit = Math.min(50, Math.max(1, Number(args.limit) || 25));
            const list = [...(rt.client?.guilds?.cache?.values() || [])]
                .slice(0, limit)
                .map((g) => ({
                    id: g.id,
                    name: g.name,
                    members: g.memberCount,
                    ownerId: g.ownerId
                }));
            return { count: rt.client?.guilds?.cache?.size || 0, guilds: list };
        }
    });

    registerTool({
        name: 'get_player_summary',
        description: 'Resumo do personagem RPG (se existir) para um user ID.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string' }
            }
        },
        handler: async (args, rt) => {
            try {
                const player = require('./player');
                const id = String(args.userId || rt.userId);
                if (!player.has?.(id) && !player.get?.(id)) {
                    return { ok: false, error: 'Personagem não encontrado.' };
                }
                const p = player.get(id);
                return {
                    ok: true,
                    userId: id,
                    classId: p.classId || p.classe || null,
                    level: p.level || p.nivel || null,
                    attrs: p.attrs || p.atributos || null,
                    keys: Object.keys(p || {}).slice(0, 30)
                };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });

    registerTool({
        name: 'design_rpg_class',
        description:
            'Estrutura uma proposta de classe RPG (nome, stats, ativas, passivas, equipamentos) a partir de um briefing.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                theme: { type: 'string' },
                powerLevel: { type: 'string', description: 'comum|rara|epica|unica' }
            },
            required: ['name', 'theme']
        },
        handler: async (args) => {
            const power = String(args.powerLevel || 'rara').toLowerCase();
            const base =
                power.includes('unica') || power.includes('única')
                    ? 220
                    : power.includes('epic')
                      ? 160
                      : power.includes('rar')
                        ? 120
                        : 80;
            return {
                ok: true,
                classId: String(args.name || 'nova_classe')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, ''),
                name: args.name,
                theme: args.theme,
                suggestedStats: {
                    forca: base + 10,
                    agilidade: base,
                    defesa: base + 5,
                    vida: base + 15
                },
                suggestedActives: [
                    { name: 'Habilidade 1', power: Math.round(base * 1.2), note: 'Dano principal' },
                    { name: 'Habilidade 2', power: Math.round(base * 0.9), note: 'Controle' },
                    { name: 'Habilidade 3', power: Math.round(base * 0.7), note: 'Utilitário' },
                    { name: 'Ultimate', power: Math.round(base * 1.8), note: 'Alto custo / cooldown' }
                ],
                suggestedPassives: [
                    { name: 'Passiva 1', note: 'Bônus passivo alinhado ao tema' },
                    { name: 'Passiva 2', note: 'Sinergia com a ultimate' }
                ],
                note: 'Ajuste fino deve ser feito em utils/classes.js e utils/abilities.js pelo dono.'
            };
        }
    });

    registerTool({
        name: 'propose_command_draft',
        description:
            'Gera rascunho de um novo comando (código) e salva em drafts/ se possível. Somente dono.',
        ownerOnly: true,
        parameters: {
            type: 'object',
            properties: {
                commandName: { type: 'string' },
                description: { type: 'string' },
                code: { type: 'string', description: 'Código JS completo do comando' }
            },
            required: ['commandName', 'description']
        },
        handler: async (args) => {
            const name = String(args.commandName || '')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 32);
            if (!name) return { ok: false, error: 'Nome inválido' };

            const code =
                args.code ||
                `const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: '${name}',
    description: ${JSON.stringify(args.description || name)},
    data: new SlashCommandBuilder()
        .setName('${name.slice(0, 32)}')
        .setDescription(${JSON.stringify(String(args.description || name).slice(0, 100))}),
    async execute(message, args) {
        await message.reply('Comando ${name} em construção.');
    },
    async executeSlash(i) {
        await i.reply({ content: 'Comando ${name} em construção.', ephemeral: true });
    }
};
`;

            const dir = path.join(process.cwd(), 'drafts');
            try {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const file = path.join(dir, name + '.js');
                fs.writeFileSync(file, code, 'utf8');
                return {
                    ok: true,
                    path: file,
                    note: 'Rascunho salvo. Revise e mova para commands/ se aprovar. Hot-reload carrega commands/ automaticamente.'
                };
            } catch (e) {
                return {
                    ok: true,
                    path: null,
                    codePreview: code.slice(0, 1500),
                    note: 'Não foi possível gravar em disco: ' + (e.message || e)
                };
            }
        }
    });
}

installDefaultTools();

module.exports = {
    configured,
    registerContext,
    registerTool,
    listContexts,
    listTools,
    chat,
    clearHistory,
    isOwner,
    model,
    baseUrl
};
