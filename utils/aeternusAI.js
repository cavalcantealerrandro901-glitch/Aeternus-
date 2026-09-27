/**
 * Consciência e Motor de PLN Local do Aeternus (Sem APIs Externas)
 * Processamento de Linguagem Natural, Aprensiadagem Social e Carregamento Modular de Ferramentas.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNED_FILE = path.join(DATA_DIR, 'learned_phrases.json');

const contexts = new Map();
const tools = new Map();
/** @type {Map<string, { lastIntents: string[], lastEntities: Record<string, any>, turns: number, updatedAt: number }> } */
const memory = new Map();

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

let learnedPhrases = [];
try {
    if (fs.existsSync(LEARNED_FILE)) {
        learnedPhrases = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf-8'));
    }
} catch (_) {
    learnedPhrases = [];
}

function saveLearnedPhrases() {
    try {
        fs.writeFileSync(LEARNED_FILE, JSON.stringify(learnedPhrases.slice(-1000), null, 2), 'utf-8');
    } catch (_) {}
}

function learnFromMessage(text) {
    const raw = String(text || '').trim();
    if (raw.length < 3 || raw.length > 140) return;
    if (raw.startsWith('O.j') || raw.startsWith('!') || raw.startsWith('/') || raw.includes('http')) return;

    const clean = raw.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim();
    if (clean.length >= 3 && !learnedPhrases.includes(clean)) {
        learnedPhrases.push(clean);
        if (learnedPhrases.length > 1000) learnedPhrases.shift();
        saveLearnedPhrases();
    }
}

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}

function isOwner(userId) {
    const o = ownerId();
    return Boolean(o && String(userId) === o);
}

function configured() {
    return true;
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(text) {
    return normalizeText(text).split(' ').filter(Boolean);
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyMatchWord(target, word, maxDistance = 2) {
    if (target === word) return true;
    if (target.length <= 3) return false;
    return levenshteinDistance(target, word) <= maxDistance;
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function registerContext(id, { description, get }) {
    if (!id || typeof get !== 'function') return false;
    contexts.set(String(id), { description: String(description || id), get });
    return true;
}

function registerTool(def) {
    if (!def?.name || typeof def.handler !== 'function') return false;
    tools.set(def.name, {
        name: def.name,
        description: String(def.description || def.name),
        handler: def.handler,
        ownerOnly: Boolean(def.ownerOnly)
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

function clearHistory(userId) {
    memory.delete(String(userId));
}

function getMemory(userId) {
    const key = String(userId);
    const now = Date.now();
    
    if (memory.has(key)) {
        const entry = memory.get(key);
        if (now - entry.updatedAt > 15 * 60 * 1000) {
            memory.delete(key);
        }
    }

    if (!memory.has(key)) {
        memory.set(key, { lastIntents: [], lastEntities: {}, turns: 0, updatedAt: now });
    }
    
    const entry = memory.get(key);
    entry.updatedAt = now;
    return entry;
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: `Ferramenta desconhecida: ${name}` };
    if (t.ownerOnly && !isOwner(runtime.userId)) {
        return { error: 'Acesso restrito ao proprietário do sistema.' };
    }
    try {
        return await t.handler(args || {}, runtime);
    } catch (e) {
        return { error: e.message || String(e) };
    }
}

function extractEntities(text, catalog) {
    const tokens = tokenize(text);
    const raw = String(text || '').trim();
    const entities = {};

    const mentionMatch = raw.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        entities.targetUserId = mentionMatch[1];
    } else {
        const idMatch = raw.match(/\b\d{17,19}\b/);
        if (idMatch) {
            entities.targetUserId = idMatch[0];
        }
    }

    const memberQueryMatch = raw.match(/(?:quem e|quem e o|quem e a|membro|usuario|sobre o|sobre a|user)\s+([a-zA-Z0-9_\.\-]{2,32})/i);
    if (memberQueryMatch && !entities.targetUserId) {
        entities.targetQuery = memberQueryMatch[1];
    }

    if (catalog) {
        for (const cat of catalog.listCategories()) {
            for (const cmd of cat.commands) {
                if (tokens.some((token) => fuzzyMatchWord(token, cmd.name, 1))) {
                    entities.commandName = cmd.name;
                    break;
                }
            }
            if (entities.commandName) break;
        }
    }

    const norm = normalizeText(raw);
    if (norm.includes('classe') || norm.includes('rpg')) {
        let powerLevel = 'rara';
        if (/(unica|lendaria|mitica)/.test(norm)) powerLevel = 'unica';
        else if (/(epica|epic)/.test(norm)) powerLevel = 'epica';
        else if (/(comum|basica)/.test(norm)) powerLevel = 'comum';

        const nameMatch = raw.match(/(?:classe|class)\s+["']?([a-zA-Z0-9_-]{2,30})["']?/i);
        entities.classBrief = {
            name: nameMatch ? nameMatch[1] : 'Nova Classe',
            theme: raw.slice(0, 150),
            powerLevel
        };
    }

    return entities;
}

function detectIntents(text, userMem, entities) {
    const tokens = tokenize(text);
    const norm = normalizeText(text);
    const intents = [];

    const addIntent = (intent, score, extra = {}) => {
        intents.push({ intent, score, ...extra });
    };

    if (!norm) {
        addIntent('casual_chat', 1.0);
        return intents;
    }

    if (norm.length < 30 && userMem.lastIntents.length > 0) {
        if (/^(e |tambem|mais|agora|como|e o|e a)/.test(norm)) {
            const previous = userMem.lastIntents[0];
            if (previous === 'balance' && (norm.includes('sonho') || norm.includes('loritta'))) {
                addIntent('loritta', 0.9);
            } else if (previous === 'command' || entities.commandName) {
                addIntent('command', 0.85, { name: entities.commandName || userMem.lastEntities.commandName });
            } else if (previous === 'member_info' && (entities.targetUserId || entities.targetQuery)) {
                addIntent('member_info', 0.9);
            } else {
                addIntent(previous, 0.6);
            }
        }
    }

    if (
        norm.includes('info do servidor') ||
        norm.includes('info do server') ||
        norm.includes('sobre o servidor') ||
        norm.includes('sobre o server') ||
        norm.includes('status do servidor') ||
        norm.includes('detalhes do server') ||
        norm.includes('membros do server') ||
        norm.includes('membros do servidor') ||
        (norm.includes('servidor') && norm.includes('quantos'))
    ) {
        addIntent('server_info', 0.95);
    }

    if (
        entities.targetUserId ||
        norm.includes('quem e') ||
        norm.includes('info de') ||
        norm.includes('perfil de') ||
        norm.includes('sobre o usuario') ||
        norm.includes('membro info')
    ) {
        addIntent('member_info', 0.9);
    }

    if (tokens.some((t) => ['oi', 'ola', 'hey', 'eae', 'eai', 'salve', 'opa', 'suave', 'sussa', 'fala'].includes(t))) {
        addIntent('greet', 0.95);
    }

    if (norm.includes('quem e voce') || norm.includes('sua ia') || norm.includes('seu nome')) {
        addIntent('identity', 0.95);
    }

    if (norm.includes('limpar memoria') || norm.includes('esquecer conversa') || norm.includes('resetar')) {
        addIntent('clear', 1.0);
    }

    if (tokens.some((t) => fuzzyMatchWord('sonho', t) || fuzzyMatchWord('sonhos', t) || t === 'loritta')) {
        addIntent('loritta', 0.9);
    }

    if (tokens.some((t) => ['saldo', 'carteira', 'eter', 'dinheiro', 'banco', 'cofre'].some((w) => fuzzyMatchWord(w, t)))) {
        addIntent('balance', 0.85);
    }

    if (tokens.some((t) => ['perfil', 'personagem', 'atributo', 'nivel', 'level'].some((w) => fuzzyMatchWord(w, t)))) {
        addIntent('player', 0.85);
    }

    if (tokens.some((t) => ['servidores', 'guilds'].some((w) => fuzzyMatchWord(w, t)))) {
        addIntent('guilds', 0.85);
    }

    if (entities.classBrief && (norm.includes('criar') || norm.includes('crie') || norm.includes('faca') || norm.includes('ideia'))) {
        addIntent('class_design', 0.95, { brief: entities.classBrief });
    }

    if (entities.commandName || norm.includes('explique') || norm.includes('como usa') || norm.includes('como usar')) {
        addIntent('command', 0.9, { name: entities.commandName || userMem.lastEntities.commandName });
    }

    if (norm.includes('lista de comandos') || norm.includes('todos os comandos') || norm.includes('categorias')) {
        addIntent('catalog', 0.9);
    }

    if (norm.includes('me atualiza') || norm.includes('resumo') || norm.includes('visao geral') || norm.includes('status')) {
        addIntent('overview', 1.0);
    }

    if (norm.includes('que horas') || norm.includes('data de hoje') || norm.includes('que dia')) {
        addIntent('time', 0.9);
    }

    if (tokens.some((t) => ['ajuda', 'help', 'capacidades', 'menu'].includes(t))) {
        addIntent('help', 0.8);
    }

    if (tokens.some((t) => ['obrigado', 'valeu', 'vlw', 'thanks', 'tmj', 'boa'].includes(t))) {
        addIntent('thanks', 0.9);
    }

    if (tokens.some((t) => ['tchau', 'flw', 'bye', 'fui'].includes(t))) {
        addIntent('bye', 0.9);
    }

    if (intents.length === 0) {
        addIntent('casual_chat', 0.5);
    }

    return intents.sort((a, b) => b.score - a.score);
}

function respondCasualChat(text) {
    const norm = normalizeText(text);

    if (learnedPhrases.length > 0 && Math.random() < 0.55) {
        const learnedSample = pick(learnedPhrases);
        const connectors = ['mano', 'po', 'slk', 'vish', 'kkkk', 'nmr', 'dahora', 'pior que'];
        if (Math.random() > 0.5) {
            return `${pick(connectors)}${learnedSample.toLowerCase()}`;
        }
        return learnedSample;
    }

    if (norm.includes('kkk') || norm.includes('hah') || norm.includes('lol') || norm.includes('massa')) {
        return pick(['kkkkkkkk', 'slk engraçado dms', 'tanko nao kkkk', 'kkkk boto fe']);
    }

    if (norm.includes('jogo') || norm.includes('jogar') || norm.includes('game')) {
        return pick(['qual a boa de jogar hoje?', 'manda a call', 'so vamo mano', 'pior que to de boa agr']);
    }

    if (norm.includes('bom dia') || norm.includes('boa tarde') || norm.includes('boa noite')) {
        return pick(['salve mano! suave?', 'opa, suave?', 'suave demais, e vc?']);
    }

    return pick([
        'suave mano, e vc?',
        'boto fe demais',
        'slk, pior ne',
        'tmj mano, precisar tamo ai',
        'dahora dms',
        'po mano kkkk',
        'vish, ai e osso',
        'tranquilo por aqui, e com vc?'
    ]);
}

async function respondIdentity(runtime) {
    return pick([
        'sou o Aeternus mano, fico trocando ideia por aqui e cuidando dos comandos do server.',
        'sou um membro qualquer daqui kkk, ajudo a ver saldo, criar classe e conversar com a galera.',
        'membro do server uai kkkk'
    ]);
}

async function respondGreet(runtime) {
    return pick([
        'salve mano! suave?',
        'eae, de boa?',
        'opa! como ta as coisas?',
        'suaveee, de boa por ai?'
    ]);
}

async function respondHelp() {
    return [
        'pode falar comigo normal mano! mas se quiser algo especifico:',
        '• **info de membro:** *"quem e @usuario"* ou *"info do usuario 123456"*',
        '• **info do servidor:** *"info do server"* ou *"detalhes do servidor"*',
        '• **saldo:** *"qual meu saldo"*',
        '• **comandos:** *"explique o comando daily"*',
        '• **RPG:** *"crie uma classe mago"*'
    ].join('\n');
}

async function respondTime() {
    const now = new Date();
    const br = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return `🕒 hora exata aqui: **${br}**`;
}

async function respondServerInfo(runtime) {
    const res = await runTool('get_server_info', {}, runtime);
    if (!res?.ok) return 'nao consegui pegar as informações do server agora mano!';

    const s = res.server;
    return [
        `🏰 **Servidor:** **${s.name}**`,
        `• **ID:** \`${s.id}\``,
        `• **Dono:** <@${s.ownerId}>`,
        `• **Membros:** **${fmt(s.memberCount)}**`,
        `• **Canais:** **${fmt(s.channelCount)}**`,
        `• **Cargos:** **${fmt(s.roleCount)}**`,
        `• **Nível de Impulso:** Nível ${s.premiumTier} (${s.premiumSubscriptionCount} boosts)`,
        `• **Criado em:** ${s.createdAt}`
    ].join('\n');
}

async function respondMemberInfo(runtime, entities) {
    const target = entities?.targetUserId || entities?.targetQuery || runtime.userId;
    const res = await runTool('get_member_info', { target }, runtime);

    if (!res?.ok) {
        return `nao encontrei esse membro no server mano! (\`${target}\`)`;
    }

    const m = res.member;
    return [
        `👤 **Membro:** **${m.displayName}** (\`${m.tag}\`)`,
        `• **ID:** \`${m.id}\``,
        `• **Entrou no servidor:** ${m.joinedAt}`,
        `• **Conta criada:** ${m.createdAt}`,
        `• **Maior cargo:** ${m.highestRole}`,
        `• **Bot:** ${m.isBot ? 'Sim' : 'Não'}`
    ].join('\n');
}

async function respondBalance(runtime) {
    const eterR = await runTool('get_eter_balance', {}, runtime);
    if (eterR?.eter != null) return `✨ teu saldo de Éter e: **${fmt(eterR.eter)}**`;
    return 'nao consegui ver teu saldo agora mano!';
}

async function respondLoritta(runtime) {
    const loriR = await runTool('get_loritta_sonhos', {}, runtime);
    if (loriR?.ok) return `💤 tu tem **${fmt(loriR.sonhos)}** sonhos na Loritta!`;
    return `nao deu pra olhar os sonhos agr: *${loriR?.error || 'erro'}*`;
}

async function respondPlayer(runtime) {
    const p = await runTool('get_player_summary', {}, runtime);
    if (!p?.ok) return 'tu nao criou personagem ainda mano, manda `O.j criar` pra começar!';
    return `🛡️ teu personagem e classe **${p.classId || 'Sem classe'}**, nivel **${p.level || 1}**!`;
}

async function respondGuilds(runtime) {
    const g = await runTool('list_bot_guilds', { limit: 10 }, runtime);
    return `to em **${g.count || 0}** servidores no momento mano!`;
}

async function respondCommand(runtime, name) {
    if (!name) return 'qual comando tu quer saber mano?';
    
    const r = await runTool('explain_command', { name }, runtime);
    if (!r?.ok) return `achei esse comando \`${name}\` nao mano.`;

    return [
        `📖 **${r.name}:**${r.desc}`,
        r.usage ? `• uso: \`${r.usage}\`` : null
    ].filter(Boolean).join('\n');
}

async function respondCatalog(runtime) {
    const cats = await runTool('list_command_categories', {}, runtime);
    if (!Array.isArray(cats)) return 'deu ruim pra carregar os comandos agr!';
    
    const lines = ['📚 **comandos que conheço:**'];
    for (const c of cats) {
        lines.push(`**${c.label}:** ${c.commands.map((cmd) => `\`${cmd}\``).join(', ')}`);
    }
    return lines.join('\n');
}

async function respondClassDesign(runtime, brief) {
    const r = await runTool('design_rpg_class', brief, runtime);
    if (r?.error) return `deu ruim: ${r.error}`;

    return `olha a classe que pensei: **${r.name}** (id: \`${r.classId}\`). tem stats base FOR ${r.suggestedStats.forca} e VIDA ${r.suggestedStats.vida}!`;
}

async function respondOverview(runtime) {
    const parts = [
        await respondBalance(runtime),
        await respondLoritta(runtime),
        await respondPlayer(runtime)
    ];
    return parts.join('\n');
}

async function runIntent(item, runtime, text, entities) {
    switch (item.intent) {
        case 'clear':
            clearHistory(runtime.userId);
            return 'limpei nossa conversa mano!';
        case 'greet':
            return respondGreet(runtime);
        case 'identity':
            return respondIdentity(runtime);
        case 'help':
            return respondHelp();
        case 'time':
            return respondTime();
        case 'server_info':
            return respondServerInfo(runtime);
        case 'member_info':
            return respondMemberInfo(runtime, entities);
        case 'balance':
            return respondBalance(runtime);
        case 'loritta':
            return respondLoritta(runtime);
        case 'player':
            return respondPlayer(runtime);
        case 'guilds':
            return respondGuilds(runtime);
        case 'command':
            return respondCommand(runtime, item.name);
        case 'catalog':
            return respondCatalog(runtime);
        case 'class_design':
            return respondClassDesign(runtime, item.brief);
        case 'overview':
            return respondOverview(runtime);
        case 'thanks':
            return pick(['tmj mano!', 'valeuuu', 'nois!', 'de nada bro!']);
        case 'bye':
            return pick(['flw mano!', 'ate mais!', 'fui, ate dps!']);
        default:
            return respondCasualChat(text);
    }
}

async function chat({ userId, message, client, guild, channel, messageId }) {
    const runtime = {
        userId: String(userId),
        client,
        guild,
        channel,
        messageId,
        isOwner: isOwner(userId)
    };

    const text = String(message || '').trim();
    learnFromMessage(text);

    const userMem = getMemory(userId);
    userMem.turns += 1;

    let catalog = null;
    try {
        catalog = require('./commandCatalog');
    } catch (_) {}

    const entities = extractEntities(text, catalog);
    const intents = detectIntents(text, userMem, entities);

    const topIntents = intents.filter((i) => i.score >= 0.55).slice(0, 1);
    if (topIntents.length === 0) topIntents.push({ intent: 'casual_chat', score: 0.3 });

    userMem.lastIntents = topIntents.map((i) => i.intent);
    userMem.lastEntities = { ...userMem.lastEntities, ...entities };

    const chunks = [];
    for (const item of topIntents) {
        const responseChunk = await runIntent(item, runtime, text, entities);
        if (responseChunk) chunks.push(String(responseChunk).trim());
    }

    let output = chunks.filter(Boolean).join('\n\n');
    if (!output) output = respondCasualChat(text);

    return {
        ok: true,
        text: String(output).slice(0, 1950),
        replyOptions: messageId ? { reply: { messageReference: messageId } } : {}
    };
}

// Carregamento automático das ferramentas registradas em /tools
function loadTools() {
    try {
        const registerServerTools = require('../tools/serverTools');
        registerServerTools({ registerTool });
    } catch (_) {}

    try {
        const registerEconomyTools = require('../tools/economyTools');
        registerEconomyTools({ registerTool });
    } catch (_) {}

    try {
        const registerRpgTools = require('../tools/rpgTools');
        registerRpgTools({ registerTool });
    } catch (_) {}
}

loadTools();

module.exports = {
    configured,
    registerContext,
    registerTool,
    listContexts,
    listTools,
    chat,
    clearHistory,
    isOwner,
    model: () => 'aeternus-native-v2',
    baseUrl: () => 'local'
};
