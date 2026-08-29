const { REST, Routes } = require('discord.js');
const { getToken, getClientId, getGuildId } = require('./env');

function collectSlashBody(client) {
    const body = [];
    const seen = new Set();

    const sources = [
        ...(client.slash ? [...client.slash.values()] : []),
        ...(client.commands ? [...client.commands.values()] : [])
    ];

    for (const cmd of sources) {
        if (!cmd?.data) continue;
        const name = cmd.data.name;
        if (!name || seen.has(name)) continue;
        if (typeof cmd.executeSlash !== 'function' && typeof cmd.execute !== 'function') continue;
        try {
            const json = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
            if (!json?.name) continue;
            seen.add(json.name);
            body.push(json);
        } catch (e) {
            console.error(`[slash] falha ao serializar ${name}:`, e.message);
        }
    }
    return body;
}

async function registerSlash(client, opts = {}) {
    // Token: env OU o que o client já usou no login
    const token = getToken() || client?.token || null;
    // Client ID: env OU id do bot já logado
    const clientId = getClientId(client);

    if (!token) {
        console.warn(
            '⚠️ [slash] Token ausente. Use no .env / Render uma destas chaves:\n' +
                '   TOKEN  ou  DISCORD_TOKEN  ou  BOT_TOKEN'
        );
        return { ok: false, error: 'missing_token' };
    }
    if (!clientId) {
        console.warn(
            '⚠️ [slash] CLIENT_ID ausente e bot ainda sem user.id. Use no .env / Render:\n' +
                '   CLIENT_ID  ou  DISCORD_CLIENT_ID  ou  APPLICATION_ID\n' +
                '   (é o Application ID do portal Discord → OAuth2)'
        );
        return { ok: false, error: 'missing_client_id' };
    }

    console.log(`🔑 [slash] clientId=${clientId} · token=ok`);

    const rest = new REST({ version: '10' }).setToken(token);
    const body = opts.wipeOnly ? [] : collectSlashBody(client);

    console.log(`⏳ [slash] Sincronizando aplicação ${clientId}…`);

    try {
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(
            body.length
                ? `✨ [slash] ${body.length} GLOBAL: ${body.map((c) => c.name).join(', ')}`
                : '🗑️ [slash] Todos os comandos GLOBAIS apagados.'
        );
    } catch (e) {
        console.error('❌ [slash] Global:', e.message);
        if (e.code === 50035 || e.status === 401) {
            console.error(
                '   → Confira se CLIENT_ID é o Application ID deste bot e se o TOKEN é o do mesmo bot.'
            );
        }
        if (e.rawError) console.error(JSON.stringify(e.rawError, null, 2));
        return { ok: false, error: e.message };
    }

    const guildIds = new Set();
    const envGuild = getGuildId();
    if (envGuild) guildIds.add(envGuild);
    if (Array.isArray(opts.guildIds)) opts.guildIds.forEach((id) => guildIds.add(id));
    if (client?.guilds?.cache) {
        for (const g of client.guilds.cache.values()) guildIds.add(g.id);
    }

    for (const gid of guildIds) {
        try {
            await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: [] });
            if (body.length && process.env.SLASH_GUILD_REGISTER === '1') {
                await rest.put(Routes.applicationGuildCommands(clientId, gid), { body });
                console.log(`✨ [slash] Guild ${gid}: ${body.length} comandos`);
            } else {
                console.log(`🗑️ [slash] Guild ${gid}: locais limpos`);
            }
        } catch (e) {
            console.warn(`⚠️ [slash] Guild ${gid}: ${e.message}`);
        }
    }

    return { ok: true, count: body.length, names: body.map((c) => c.name) };
}

async function wipeSlash(client) {
    return registerSlash(client, { wipeOnly: true });
}

module.exports = { registerSlash, wipeSlash, collectSlashBody };
