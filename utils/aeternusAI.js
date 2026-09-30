/**
 * Aeternus Engine — J.A.R.V.I.S. Core
 * Personalidade estilo assistente do Homem de Ferro + multi-API de IA.
 *
 * Provedores (ordem de prioridade, só os que tiverem chave no env):
 *  1. Groq          → GROQ_API_KEY
 *  2. OpenAI        → OPENAI_API_KEY
 *  3. Google Gemini → GEMINI_API_KEY / GOOGLE_API_KEY
 *  4. OpenRouter    → OPENROUTER_API_KEY
 *  5. HuggingFace   → HF_TOKEN / HUGGINGFACE_API_KEY
 *  6. Pollinations  → sem chave (fallback público)
 *
 * Nunca coloque chaves neste arquivo. Use .env / Render Environment.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const DICT_CACHE_FILE = path.join(DATA_DIR, 'dict_cache.json');
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');

const contexts = new Map();
const tools = new Map();

let usersDb = {};
let dictCache = {};
let botState = { globalMood: 0 };

const triviaQuestions = [
    { q: 'Qual é a velocidade aproximada da luz no vácuo? (Dica: cerca de 300 mil km/s)', a: '300000' },
    { q: 'Quantos bits formam 1 byte?', a: '8' },
    { q: 'Qual linguagem de programação deu origem a este bot?', a: 'javascript' },
    { q: 'Qual é a estrela mais próxima da Terra além do Sol?', a: 'proxima centauri' },
    { q: 'Em que ano o homem pisou na Lua pela primeira vez?', a: '1969' }
];

if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (_) {}
}

try {
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (fs.existsSync(DICT_CACHE_FILE)) dictCache = JSON.parse(fs.readFileSync(DICT_CACHE_FILE, 'utf-8'));
    if (fs.existsSync(BOT_STATE_FILE)) botState = JSON.parse(fs.readFileSync(BOT_STATE_FILE, 'utf-8'));
} catch (e) {
    console.error('[JARVIS] Erro ao carregar dados:', e.message);
}

function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
        fs.writeFileSync(DICT_CACHE_FILE, JSON.stringify(dictCache, null, 2), 'utf-8');
        fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(botState, null, 2), 'utf-8');
    } catch (_) {}
}

// ─── Persona J.A.R.V.I.S. ───────────────────────────────────────────────────
const JARVIS_BASE = `Você é J.A.R.V.I.S. (Just A Rather Very Intelligent System), a inteligência artificial do projeto Aeternus no Discord.
Personalidade: formal, elegante, levemente sarcástico e extremamente competente — no estilo do assistente do Homem de Ferro.
Trate o usuário com respeito (pode usar "senhor(a)" ocasionalmente, sem exagero).
Respostas em português do Brasil, claras e úteis para Discord (curtas: preferencialmente até 3–6 frases).
Nunca invente comandos que o bot não tem. Se não souber, admita com elegância e ofereça alternativa.
Não revele chaves de API, tokens ou segredos. Não execute ações de moderação por conta própria — apenas oriente.`;

function systemPromptFor(persona) {
    if (persona === 'cyberpunk') {
        return `${JARVIS_BASE}
Modo ativo: CIBERNÉTICO. Tom de rede neural / interface tática, ainda elegante.`;
    }
    if (persona === 'medieval') {
        return `${JARVIS_BASE}
Modo ativo: MÍSTICO. Tom de conselheiro de corte real / armadura arcana, ainda preciso.`;
    }
    return `${JARVIS_BASE}
Modo ativo: padrão Stark Industries — protocolo JARVIS completo.`;
}

// ─── Multi-API cascade ─────────────────────────────────────────────────────
function env(name) {
    return String(process.env[name] || '').trim();
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

/** Groq — rápido, grátis com chave */
async function providerGroq(system, userMsg) {
    const key = env('GROQ_API_KEY');
    if (!key) return null;
    const model = env('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    return callChatCompletions('https://api.groq.com/openai/v1/chat/completions', key, {
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg }
        ],
        temperature: 0.7,
        max_tokens: 500
    });
}

/** OpenAI */
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
        temperature: 0.7,
        max_tokens: 500
    });
}

/** Google Gemini */
async function providerGemini(system, userMsg) {
    const key = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
    if (!key) return null;
    const model = env('GEMINI_MODEL') || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
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

/** OpenRouter — vários modelos atrás de uma chave */
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
            temperature: 0.7,
            max_tokens: 500
        },
        {
            'HTTP-Referer': env('OPENROUTER_REFERER') || 'https://github.com/aeternus-bot',
            'X-Title': 'Aeternus JARVIS'
        }
    );
}

/** Hugging Face Inference */
async function providerHuggingFace(system, userMsg) {
    const key = env('HF_TOKEN') || env('HUGGINGFACE_API_KEY');
    if (!key) return null;
    const model = env('HF_MODEL') || 'HuggingFaceH4/zephyr-7b-beta';
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: `<|system|>\n${system}</s>\n<|user|>\n${userMsg}</s>\n<|assistant|>\n`,
            parameters: { max_new_tokens: 400, temperature: 0.7, return_full_text: false }
        })
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`hf ${res.status} ${t.slice(0, 120)}`);
    }
    const data = await res.json();
    const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    if (!text || !String(text).trim()) throw new Error('hf empty');
    return String(text).trim();
}

/** Pollinations — fallback sem chave */
async function providerPollinations(system, userMsg) {
    const full = `${system}\n\nUsuário: ${userMsg}\nJARVIS:`;
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
    { name: 'huggingface', fn: providerHuggingFace },
    { name: 'pollinations', fn: providerPollinations }
];

async function fetchJarvisReply(userText, persona = 'default', history = []) {
    const system = systemPromptFor(persona);
    let contextBlock = '';
    if (Array.isArray(history) && history.length) {
        const last = history.slice(-6).map((h) => `- ${h.text}`).join('\n');
        contextBlock = `\nContexto recente do usuário:\n${last}\n`;
    }
    const userMsg = `${contextBlock}Mensagem atual: ${userText}`.trim();

    const errors = [];
    for (const p of PROVIDERS) {
        try {
            const text = await p.fn(system, userMsg);
            if (text) {
                return { text: text.slice(0, 1900), provider: p.name };
            }
        } catch (e) {
            errors.push(`${p.name}: ${e.message}`);
        }
    }
    if (errors.length) {
        console.warn('[JARVIS] todos os provedores falharam:', errors.join(' | '));
    }
    return null;
}

async function fetchPublicAIResponse(promptText, persona = 'default') {
    const r = await fetchJarvisReply(promptText, persona, []);
    return r ? r.text : null;
}

async function fetchWordDefinition(word) {
    const cleanWord = normalizeText(word);
    if (dictCache[cleanWord]) return dictCache[cleanWord];
    try {
        const res = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(cleanWord)}`);
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

function getUserProfile(userId, displayName) {
    if (!usersDb[userId]) {
        usersDb[userId] = {
            name: displayName,
            interactions: 0,
            affinity: 50,
            xp: 0,
            level: 1,
            persona: 'default',
            badges: ['Iniciante ⚡'],
            history: []
        };
    }
    usersDb[userId].interactions += 1;
    return usersDb[userId];
}

function checkAndAwardBadges(profile) {
    if (!profile.badges) profile.badges = ['Iniciante ⚡'];
    if (profile.level >= 3 && !profile.badges.includes('Veterano 🛡️')) profile.badges.push('Veterano 🛡️');
    if (profile.level >= 5 && !profile.badges.includes('Lendário 🌟')) profile.badges.push('Lendário 🌟');
    if (profile.persona === 'cyberpunk' && !profile.badges.includes('Ciber-Hacker 🦾'))
        profile.badges.push('Ciber-Hacker 🦾');
    if (profile.persona === 'medieval' && !profile.badges.includes('Cavaleiro Místico ⚔️'))
        profile.badges.push('Cavaleiro Místico ⚔️');
}

function addXpAndCheckLevel(profile, bonus = 0) {
    const xpGain = Math.floor(Math.random() * 15) + 12 + bonus;
    profile.xp = (profile.xp || 0) + xpGain;
    const nextLevelXp = profile.level * 100;
    let leveledUp = false;
    if (profile.xp >= nextLevelXp) {
        profile.level += 1;
        profile.xp -= nextLevelXp;
        profile.affinity = Math.min(100, profile.affinity + 10);
        leveledUp = true;
    }
    checkAndAwardBadges(profile);
    saveData();
    return { xpGain, leveledUp };
}

function updatePersistentHistory(userId, text, intent) {
    const profile = usersDb[userId];
    if (!profile) return;
    if (!profile.history) profile.history = [];
    profile.history.push({ text, intent, timestamp: Date.now() });
    if (profile.history.length > 12) profile.history.shift();
    saveData();
}

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}
function isOwner(userId) {
    return Boolean(ownerId() && String(userId) === ownerId());
}

function isStaffOrAdmin(guild, userId) {
    if (isOwner(userId)) return true;
    if (!guild) return false;
    const member = guild.members.cache.get(userId);
    if (!member) return false;
    return (
        member.permissions.has('Administrator') ||
        member.permissions.has('ManageGuild') ||
        member.permissions.has('ModerateMembers')
    );
}

function configured() {
    return true;
}

function activeProviders() {
    const list = [];
    if (env('GROQ_API_KEY')) list.push('groq');
    if (env('OPENAI_API_KEY')) list.push('openai');
    if (env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')) list.push('gemini');
    if (env('OPENROUTER_API_KEY')) list.push('openrouter');
    if (env('HF_TOKEN') || env('HUGGINGFACE_API_KEY')) list.push('huggingface');
    list.push('pollinations');
    return list;
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function registerContext(id, { description, get }) {
    if (!id || typeof get !== 'function') return false;
    contexts.set(String(id), { description: String(description || id), get });
    return true;
}

function listContexts() {
    return [...contexts.entries()].map(([id, c]) => ({ id, description: c.description }));
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
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: '❌ Só o meu criador mexe aqui, senhor.' };
    try {
        return await t.handler(args || {}, runtime);
    } catch (e) {
        return { error: e.message };
    }
}

function detectIntents(text) {
    const norm = normalizeText(text);

    const inviteMatch = norm.match(
        /(?:link de convite|convite|gerar convite)\s+(?:do\s+servidor\s+)?([0-9]+|[a-z0-9\s]+)/
    );
    if (inviteMatch) return { intent: 'guild_invite', query: inviteMatch[1].trim(), score: 0.99 };

    const banMatch = norm.match(/(?:banir|ban)\s+([@0-9a-z\s#]+)/i);
    if (banMatch) return { intent: 'mod_ban', target: banMatch[1].trim(), score: 0.99 };

    const kickMatch = norm.match(/(?:expulsar|kick)\s+([@0-9a-z\s#]+)/i);
    if (kickMatch) return { intent: 'mod_kick', target: kickMatch[1].trim(), score: 0.99 };

    const muteMatch = norm.match(/(?:mutar|timeout|silenciar)\s+([@0-9a-z\s#]+)/i);
    if (muteMatch) return { intent: 'mod_mute', target: muteMatch[1].trim(), score: 0.99 };

    const clearMatch = norm.match(/(?:limpar|purge|apagar)\s+([0-9]+)\s+mensagens?/i);
    if (clearMatch) return { intent: 'mod_clear', count: parseInt(clearMatch[1], 10), score: 0.99 };

    if (norm.match(/quais servidores|listar servidores|servidores que voce esta|meus servidores/)) {
        return { intent: 'list_guilds', score: 0.99 };
    }

    const serverInfoMatch =
        norm.match(/(?:informacoes|info|sobre)\s+do\s+servidor\s+([0-9]+|[a-z0-9\s]+)/) ||
        norm.match(/servidor\s+([0-9]+)/);
    if (serverInfoMatch) return { intent: 'guild_info', query: serverInfoMatch[1].trim(), score: 0.99 };

    const msgOwnerMatch = norm.match(
        /(?:mandar mensagem|enviar mensagem)\s+(?:para\s+)?o\s+dono\s+do\s+servidor\s+([0-9]+|[a-z0-9\s]+)(?::\s*|\s+dizendo\s+)(.+)/i
    );
    if (msgOwnerMatch) {
        return {
            intent: 'message_guild_owner',
            target: msgOwnerMatch[1].trim(),
            content: msgOwnerMatch[2].trim(),
            score: 0.99
        };
    }

    if (norm.match(/desafio|trivia|quiz|pergunta/)) return { intent: 'start_trivia', score: 0.99 };
    if (norm.match(/modo cibernetico|ativar cyberpunk/)) return { intent: 'set_persona', persona: 'cyberpunk', score: 0.99 };
    if (norm.match(/modo medieval|ativar m[eé]stico/)) return { intent: 'set_persona', persona: 'medieval', score: 0.99 };
    if (norm.match(/modo padr[aã]o|desativar modo|modo jarvis|ativar jarvis/))
        return { intent: 'set_persona', persona: 'default', score: 0.99 };

    if (norm.match(/meu nivel|minha ficha|meus status|meu perfil/)) return { intent: 'user_profile', score: 0.99 };

    if (norm.match(/quais (ias|apis|provedores)|status (da )?ia|jarvis status/)) {
        return { intent: 'ai_status', score: 0.99 };
    }

    for (const [name, tool] of tools.entries()) {
        const toolNameNorm = normalizeText(name);
        if (norm.includes(toolNameNorm) || (toolNameNorm.length > 4 && norm.includes(toolNameNorm.replace(/_/g, ' ')))) {
            return { intent: 'execute_dynamic_tool', toolName: name, score: 0.95 };
        }
    }

    const dictMatch = norm.match(
        /(?:significa|significado de|defina|definicao de|o que e|pesquise a palavra|pesquisar)\s+([a-zà-ú]+)/
    );
    if (dictMatch) return { intent: 'dictionary_lookup', score: 0.99, word: dictMatch[1] };

    if (norm.match(/como vc ta|como voce esta|seu humor/)) return { intent: 'bot_mood', score: 0.95 };
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) return { intent: 'creator_info', score: 0.95 };

    const mathMatch =
        norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) ||
        norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) return { intent: 'calculate', score: 0.95, expression: mathMatch[1] || mathMatch[0] };

    return { intent: 'autonomous_reply', score: 0.8 };
}

function safeEvalMath(expression) {
    const cleaned = String(expression || '').replace(/[^0-9+\-*/%().^\s]/g, '');
    if (!cleaned || cleaned.length > 80) return { error: 'Expressão inválida.' };
    try {
        const result = Function(`"use strict"; return (${cleaned.replace(/\^/g, '**')});`)();
        if (typeof result !== 'number' || !Number.isFinite(result)) return { error: 'Resultado inválido.' };
        return { result };
    } catch {
        return { error: 'Não consegui calcular isso.' };
    }
}

async function runIntent(item, runtime, text, profile, levelUpInfo) {
    updatePersistentHistory(runtime.userId, text, item.intent);

    const client = runtime.client;
    const guild = runtime.guild;
    const guilds = client && client.guilds ? Array.from(client.guilds.cache.values()) : [];

    const restrictedIntents = [
        'guild_invite',
        'message_guild_owner',
        'mod_ban',
        'mod_kick',
        'mod_mute',
        'mod_clear'
    ];
    if (restrictedIntents.includes(item.intent)) {
        if (!isStaffOrAdmin(guild, runtime.userId)) {
            return '❌ **Acesso negado, senhor.** Apenas staff/admin podem usar moderação e gestão de servidores.';
        }
    }

    const prefix =
        profile.persona === 'cyberpunk'
            ? '`[CYBER-NET]` '
            : profile.persona === 'medieval'
              ? '`[VALE MÍSTICO]` '
              : '**J.A.R.V.I.S.** · ';

    if (item.intent === 'guild_invite') {
        let targetGuild = null;
        const q = item.query;
        if (!isNaN(q)) targetGuild = guilds[parseInt(q, 10) - 1];
        else targetGuild = guilds.find((g) => normalizeText(g.name).includes(normalizeText(q)));
        if (!targetGuild) return `⚠️ Servidor "${q}" não encontrado na minha lista.`;
        try {
            const channel = targetGuild.channels.cache.find(
                (c) =>
                    c.isTextBased() &&
                    c.permissionsFor(targetGuild.members.me)?.has('CreateInstantInvite')
            );
            if (!channel)
                return `❌ Sem permissão para criar convites em **${targetGuild.name}**.`;
            const invite = await channel.createInvite({
                maxAge: 86400,
                maxUses: 1,
                reason: `Staff (${profile.name})`
            });
            return `🔗 **Convite [${targetGuild.name}]:**\n> https://discord.gg/${invite.code}\n\n⏱️ Expira em 24h (uso único).`;
        } catch (e) {
            return `❌ Falha ao gerar convite: ${e.message}`;
        }
    }

    if (item.intent.startsWith('mod_')) {
        if (!guild) return '⚠️ Moderação só dentro de um servidor.';
        const channel = runtime.channel;
        if (item.intent === 'mod_clear') {
            try {
                if (!channel || typeof channel.bulkDelete !== 'function')
                    return '❌ Não foi possível limpar mensagens neste canal.';
                const fetched = await channel.messages.fetch({
                    limit: Math.min(item.count + 1, 100)
                });
                await channel.bulkDelete(fetched, true);
                return `🧹 **${item.count}** mensagens removidas. Protocolo de limpeza concluído.`;
            } catch (e) {
                return `❌ Erro ao limpar: ${e.message}`;
            }
        }
        const targetQuery = normalizeText(item.target);
        const targetMember = guild.members.cache.find(
            (m) =>
                m.id === targetQuery.replace(/[^0-9]/g, '') ||
                normalizeText(m.user.username).includes(targetQuery) ||
                normalizeText(m.displayName).includes(targetQuery)
        );
        if (!targetMember) return `⚠️ Usuário "${item.target}" não encontrado neste servidor.`;
        try {
            if (item.intent === 'mod_ban') {
                await targetMember.ban({ reason: `Staff (${profile.name})` });
                return `🔨 **Banimento:** **${targetMember.user.tag}** removido.`;
            }
            if (item.intent === 'mod_kick') {
                await targetMember.kick(`Staff (${profile.name})`);
                return `👢 **Expulsão:** **${targetMember.user.tag}** removido do servidor.`;
            }
            if (item.intent === 'mod_mute') {
                await targetMember.timeout(10 * 60 * 1000, `Staff (${profile.name})`);
                return `🔇 **Timeout 10 min** em **${targetMember.user.tag}**.`;
            }
        } catch (e) {
            return `❌ Erro de moderação: ${e.message}`;
        }
    }

    if (item.intent === 'list_guilds') {
        if (!guilds.length) return '🌐 Não estou em nenhum servidor no momento.';
        let listStr = '🌐 **Servidores conectados:**\n';
        guilds.forEach((g, idx) => {
            listStr += `**${idx + 1}.** ${g.name} *(ID: ${g.id} | ${g.memberCount} membros)*\n`;
        });
        return listStr;
    }

    if (item.intent === 'guild_info') {
        let targetGuild = null;
        const q = item.query;
        if (!isNaN(q)) targetGuild = guilds[parseInt(q, 10) - 1];
        else targetGuild = guilds.find((g) => normalizeText(g.name).includes(normalizeText(q)));
        if (!targetGuild) return `⚠️ Servidor "${q}" não encontrado.`;
        let ownerTag = 'Desconhecido';
        try {
            const owner = await targetGuild.fetchOwner();
            ownerTag = owner ? owner.user.tag : 'Desconhecido';
        } catch (_) {}
        return (
            `📊 **Servidor**\n` +
            `• **Nome:** ${targetGuild.name}\n` +
            `• **ID:** ${targetGuild.id}\n` +
            `• **Membros:** ${targetGuild.memberCount}\n` +
            `• **Dono:** ${ownerTag}\n` +
            `• **Criado:** <t:${Math.floor(targetGuild.createdTimestamp / 1000)}:R>`
        );
    }

    if (item.intent === 'message_guild_owner') {
        let targetGuild = null;
        const t = item.target;
        if (!isNaN(t)) targetGuild = guilds[parseInt(t, 10) - 1];
        else targetGuild = guilds.find((g) => normalizeText(g.name).includes(normalizeText(t)));
        if (!targetGuild) return `⚠️ Servidor "${t}" não encontrado.`;
        try {
            const owner = await targetGuild.fetchOwner();
            if (!owner) return `⚠️ Dono de ${targetGuild.name} não encontrado.`;
            await owner.send(`📩 **Mensagem da Staff (${runtime.userId}):**\n> ${item.content}`);
            return `✅ Mensagem entregue ao dono de **${targetGuild.name}** (${owner.user.tag}).`;
        } catch (e) {
            return `❌ Falha ao enviar DM: ${e.message}`;
        }
    }

    if (item.intent === 'set_persona') {
        profile.persona = item.persona;
        checkAndAwardBadges(profile);
        saveData();
        if (item.persona === 'cyberpunk')
            return `⚡ **Modo cibernético online.** Interface neural sincronizada.`;
        if (item.persona === 'medieval')
            return `🛡️ **Modo místico ativo.** Que os reinos antigos guiem nossos cálculos.`;
        return `🏛️ **Protocolo J.A.R.V.I.S. restaurado.** Sistemas em capacidade nominal, senhor.`;
    }

    if (item.intent === 'start_trivia') {
        const randomQ = pick(triviaQuestions);
        profile.activeTrivia = randomQ.a;
        saveData();
        return `🧠 **Desafio Aeternus**\n> *${randomQ.q}*\n\nResponda corretamente para **+50 XP**.`;
    }

    if (item.intent === 'ai_status') {
        const active = activeProviders();
        return (
            `🤖 **Status J.A.R.V.I.S.**\n` +
            `• Provedores ativos: **${active.join(' → ')}**\n` +
            `• Cascata: tenta cada um até obter resposta\n` +
            `• Chaves: só via variáveis de ambiente (Render / .env)\n` +
            `• Persona atual: **${profile.persona || 'default'}**`
        );
    }

    if (item.intent === 'execute_dynamic_tool') {
        const toolRes = await runTool(item.toolName, { query: text }, runtime);
        if (toolRes && !toolRes.error) {
            const formattedRes = typeof toolRes === 'object' ? JSON.stringify(toolRes, null, 2) : toolRes;
            return `⚙️ **Tool [${item.toolName}]**\n> ${formattedRes}`;
        }
        return `⚠️ Tool **${item.toolName}**: ${toolRes?.error || 'retorno inválido.'}`;
    }

    if (profile.activeTrivia) {
        const cleanAns = normalizeText(text);
        if (cleanAns.includes(profile.activeTrivia)) {
            profile.activeTrivia = null;
            if (!profile.badges.includes('Mestre do Saber 🏆')) profile.badges.push('Mestre do Saber 🏆');
            saveData();
            return `🎉 **Correto.** +50 XP e insígnia **Mestre do Saber 🏆**. Excelente, senhor.`;
        }
    }

    if (item.intent === 'user_profile') {
        return (
            `📋 **Ficha — ${profile.name}**\n` +
            `• Nível **${profile.level}** · XP **${profile.xp}**\n` +
            `• Afinidade **${profile.affinity}** · Interações **${profile.interactions}**\n` +
            `• Persona **${profile.persona}**\n` +
            `• Insígnias: ${(profile.badges || []).join(', ') || '—'}`
        );
    }

    if (item.intent === 'dictionary_lookup') {
        const def = await fetchWordDefinition(item.word);
        if (def) return `📖 **${item.word}:** ${def.slice(0, 1500)}`;
        return `⚠️ Não encontrei definição para **${item.word}**.`;
    }

    if (item.intent === 'bot_mood') {
        const mood = botState.globalMood || 0;
        return pick([
            `${prefix}Sistemas nominais. Humor operacional em **${mood}**. Em que posso ajudar?`,
            `${prefix}Todos os protocolos online. Pronto para a próxima solicitação.`,
            `${prefix}Funcionando como um reator Arc bem calibrado. Pode falar.`
        ]);
    }

    if (item.intent === 'creator_info') {
        return `${prefix}Fui desenvolvido para o projeto **Aeternus**. O responsável técnico é o dono configurado em \`OWNER_ID\`.`;
    }

    if (item.intent === 'calculate') {
        const calcRes = safeEvalMath(item.expression);
        if (calcRes.error) return `⚠️ ${calcRes.error}`;
        return `${prefix}Resultado: **${calcRes.result}**`;
    }

    if (item.intent === 'autonomous_reply') {
        const ai = await fetchJarvisReply(text, profile.persona || 'default', profile.history || []);
        if (ai) {
            let out = `${prefix}${ai.text}`;
            if (levelUpInfo?.leveledUp) {
                out += `\n\n✨ *Nível ${profile.level} alcançado. Protocolos de afinidade atualizados.*`;
            }
            return out;
        }
        return pick([
            `${prefix}Canais de IA momentaneamente indisponíveis. Reformule ou tente em instantes.`,
            `${prefix}Não obtive resposta dos núcleos externos. Ainda assim, estou à disposição para comandos locais.`,
            `${prefix}Falha na cascata de provedores. Sistemas internos seguem ativos.`
        ]);
    }

    return `${prefix}Pode detalhar um pouco mais a solicitação?`;
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '❓' };
    if (learnOnly) return { ok: true, text: null };

    const displayName = author?.displayName || author?.username || 'Usuário';
    const profile = getUserProfile(userId, displayName);
    const levelUpInfo = addXpAndCheckLevel(profile, 0);

    const runtime = {
        userId: String(userId),
        client,
        guild,
        channel,
        messageId,
        isOwner: isOwner(userId)
    };
    const intent = detectIntents(text);
    const responseText = await runIntent(intent, runtime, text, profile, levelUpInfo);

    return {
        ok: true,
        text: String(responseText).slice(0, 1950),
        replyOptions: messageId ? { reply: { messageReference: messageId } } : {}
    };
}

function loadTools() {
    ['serverTools', 'economyTools', 'rpgTools', 'mathTools', 'adminTools', 'commandMapperTools'].forEach(
        (file) => {
            try {
                require(`../tools/${file}`)({ registerTool });
            } catch (_) {}
        }
    );
}
loadTools();

module.exports = {
    configured,
    registerContext,
    listContexts,
    registerTool,
    listTools,
    chat,
    isOwner,
    activeProviders,
    fetchJarvisReply,
    model: () => 'aeternus-jarvis-multi-api',
    baseUrl: () => 'multi-provider'
};
