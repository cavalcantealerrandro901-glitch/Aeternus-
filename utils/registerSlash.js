const { REST, Routes } = require('discord.js');

/**
 * Coleta apenas comandos com SlashCommandBuilder (`data`) e handler (`executeSlash` ou `execute`).
 */
function collectSlashBody(client) {
    const body = [];
    const seen = new Set();

    const sources = [
        ...(client.slash ? [...client.slash.values()] : []),
        ...(client.commands ? [...client.commands.values()] : [])
    ];

    for (const cmd of sources) {
        if (!cmd?.data) continue;
        const name = cmd.data.name || cmd.data?.name;
        if (!name || seen.has(name)) continue;
        // só registra se tem handler de slash (ou execute genérico)
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

/**
 * 1) Apaga TODOS os comandos globais
 * 2) Apaga comandos de guild (GUILD_ID ou todas as guilds do cache)
 * 3) Registra a lista atual
 *
 * @param {import('discord.js').Client} client
 * @param {{ wipeOnly?: boolean, guildIds?: string[] }} [opts]
 */
async function registerSlash(client, opts = {}) {
    const token = process.env.TOKEN;
    const clientId = process.env.CLIENT_ID || client?.user?.id;

    if (!token || !clientId) {
        console.warn('⚠️ [slash] TOKEN ou CLIENT_ID ausente — registro ignorado.');
        return { ok: false, error: 'missing_env' };
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = opts.wipeOnly ? [] : collectSlashBody(client);

    console.log(`⏳ [slash] Limpando comandos antigos da aplicação ${clientId}…`);

    // ── Global wipe + put ──────────────────────────────────────────
    try {
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(
            body.length
                ? `✨ [slash] ${body.length} comando(s) GLOBAL registrados: ${body.map((c) => c.name).join(', ')}`
                : '🗑️ [slash] Todos os comandos GLOBAIS foram apagados.'
        );
    } catch (e) {
        console.error('❌ [slash] Global:', e.message);
        if (e.rawError) console.error(JSON.stringify(e.rawError, null, 2));
        return { ok: false, error: e.message };
    }

    // ── Guild wipe/put (instantâneo) ───────────────────────────────
    const guildIds = new Set();
    if (process.env.GUILD_ID) guildIds.add(process.env.GUILD_ID);
    if (Array.isArray(opts.guildIds)) opts.guildIds.forEach((id) => guildIds.add(id));
    if (client?.guilds?.cache) {
        for (const g of client.guilds.cache.values()) guildIds.add(g.id);
    }

    for (const gid of guildIds) {
        try {
            // limpa resíduos de guild
            await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: [] });
            if (body.length && process.env.SLASH_GUILD_REGISTER === '1') {
                // opcional: também registra na guild (aparece na hora)
                await rest.put(Routes.applicationGuildCommands(clientId, gid), { body });
                console.log(`✨ [slash] Guild ${gid}: ${body.length} comandos`);
            } else {
                console.log(`🗑️ [slash] Guild ${gid}: comandos locais limpos`);
            }
        } catch (e) {
            console.warn(`⚠️ [slash] Guild ${gid}: ${e.message}`);
        }
    }

    return { ok: true, count: body.length, names: body.map((c) => c.name) };
}

/** Só apaga tudo (global + guilds conhecidas) */
async function wipeSlash(client) {
    return registerSlash(client, { wipeOnly: true });
}

module.exports = { registerSlash, wipeSlash, collectSlashBody };
