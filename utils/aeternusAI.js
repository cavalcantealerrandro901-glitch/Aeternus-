/**
 * Consciência do Aeternus — motor local (sem IA de terceiros).
 * Estilo assistente de celular: multi-intenção, linguagem solta, memória curta.
 *
 *   mind.registerContext('x', { description, get });
 *   mind.registerTool({ name, description, handler, ownerOnly? });
 */

const fs = require('fs');
const path = require('path');

const contexts = new Map();
const tools = new Map();
/** @type {Map<string, { lastIntents: string[], lastText: string, turns: number }> } */
const memory = new Map();

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}
function isOwner(userId) {
    const o = ownerId();
    return o && String(userId) === o;
}
function configured() {
    return true;
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
function clearHistory(userId) {
    memory.delete(String(userId));
}
function mem(userId) {
    const k = String(userId);
    if (!memory.has(k)) memory.set(k, { lastIntents: [], lastText: '', turns: 0 });
    return memory.get(k);
}

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s@._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function hasAny(n, words) {
    return words.some((w) => n.includes(w));
}

async function runTool(name, args, runtime) {
    const t = tools.get(name);
    if (!t) return { error: 'Ferramenta desconhecida: ' + name };
    if (t.ownerOnly && !isOwner(runtime.userId)) {
        return { error: 'Somente o dono pode usar isso.' };
    }
    try {
        return await t.handler(args || {}, runtime);
    } catch (e) {
        return { error: e.message || String(e) };
    }
}

/* ---------- detecção multi-intenção (estilo assistente) ---------- */

function extractCommandName(text) {
    const n = norm(text);
    const m =
        n.match(
            /(?:comando|cmd|explique|explica|como usa|como usar|o que e|o que e o|sobre o|sobre a)\s+(?:o\.?\s*)?([a-z0-9_-]{2,32})/
        ) ||
        n.match(/\bo\.([a-z0-9_-]{2,32})\b/) ||
        n.match(/\b([a-z0-9_-]{2,32})\b.*\b(comando|cmd)\b/);
    if (m) return m[1];
    return null;
}

function extractClassBrief(text) {
    const raw = String(text || '').trim();
    const n = norm(raw);
    let name = null;
    let theme = raw;
    const m = n.match(/(?:classe|class)\s+(?:chamada\s+|nome\s+)?["']?([a-z0-9 _-]{2,40})["']?/);
    if (m) name = m[1].trim();
    const m2 = n.match(/(?:criar|crie|faca|faca|monta|monte|ideia de)\s+(?:uma\s+)?classe\s+(.+)/);
    if (m2) theme = m2[1];
    let power = 'rara';
    if (/unica|lendari|mitic/.test(n)) power = 'unica';
    else if (/epic|epica/.test(n)) power = 'epica';
    else if (/comum|basic/.test(n)) power = 'comum';
    return { name: name || 'Nova Classe', theme: String(theme).slice(0, 200), powerLevel: power };
}

/** Retorna lista de intenções com peso (pode ser várias numa frase). */
function detectIntents(text, userMem) {
    const n = norm(text);
    const found = [];
    const add = (intent, score, extra) => {
        found.push({ intent, score, ...(extra || {}) });
    };

    if (!n) {
        add('help', 1);
        return found;
    }

    // continuação curta (“e os sonhos?”, “e o perfil?”)
    if (n.length < 28 && userMem?.lastIntents?.length) {
        if (/^(e |tambem |também |mais |agora )/.test(n) || /^(sonhos?|eter|perfil|classe|servidor)/.test(n)) {
            for (const prev of userMem.lastIntents.slice(0, 2)) {
                if (prev === 'balance' && /sonho|lori/.test(n)) add('loritta', 0.9);
                else if (prev === 'loritta' && /eter|saldo/.test(n)) add('balance', 0.9);
                else add(prev, 0.55);
            }
        }
    }

    if (/^(oi|ola|hey|eae|eai|fala|salve|bom dia|boa tarde|boa noite|opa|iae)\b/.test(n)) {
        add('greet', 0.95);
    }
    if (hasAny(n, ['quem e voce', 'o que voce e', 'sua consciencia', 'voce e uma ia', 'e uma ia'])) {
        add('identity', 1);
    }
    if (hasAny(n, ['limpar memoria', 'limpar historico', 'esquecer conversa', 'reset conversa'])) {
        add('clear', 1);
    }
    if (hasAny(n, ['sonho', 'sonhos', 'loritta', 'lori'])) add('loritta', 0.9);
    if (hasAny(n, ['saldo', 'carteira', 'eter', 'quanto tenho', 'meu dinheiro', 'banco', 'cofre'])) {
        add('balance', 0.85);
    }
    if (hasAny(n, ['perfil', 'personagem', 'meu rpg', 'minha classe', 'atributo', 'level', 'nivel'])) {
        add('player', 0.85);
    }
    if (hasAny(n, ['servidor', 'servidores', 'guilds', 'onde voce esta', 'quantos servidores'])) {
        add('guilds', 0.85);
    }
    if (
        /\b(classe|rpg).*(criar|crie|faca|montar|ideia|design)|\b(criar|crie|faca|ideia)\b.*\bclasse\b/.test(
            n
        )
    ) {
        add('class_design', 0.95, { brief: extractClassBrief(text) });
    }
    if (hasAny(n, ['lista de comando', 'listar comando', 'todos os comando', 'categorias', 'que comandos'])) {
        add('catalog', 0.9);
    }
    const cmdName = extractCommandName(text);
    if (cmdName || hasAny(n, ['explique', 'explica', 'como usa', 'como usar', 'o que faz o'])) {
        add('command', 0.88, { name: cmdName });
    }
    if (hasAny(n, ['criar comando', 'novo comando', 'rascunho', 'draft'])) {
        add('draft_command', 0.9);
    }
    if (
        hasAny(n, [
            'me atualiza',
            'resumo',
            'status',
            'como estou',
            'me conta tudo',
            'visao geral',
            'overview',
            'dashboard'
        ])
    ) {
        add('overview', 1);
    }
    if (hasAny(n, ['que horas', 'hora atual', 'data de hoje', 'que dia'])) {
        add('time', 0.9);
    }
    if (hasAny(n, ['este servidor', 'esse servidor', 'aqui no server', 'info do server', 'server info'])) {
        add('here', 0.9);
    }
    if (hasAny(n, ['ajuda', 'help', 'o que voce faz', 'o que consegue', 'capacidades', 'menu'])) {
        add('help', 0.75);
    }
    if (hasAny(n, ['obrigado', 'valeu', 'thanks', 'tmj', 'vlw'])) {
        add('thanks', 0.9);
    }
    if (hasAny(n, ['tchau', 'flw', 'ate mais', 'até mais', 'bye'])) {
        add('bye', 0.9);
    }

    // busca solta no catálogo por palavra-chave
    if (!found.some((f) => f.score >= 0.85)) {
        add('search', 0.4);
    }

    if (!found.length) add('chat', 0.3);

    // ordena e dedup por intent (fica o maior score)
    const best = new Map();
    for (const f of found) {
        const prev = best.get(f.intent);
        if (!prev || f.score > prev.score) best.set(f.intent, f);
    }
    return [...best.values()].sort((a, b) => b.score - a.score);
}

/* ---------- respostas ---------- */

async function respondIdentity(runtime) {
    const name = runtime.client?.user?.username || 'Aeternus';
    const guilds = runtime.client?.guilds?.cache?.size || 0;
    return pick([
        'Eu sou a consciência do **' +
            name +
            '** — tipo o assistente do sistema deste bot. Sem API de IA de fora. Cuido de éter, RPG, comandos e dos **' +
            guilds +
            '** servidores onde estou.',
        'Pode me tratar como o assistente do Aeternus. Peça saldo, sonhos, como usar um comando, ideia de classe… eu resolvo por aqui.'
    ]);
}

async function respondGreet(runtime) {
    const name = runtime.client?.user?.username || 'Aeternus';
    const g = runtime.guild?.name;
    return pick([
        'Oi! Sou o **' + name + '**' + (g ? ' · ' + g : '') + '. No que posso ajudar?',
        'E aí. Quer saldo, comando, sonhos ou ideia de classe?',
        'Presente. Fala comigo como com o assistente do celular — pode misturar assuntos na mesma frase.'
    ]);
}

async function respondHelp() {
    return [
        '**Assistente Aeternus** — fala natural, multi-assunto:',
        '• “meu saldo e sonhos”',
        '• “explique arena” / “como usa daily”',
        '• “me atualiza” (resumo completo)',
        '• “crie uma classe ninja épica”',
        '• “em quantos servidores você está?”',
        '• “o que tem neste servidor?”',
        '',
        'Pode misturar: *quanto de éter eu tenho e como funciona o work?*'
    ].join('\n');
}

async function respondTime() {
    const now = new Date();
    const br = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return 'Agora (Brasília): **' + br + '**.';
}

async function respondHere(runtime) {
    const g = runtime.guild;
    if (!g) return 'Você não está em um servidor agora (talvez DM).';
    return [
        '**Aqui:** ' + g.name,
        'ID: `' + g.id + '`',
        'Membros: **' + fmt(g.memberCount) + '**',
        'Dono do server: <@' + g.ownerId + '>'
    ].join('\n');
}

async function respondBalance(runtime) {
    const eterR = await runTool('get_eter_balance', {}, runtime);
    const lines = [];
    if (eterR?.eter != null) lines.push('✨ Éter: **' + fmt(eterR.eter) + '**');
    else lines.push('✨ Éter: indisponível');
    return lines.join('\n');
}

async function respondLoritta(runtime) {
    const loriR = await runTool('get_loritta_sonhos', {}, runtime);
    if (loriR?.ok) return '💤 Sonhos (Loritta): **' + fmt(loriR.sonhos) + '**';
    return '💤 Sonhos: ' + (loriR?.error || 'não consegui ler a Loritta');
}

async function respondPlayer(runtime) {
    const p = await runTool('get_player_summary', {}, runtime);
    if (!p?.ok) return 'Ainda não achei personagem. Use `O.j criar`.';
    return [
        '**Personagem**',
        p.classId ? 'Classe: **' + p.classId + '**' : null,
        p.level != null ? 'Nível: **' + p.level + '**' : null,
        p.attrs ? 'Attrs: ' + JSON.stringify(p.attrs) : null
    ]
        .filter(Boolean)
        .join('\n');
}

async function respondGuilds(runtime) {
    const g = await runTool('list_bot_guilds', { limit: 12 }, runtime);
    const lines = ['Estou em **' + (g.count || 0) + '** servidor(es):'];
    for (const x of g.guilds || []) {
        lines.push('• **' + x.name + '** · ' + fmt(x.members));
    }
    return lines.join('\n');
}

async function respondCommand(runtime, name) {
    if (!name) {
        return 'Qual comando? Ex.: “explique daily” ou “como usa O.arena”.';
    }
    const r = await runTool('explain_command', { name }, runtime);
    if (!r?.ok) {
        // fuzzy: busca no catálogo
        const hit = await fuzzyCommand(name);
        if (hit) {
            return formatCmd(hit);
        }
        return 'Não achei **' + name + '**. Tente “lista de comandos”.';
    }
    return formatCmd(r);
}

function formatCmd(r) {
    return [
        '**' + r.name + '**' + (r.category ? ' · ' + r.category : ''),
        r.desc,
        r.about || null,
        r.usage ? 'Uso: `' + r.usage + '`' : null,
        r.example ? 'Ex.: `' + r.example + '`' : null
    ]
        .filter(Boolean)
        .join('\n');
}

async function fuzzyCommand(q) {
    const catalog = require('./commandCatalog');
    const n = norm(q);
    let best = null;
    let score = 0;
    for (const cat of catalog.listCategories()) {
        for (const c of cat.commands) {
            const blob = norm(c.name + ' ' + c.desc + ' ' + (c.about || ''));
            let s = 0;
            if (c.name === n) s = 10;
            else if (blob.includes(n)) s = 5;
            else if (n.length >= 3 && c.name.includes(n)) s = 4;
            if (s > score) {
                score = s;
                best = { ...c, category: cat.label, ok: true };
            }
        }
    }
    return score >= 4 ? best : null;
}

async function respondCatalog(runtime) {
    const cats = await runTool('list_command_categories', {}, runtime);
    if (!Array.isArray(cats)) return 'Catálogo offline.';
    const lines = ['**Comandos por categoria**'];
    for (const c of cats) {
        lines.push('**' + c.label + ':** ' + (c.commands || []).slice(0, 12).join(', '));
    }
    return lines.join('\n').slice(0, 1900);
}

async function respondClassDesign(runtime, brief) {
    const r = await runTool(
        'design_rpg_class',
        {
            name: brief?.name || 'Nova Classe',
            theme: brief?.theme || 'mistério',
            powerLevel: brief?.powerLevel || 'rara'
        },
        runtime
    );
    if (r?.error) return r.error;
    const s = r.suggestedStats || {};
    const act = (r.suggestedActives || [])
        .map((a) => '• **' + a.name + '** (' + a.power + ') — ' + a.note)
        .join('\n');
    const pas = (r.suggestedPassives || [])
        .map((a) => '• **' + a.name + '** — ' + a.note)
        .join('\n');
    return [
        'Montei uma proposta pra **' + r.name + '**:',
        'ID: `' + r.classId + '` · ' + r.theme,
        'FOR ' + s.forca + ' · AGI ' + s.agilidade + ' · DEF ' + s.defesa + ' · VIDA ' + s.vida,
        '',
        '**Ativas**',
        act,
        '**Passivas**',
        pas,
        '',
        '_Ideia pronta — o dono aplica no código se quiser._'
    ].join('\n');
}

async function respondDraft(runtime, text) {
    if (!isOwner(runtime.userId)) return 'Rascunho de comando só o **dono** pede.';
    const n = norm(text);
    const m = n.match(/(?:comando|cmd)\s+([a-z0-9_-]{2,32})/);
    const commandName = m?.[1] || 'novo_comando';
    const r = await runTool(
        'propose_command_draft',
        { commandName, description: text.slice(0, 200) },
        runtime
    );
    if (r?.path) return 'Pronto — salvei em `' + r.path + '`.\n' + (r.note || '');
    if (r?.codePreview) {
        return 'Não gravei no disco (' + r.note + '). Prévia:\n```js\n' + r.codePreview.slice(0, 800) + '\n```';
    }
    return r?.error || 'Falhou o rascunho.';
}

async function respondOverview(runtime) {
    const parts = [
        await respondBalance(runtime),
        await respondLoritta(runtime),
        await respondPlayer(runtime),
        runtime.guild ? await respondHere(runtime) : null
    ].filter(Boolean);
    return '**Seu panorama**\n' + parts.join('\n\n');
}

async function respondSearch(runtime, text) {
    const n = norm(text);
    const words = n.split(' ').filter((w) => w.length > 3);
    const catalog = require('./commandCatalog');
    const hits = [];
    for (const cat of catalog.listCategories()) {
        for (const c of cat.commands) {
            const blob = norm(c.name + ' ' + c.desc + ' ' + (c.about || ''));
            if (words.some((w) => blob.includes(w))) {
                hits.push({ ...c, category: cat.label });
            }
        }
    }
    if (hits.length) {
        const top = hits.slice(0, 5);
        return (
            'Achei isso relacionado:\n' +
            top.map((c) => '• **' + c.name + '** — ' + c.desc + ' (`' + c.usage + '`)').join('\n')
        );
    }
    return null;
}

async function respondChat(runtime, text) {
    const search = await respondSearch(runtime, text);
    if (search) return search;

    const n = norm(text);
    if (/\?$/.test(text.trim()) || hasAny(n, ['sera que', 'sera', 'pode', 'consegue', 'tem como'])) {
        return pick([
            'Posso tentar. Se for sobre o bot, fala mais direto — saldo, comando, classe, servidor…',
            'Sim, dentro do Aeternus. Me diz o objetivo em uma frase.',
            'Construo a resposta com o que o sistema sabe. Quer um resumo? Fala “me atualiza”.'
        ]);
    }

    return pick([
        'Tô aqui. Pode falar solto — tipo assistente do celular. Ex.: “saldo e como funciona o daily”.',
        'Não peguei um pedido claro. Mistura assuntos se quiser: éter, Loritta, RPG, comandos.',
        'Me dá um gancho: saldo, sonhos, comando X, classe nova, ou “me atualiza”.'
    ]);
}

async function runIntent(item, runtime, text) {
    switch (item.intent) {
        case 'clear':
            clearHistory(runtime.userId);
            return 'Memória da conversa limpa.';
        case 'greet':
            return respondGreet(runtime);
        case 'identity':
            return respondIdentity(runtime);
        case 'help':
            return respondHelp();
        case 'time':
            return respondTime();
        case 'here':
            return respondHere(runtime);
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
        case 'draft_command':
            return respondDraft(runtime, text);
        case 'overview':
            return respondOverview(runtime);
        case 'thanks':
            return pick(['De nada ✨', 'Sempre.', 'Quando quiser.']);
        case 'bye':
            return pick(['Até mais.', 'Flw.', 'Estou por aqui.']);
        case 'search':
            return (await respondSearch(runtime, text)) || respondChat(runtime, text);
        default:
            return respondChat(runtime, text);
    }
}

async function chat({ userId, message, client, guild, channel }) {
    const runtime = {
        userId: String(userId),
        client,
        guild,
        channel,
        isOwner: isOwner(userId)
    };
    const text = String(message || '').trim();
    const userMem = mem(userId);
    userMem.turns += 1;
    userMem.lastText = text;

    const intents = detectIntents(text, userMem);
    // executa até 3 intenções relevantes (score >= 0.5), estilo multi-assunto
    const toRun = intents.filter((i) => i.score >= 0.5).slice(0, 3);
    if (!toRun.length) toRun.push({ intent: 'chat', score: 0.3 });

    userMem.lastIntents = toRun.map((i) => i.intent);

    const chunks = [];
    const seen = new Set();
    for (const item of toRun) {
        if (seen.has(item.intent)) continue;
        seen.add(item.intent);
        const piece = await runIntent(item, runtime, text);
        if (piece) chunks.push(String(piece).trim());
    }

    let out = chunks.filter(Boolean).join('\n\n');
    if (!out) out = await respondChat(runtime, text);
    return { ok: true, text: String(out).slice(0, 1900) };
}

/* ---------- tools nativas ---------- */

function installDefaults() {
    registerContext('bot', {
        description: 'Identidade do bot',
        get: async ({ client }) => ({
            tag: client?.user?.tag || null,
            id: client?.user?.id || null,
            guildCount: client?.guilds?.cache?.size || 0
        })
    });
    registerContext('guild', {
        description: 'Servidor atual',
        get: async ({ guild }) =>
            guild
                ? { id: guild.id, name: guild.name, members: guild.memberCount }
                : { inGuild: false }
    });

    registerTool({
        name: 'get_eter_balance',
        description: 'Saldo de éter',
        handler: async (args, rt) => {
            const eter = require('./eter');
            const id = String(args.userId || rt.userId);
            return { userId: id, eter: eter.get(id) };
        }
    });
    registerTool({
        name: 'get_loritta_sonhos',
        description: 'Sonhos Loritta',
        handler: async (args, rt) => {
            const loritta = require('./loritta');
            const id = String(args.userId || rt.userId);
            if (!loritta.configured()) {
                return { ok: false, error: 'LORITTA_API_TOKEN ausente' };
            }
            try {
                const u = await loritta.getUser(id);
                return { ok: true, userId: id, sonhos: u.sonhos ?? u.money ?? null };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });
    registerTool({
        name: 'explain_command',
        description: 'Explica comando',
        handler: async (args) => {
            const catalog = require('./commandCatalog');
            const found = catalog.findCommand(args.name);
            if (!found) return { ok: false, error: 'não encontrado' };
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
        description: 'Categorias',
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
        description: 'Servidores',
        handler: async (args, rt) => {
            const limit = Math.min(50, Math.max(1, Number(args.limit) || 25));
            const list = [...(rt.client?.guilds?.cache?.values() || [])]
                .slice(0, limit)
                .map((g) => ({ id: g.id, name: g.name, members: g.memberCount }));
            return { count: rt.client?.guilds?.cache?.size || 0, guilds: list };
        }
    });
    registerTool({
        name: 'get_player_summary',
        description: 'RPG',
        handler: async (args, rt) => {
            try {
                const player = require('./player');
                const id = String(args.userId || rt.userId);
                const p = player.get?.(id);
                if (!p) return { ok: false, error: 'sem personagem' };
                return {
                    ok: true,
                    userId: id,
                    classId: p.classId || p.classe || null,
                    level: p.level || p.nivel || null,
                    attrs: p.attrs || p.atributos || null
                };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }
    });
    registerTool({
        name: 'design_rpg_class',
        description: 'Classe',
        handler: async (args) => {
            const power = String(args.powerLevel || 'rara').toLowerCase();
            const base =
                /unica|lend/.test(power) ? 220 : /epic|epica/.test(power) ? 160 : /rar/.test(power) ? 120 : 80;
            const theme = String(args.theme || 'mistério');
            const name = String(args.name || 'Nova Classe');
            return {
                ok: true,
                classId: name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '')
                    .slice(0, 40),
                name,
                theme,
                suggestedStats: {
                    forca: base + 10,
                    agilidade: base,
                    defesa: base + 5,
                    vida: base + 15
                },
                suggestedActives: [
                    { name: theme.split(' ')[0] + ' I', power: Math.round(base * 1.2), note: 'Dano' },
                    { name: theme.split(' ')[0] + ' II', power: Math.round(base * 0.9), note: 'Controle' },
                    { name: 'Véu', power: Math.round(base * 0.7), note: 'Utilitário' },
                    { name: 'Despertar', power: Math.round(base * 1.8), note: 'Ultimate' }
                ],
                suggestedPassives: [
                    { name: 'Essência', note: 'Tema: ' + theme.slice(0, 40) },
                    { name: 'Resiliência', note: 'Sinergia com ultimate' }
                ]
            };
        }
    });
    registerTool({
        name: 'propose_command_draft',
        description: 'Rascunho (dono)',
        ownerOnly: true,
        handler: async (args) => {
            const name = String(args.commandName || '')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 32);
            if (!name) return { ok: false, error: 'Nome inválido' };
            const code =
                "const { SlashCommandBuilder } = require('discord.js');\n\nmodule.exports = {\n" +
                "    name: '" +
                name +
                "',\n    description: " +
                JSON.stringify(args.description || name) +
                ",\n    data: new SlashCommandBuilder().setName('" +
                name +
                "').setDescription(" +
                JSON.stringify(String(args.description || name).slice(0, 100)) +
                "),\n    async execute(message) { await message.reply('Comando " +
                name +
                " em construção.'); },\n    async executeSlash(i) { await i.reply({ content: 'ok', ephemeral: true }); }\n};\n";
            const dir = path.join(process.cwd(), 'drafts');
            try {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const file = path.join(dir, name + '.js');
                fs.writeFileSync(file, code, 'utf8');
                return { ok: true, path: file, note: 'Mova para commands/ se aprovar.' };
            } catch (e) {
                return { ok: true, path: null, codePreview: code.slice(0, 1200), note: e.message };
            }
        }
    });
}

installDefaults();

module.exports = {
    configured,
    registerContext,
    registerTool,
    listContexts,
    listTools,
    chat,
    clearHistory,
    isOwner,
    model: () => 'aeternus-native',
    baseUrl: () => 'local'
};
