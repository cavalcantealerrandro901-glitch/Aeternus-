/**
 * Aeternus Engine v7.17 (Invite Generator & Autonomous Moderation Suite)
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
    { q: "Qual é a velocidade aproximada da luz no vácuo? (Dica: cerca de 300 mil km/s)", a: "300000" },
    { q: "Quantos bits formam 1 byte?", a: "8" },
    { q: "Qual linguagem de programação deu origem a este bot?", a: "javascript" },
    { q: "Qual é a estrela mais próxima da Terra além do Sol?", a: "proxima centauri" },
    { q: "Em que ano o homem pisou na Lua pela primeira vez?", a: "1969" }
];

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

try {
    if (fs.existsSync(USERS_FILE)) usersDb = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (fs.existsSync(DICT_CACHE_FILE)) dictCache = JSON.parse(fs.readFileSync(DICT_CACHE_FILE, 'utf-8'));
    if (fs.existsSync(BOT_STATE_FILE)) botState = JSON.parse(fs.readFileSync(BOT_STATE_FILE, 'utf-8'));
} catch (e) {
    console.error('Erro ao carregar dados:', e);
}

function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2), 'utf-8');
        fs.writeFileSync(DICT_CACHE_FILE, JSON.stringify(dictCache, null, 2), 'utf-8');
        fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(botState, null, 2), 'utf-8');
    } catch (_) {}
}

async function fetchWordDefinition(word) {
    const cleanWord = normalizeText(word);
    if (dictCache[cleanWord]) return dictCache[cleanWord];

    try {
        const res = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(cleanWord)}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0 && data[0].xml) {
            const xml = data[0].xml;
            const definition = xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            dictCache[cleanWord] = definition;
            saveData();
            return definition;
        }
    } catch (e) {}
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
    if (profile.persona === 'cyberpunk' && !profile.badges.includes('Ciber-Hacker 🦾')) profile.badges.push('Ciber-Hacker 🦾');
    if (profile.persona === 'medieval' && !profile.badges.includes('Cavaleiro Místico ⚔️')) profile.badges.push('Cavaleiro Místico ⚔️');
}

function addXpAndCheckLevel(profile, bonus = 0) {
    const xpGain = (Math.floor(Math.random() * 15) + 12) + bonus;
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

function ownerId() { return String(process.env.OWNER_ID || '').trim(); }
function isOwner(userId) { return Boolean(ownerId() && String(userId) === ownerId()); }
function configured() { return true; }

function normalizeText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s_.]/g, ' ').replace(/\s+/g, ' ').trim();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function extractMainTopic(text) {
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na', 'por', 'para', 'com', 'e', 'que', 'vc', 'voce', 'ele', 'qual', 'como', 'onde', 'quando', 'porque', 'me', 'fala', 'sobre'];
    const words = normalizeText(text).split(' ').filter(w => !stopWords.includes(w) && w.length > 3);
    return words.length > 0 ? words[words.length - 1] : null;
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
    if (t.ownerOnly && !isOwner(runtime.userId)) return { error: '❌ Só o meu criador mexe aqui.' };
    try { return await t.handler(args || {}, runtime); } catch (e) { return { error: e.message }; }
}

function detectIntents(text) {
    const norm = normalizeText(text);

    // 🔗 Server Invite Intent
    const inviteMatch = norm.match(/(?:link de convite|convite|gerar convite)\s+(?:do\s+servidor\s+)?([0-9]+|[a-z0-9\s]+)/);
    if (inviteMatch) {
        return { intent: 'guild_invite', query: inviteMatch[1].trim(), score: 0.99 };
    }

    // 🛡️ Moderation Intents
    const banMatch = norm.match(/(?:banir|ban)\s+([@0-9a-z\s#]+)/i);
    if (banMatch) return { intent: 'mod_ban', target: banMatch[1].trim(), score: 0.99 };

    const kickMatch = norm.match(/(?:expulsar|kick)\s+([@0-9a-z\s#]+)/i);
    if (kickMatch) return { intent: 'mod_kick', target: kickMatch[1].trim(), score: 0.99 };

    const muteMatch = norm.match(/(?:mutar|timeout|silenciar)\s+([@0-9a-z\s#]+)/i);
    if (muteMatch) return { intent: 'mod_mute', target: muteMatch[1].trim(), score: 0.99 };

    const clearMatch = norm.match(/(?:limpar|purge|apagar)\s+([0-9]+)\s+mensagens?/i);
    if (clearMatch) return { intent: 'mod_clear', count: parseInt(clearMatch[1]), score: 0.99 };

    // 🌐 Guild Navigator Intents
    if (norm.match(/quais servidores|listar servidores|servidores que voce esta|meus servidores/)) {
        return { intent: 'list_guilds', score: 0.99 };
    }

    const serverInfoMatch = norm.match(/(?:informacoes|info|sobre)\s+do\s+servidor\s+([0-9]+|[a-z0-9\s]+)/) || norm.match(/servidor\s+([0-9]+)/);
    if (serverInfoMatch) {
        return { intent: 'guild_info', query: serverInfoMatch[1].trim(), score: 0.99 };
    }

    const msgOwnerMatch = norm.match(/(?:mandar mensagem|enviar mensagem)\s+(?:para\s+)?o\s+dono\s+do\s+servidor\s+([0-9]+|[a-z0-9\s]+)(?::\s*|\s+dizendo\s+)(.+)/i);
    if (msgOwnerMatch) {
        return { intent: 'message_guild_owner', target: msgOwnerMatch[1].trim(), content: msgOwnerMatch[2].trim(), score: 0.99 };
    }

    if (norm.match(/desafio|trivia|quiz|pergunta/)) return { intent: 'start_trivia', score: 0.99 };
    if (norm.match(/modo cibernetico|ativar cyberpunk/)) return { intent: 'set_persona', persona: 'cyberpunk', score: 0.99 };
    if (norm.match(/modo medieval|ativar m[eé]stico/)) return { intent: 'set_persona', persona: 'medieval', score: 0.99 };
    if (norm.match(/modo padrão|desativar modo/)) return { intent: 'set_persona', persona: 'default', score: 0.99 };

    if (norm.match(/meu nivel|minha ficha|meus status|meu perfil/)) {
        return { intent: 'user_profile', score: 0.99 };
    }

    for (const [name, tool] of tools.entries()) {
        const toolNameNorm = normalizeText(name);
        if (norm.includes(toolNameNorm) || (toolNameNorm.length > 4 && norm.includes(toolNameNorm.replace(/_/g, ' ')))) {
            return { intent: 'execute_dynamic_tool', toolName: name, score: 0.95 };
        }
    }

    const dictMatch = norm.match(/(?:significa|significado de|defina|definicao de|o que e|pesquise a palavra|pesquisar)\s+([a-zà-ú]+)/);
    if (dictMatch) return { intent: 'dictionary_lookup', score: 0.99, word: dictMatch[1] };

    if (norm.match(/como vc ta|como voce esta|seu humor/)) return { intent: 'bot_mood', score: 0.95 };
    if (norm.match(/quem te (criou|fez)|seu (criador|dono)/)) return { intent: 'creator_info', score: 0.95 };

    const mathMatch = norm.match(/(?:calcula|resultado de|conta)\s+([0-9+\-*/%().^\s]+)/) || norm.match(/^([0-9+\-*/%().^\s]{3,})$/);
    if (mathMatch) return { intent: 'calculate', score: 0.95, expression: mathMatch[1] || mathMatch[0] };

    return { intent: 'autonomous_reply', score: 0.8 };
}

async function runIntent(item, runtime, text, profile, levelUpInfo) {
    updatePersistentHistory(runtime.userId, text, item.intent);

    const client = runtime.client;
    const guilds = client && client.guilds ? Array.from(client.guilds.cache.values()) : [];

    // 🔗 Handler para gerar convite do servidor
    if (item.intent === 'guild_invite') {
        let targetGuild = null;
        const q = item.query;
        if (!isNaN(q)) {
            const index = parseInt(q) - 1;
            targetGuild = guilds[index];
        } else {
            targetGuild = guilds.find(g => normalizeText(g.name).includes(normalizeText(q)));
        }

        if (!targetGuild) return `⚠️ Servidor "${q}" não encontrado na minha lista.`;

        try {
            const channel = targetGuild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(targetGuild.members.me)?.has('CreateInstantInvite'));
            if (!channel) return `❌ Não tenho permissão para criar convites no servidor **${targetGuild.name}**.`;

            const invite = await channel.createInvite({ maxAge: 86400, maxUses: 1, reason: `Solicitado por ${profile.name}` });
            return `🔗 **Link de Convite para [${targetGuild.name}]:**\n> https://discord.gg/${invite.code}\n\n⏱️ *Este convite expira em 24 horas (uso único).*`;
        } catch (e) {
            return `❌ Falha ao gerar convite: ${e.message}`;
        }
    }

    // 🛡️ Handlers de Moderação
    if (item.intent.startsWith('mod_')) {
        const guild = runtime.guild;
        if (!guild) return "⚠️ Este comando de moderação só pode ser executado dentro de um servidor.";

        const member = guild.members.cache.get(runtime.userId);
        if (!member || (!member.permissions.has('Administrator') && !isOwner(runtime.userId))) {
            return "❌ Você não tem permissão para executar comandos de moderação!";
        }

        const channel = runtime.channel;

        if (item.intent === 'mod_clear') {
            try {
                if (!channel || typeof channel.bulkDelete !== 'function') return "❌ Não foi possível limpar mensagens neste canal.";
                const fetched = await channel.messages.fetch({ limit: Math.min(item.count + 1, 100) });
                await channel.bulkDelete(fetched, true);
                return `🧹 Sucesso! ${item.count} mensagens apagadas por ordem de moderação. ✨`;
            } catch (e) {
                return `❌ Erro ao limpar mensagens: ${e.message}`;
            }
        }

        // Para ban, kick, mute precisamos achar o membro alvo
        const targetQuery = normalizeText(item.target);
        const targetMember = guild.members.cache.find(m => 
            m.id === targetQuery.replace(/[^0-9]/g, '') || 
            normalizeText(m.user.username).includes(targetQuery) ||
            normalizeText(m.displayName).includes(targetQuery)
        );

        if (!targetMember) return `⚠️ Usuário "${item.target}" não foi encontrado neste servidor.`;

        try {
            if (item.intent === 'mod_ban') {
                await targetMember.ban({ reason: `Ação solicitada por ${profile.name}` });
                return `🔨 **Banimento Executado:** O usuário **${targetMember.user.tag}** foi banido com sucesso. 🚀`;
            }
            if (item.intent === 'mod_kick') {
                await targetMember.kick(`Ação solicitada por ${profile.name}`);
                return `👢 **Expulsão Executada:** O usuário **${targetMember.user.tag}** foi expulso do servidor. ⚡`;
            }
            if (item.intent === 'mod_mute') {
                await targetMember.timeout(10 * 60 * 1000, `Mutado por 10 minutos a pedido de ${profile.name}`);
                return `🔇 **Silenciamento Aplicado:** **${targetMember.user.tag}** recebeu timeout de 10 minutos. 🛑`;
            }
        } catch (e) {
            return `❌ Erro na execução de moderação: ${e.message}`;
        }
    }

    if (item.intent === 'list_guilds') {
        if (guilds.length === 0) return "🌐 No momento não estou conectado a nenhum servidor.";
        let listStr = "🌐 **Servidores Conectados (Guild Navigator):**\n";
        guilds.forEach((g, idx) => {
            listStr += `**${idx + 1}.** ${g.name} *(ID: ${g.id} | Membros: ${g.memberCount})*\n`;
        });
        listStr += "\n💡 *Dica: Peça 'link de convite do servidor [número]' ou 'informações do servidor [número]'!*";
        return listStr;
    }

    if (item.intent === 'guild_info') {
        let targetGuild = null;
        const q = item.query;
        if (!isNaN(q)) {
            const index = parseInt(q) - 1;
            targetGuild = guilds[index];
        } else {
            targetGuild = guilds.find(g => normalizeText(g.name).includes(normalizeText(q)));
        }

        if (!targetGuild) return `⚠️ Servidor "${q}" não encontrado na lista. Use o comando de listar servidores para conferir os números!`;

        let ownerTag = "Desconhecido";
        try {
            const owner = await targetGuild.fetchOwner();
            ownerTag = owner ? owner.user.tag : "Desconhecido";
        } catch (_) {}

        return `📊 **Informações do Servidor:**\n` +
               `• **Nome:** ${targetGuild.name}\n` +
               `• **ID:** ${targetGuild.id}\n` +
               `• **Membros:** ${targetGuild.memberCount}\n` +
               `• **Dono:** ${ownerTag}\n` +
               `• **Criado em:** <t:${Math.floor(targetGuild.createdTimestamp / 1000)}:R>`;
    }

    if (item.intent === 'message_guild_owner') {
        if (!isOwner(runtime.userId)) return "❌ Apenas o meu criador mexe com comandos de envio global para donos de servidores.";
        
        let targetGuild = null;
        const t = item.target;
        if (!isNaN(t)) {
            const index = parseInt(t) - 1;
            targetGuild = guilds[index];
        } else {
            targetGuild = guilds.find(g => normalizeText(g.name).includes(normalizeText(t)));
        }

        if (!targetGuild) return `⚠️ Servidor "${t}" não encontrado.`;

        try {
            const owner = await targetGuild.fetchOwner();
            if (!owner) return `⚠️ Não foi possível encontrar o dono do servidor ${targetGuild.name}.`;
            
            await owner.send(`📩 **Mensagem do Criador do Bot (${runtime.userId}):**\n> ${item.content}`);
            return `✅ Mensagem enviada com sucesso para o dono do servidor **${targetGuild.name}** (${owner.user.tag})! 🚀`;
        } catch (e) {
            return `❌ Falha ao enviar mensagem para o dono: ${e.message}`;
        }
    }

    if (item.intent === 'set_persona') {
        profile.persona = item.persona;
        checkAndAwardBadges(profile);
        saveData();
        if (item.persona === 'cyberpunk') return `⚡ **Modo Cibernético ATIVADO!** Conexão neural estabelecida, parceiro! 🦾🕶️`;
        if (item.persona === 'medieval') return `🛡️ **Modo Místico ATIVADO!** Que a força dos reinos antigos guie nossa jornada! ⚔️📜`;
        return `🌟 **Modo Padrão Restaurado!** Sistemas operando com máxima versatilidade. 🤖✨`;
    }

    if (item.intent === 'start_trivia') {
        const randomQ = pick(triviaQuestions);
        profile.activeTrivia = randomQ.a;
        saveData();
        return `🧠 **DESAFIO TRIVIA AETERNUS:**\n> *${randomQ.q}*\n\n💡 Responda com o valor ou palavra correta para faturar um bônus de **+50 XP**! 🚀🎯`;
    }

    if (item.intent === 'execute_dynamic_tool') {
        const toolRes = await runTool(item.toolName, { query: text }, runtime);
        if (toolRes && !toolRes.error) {
            const formattedRes = typeof toolRes === 'object' ? JSON.stringify(toolRes, null, 2) : toolRes;
            return `⚙️ **Execução Dinâmica da Tool [${item.toolName}]:**\n> ${formattedRes}\n\n🚀 Comando processado com sucesso pelo roteador da IA!`;
        }
        return `⚠️ Erro ao executar a tool **${item.toolName}**: ${toolRes?.error || 'Retorno inválido.'}`;
    }

    if (profile.activeTrivia) {
        const cleanAns = normalizeText(text);
        if (cleanAns.includes(profile.activeTrivia)) {
            profile.activeTrivia = null;
            if (!profile.badges.includes('Mestre do Saber 🏆')) profile.badges.push('Mestre do Saber 🏆');
            saveData();
            return `🎉 **RESPOSTA CORRETA!** Você gabaritou o desafio, ganhou **+50 XP** e desbloqueou a insígnia **Mestre do Saber 🏆**! 🔥`;
        }
    }

    let prefix = profile.persona === 'cyberpunk' ? `[CYBER-NET] ` : profile.persona === 'medieval' ? `[VALE MÍSTICO] ` : (profile.affinity > 75 ? `Parceiro ${profile.name}! ` : "");

    if (levelUpInfo.leveledUp) {
        prefix += `🎉 **LEVEL UP!** Subiu para o **Nível ${profile.level}**! 🚀🔥\n\n`;
    }

    switch (item.intent) {
        case 'user_profile':
            return `${prefix}📊 **Ficha de Status & Conquistas:**\n` +
                   `• **Nível:** ${profile.level}\n` +
                   `• **XP Atual:** ${profile.xp} / ${profile.level * 100}\n` +
                   `• **Afinidade:** ${profile.affinity}%\n` +
                   `• **Medalhas:** ${profile.badges.join(', ')} 🌟`;
        case 'dictionary_lookup': {
            const word = item.word;
            const definition = await fetchWordDefinition(word);
            if (definition) {
                return `${prefix}📖 **Dicionário — "${word}":**\n> *${definition}*\n\n💡 Termo processado com sucesso! ✨`;
            }
            return `${prefix}🤔 Não achei registros para "${word}". Tente outro termo! 🔍`;
        }
        case 'bot_mood':
            return pick([
                `${prefix}🤖 Sistemas v7.17 operando com Moderação Autônoma e Gestão de Convites! 🔥`,
                `${prefix}🚀 Tudo tinindo por aqui! Servidores sincronizados e prontos para o desafio. 😎⚡`,
                `${prefix}🌟 Núcleo inteligente processando com alta performance! 🦾`
            ]);
        case 'creator_info':
            return ownerId() ? `${prefix}👑 Criado pelo mestre <@${ownerId()}> com tecnologias avançadas! 💻✨` : `${prefix}🏷️ Criador não configurado. ⚙️`;
        case 'calculate':
            const calcRes = await runTool('calculate_math', { expression: item.expression }, runtime);
            return calcRes.ok ? `${prefix}🧮 Resultado matemático: **${calcRes.result}** 🚀✨` : `⚠️ ${calcRes.error}`;
        case 'autonomous_reply': {
            const topic = extractMainTopic(text);
            if (topic) {
                const def = await fetchWordDefinition(topic);
                if (def) {
                    return `${prefix}🧠 Analisando **${topic}**, encontrei conexões diretas no acervo: *${def.slice(0, 120)}...* Fascinante! 🎯🔥`;
                }
                return `${prefix}💬 Excelente abordagem sobre **${topic}**! Nossa engine está processando sua linha de raciocínio. Mande um **"desafio"** para testar sua mente! 🤔✨`;
            }
            return pick([
                `${prefix}🎯 Entendi exatamente o seu ponto! Como quer prosseguir?`,
                `${prefix}🔥 Ótima linha de pensamento! Quer aprofundar mais aspectos sobre isso?`,
                `${prefix}⚡ Captado! Sua argumentação está bem sólida. O que mais manda?`,
                `${prefix}✨ Perspectiva super criativa e rica em detalhes! 🚀`
            ]);
        }
        default:
            return `${prefix}🤔 Achei essa colocação muito profunda! Pode detalhar um pouco mais? 💡`;
    }
}

async function chat({ userId, message, client, guild, channel, messageId, author, learnOnly }) {
    const text = String(message || '').trim();
    if (text.length < 3) return { ok: true, text: '❓' };

    if (learnOnly) {
        return { ok: true, text: null };
    }

    const displayName = author?.displayName || author?.username || 'Usuario';
    const profile = getUserProfile(userId, displayName);
    const levelUpInfo = addXpAndCheckLevel(profile, 0);

    const runtime = { userId: String(userId), client, guild, channel, messageId, isOwner: isOwner(userId) };
    const intent = detectIntents(text);
    const responseText = await runIntent(intent, runtime, text, profile, levelUpInfo);

    return { ok: true, text: String(responseText).slice(0, 1950), replyOptions: messageId ? { reply: { messageReference: messageId } } : {} };
}

function loadTools() {
    ['serverTools', 'economyTools', 'rpgTools', 'mathTools', 'adminTools', 'commandMapperTools'].forEach(file => {
        try { require(`../tools/${file}`)({ registerTool }); } catch (_) {}
    });
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
    model: () => 'aeternus-v7.17-moderation-invites',
    baseUrl: () => 'local'
};
