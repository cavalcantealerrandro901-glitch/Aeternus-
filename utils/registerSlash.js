const { REST, Routes } = require('discord.js');
const { getToken, getClientId, getGuildId } = require('./env');

function collectSlashBody(client) {
    const body = [];
    const seen = new Set();
    const sources = client.slash ? [...client.slash.values()] : [];

    for (const cmd of sources) {
        if (!cmd?.data) continue;
        if (typeof cmd.executeSlash !== 'function' && typeof cmd.execute !== 'function') continue;

        try {
            const json = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : { ...cmd.data };
            if (!json?.name) continue;

            let name = String(json.name)
                .toLowerCase()
                .replace(/_/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 32);
            if (!name || seen.has(name)) continue;

            if (Array.isArray(json.options)) {
                json.options = json.options.filter((o) => o && o.name !== 'args');
            }

            json.name = name;
            seen.add(name);
            body.push(json);
        } catch (e) {
            console.error('[slash] falha ao serializar:', e.message);
        }
    }

    body.sort((a, b) => a.name.localeCompare(b.name));
    return body;
}

async function registerSlash(client, opts = {}) {
    const token = getToken() || client?.token || null;
    const clientId = getClientId(client);

    if (!token) {
        console.warn('⚠️ [slash] Token ausente.');
        return { ok: false, error: 'missing_token' };
    }
    if (!clientId) {
        console.warn('⚠️ [slash] CLIENT_ID ausente.');
        return { ok: false, error: 'missing_client_id' };
    }

    console.log('🔑 [slash] clientId=' + clientId);

    const rest = new REST({ version: '10' }).setToken(token);
    const body = opts.wipeOnly ? [] : collectSlashBody(client);

    console.log('⏳ [slash] Sincronizando ' + body.length + ' comandos (sem args, sem duplicatas)…');

    try {
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(
            body.length
                ? '✨ [slash] GLOBAL (' + body.length + '): ' + body.map((c) => c.name).join(', ')
                : '🗑️ [slash] Comandos GLOBAIS apagados.'
        );
    } catch (e) {
        console.error('❌ [slash] Global:', e.message);
        if (e.rawError) console.error(JSON.stringify(e.rawError, null, 2));
        return { ok: false, error: e.message };
    }

    const guildIds = new Set();
    const envGuild = getGuildId();
    if (envGuild) guildIds.add(envGuild);
    if (Array.isArray(opts.guildIds)) opts.guildIds.forEach((id) => guildIds.add(String(id)));
    if (client?.guilds?.cache) {
        for (const g of client.guilds.cache.values()) guildIds.add(g.id);
    }

    // Padrão: limpa locais para NÃO duplicar com global
    const useGuild = process.env.SLASH_GUILD_REGISTER === '1' && !opts.wipeOnly;

    for (const gid of guildIds) {
        try {
            if (useGuild && body.length) {
                await rest.put(Routes.applicationGuildCommands(clientId, gid), { body });
                console.log('✨ [slash] Guild ' + gid + ': ' + body.length);
            } else {
                await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: [] });
                console.log('🗑️ [slash] Guild ' + gid + ': locais removidos (só global)');
            }
        } catch (e) {
            console.warn('⚠️ [slash] Guild ' + gid + ': ' + e.message);
        }
    }

    return { ok: true, count: body.length, names: body.map((c) => c.name) };
}

async function wipeSlash(client) {
    return registerSlash(client, { wipeOnly: true });
}

module.exports = { registerSlash, wipeSlash, collectSlashBody };
