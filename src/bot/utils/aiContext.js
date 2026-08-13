const { PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { listCommandsFromClient, listCommandsText } = require('./commandCatalog');

function getCreatorInfo() {
    return {
        id: process.env.OWNER_ID || process.env.CREATOR_ID || '',
        name: process.env.CREATOR_NAME || process.env.OWNER_NAME || 'o dono do bot',
        about: process.env.CREATOR_ABOUT || 'Criador e administrador do bot Aeternus.',
        contact: process.env.CREATOR_CONTACT || ''
    };
}

function getDateTimeInfo(timeZone = process.env.BOT_TIMEZONE || 'America/Sao_Paulo') {
    const now = new Date();
    let formatted = now.toISOString();
    try {
        formatted = new Intl.DateTimeFormat('pt-BR', {
            timeZone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(now);
    } catch {}
    return { iso: now.toISOString(), timezone: timeZone, formatted, unix: Math.floor(now.getTime() / 1000) };
}

function getServerInfo(guild) {
    if (!guild) return null;
    const textChannels = guild.channels?.cache
        ? guild.channels.cache.filter((c) => c.type === 0 || c.type === 5).size
        : 0;
    const voiceChannels = guild.channels?.cache
        ? guild.channels.cache.filter((c) => c.type === 2 || c.type === 13).size
        : 0;
    const roles = guild.roles?.cache ? Math.max(0, guild.roles.cache.size - 1) : 0;

    return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount || guild.members?.cache?.size || 0,
        ownerId: guild.ownerId || '',
        createdAt: guild.createdTimestamp
            ? new Date(guild.createdTimestamp).toISOString().slice(0, 10)
            : '',
        textChannels,
        voiceChannels,
        roles,
        boostLevel: guild.premiumTier || 0,
        boosts: guild.premiumSubscriptionCount || 0,
        description: guild.description || ''
    };
}

async function geocodeCity(city) {
    const q = encodeURIComponent(String(city).trim());
    if (!q) return null;
    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=pt&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    return {
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        lat: r.latitude,
        lon: r.longitude,
        timezone: r.timezone || 'America/Sao_Paulo'
    };
}

function weatherCodePt(code) {
    const map = {
        0: 'céu limpo', 1: 'principalmente limpo', 2: 'parcialmente nublado', 3: 'nublado',
        45: 'neblina', 48: 'neblina com geada', 51: 'garoa leve', 53: 'garoa', 55: 'garoa forte',
        61: 'chuva leve', 63: 'chuva', 65: 'chuva forte', 71: 'neve leve', 73: 'neve', 75: 'neve forte',
        80: 'pancadas leves', 81: 'pancadas', 82: 'pancadas fortes', 95: 'trovoada',
        96: 'trovoada com granizo', 99: 'trovoada forte com granizo'
    };
    return map[code] || 'condição indefinida';
}

async function getWeather(city) {
    try {
        const place =
            (await geocodeCity(city)) ||
            (await geocodeCity(process.env.DEFAULT_WEATHER_CITY || 'São Paulo'));
        if (!place) return { error: 'Cidade não encontrada.' };
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
            `&timezone=${encodeURIComponent(place.timezone)}`;
        const res = await fetch(url);
        if (!res.ok) return { error: 'Falha ao obter clima.' };
        const data = await res.json();
        const c = data.current || {};
        return {
            city: place.name,
            region: place.admin1,
            country: place.country,
            temperature: c.temperature_2m,
            feelsLike: c.apparent_temperature,
            humidity: c.relative_humidity_2m,
            wind: c.wind_speed_10m,
            description: weatherCodePt(c.weather_code),
            unit: data.current_units?.temperature_2m || '°C'
        };
    } catch (err) {
        return { error: err.message || 'Erro no clima.' };
    }
}

function extractCityFromMessage(text) {
    const t = String(text || '');
    const m =
        t.match(/(?:clima|temperatura|tempo)\s+(?:em|de|na|no)\s+([A-Za-zÀ-ÿ\s\-]{2,40})/i) ||
        t.match(/\bem\s+([A-Za-zÀ-ÿ\s\-]{2,40})\s*\??$/i);
    if (!m) return process.env.DEFAULT_WEATHER_CITY || 'São Paulo';
    return m[1].replace(/[?.!,]/g, '').trim();
}

function extractMentionIds(text) {
    const ids = [];
    const re = /<@!?(\d{15,20})>/g;
    let m;
    while ((m = re.exec(text || '')) !== null) ids.push(m[1]);
    return ids;
}

function wantsWeather(text) {
    return /\b(clima|temperatura|tempo\s+(em|hoje|agora)|weather|°c|graus)\b/i.test(text || '');
}

function wantsBalance(text) {
    return /\b(saldo|carteira|almas|balance|atm|quanto (eu )?tenho|banco)\b/i.test(text || '');
}

function wantsTransfers(text) {
    return /\b(transfer(ência|encia)?|transferências|historico de (pay|pagamento)|pagamentos|envios de almas)\b/i.test(
        text || ''
    );
}

function wantsCommands(text) {
    return /\b(comandos|lista de comandos|o que (você|voce) (faz|pode)|help|ajuda|quais comandos)\b/i.test(
        text || ''
    );
}

function wantsLeaderboard(text) {
    return /\b(ranking|leaderboard|top\s*\d*|mais ricos|quem tem mais almas)\b/i.test(text || '');
}

function wantsStaff(text) {
    return /\b(admin|admins|administradores|moderadores|staff|equipe|dono do servidor|owner|quem (é|e) o dono)\b/i.test(
        text || ''
    );
}

function wantsRoles(text) {
    return /\b(cargos|roles|lista de cargos|quais cargos)\b/i.test(text || '');
}

function wantsAbout(text) {
    return /\b(sobre mim|sobre (ele|ela|o usuário|o user)|quem (é|e)|perfil|info (do|da)|userinfo)\b/i.test(
        text || ''
    );
}

function wantsMemory(text) {
    return /\b(o que (eu )?falei|minhas (últimas )?frases|histórico|historico|lembra|você lembra)\b/i.test(
        text || ''
    );
}

function formatNum(n) {
    return Math.floor(Number(n) || 0).toLocaleString('pt-BR');
}

async function resolveUserEconomy(userId, guildId) {
    const u = await db.getUser(userId, guildId);
    return {
        userId,
        almas: u.almas || 0,
        bank: u.bank || 0,
        dailyStreak: u.dailyStreak || 0,
        workXp: u.workXp || 0,
        wins: u.wins || 0,
        losses: u.losses || 0,
        totalBet: u.totalBet || 0,
        totalWon: u.totalWon || 0
    };
}

async function getStaffFacts(guild) {
    const lines = [];
    try {
        let ownerTag = guild.ownerId;
        try {
            const owner = await guild.fetchOwner();
            ownerTag = `${owner.user.tag || owner.user.username} (ID ${owner.id})`;
        } catch {
            ownerTag = `ID ${guild.ownerId}`;
        }
        lines.push(`Dono do servidor: ${ownerTag}`);

        // Admins / moderadores no cache (limitado)
        const admins = [];
        const mods = [];
        for (const [, m] of guild.members.cache) {
            if (m.user.bot) continue;
            if (m.id === guild.ownerId) continue;
            if (m.permissions.has(PermissionFlagsBits.Administrator)) {
                admins.push(m.user.username);
            } else if (
                m.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                m.permissions.has(PermissionFlagsBits.ManageMessages) ||
                m.permissions.has(PermissionFlagsBits.KickMembers) ||
                m.permissions.has(PermissionFlagsBits.BanMembers)
            ) {
                mods.push(m.user.username);
            }
            if (admins.length >= 12 && mods.length >= 12) break;
        }
        if (admins.length) lines.push(`Administradores (cache): ${admins.slice(0, 12).join(', ')}`);
        else lines.push('Administradores: nenhum além do dono no cache (ou não carregados).');
        if (mods.length) lines.push(`Moderadores (cache): ${mods.slice(0, 12).join(', ')}`);
    } catch (err) {
        lines.push('Staff: falha ao ler membros — ' + err.message);
    }
    return lines;
}

function getRolesFacts(guild) {
    try {
        const roles = [...guild.roles.cache.values()]
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .slice(0, 25)
            .map((r) => `${r.name} (${r.members?.cache?.size ?? '?'} membros)`);
        return roles.length
            ? 'Cargos (top 25): ' + roles.join(' · ')
            : 'Nenhum cargo listado.';
    } catch {
        return 'Cargos indisponíveis.';
    }
}

async function getMemberAbout(guild, userId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return `Membro ${userId}: não encontrado neste servidor.`;

        const u = member.user;
        const roles = member.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map((r) => r.name)
            .slice(0, 15);

        const perms = [];
        if (member.id === guild.ownerId) perms.push('dono do servidor');
        if (member.permissions.has(PermissionFlagsBits.Administrator)) perms.push('Administrador');
        if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) perms.push('Moderar membros');
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) perms.push('Gerenciar servidor');
        if (member.permissions.has(PermissionFlagsBits.ManageChannels)) perms.push('Gerenciar canais');

        const joined = member.joinedTimestamp
            ? new Date(member.joinedTimestamp).toISOString().slice(0, 10)
            : '?';
        const created = u.createdTimestamp
            ? new Date(u.createdTimestamp).toISOString().slice(0, 10)
            : '?';

        // Bio pública do Discord não vem de forma confiável para bots; usamos o que a API entrega
        const display = member.displayName || u.globalName || u.username;

        return (
            `Perfil ${display} (@${u.username}, ID ${u.id}): ` +
            `entrou ${joined}, conta ${created}. ` +
            `Cargos: ${roles.join(', ') || 'nenhum'}. ` +
            `Permissões chave: ${perms.join(', ') || 'padrão'}. ` +
            (member.premiumSince ? 'Booster. ' : '') +
            (member.communicationDisabledUntil && member.communicationDisabledUntil > new Date()
                ? 'Em timeout. '
                : '')
        );
    } catch (err) {
        return `Perfil ${userId}: erro — ${err.message}`;
    }
}

async function buildLiveFacts(messageText, guild, extra = {}) {
    const lines = [];
    const dt = getDateTimeInfo();
    lines.push(`Data/hora atual (${dt.timezone}): ${dt.formatted}`);

    const creator = getCreatorInfo();
    lines.push(
        `Criador do bot: ${creator.name}` +
            (creator.id ? ` (Discord ID ${creator.id})` : '') +
            `. ${creator.about}` +
            (creator.contact ? ` Contato: ${creator.contact}` : '')
    );

    if (guild) {
        const s = getServerInfo(guild);
        if (s) {
            lines.push(
                `Servidor: "${s.name}" (ID ${s.id}). Membros ≈ ${s.memberCount}. ` +
                    `Texto: ${s.textChannels}, voz: ${s.voiceChannels}, cargos: ${s.roles}. ` +
                    `Boost ${s.boostLevel}/${s.boosts}.` +
                    (s.description ? ` Descrição: ${s.description.slice(0, 120)}.` : '') +
                    (s.ownerId ? ` Dono ID: ${s.ownerId}.` : '')
            );
        }

        const prefix = db.getGuildConfig(guild.id).prefix || '!';

        if (wantsStaff(messageText) || wantsAbout(messageText)) {
            const staff = await getStaffFacts(guild);
            lines.push(...staff);
        }

        if (wantsRoles(messageText)) {
            lines.push(getRolesFacts(guild));
        }

        if (wantsAbout(messageText) || extractMentionIds(messageText).length) {
            const askerId = extra.userId;
            if (askerId && /\bsobre mim\b/i.test(messageText || '')) {
                lines.push(await getMemberAbout(guild, askerId));
                try {
                    const eco = await resolveUserEconomy(askerId, guild.id);
                    lines.push(
                        `Economia: ${formatNum(eco.almas)} Almas, banco ${formatNum(eco.bank)}, W/L ${eco.wins}/${eco.losses}.`
                    );
                } catch {}
            }
            for (const id of extractMentionIds(messageText).slice(0, 3)) {
                lines.push(await getMemberAbout(guild, id));
                try {
                    const eco = await resolveUserEconomy(id, guild.id);
                    lines.push(
                        `Economia de ${id}: ${formatNum(eco.almas)} Almas, banco ${formatNum(eco.bank)}.`
                    );
                } catch {}
            }
        }

        if (wantsCommands(messageText)) {
            const catalog = extra.client
                ? listCommandsFromClient(extra.client, prefix)
                : listCommandsText(prefix);
            lines.push('Comandos:\n' + catalog);
        }

        if (wantsBalance(messageText) || wantsTransfers(messageText)) {
            const askerId = extra.userId;
            if (askerId) {
                const self = await resolveUserEconomy(askerId, guild.id);
                lines.push(
                    `Saldo de quem perguntou: ${formatNum(self.almas)} Almas (banco ${formatNum(self.bank)}), ` +
                        `daily ${self.dailyStreak}d, W/L ${self.wins}/${self.losses}.`
                );
            }
            for (const id of extractMentionIds(messageText).filter((x) => x !== askerId).slice(0, 5)) {
                const e = await resolveUserEconomy(id, guild.id);
                lines.push(`Saldo ${id}: ${formatNum(e.almas)} Almas (banco ${formatNum(e.bank)}).`);
            }
        }

        if (wantsTransfers(messageText)) {
            const targetId = extractMentionIds(messageText)[0] || extra.userId;
            const txs = await db.getTransfers(guild.id, { userId: targetId || null, limit: 8 });
            if (!txs.length) lines.push('Sem transferências registradas.');
            else {
                lines.push(
                    'Transferências recentes:\n' +
                        txs
                            .map(
                                (t) =>
                                    `• ${formatNum(t.amount)} de ${t.fromId} → ${t.toId} (${new Date(t.at).toISOString().slice(0, 16)})`
                            )
                            .join('\n')
                );
            }
        }

        if (wantsLeaderboard(messageText)) {
            const top = await db.getLeaderboard(guild.id, 10);
            lines.push(
                top.length
                    ? 'Top 10:\n' + top.map((u, i) => `${i + 1}. ${u.userId}: ${formatNum(u.almas)}`).join('\n')
                    : 'Ranking vazio.'
            );
        }

        if (wantsMemory(messageText) && extra.userId) {
            const mem = await db.getAiMemory(extra.userId, guild.id);
            const userLines = mem.filter((m) => m.role === 'user').slice(-10);
            if (userLines.length) {
                lines.push(
                    'Últimas frases do usuário com a IA:\n' +
                        userLines.map((m, i) => `${i + 1}. ${m.content}`).join('\n')
                );
            } else {
                lines.push('Ainda não há frases salvas deste usuário com a IA.');
            }
        }
    }

    if (wantsWeather(messageText)) {
        const city = extractCityFromMessage(messageText);
        const w = await getWeather(city);
        if (w.error) lines.push(`Clima: ${w.error}`);
        else {
            lines.push(
                `Clima ${w.city}: ${w.temperature}${w.unit}, ${w.description}, umidade ${w.humidity}%.`
            );
        }
    }

    return lines.join('\n');
}

module.exports = {
    getCreatorInfo,
    getDateTimeInfo,
    getServerInfo,
    getWeather,
    extractCityFromMessage,
    extractMentionIds,
    wantsWeather,
    wantsBalance,
    wantsTransfers,
    wantsCommands,
    wantsLeaderboard,
    wantsStaff,
    wantsRoles,
    wantsAbout,
    wantsMemory,
    buildLiveFacts
};
