/**
 * Consciência do Aeternus — motor local, sem API de IA de terceiros.
 *
 * Integra saldos (éter + Loritta), catálogo de comandos, servidores, RPG
 * e registro de contextos/ferramentas para módulos novos.
 *
 *   const mind = require('./aeternusAI');
 *   mind.registerContext('x', { description, get });
 *   mind.registerTool({ name, description, handler, ownerOnly? });
 */

const fs = require('fs');
const path = require('path');

const contexts = new Map();
const tools = new Map();
const memory = new Map(); // userId -> { lastIntent, topics: string[] }

function ownerId() {
    return String(process.env.OWNER_ID || '').trim();
}

function isOwner(userId) {
    const o = ownerId();
    return o && String(userId) === o;
}

function configured() {
    return true; // sempre ativa — consciência nativa
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

function remember(userId, patch) {
    const key = String(userId);
    const cur = memory.get(key) || { lastIntent: null, topics: [] };
    Object.assign(cur, patch);
    if (patch.topic) {
        cur.topics = [patch.topic, ...(cur.topics || [])].slice(0, 8);
        delete cur.topic;
    }
    memory.set(key, cur);
    return cur;
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

function extractCommandName(text) {
    const n = norm(text);
    const m =
        n.match(/(?:comando|cmd|explique|explica|como usa|como usar|o que e|o que é)\s+(?:o\.?\s*)?([a-z0-9_-]{2,32})/) ||
        n.match(/\bo\.([a-z0-9_-]{2,32})\b/) ||
        n.match(/\b([a-z0-9_-]{2,32})\b.*\b(comando|cmd)\b/);
    if (m) return m[1] || m[2];
    // última palavra útil
    const parts = n.split(' ').filter((w) => w.length > 2 && !['como', 'usar', 'explique', 'explica', 'sobre', 'comando'].includes(w));
    return parts[parts.length - 1] || null;
}

function extractClassBrief(text) {
    const raw = String(text || '').trim();
    const n = norm(raw);
    let name = null;
    let theme = raw;
    const m = n.match(/(?:classe|class)\s+(?:chamada\s+|nome\s+)?["']?([a-z0-9 _-]{2,40})["']?/);
    if (m) name = m[1].trim();
    if (!name) {
        const m2 = n.match(/(?:criar|crie|faca|faça|monta|monte)\s+(?:uma\s+)?classe\s+(.+)/);
        if (m2) theme = m2[1];
    }
    let power = 'rara';
    if (/unica|única|lendari|mitic/.test(n)) power = 'unica';
    else if (/epic|épica|epica/.test(n)) power = 'epica';
    else if (/comum|basic/.test(n)) power = 'comum';
    return { name: name || 'Nova Classe', theme: theme.slice(0, 200), powerLevel: power };
}

function detectIntent(text) {
    const n = norm(text);
    if (!n) return { intent: 'empty' };

    if (/^(oi|ola|olá|hey|eae|eai|fala|salve|bom dia|boa tarde|boa noite)\b/.test(n) || n.length < 4) {
        return { intent: 'greet' };
    }
    if (/\b(quem e voce|quem é você|o que voce e|o que você é|sua consciencia|consciência)\b/.test(n)) {
        return { intent: 'identity' };
    }
    if (/\b(limpar|clear|reset|esquecer)\b/.test(n) && /\b(historico|histórico|memoria|memória|conversa)\b/.test(n)) {
        return { intent: 'clear' };
    }
    if (/\b(sonho|sonhos|loritta|lori)\b/.test(n)) {
        return { intent: 'loritta' };
    }
    if (/\b(saldo|carteira|eter|éter|quantos eter|meu dinheiro|bank|banco)\b/.test(n)) {
        return { intent: 'balance' };
    }
    if (/\b(perfil|personagem|meu rpg|minha classe|atributo)\b/.test(n)) {
        return { intent: 'player' };
    }
    if (/\b(servidor|servidores|guilds?|onde voce esta|onde você está)\b/.test(n)) {
        return { intent: 'guilds' };
    }
    if (/\b(classe|rpg).*(criar|crie|faca|faça|montar|ideia|design)|\b(criar|crie|faca|faça)\b.*\bclasse\b/.test(n)) {
        return { intent: 'class_design', brief: extractClassBrief(text) };
    }
    if (/\b(comando|cmd|explique|explica|como usa|como usar|ajuda com)\b/.test(n) || /\bo\.[a-z]/.test(n)) {
        return { intent: 'command', name: extractCommandName(text) };
    }
    if (/\b(categoria|categorias|lista de comando|listar comando|todos os comando|comandos)\b/.test(n)) {
        return { intent: 'catalog' };
    }
    if (/\b(criar comando|novo comando|rascunho|draft)\b/.test(n)) {
        return { intent: 'draft_command' };
    }
    if (/\b(ajuda|help|o que voce faz|o que você faz|capacidades)\b/.test(n)) {
        return { intent: 'help' };
    }
    return { intent: 'chat' };
}

async function respondIdentity(runtime) {
    const name = runtime.client?.user?.username || 'Aeternus';
    const guilds = runtime.client?.guilds?.cache?.size || 0;
    return (
        `Eu sou a **consciência do ${name}** — não dependo de IA de terceiros.\n` +
        `Vivo neste bot: economia, RPG, servidores e o que os módulos registrarem em mim.\n` +
        `Agora habito **${guilds}** servidor(es). Pergunte saldo, sonhos, comandos ou classes.`
    );
}

async function respondGreet(runtime) {
    const name = runtime.client?.user?.username || 'Aeternus';
    return pick([
        `Olá. Eu sou o **${name}**. Pode falar de saldo, comandos, Loritta ou RPG.`,
        `Presente. Sou a consciência do Aeternus — em que posso ajudar?`,
        `Oi. Pergunte algo do bot: éter, sonhos, arena, classes…`
    ]);
}

async function respondHelp() {
    return [
        '**Consciência Aeternus** — o que eu faço:',
        '• Saldo de **éter** e **sonhos** (Loritta)',
        '• Explicar **comandos** e listar categorias',
        '• Resumo do seu **personagem** RPG',
        '• Listar **servidores** onde estou',
        '• Ajudar a **desenhar classes**',
        '• Dono: rascunho de comando em `drafts/`',
        '',
        'Exemplos: `meu saldo e sonhos` · `explique arena` · `crie uma classe ninja rara`'
    ].join('\n');
}

async function respondBalance(runtime) {
    const eterR = await runTool('get_eter_balance', {}, runtime);
    const loriR = await runTool('get_loritta_sonhos', {}, runtime);
    const lines = ['**Seus recursos**'];
    if (eterR?.eter != null) lines.push(`✨ Éter: **${fmt(eterR.eter)}**`);
    else lines.push('✨ Éter: indisponível');
    if (loriR?.ok) lines.push(`💤 Sonhos (Loritta): **${fmt(loriR.sonhos)}**`);
    else lines.push(`💤 Sonhos: ${loriR?.error || 'API Loritta não configurada'}`);
    return lines.join('\n');
}

async function respondLoritta(runtime) {
    const loriR = await runTool('get_loritta_sonhos', {}, runtime);
    if (loriR?.ok) {
        return `Na Loritta você tem 💤 **${fmt(loriR.sonhos)}** sonhos.\n(Consulta direta à API da Loritta — eu só leio, não transfiro.)`;
    }
    return `Não consegui ler os sonhos: ${loriR?.error || 'erro'}.\nVerifique se `LORITTA_API_TOKEN` (lorixp_) está no ambiente.`;
}

async function respondPlayer(runtime) {
    const p = await runTool('get_player_summary', {}, runtime);
    if (!p?.ok) {
        return 'Não achei personagem seu. Crie com `O.j criar` e depois pergunte de novo.';
    }
    return [
        '**Seu personagem**',
        p.classId ? `Classe: **${p.classId}**` : 'Classe: —',
        p.level != null ? `Nível: **${p.level}**` : null,
        p.attrs ? `Atributos: ${JSON.stringify(p.attrs)}` : null
    ]
        .filter(Boolean)
        .join('\n');
}

async function respondGuilds(runtime) {
    const g = await runTool('list_bot_guilds', { limit: 15 }, runtime);
    const lines = [`Estou em **${g.count || 0}** servidor(es).`];
    for (const x of g.guilds || []) {
        lines.push(`• **${x.name}** — ${fmt(x.members)} membros · \`${x.id}\``);
    }
    if ((g.count || 0) > (g.guilds || []).length) {
        lines.push(`_…e mais ${(g.count || 0) - (g.guilds || []).length}_`);
    }
    return lines.join('\n');
}

async function respondCommand(runtime, name) {
    if (!name) {
        return 'Diga qual comando quer que eu explique. Ex.: `explique daily` ou `como usa O.arena`.';
    }
    const r = await runTool('explain_command', { name }, runtime);
    if (!r?.ok) {
        return `Não encontrei **${name}** no catálogo. Peça `lista de comandos` ou veja `O.ajuda`.`;
    }
    return [
        `**${r.name}** · ${r.category || '—'}`,
        r.desc,
        r.about ? r.about : null,
        r.usage ? `Uso: \`${r.usage}\`` : null,
        r.example ? `Ex.: \`${r.example}\`` : null
    ]
        .filter(Boolean)
        .join('\n');
}

async function respondCatalog(runtime) {
    const cats = await runTool('list_command_categories', {}, runtime);
    if (!Array.isArray(cats)) return 'Catálogo indisponível no momento.';
    const lines = ['**Categorias e comandos**'];
    for (const c of cats) {
        lines.push(`**${c.label}**: ${(c.commands || []).join(', ')}`);
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
    if (!r?.ok && r?.error) return r.error;
    const s = r.suggestedStats || {};
    const act = (r.suggestedActives || [])
        .map((a) => `• **${a.name}** (${a.power}) — ${a.note}`)
        .join('\n');
    const pas = (r.suggestedPassives || []).map((a) => `• **${a.name}** — ${a.note}`).join('\n');
    return [
        `**Proposta de classe: ${r.name}**`,
        `ID sugerido: \`${r.classId}\` · tema: ${r.theme}`,
        `Stats: FOR ${s.forca} · AGI ${s.agilidade} · DEF ${s.defesa} · VIDA ${s.vida}`,
        '',
        '**Ativas**',
        act,
        '',
        '**Passivas**',
        pas,
        '',
        '_Eu desenho a ideia; o dono aplica em `utils/classes.js` e `abilities.js`._'
    ].join('\n');
}

async function respondDraft(runtime, text) {
    if (!isOwner(runtime.userId)) {
        return 'Só o **dono** pode pedir rascunho de comando novo.';
    }
    const n = norm(text);
    const m = n.match(/(?:comando|cmd)\s+([a-z0-9_-]{2,32})/);
    const commandName = m?.[1] || 'novo_comando';
    const r = await runTool(
        'propose_command_draft',
        { commandName, description: text.slice(0, 200) },
        runtime
    );
    if (r?.path) return `Rascunho salvo em \`${r.path}\`.\n${r.note || ''}`;
    if (r?.codePreview) {
        return `Não gravei em disco (${r.note}).\nPrévia:\n\`\`\`js\n${r.codePreview.slice(0, 900)}\n\`\`\``;
    }
    return r?.error || 'Não consegui gerar o rascunho.';
}

async function respondChat(runtime, text) {
    const n = norm(text);
    // tenta achar comando citado no meio da frase
    const maybeCmd = extractCommandName(text);
    if (maybeCmd && maybeCmd.length >= 3) {
        const r = await runTool('explain_command', { name: maybeCmd }, runtime);
        if (r?.ok) return respondCommand(runtime, maybeCmd).then?.(() => null) || null;
        const found = await runTool('explain_command', { name: maybeCmd }, runtime);
        if (found?.ok) {
            return [
                `Sobre **${found.name}**: ${found.about || found.desc}`,
                found.usage ? `Uso: \`${found.usage}\`` : null
            ]
                .filter(Boolean)
                .join('\n');
        }
    }

    if (/\b(obrigado|valeu|thanks)\b/.test(n)) {
        return pick(['De nada.', 'Sempre.', 'Às ordens.']);
    }

    return [
        'Entendi o que você disse, mas preciso de um pedido mais claro para agir.',
        'Posso: **saldo**, **sonhos**, **explicar comando**, **lista de comandos**, **servidores**, **personagem**, **criar classe**.',
        'Ex.: `meu saldo` · `explique work` · `crie uma classe samurai epica`'
    ].join('\n');
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
    const intent = detectIntent(text);
    remember(userId, { lastIntent: intent.intent, topic: intent.intent });

    let out;
    switch (intent.intent) {
        case 'empty':
            out = await respondHelp();
            break;
        case 'clear':
            clearHistory(userId);
            out = 'Memória desta conversa apagada.';
            break;
        case 'greet':
            out = await respondGreet(runtime);
            break;
        case 'identity':
            out = await respondIdentity(runtime);
            break;
        case 'help':
            out = await respondHelp();
            break;
        case 'balance':
            out = await respondBalance(runtime);
            break;
        case 'loritta':
            out = await respondLoritta(runtime);
            break;
        case 'player':
            out = await respondPlayer(runtime);
            break;
        case 'guilds':
            out = await respondGuilds(runtime);
            break;
        case 'command':
            out = await respondCommand(runtime, intent.name);
            break;
        case 'catalog':
            out = await respondCatalog(runtime);
            break;
        case 'class_design':
            out = await respondClassDesign(runtime, intent.brief);
            break;
        case 'draft_command':
            out = await respondDraft(runtime, text);
            break;
        default:
            out = await respondChat(runtime, text);
            break;
    }

    return { ok: true, text: String(out || '…').slice(0, 1900) };
}

/* ---------- ferramentas / contextos nativos ---------- */

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
        description: 'Sonhos na Loritta',
        handler: async (args, rt) => {
            const loritta = require('./loritta');
            const id = String(args.userId || rt.userId);
            if (!loritta.configured()) {
                return { ok: false, error: 'LORITTA_API_TOKEN ausente (lorixp_...).' };
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
        description: 'Explica comando do catálogo',
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
        description: 'Lista categorias',
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
        description: 'Servidores do bot',
        handler: async (args, rt) => {
            const limit = Math.min(50, Math.max(1, Number(args.limit) || 25));
            const list = [...(rt.client?.guilds?.cache?.values() || [])]
                .slice(0, limit)
                .map((g) => ({
                    id: g.id,
                    name: g.name,
                    members: g.memberCount
                }));
            return { count: rt.client?.guilds?.cache?.size || 0, guilds: list };
        }
    });

    registerTool({
        name: 'get_player_summary',
        description: 'Resumo RPG',
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
        description: 'Proposta de classe',
        handler: async (args) => {
            const power = String(args.powerLevel || 'rara').toLowerCase();
            const base =
                /unica|única|lend/.test(power)
                    ? 220
                    : /epic|épica/.test(power)
                      ? 160
                      : /rar/.test(power)
                        ? 120
                        : 80;
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
                    { name: theme.split(' ')[0] + ' I', power: Math.round(base * 1.2), note: 'Dano principal' },
                    { name: theme.split(' ')[0] + ' II', power: Math.round(base * 0.9), note: 'Controle' },
                    { name: 'Véu', power: Math.round(base * 0.7), note: 'Utilitário' },
                    { name: 'Despertar', power: Math.round(base * 1.8), note: 'Ultimate' }
                ],
                suggestedPassives: [
                    { name: 'Essência', note: 'Bônus passivo do tema: ' + theme.slice(0, 40) },
                    { name: 'Resiliência', note: 'Sinergia com a ultimate' }
                ]
            };
        }
    });

    registerTool({
        name: 'propose_command_draft',
        description: 'Rascunho de comando (dono)',
        ownerOnly: true,
        handler: async (args) => {
            const name = String(args.commandName || '')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 32);
            if (!name) return { ok: false, error: 'Nome inválido' };
            const code = `const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: '${name}',
    description: ${JSON.stringify(args.description || name)},
    data: new SlashCommandBuilder()
        .setName('${name.slice(0, 32)}')
        .setDescription(${JSON.stringify(String(args.description || name).slice(0, 100))}),
    async execute(message) {
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
                    note: 'Revise e mova para commands/ se aprovar.'
                };
            } catch (e) {
                return {
                    ok: true,
                    path: null,
                    codePreview: code.slice(0, 1500),
                    note: e.message || String(e)
                };
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
    /** compat: sem modelo externo */
    model: () => 'aeternus-native',
    baseUrl: () => 'local'
};
