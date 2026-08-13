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
                `Servidor atual: "${s.name}" (ID ${s.id}). Membros ≈ ${s.memberCount}. ` +
                    `Texto: ${s.textChannels}, voz: ${s.voiceChannels}, cargos: ${s.roles}. ` +
                    `Boost nível ${s.boostLevel} (${s.boosts}).` +
                    (s.ownerId ? ` Dono do servidor ID: ${s.ownerId}.` : '')
            );
        }

        const prefix = db.getGuildConfig(guild.id).prefix || '!';

        // Comandos
        if (wantsCommands(messageText) || /\b(tudo que (você|voce) (faz|pode))\b/i.test(messageText)) {
            const catalog = extra.client
                ? listCommandsFromClient(extra.client, prefix)
                : listCommandsText(prefix);
            lines.push('Comandos disponíveis:\n' + catalog);
        }

        // Saldos
        if (wantsBalance(messageText) || wantsTransfers(messageText)) {
            const askerId = extra.userId;
            if (askerId) {
                const self = await resolveUserEconomy(askerId, guild.id);
                lines.push(
                    `Saldo de quem perguntou (ID ${askerId}): carteira ${formatNum(self.almas)} Almas, ` +
                        `banco ${formatNum(self.bank)}, sequência daily ${self.dailyStreak}, ` +
                        `W/L ${self.wins}/${self.losses}, apostado total ${formatNum(self.totalBet)}, ` +
                        `ganho total ${formatNum(self.totalWon)}.`
                );
            }

            const mentioned = extractMentionIds(messageText).filter((id) => id !== askerId);
            for (const id of mentioned.slice(0, 5)) {
                const e = await resolveUserEconomy(id, guild.id);
                lines.push(
                    `Saldo do usuário ID ${id}: carteira ${formatNum(e.almas)} Almas, banco ${formatNum(e.bank)}, ` +
                        `W/L ${e.wins}/${e.losses}.`
                );
            }
        }

        // Transferências
        if (wantsTransfers(messageText)) {
            const targetId = extractMentionIds(messageText)[0] || extra.userId;
            const txs = await db.getTransfers(guild.id, {
                userId: targetId || null,
                limit: 8
            });
            if (!txs.length) {
                lines.push('Nenhuma transferência registrada ainda neste servidor (ou para este usuário).');
            } else {
                lines.push(
                    'Últimas transferências (mais recentes primeiro):\n' +
                        txs
                            .map(
                                (t) =>
                                    `• ${formatNum(t.amount)} Almas de ${t.fromId} → ${t.toId} em ${new Date(t.at).toISOString()}`
                            )
                            .join('\n')
                );
            }
        }

        // Ranking
        if (wantsLeaderboard(messageText)) {
            const top = await db.getLeaderboard(guild.id, 10);
            if (!top.length) {
                lines.push('Ranking vazio neste servidor.');
            } else {
                lines.push(
                    'Top 10 Almas:\n' +
                        top
                            .map((u, i) => `${i + 1}. ${u.userId}: ${formatNum(u.almas)} Almas`)
                            .join('\n')
                );
            }
        }
    }

    if (wantsWeather(messageText)) {
        const city = extractCityFromMessage(messageText);
        const w = await getWeather(city);
        if (w.error) lines.push(`Clima: ${w.error}`);
        else {
            lines.push(
                `Clima em ${w.city}${w.region ? ', ' + w.region : ''}: ` +
                    `${w.temperature}${w.unit}, sensação ${w.feelsLike}${w.unit}, ` +
                    `${w.description}, umidade ${w.humidity}%, vento ${w.wind} km/h.`
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
    buildLiveFacts
};
