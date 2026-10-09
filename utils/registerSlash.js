const { REST, Routes } = require('discord.js');
const { getToken, getClientId, getGuildId } = require('./env');

// O Discord não aceita espaços no nome individual. A estrutura grupo + subcomando
// faz os comandos aparecerem como "/economia saldo", "/moderacao banir" etc.
const CATEGORY = {
    addmoney: 'economia', removemoney: 'economia', saldo: 'economia', banco: 'economia',
    depositar: 'economia', sacar: 'economia', beg: 'economia', rob: 'economia', pay: 'economia',
    daily: 'economia', work: 'economia', crime: 'economia', slots: 'economia', cara: 'economia',
    ppt: 'diversao', dado: 'economia', blackjack: 'economia', minas: 'economia', drop: 'economia',
    ban: 'moderacao', kick: 'moderacao', mute: 'moderacao', unmute: 'moderacao', unban: 'moderacao',
    warn: 'moderacao', warns: 'moderacao', lock: 'moderacao', unlock: 'moderacao', slowmode: 'moderacao',
    limpar: 'moderacao', lockdown: 'moderacao', bloquearcomandos: 'moderacao',
    say: 'servidor', contagem: 'servidor', embed: 'servidor', painel: 'servidor',
    verificar: 'servidor', msg: 'servidor', invites: 'servidor', cargo: 'servidor', role: 'servidor',
    ranking: 'servidor', afk: 'utilidades', help: 'utilidades', ping: 'utilidades',
    calc: 'utilidades', j: 'utilidades', quiz: 'diversao', pvp: 'rpg', rank: 'rpg',
    xp: 'rpg', arena: 'rpg', classe: 'rpg', atributos: 'rpg', avanco: 'rpg',
    play: 'musica', pause: 'musica', resume: 'musica', skip: 'musica', stop: 'musica',
    queue: 'musica', volume: 'musica', nowplaying: 'musica', loop: 'musica'
};

const LABELS = {
    addmoney: 'adicionar', removemoney: 'remover', saldo: 'saldo', banco: 'banco',
    depositar: 'depositar', sacar: 'sacar', beg: 'pedir', rob: 'roubar', pay: 'pagar',
    daily: 'diario', work: 'trabalho', crime: 'crime', slots: 'slots', cara: 'caraoucoroa',
    ppt: 'jokenpo', dado: 'dado', blackjack: 'blackjack', minas: 'minas', drop: 'drop',
    ban: 'banir', kick: 'expulsar', mute: 'silenciar', unmute: 'dessilenciar', unban: 'desbanir',
    warn: 'advertir', warns: 'advertencias', lock: 'trancar', unlock: 'destrancar',
    slowmode: 'modelento', limpar: 'limpar', lockdown: 'bloqueio', bloquearcomandos: 'bloquear',
    say: 'mensagem', contagem: 'contador', embed: 'embed', painel: 'painel',
    verificar: 'verificar', msg: 'mensagens', invites: 'convites', cargo: 'cargo',
    role: 'alternarcargo', ranking: 'ranking', afk: 'ausente', help: 'ajuda',
    ping: 'latencia', calc: 'calculadora', j: 'jogador', quiz: 'quiz', pvp: 'pvp',
    rank: 'rank', xp: 'nivel', arena: 'arena', classe: 'classe', atributos: 'atributos',
    avanco: 'avanco', play: 'tocar', pause: 'pausar', resume: 'continuar', skip: 'pular',
    stop: 'parar', queue: 'fila', volume: 'volume', nowplaying: 'tocando', loop: 'repetir'
};

function safeName(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '').slice(0, 32) || 'comando';
}

function collectSlashBody(client) {
    const groups = new Map();
    const routes = new Map();
    const sources = client.slash ? [...client.slash.values()] : [];

    for (const cmd of sources) {
        if (!cmd?.data || (typeof cmd.executeSlash !== 'function' && typeof cmd.execute !== 'function')) continue;
        try {
            const json = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : { ...cmd.data };
            if (!json?.name) continue;
            const group = CATEGORY[cmd.name] || 'geral';
            let sub = safeName(LABELS[cmd.name] || cmd.name);
            const routeKey = group + ' ' + sub;
            if (routes.has(routeKey)) {
                sub = safeName(cmd.name);
            }
            const finalKey = group + ' ' + sub;
            if (routes.has(finalKey)) {
                console.warn('[slash] subcomando duplicado ignorado:', finalKey);
                continue;
            }
            const options = Array.isArray(json.options)
                ? json.options.filter(o => o && o.name !== 'args')
                : [];
            // Slash commands are exposed as subcommands. Existing options and handlers remain.
            if (options.some(o => o.type === 1 || o.type === 2)) {
                console.warn('[slash] comando com subcomandos aninhados não agrupado:', cmd.name);
                continue;
            }
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push({
                type: 1,
                name: sub,
                description: String(json.description || cmd.description || cmd.name || sub).slice(0, 100),
                ...(options.length ? { options } : {})
            });
            routes.set(finalKey, cmd);
        } catch (e) {
            console.error('[slash] falha ao serializar:', e.message);
        }
    }

    const body = [];
    for (const [group, subs] of groups) {
        // Discord permite no máximo 25 subcomandos em cada grupo.
        for (let i = 0; i < subs.length; i += 25) {
            const chunk = subs.slice(i, i + 25);
            const name = i === 0 ? group : safeName(group + (i / 25 + 1));
            body.push({
                name,
                description: ({
                    economia: 'Saldo, banco e economia do Aeternus',
                    moderacao: 'Ferramentas de moderação do servidor',
                    servidor: 'Configurações e ferramentas do servidor',
                    utilidades: 'Comandos úteis do Aeternus',
                    diversao: 'Jogos e diversão',
                    rpg: 'Aventura, classes e progressão',
                    musica: 'Reprodução e controle de música',
                    geral: 'Outros comandos'
                })[group] || 'Comandos do Aeternus',
                options: chunk
            });
            // Rotas dos grupos adicionais também apontam para os comandos originais.
            if (i > 0) {
                const original = subs.slice(i, i + 25);
                for (const sub of original) {
                    const cmd = [...routes.entries()].find(([k]) => k.endsWith(' ' + sub.name))?.[1];
                    if (cmd) routes.set(name + ' ' + sub.name, cmd);
                }
            }
        }
    }
    client.slashRoutes = routes;
    body.sort((a, b) => a.name.localeCompare(b.name));
    return body;
}

async function registerSlash(client, opts = {}) {
    const token = getToken() || client?.token || null;
    const clientId = getClientId(client);
    if (!token) return { ok: false, error: 'missing_token' };
    if (!clientId) return { ok: false, error: 'missing_client_id' };

    const rest = new REST({ version: '10' }).setToken(token);
    const body = opts.wipeOnly ? [] : collectSlashBody(client);
    console.log('⏳ [slash] Sincronizando ' + body.length + ' grupos (subcomandos agrupados)…');

    try {
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(body.length ? '✨ [slash] GLOBAL: ' + body.map(c => c.name).join(', ') : '🗑️ [slash] Comandos globais apagados.');
    } catch (e) {
        console.error('❌ [slash] Global:', e.message);
        if (e.rawError) console.error(JSON.stringify(e.rawError, null, 2));
        return { ok: false, error: e.message };
    }

    const guildIds = new Set();
    const envGuild = getGuildId();
    if (envGuild) guildIds.add(envGuild);
    if (Array.isArray(opts.guildIds)) opts.guildIds.forEach(id => guildIds.add(String(id)));
    if (client?.guilds?.cache) for (const g of client.guilds.cache.values()) guildIds.add(g.id);
    const useGuild = process.env.SLASH_GUILD_REGISTER === '1' && !opts.wipeOnly;
    for (const gid of guildIds) {
        try {
            await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: useGuild ? body : [] });
            console.log(useGuild ? '✨ [slash] Guild ' + gid + ': ' + body.length : '🗑️ [slash] Guild ' + gid + ': locais removidos');
        } catch (e) {
            console.warn('⚠️ [slash] Guild ' + gid + ': ' + e.message);
        }
    }
    return { ok: true, count: body.length, names: body.map(c => c.name) };
}

async function wipeSlash(client) {
    return registerSlash(client, { wipeOnly: true });
}

module.exports = { registerSlash, wipeSlash, collectSlashBody };
