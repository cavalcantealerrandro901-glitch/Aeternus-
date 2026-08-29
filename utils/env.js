/**
 * Lê variáveis de ambiente com vários nomes comuns.
 */
function first(...keys) {
    for (const k of keys) {
        const v = process.env[k];
        if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return null;
}

function getToken() {
    return first(
        'TOKEN',
        'DISCORD_TOKEN',
        'BOT_TOKEN',
        'DISCORD_BOT_TOKEN'
    );
}

function getClientId(client) {
    return (
        first(
            'CLIENT_ID',
            'DISCORD_CLIENT_ID',
            'APPLICATION_ID',
            'APP_ID',
            'DISCORD_APPLICATION_ID'
        ) ||
        client?.user?.id ||
        null
    );
}

function getGuildId() {
    return first('GUILD_ID', 'DISCORD_GUILD_ID', 'SERVER_ID');
}

module.exports = { first, getToken, getClientId, getGuildId };
